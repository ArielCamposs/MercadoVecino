import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { Send, Star, X } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface PendingReview {
    contact_id: string;
    product_id: string;
    product_title: string;
    product_image: string;
}

// Local session cache to prevent same-session reappearance
const sessionDismissed = new Set<string>();

export default function ProactiveReviewModal() {
    const [visible, setVisible] = useState(false);
    const [pendingItem, setPendingItem] = useState<PendingReview & { user_id: string } | null>(null);
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    useFocusEffect(
        useCallback(() => {
            if (!visible && !pendingItem) {
                checkPendingReviews();
            }
        }, [visible, pendingItem])
    );

    async function checkPendingReviews() {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            setCurrentUserId(user.id);

            // Fetch confirmed contacts that are NOT finalized
            const { data: contacts, error: contactError } = await supabase
                .from('product_contacts')
                .select('id, product_id, created_at, products!product_id(title, image_url)')
                .eq('user_id', user.id)
                .eq('status', 'confirmed')
                .order('created_at', { ascending: false })
                .limit(1);

            if (contactError) throw contactError;

            // Filter out contacts already dismissed in this session OR permanently
            const filteredContacts = [];
            for (const contact of (contacts || [])) {
                if (sessionDismissed.has(contact.product_id)) continue;

                // Check permanent dismissal list in AsyncStorage
                const dismissedKey = `dismissed_review_${contact.id}`;
                const isDismissed = await AsyncStorage.getItem(dismissedKey);
                if (isDismissed) continue;

                filteredContacts.push(contact);
            }

            if (filteredContacts.length > 0) {
                const contact = filteredContacts[0];
                const product = contact.products as any;
                const contactTime = new Date(contact.created_at).getTime();

                // Skip if already dismissed in this session
                if (sessionDismissed.has(contact.product_id)) return;

                // Double check if manual review was already submitted for this cycle
                const { data: latestReview } = await supabase
                    .from('product_reviews')
                    .select('created_at')
                    .eq('product_id', contact.product_id)
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false })
                    .limit(1);

                const reviewTime = latestReview && latestReview.length > 0
                    ? new Date(latestReview[0].created_at).getTime()
                    : 0;

                // If already reviewed manually, just finalize the contacts and don't show modal
                if (reviewTime >= contactTime) {
                    await supabase
                        .from('product_contacts')
                        .update({ status: 'finalized' })
                        .eq('product_id', contact.product_id)
                        .eq('user_id', user.id)
                        .eq('status', 'confirmed');
                    return;
                }

                setPendingItem({
                    contact_id: contact.id,
                    product_id: contact.product_id,
                    product_title: product?.title || 'Producto',
                    product_image: product?.image_url || 'https://images.unsplash.com/photo-1549931319-a545dcf3bc73?q=80&w=500&auto=format&fit=crop',
                    user_id: user.id
                });
                setVisible(true);
            }
        } catch (err) {
            console.error('[ProactiveReviewModal] Check error:', err);
        }
    }

    async function handleSkip() {
        if (!pendingItem) return;
        const productIdToClear = pendingItem.product_id;
        const userIdToClear = pendingItem.user_id;

        // Optimistically hide and blacklist
        setVisible(false);
        setPendingItem(null); // Clear immediately to avoid reappearance while DB updates
        sessionDismissed.add(productIdToClear);

        // Mark as permanently dismissed locally to be safe
        try {
            await AsyncStorage.setItem(`dismissed_review_${pendingItem.contact_id}`, 'true');
        } catch (e) { }

        try {
            // Update ALL confirmed contacts for this product to finalized
            const { error } = await supabase
                .from('product_contacts')
                .update({ status: 'finalized' })
                .eq('product_id', productIdToClear)
                .eq('user_id', userIdToClear)
                .eq('status', 'confirmed');

            if (error) throw error;
            setPendingItem(null);
        } catch (err) {
            console.error('[ProactiveReviewModal] Skip error:', err);
            // Optionally could Re-show if failure is critical, but usually better to stay hidden
        }
    }

    async function handleSubmit() {
        if (!pendingItem) return;
        const productIdToClear = pendingItem.product_id;
        const userIdToClear = pendingItem.user_id;
        const contactId = pendingItem.contact_id;

        if (!comment.trim()) {
            Alert.alert('Comentario vacío', 'Por favor escribe algo sobre el producto.');
            return;
        }

        try {
            setSubmitting(true);

            // 1. Submit review
            const { error: reviewError } = await supabase
                .from('product_reviews')
                .insert({
                    product_id: productIdToClear,
                    user_id: userIdToClear,
                    rating,
                    comment: comment.trim(),
                    created_at: new Date().toISOString()
                });

            if (reviewError) throw reviewError;

            // 2. Finalize ALL confirmed contacts for this product
            const { error: contactError } = await supabase
                .from('product_contacts')
                .update({ status: 'finalized' })
                .eq('product_id', productIdToClear)
                .eq('user_id', userIdToClear)
                .eq('status', 'confirmed');

            if (contactError) throw contactError;

            Alert.alert('¡Gracias!', 'Tu reseña ha sido publicada.');
            setVisible(false);
            setPendingItem(null); // Clear immediately
            sessionDismissed.add(productIdToClear);
            setComment('');
            setRating(5);
        } catch (err) {
            console.error('[ProactiveReviewModal] Submit error:', err);
            Alert.alert('Error', 'No pudimos guardar tu reseña.');
        } finally {
            setSubmitting(false);
        }
    }

    if (!pendingItem) return null;

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={handleSkip}
        >
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <View className="flex-row justify-between items-center mb-6">
                        <Text className="text-2xl font-black text-slate-900">¿Qué te pareció?</Text>
                        <TouchableOpacity onPress={handleSkip} className="w-10 h-10 bg-slate-100 rounded-full items-center justify-center">
                            <X size={24} color="#0F172A" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false}>
                        <Text className="text-slate-500 font-medium mb-6">
                            El vendedor confirmó tu compra de <Text className="text-brand-600 font-bold">"{pendingItem.product_title}"</Text>. Tu opinión ayuda a otros vecinos.
                        </Text>

                        <View className="items-center mb-8">
                            <View className="flex-row">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <TouchableOpacity key={star} onPress={() => setRating(star)} className="mx-2">
                                        <Star
                                            size={40}
                                            fill={star <= rating ? "#FACC15" : "transparent"}
                                            color={star <= rating ? "#FACC15" : "#CBD5E1"}
                                        />
                                    </TouchableOpacity>
                                ))}
                            </View>
                            <Text className="text-slate-400 font-black text-[10px] uppercase tracking-widest mt-4">Toca las estrellas para calificar</Text>
                        </View>

                        <View className="bg-slate-50 rounded-3xl border border-slate-200 p-4 mb-8">
                            <TextInput
                                placeholder="Cuéntanos tu experiencia (opcional)..."
                                placeholderTextColor="#94A3B8"
                                multiline
                                value={comment}
                                onChangeText={setComment}
                                className="text-slate-700 font-medium min-h-[100px] text-lg"
                                textAlignVertical="top"
                            />
                        </View>

                        <View className="flex-row gap-4 mb-2">
                            <TouchableOpacity
                                onPress={handleSkip}
                                className="flex-1 p-5 rounded-[24px] bg-slate-100 items-center justify-center"
                            >
                                <Text className="text-slate-500 font-black">Omitir</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={handleSubmit}
                                disabled={submitting}
                                className={`flex-[2] p-5 rounded-[24px] flex-row items-center justify-center shadow-lg ${submitting ? 'bg-brand-400' : 'bg-brand-600'}`}
                            >
                                {submitting ? (
                                    <ActivityIndicator color="white" />
                                ) : (
                                    <>
                                        <Send size={20} color="white" className="mr-2" />
                                        <Text className="text-white font-black text-lg ml-2">Publicar</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                        <Text className="text-center text-slate-400 text-[10px] font-bold uppercase tracking-tighter mt-4">Al omitir, finalizarás la venta sin calificar</Text>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        justifyContent: 'flex-end',
    },
    container: {
        backgroundColor: 'white',
        borderTopLeftRadius: 50,
        borderTopRightRadius: 50,
        padding: 32,
        maxHeight: '85%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 20,
    }
});
