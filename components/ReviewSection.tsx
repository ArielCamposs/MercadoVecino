import { supabase } from '@/lib/supabase';
import { Check, MessageSquare, Send, ShoppingBag, Star, Store, User } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface Review {
    id: string;
    rating: number;
    comment: string;
    created_at: string;
    user_id: string;
    profiles: {
        full_name: string;
    };
}

interface ReviewSectionProps {
    productId: string;
    onReviewSubmitted?: () => void;
}

export default function ReviewSection({ productId, onReviewSubmitted }: ReviewSectionProps) {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState('');
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [hasContacted, setHasContacted] = useState(false);
    const [contactStatus, setContactStatus] = useState<'pending' | 'confirmed' | 'finalized' | null>(null);
    const [isOwner, setIsOwner] = useState(false);
    const [hasReviewed, setHasReviewed] = useState(false);

    useEffect(() => {
        fetchReviews();
        checkUser();
    }, [productId]);

    async function checkUser() {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            setCurrentUserId(user.id);

            // Check if user is the owner of the product
            const { data: productData } = await supabase
                .from('products')
                .select('user_id')
                .eq('id', productId)
                .single();

            if (productData?.user_id === user.id) {
                setIsOwner(true);
            }

            // Check user's purchase status
            try {
                // Fetch ALL contacts for this user/product to find the MOST relevant one
                const { data: contactData } = await supabase
                    .from('product_contacts')
                    .select('id, status, created_at')
                    .eq('product_id', productId)
                    .eq('user_id', user.id)
                    .in('status', ['pending', 'confirmed', 'finalized'])
                    .order('created_at', { ascending: false });

                if (contactData && contactData.length > 0) {
                    setHasContacted(true);
                    // If there's a confirmed one anywhere, it takes precedence over finalized ones 
                    // unless a review exists for it (handled by checkReviewEligibility)
                    const latest = contactData[0];
                    setContactStatus(latest.status as any);
                } else {
                    setHasContacted(false);
                    setContactStatus(null);
                }
            } catch (e) {
                console.error('[Reseñas] Error al verificar contactos:', e);
            }
        }
    }

    async function fetchReviews() {
        try {
            setLoading(true);

            // 1. Fetch raw reviews
            const { data: rawReviews, error: reviewError } = await supabase
                .from('product_reviews')
                .select('*')
                .eq('product_id', productId)
                .order('created_at', { ascending: false });

            if (reviewError) throw reviewError;
            if (!rawReviews || rawReviews.length === 0) {
                setReviews([]);
                return;
            }

            // 2. Fetch profiles for these reviews manually to avoid Foreign Key Join error
            const userIds = [...new Set(rawReviews.map(r => r.user_id))];
            const { data: profileData } = await supabase
                .from('profiles')
                .select('id, full_name')
                .in('id', userIds);

            const profileLookup: Record<string, string> = {};
            profileData?.forEach(p => {
                profileLookup[p.id] = p.full_name;
            });

            // 3. Merge data
            const formattedReviews: Review[] = rawReviews.map(r => ({
                ...r,
                profiles: {
                    full_name: profileLookup[r.user_id] || 'Vecino Anónimo'
                }
            }));

            setReviews(formattedReviews);
        } catch (err) {
            console.error('[Reseñas] Error al obtener reseñas:', err);
        } finally {
            setLoading(false);
        }
    }

    // New effect to handle the cycle logic separately from data fetching
    useEffect(() => {
        checkReviewEligibility();
    }, [currentUserId, reviews, contactStatus]);

    async function checkReviewEligibility() {
        if (!currentUserId || !productId) return;

        try {
            // Fetch latest confirmed or finalized contact
            const { data: latestContact } = await supabase
                .from('product_contacts')
                .select('created_at')
                .eq('product_id', productId)
                .eq('user_id', currentUserId)
                .in('status', ['confirmed', 'finalized'])
                .order('created_at', { ascending: false })
                .limit(1);

            // Fetch latest review by THIS user
            const { data: latestReview } = await supabase
                .from('product_reviews')
                .select('created_at')
                .eq('product_id', productId)
                .eq('user_id', currentUserId)
                .order('created_at', { ascending: false })
                .limit(1);

            if (latestContact && latestContact.length > 0) {
                const contactTime = new Date(latestContact[0].created_at).getTime();
                const reviewTime = latestReview && latestReview.length > 0
                    ? new Date(latestReview[0].created_at).getTime()
                    : 0;

                // If review is newer than contact, it's definitely reviewed
                if (reviewTime >= contactTime) {
                    setHasReviewed(true);
                } else {
                    setHasReviewed(false);
                }
            } else {
                setHasReviewed(false);
            }
        } catch (e) {
            console.error('[Reseñas] Error al verificar elegibilidad:', e);
        }
    }

    async function handleSubmit() {
        if (!currentUserId) {
            Alert.alert('Inicia Sesión', 'Debes estar conectado para dejar una reseña.');
            return;
        }
        if (!comment.trim()) {
            Alert.alert('Falta Comentario', 'Por favor escribe algo sobre tu experiencia.');
            return;
        }

        if (hasReviewed) {
            Alert.alert('Calificación ya enviada', 'Ya has calificado esta compra.');
            return;
        }

        try {
            setSubmitting(true);
            const { error } = await supabase
                .from('product_reviews')
                .insert({
                    product_id: productId,
                    user_id: currentUserId,
                    rating,
                    comment: comment.trim(),
                    created_at: new Date().toISOString()
                });

            if (error) throw error;

            // Update contact status to finalized if it was confirmed
            const { data: contactData } = await supabase
                .from('product_contacts')
                .select('id, status')
                .eq('product_id', productId)
                .eq('user_id', currentUserId)
                .order('created_at', { ascending: false })
                .limit(1);

            if (contactData && contactData.length > 0) {
                // Finalize ALL confirmed contacts for this product to avoid duplicates
                await supabase
                    .from('product_contacts')
                    .update({ status: 'finalized' })
                    .eq('product_id', productId)
                    .eq('user_id', currentUserId)
                    .eq('status', 'confirmed');
            }

            setComment('');
            setRating(5);
            setHasReviewed(true);
            fetchReviews();
            if (onReviewSubmitted) onReviewSubmitted();
            Alert.alert('¡Gracias!', 'Tu reseña ha sido publicada.');
        } catch (err: any) {
            Alert.alert('Error', 'No pudimos guardar tu reseña. Inténtalo de nuevo.');
            console.error('[Reseñas] Error al enviar reseña:', err);
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <View className="mt-8 border-t border-slate-100 pt-8">
            <Text className="text-slate-400 font-extrabold text-[10px] uppercase tracking-widest mb-6 px-1">Opiniones de vecinos</Text>

            {/* Formulario de Reseña */}
            {currentUserId ? (
                isOwner ? (
                    <View style={styles.infoCard}>
                        <Text className="text-slate-500 font-bold text-center">No puedes calificar tu propio producto.</Text>
                    </View>
                ) : hasReviewed ? (
                    <View className="bg-emerald-50 rounded-[32px] p-6 border border-emerald-100 mb-8 items-center">
                        <Check size={32} color="#059669" style={{ opacity: 0.6 }} />
                        <Text className="text-emerald-800 font-bold text-center mt-3">¡Ya has calificado este producto!</Text>
                        <Text className="text-emerald-600 text-[10px] text-center mt-1 uppercase font-black">Tu opinión ayuda a la comunidad</Text>
                    </View>
                ) : contactStatus === 'finalized' ? (
                    <View className="bg-slate-50 rounded-[32px] p-6 border border-slate-100 mb-8 items-center">
                        <ShoppingBag size={32} color="#64748B" style={{ opacity: 0.6 }} />
                        <Text className="text-slate-700 font-bold text-center mt-3">No has calificado esta compra</Text>
                        <Text className="text-slate-500 text-[10px] text-center mt-1 uppercase font-black">Venta finalizada sin reseña</Text>
                    </View>
                ) : contactStatus === 'confirmed' ? (
                    <View style={styles.formCard}>
                        <Text className="text-slate-700 font-bold mb-4">¿Qué te pareció este producto?</Text>

                        <View className="flex-row mb-4">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <TouchableOpacity key={star} onPress={() => setRating(star)} className="mr-2">
                                    <Star
                                        size={28}
                                        fill={star <= rating ? "#FACC15" : "transparent"}
                                        color={star <= rating ? "#FACC15" : "#CBD5E1"}
                                    />
                                </TouchableOpacity>
                            ))}
                        </View>

                        <View className="bg-white rounded-2xl border border-slate-200 p-4 mb-4">
                            <TextInput
                                placeholder="Escribe un comentario corto..."
                                placeholderTextColor="#94A3B8"
                                multiline
                                value={comment}
                                onChangeText={setComment}
                                className="text-slate-700 font-medium min-h-[60px]"
                            />
                        </View>

                        <TouchableOpacity
                            onPress={handleSubmit}
                            disabled={submitting}
                            className={`flex-row items-center justify-center p-4 rounded-2xl ${submitting ? 'bg-brand-400' : 'bg-brand-600'}`}
                        >
                            {submitting ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <>
                                    <Send size={18} color="white" className="mr-2" />
                                    <Text className="text-white font-black ml-2">Publicar Reseña</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                ) : hasContacted ? (
                    <View className="bg-amber-50 rounded-[32px] p-6 border border-amber-100 mb-8 items-center">
                        <Store size={32} color="#D97706" style={{ opacity: 0.6 }} />
                        <Text className="text-amber-800 font-bold text-center mt-3">
                            Venta pendiente de confirmación.
                        </Text>
                        <Text className="text-amber-600 text-[10px] text-center mt-1 uppercase font-black">
                            Espera a que el vendedor confirme tu compra para calificar.
                        </Text>
                    </View>
                ) : (
                    <View style={styles.brandInfoCard}>
                        <MessageSquare size={32} color="#8b5cf6" style={{ opacity: 0.5 }} />
                        <Text className="text-brand-700 font-bold text-center mt-3">
                            Debes contactar al vecino por WhatsApp para poder calificarlo.
                        </Text>
                        <Text className="text-brand-500 text-[10px] text-center mt-1 uppercase font-black">
                            Esto asegura reseñas reales
                        </Text>
                    </View>
                )
            ) : (
                <View className="bg-slate-50 rounded-2xl p-4 mb-8">
                    <Text className="text-slate-500 font-bold text-center text-xs">Inicia sesión para calificar este producto.</Text>
                </View>
            )}

            {/* Lista de Reseñas */}
            {loading ? (
                <ActivityIndicator color="#8b5cf6" className="my-8" />
            ) : reviews.length > 0 ? (
                <View className="space-y-4">
                    {reviews.map((rev) => (
                        <View key={rev.id} className="bg-white p-5 rounded-3xl border border-slate-50 shadow-sm flex-row items-start mb-4">
                            <View className="w-10 h-10 bg-slate-100 rounded-2xl items-center justify-center mr-4">
                                <User size={18} color="#64748B" />
                            </View>
                            <View className="flex-1">
                                <View className="flex-row justify-between items-center mb-1">
                                    <Text className="text-slate-900 font-bold text-sm">{rev.profiles?.full_name || 'Vecino Anónimo'}</Text>
                                    <View className="flex-row items-center">
                                        <Star size={10} fill="#FACC15" color="#FACC15" />
                                        <Text className="text-slate-900 font-black text-[10px] ml-1">{rev.rating}.0</Text>
                                    </View>
                                </View>
                                <Text className="text-slate-500 text-xs mb-2 font-medium">
                                    {new Date(rev.created_at).toLocaleDateString()}
                                </Text>
                                <Text className="text-slate-600 text-sm leading-5 font-medium">{rev.comment}</Text>
                            </View>
                        </View>
                    ))}
                </View>
            ) : (
                <View className="items-center py-8">
                    <MessageSquare size={32} color="#E2E8F0" />
                    <Text className="text-slate-400 font-medium text-xs mt-3">Aún no hay reseñas. ¡Sé el primero!</Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    infoCard: {
        backgroundColor: '#f8fafc',
        borderRadius: 32,
        padding: 24,
        borderWidth: 1,
        borderColor: '#f1f5f9',
        marginBottom: 32,
        alignItems: 'center',
    },
    formCard: {
        backgroundColor: '#f8fafc',
        borderRadius: 32,
        padding: 24,
        borderWidth: 1,
        borderColor: '#f1f5f9',
        marginBottom: 32,
    },
    brandInfoCard: {
        backgroundColor: '#f5f3ff',
        borderRadius: 32,
        padding: 24,
        borderWidth: 1,
        borderColor: '#ede9fe',
        marginBottom: 32,
        alignItems: 'center',
    }
});
