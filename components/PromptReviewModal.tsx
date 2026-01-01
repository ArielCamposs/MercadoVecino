import { supabase } from '@/lib/supabase';
import * as Haptics from 'expo-haptics';
import { Send, Star, X } from 'lucide-react-native';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

interface PromptReviewModalProps {
    visible: boolean;
    productId: string;
    productTitle: string;
    onClose: () => void;
    onSuccess: () => void;
}

export default function PromptReviewModal({ visible, productId, productTitle, onClose, onSuccess }: PromptReviewModalProps) {
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!comment.trim()) {
            Alert.alert('Falta Comentario', 'Por favor escribe algo sobre tu experiencia.');
            return;
        }

        try {
            setSubmitting(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No user found');

            // 1. Insert review
            const { error: reviewError } = await supabase
                .from('product_reviews')
                .insert({
                    product_id: productId,
                    user_id: user.id,
                    rating,
                    comment: comment.trim(),
                    created_at: new Date().toISOString()
                });

            if (reviewError) throw reviewError;

            // 2. Finalize contacts
            await supabase
                .from('product_contacts')
                .update({ status: 'finalized' })
                .eq('product_id', productId)
                .eq('user_id', user.id)
                .eq('status', 'confirmed');

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            onSuccess();
        } catch (err) {
            console.error('[PromptReview] Error:', err);
            Alert.alert('Error', 'No pudimos guardar tu reseña.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.keyboardView}
                >
                    <View style={styles.modalContainer}>
                        <View style={styles.header}>
                            <Text style={styles.headerTitle}>¡Trato Hecho! 🥳</Text>
                            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                                <X size={24} color="#64748B" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.content}>
                            <Text style={styles.subtitle}>
                                Cuéntanos qué tal tu experiencia con
                                <Text style={styles.productName}> {productTitle}</Text>
                            </Text>

                            <View style={styles.starsContainer}>
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <TouchableOpacity
                                        key={star}
                                        onPress={() => {
                                            setRating(star);
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        }}
                                        style={styles.starBtn}
                                    >
                                        <Star
                                            size={40}
                                            fill={star <= rating ? "#FACC15" : "transparent"}
                                            color={star <= rating ? "#FACC15" : "#CBD5E1"}
                                        />
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <View style={styles.inputContainer}>
                                <TextInput
                                    placeholder="Escribe un breve comentario para el vendedor..."
                                    placeholderTextColor="#94A3B8"
                                    multiline
                                    numberOfLines={4}
                                    value={comment}
                                    onChangeText={setComment}
                                    style={styles.input}
                                />
                            </View>

                            <TouchableOpacity
                                onPress={handleSubmit}
                                disabled={submitting}
                                style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
                                activeOpacity={0.8}
                            >
                                {submitting ? (
                                    <ActivityIndicator color="white" />
                                ) : (
                                    <>
                                        <Text style={styles.submitBtnText}>Publicar Reseña</Text>
                                        <Send size={18} color="white" style={{ marginLeft: 8 }} />
                                    </>
                                )}
                            </TouchableOpacity>

                            <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
                                <Text style={styles.cancelBtnText}>Ahora no, gracias</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        justifyContent: 'center',
        padding: 24,
    },
    keyboardView: {
        width: '100%',
    },
    modalContainer: {
        backgroundColor: 'white',
        borderRadius: 40,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: 24,
        paddingBottom: 12,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '900',
        color: '#0F172A',
    },
    closeBtn: {
        padding: 8,
    },
    content: {
        paddingHorizontal: 24,
        paddingBottom: 32,
        alignItems: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 24,
    },
    productName: {
        color: '#0F172A',
        fontWeight: '800',
    },
    starsContainer: {
        flexDirection: 'row',
        marginBottom: 24,
    },
    starBtn: {
        paddingHorizontal: 4,
    },
    inputContainer: {
        width: '100%',
        backgroundColor: '#F8FAFC',
        borderRadius: 24,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        padding: 16,
        marginBottom: 24,
    },
    input: {
        width: '100%',
        minHeight: 100,
        color: '#1E293B',
        fontSize: 15,
        textAlignVertical: 'top',
        fontWeight: '500',
    },
    submitBtn: {
        width: '100%',
        backgroundColor: '#4F46E5', // Indigo-600
        paddingVertical: 18,
        borderRadius: 24,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#4F46E5',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 5,
        marginBottom: 16,
    },
    submitBtnDisabled: {
        backgroundColor: '#94A3B8',
        shadowOpacity: 0,
    },
    submitBtnText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '900',
    },
    cancelBtn: {
        padding: 12,
    },
    cancelBtnText: {
        color: '#94A3B8',
        fontSize: 14,
        fontWeight: '700',
    },
});
