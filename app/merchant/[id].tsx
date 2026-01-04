import ProductCard, { Product } from '@/components/ProductCard';
import ProductDetailModal from '@/components/ProductDetailModal';
import ProductGalleryModal from '@/components/ProductGalleryModal';
import SkeletonProductCard from '@/components/SkeletonProductCard';
import { supabase } from '@/lib/supabase';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { BadgeCheck, Star, Store, User, UserPlus, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Alert, Dimensions, Image, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const DEFAULT_IMAGES: Record<string, string> = {
    'comida': 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=500&auto=format&fit=crop',
    'almacén': 'https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=500&auto=format&fit=crop',
    'servicios': 'https://images.unsplash.com/photo-1581578731548-c64695cc6958?q=80&w=500&auto=format&fit=crop',
    'tecnología': 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=500&auto=format&fit=crop',
    'otros': 'https://images.unsplash.com/photo-1549931319-a545dcf3bc73?q=80&w=500&auto=format&fit=crop',
};

export default function MerchantProfileScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const [merchant, setMerchant] = useState<{ full_name: string, role: string, avatar_url?: string, is_verified?: boolean, profile_views?: number } | null>(null);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [isFollowing, setIsFollowing] = useState(false);
    const [loadingFollow, setLoadingFollow] = useState(false);
    const [showGallery, setShowGallery] = useState(false);
    const [galleryImages, setGalleryImages] = useState<string[]>([]);
    const [galleryInitialIndex, setGalleryInitialIndex] = useState(0);

    useEffect(() => {
        async function fetchMerchantData() {
            if (!id) return;
            try {
                // Fetch Merchant Profile
                const { data: profileData, error: profileError } = await supabase
                    .from('profiles')
                    .select('full_name, role, avatar_url, is_verified, profile_views')
                    .eq('id', id)
                    .single();

                if (profileError) throw profileError;
                setMerchant(profileData);

                // Increment profile views silently
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.user?.id && session.user.id !== id) {
                    supabase.rpc('increment_profile_views', { profile_id: id }).then(({ error }) => {
                        if (error) {
                            // Fallback to manual increment if RPC doesn't exist yet
                            supabase.from('profiles')
                                .update({ profile_views: (profileData.profile_views || 0) + 1 })
                                .eq('id', id)
                                .then(() => { });
                        }
                    });

                    // Check if following
                    const { data: followData } = await supabase
                        .from('merchant_follows')
                        .select('id')
                        .eq('follower_id', session.user.id)
                        .eq('merchant_id', id)
                        .maybeSingle();
                    setIsFollowing(!!followData);
                }

                // Fetch Merchant Products
                const { data: rawProducts, error: productsError } = await supabase
                    .from('products')
                    .select('*')
                    .eq('user_id', id)
                    .order('created_at', { ascending: false });

                if (productsError) throw productsError;

                // Fetch ratings for these products
                const productIds = (rawProducts || []).map(p => p.id);
                let ratingLookup: Record<string, { avg: number, count: number }> = {};

                if (productIds.length > 0) {
                    const { data: reviewsData } = await supabase
                        .from('product_reviews')
                        .select('product_id, rating')
                        .in('product_id', productIds);

                    if (reviewsData) {
                        const stats: Record<string, { sum: number, count: number }> = {};
                        reviewsData.forEach(r => {
                            if (!stats[r.product_id]) stats[r.product_id] = { sum: 0, count: 0 };
                            stats[r.product_id].sum += r.rating;
                            stats[r.product_id].count += 1;
                        });
                        Object.keys(stats).forEach(pid => {
                            ratingLookup[pid] = {
                                avg: stats[pid].sum / stats[pid].count,
                                count: stats[pid].count
                            };
                        });
                    }
                }

                const formattedProducts: Product[] = (rawProducts || []).map(p => {
                    const categoryKey = String(p.category || 'otros').toLowerCase();
                    const genericPlaceholder = 'https://images.unsplash.com/photo-1549931319-a545dcf3bc73?q=80&w=500&auto=format&fit=crop';
                    const imageUrl = (!p.image_url || p.image_url === genericPlaceholder)
                        ? (DEFAULT_IMAGES[categoryKey] || DEFAULT_IMAGES['otros'])
                        : p.image_url;

                    return {
                        id: String(p.id),
                        title: String(p.title || 'Sin título'),
                        price: Number(p.price || 0),
                        category: String(p.category || 'Otros'),
                        seller: profileData.full_name,
                        rating: ratingLookup[p.id]?.avg || 0,
                        review_count: ratingLookup[p.id]?.count || 0,
                        image: imageUrl,
                        location: p.location,
                        whatsapp_number: p.whatsapp_number,
                        description: p.description,
                        extra_services: p.extra_services,
                        user_id: p.user_id,
                        is_verified: !!profileData.is_verified,
                        image_urls: p.image_urls || [imageUrl],
                    };
                });
                setProducts(formattedProducts);
            } catch (error) {
                console.error('[PerfilComerciante] Error al obtener datos:', error);
                Alert.alert('Error', 'No pudimos cargar el perfil del comerciante');
            } finally {
                setLoading(false);
            }
        }
        async function fetchUserRole() {
            try {
                const { data: { session } = {} } = await supabase.auth.getSession();
                if (!session) {
                    setUserRole('client');
                    return;
                }
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const { data } = await supabase
                        .from('profiles')
                        .select('role')
                        .eq('id', user.id)
                        .single();
                    setUserRole(data?.role || 'client');
                }
            } catch (err) {
                console.log('[PerfilComerciante] Verificación de rol fallida (silenciosa)');
                setUserRole('client');
            }
        }

        fetchMerchantData();
        fetchUserRole();
    }, [id]);

    const handleWhatsApp = async (product: Product) => {
        if (userRole === 'vendor') {
            Alert.alert('Rol de Comerciante', 'Como comerciante, no puedes contactar para comprar productos.');
            return;
        }

        if (!product.whatsapp_number) {
            Alert.alert('Sin WhatsApp', 'Este vendedor no ha proporcionado un número de contacto.');
            return;
        }

        // Register contact
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user && user.id !== product.user_id) {
                const { data: existing } = await supabase
                    .from('product_contacts')
                    .select('id, status')
                    .eq('product_id', product.id)
                    .eq('user_id', user.id)
                    .single();

                if (existing) {
                    await supabase
                        .from('product_contacts')
                        .update({
                            status: 'pending',
                            created_at: new Date().toISOString()
                        })
                        .eq('id', existing.id);
                } else {
                    await supabase
                        .from('product_contacts')
                        .insert({
                            product_id: product.id,
                            user_id: user.id,
                            status: 'pending'
                        });
                }
            }
        } catch (err) {
            console.error('[PerfilComerciante] Error al registrar contacto:', err);
        }

        const cleanNumber = product.whatsapp_number.replace(/[^0-9]/g, '');
        const message = `Hola, vi tu producto "${product.title}" en MercadoVecino y me interesa.`;
        const encodedMessage = encodeURIComponent(message);
        const url = `https://wa.me/${cleanNumber}?text=${encodedMessage}`;

        Linking.canOpenURL(url).then(supported => {
            if (supported) {
                Linking.openURL(url);
            } else {
                Linking.openURL(`whatsapp://send?phone=${cleanNumber}&text=${encodedMessage}`).catch(() => {
                    Alert.alert('No se pudo abrir WhatsApp', 'Asegúrate de tener la aplicación instalada.');
                });
            }
        }).catch(() => {
            Alert.alert('Error', 'No pudimos abrir WhatsApp.');
        });
    };

    const handleInternalChat = async (product: Product) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                Alert.alert('Inicia Sesión', 'Debes estar conectado para chatear con el vendedor.');
                return;
            }

            if (user.id === product.user_id) {
                Alert.alert('¡Ups!', 'No puedes chatear contigo mismo.');
                return;
            }
            // 1. Check if room exists
            const { data: existingRoom } = await supabase
                .from('chat_rooms')
                .select('id')
                .contains('participants', [user.id, product.user_id])
                .eq('product_id', product.id)
                .maybeSingle();

            let roomId = existingRoom?.id;

            if (!roomId) {
                // 2. Create room
                const { data: newRoom, error: createError } = await supabase
                    .from('chat_rooms')
                    .insert({
                        product_id: product.id,
                        participants: [user.id, product.user_id]
                    })
                    .select()
                    .single();

                if (createError) throw createError;
                roomId = newRoom?.id;
            }

            if (roomId) {
                // 3. Send context message (every time)
                await supabase
                    .from('chat_messages')
                    .insert({
                        room_id: roomId,
                        sender_id: user.id,
                        content: `¡Hola! Me interesa tu producto: ${product.title}. ¿Está disponible?`
                    });

                setSelectedProduct(null);
                router.push({
                    pathname: '/chat/[id]',
                    params: { id: roomId }
                });
            }
        } catch (err) {
            console.error('[Chat] Error al inicializar conversación:', err);
            Alert.alert('Error', 'No pudimos iniciar el chat. Inténtalo de nuevo.');
        }
    };

    const toggleFollow = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) {
                Alert.alert('Inicia Sesión', 'Debes entrar a tu cuenta para seguir a este comerciante.');
                return;
            }

            setLoadingFollow(true);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

            if (isFollowing) {
                const { error } = await supabase
                    .from('merchant_follows')
                    .delete()
                    .eq('follower_id', session.user.id)
                    .eq('merchant_id', id);

                if (!error) setIsFollowing(false);
            } else {
                const { error } = await supabase
                    .from('merchant_follows')
                    .insert({ follower_id: session.user.id, merchant_id: id });

                if (!error) setIsFollowing(true);
                else if (error.code === '42P01') {
                    Alert.alert('Próximamente', 'Estamos activando el sistema de seguidores. ¡Vuelve pronto!');
                }
            }
        } catch (err) {
            console.error('[PerfilComerciante] Error al cambiar seguimiento:', err);
        } finally {
            setLoadingFollow(false);
        }
    };

    const openGallery = (images: string[], index: number = 0) => {
        setGalleryImages(images);
        setGalleryInitialIndex(index);
        setShowGallery(true);
    };

    return (
        <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#FAF9FF' }}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
                {/* Header / Cover Placeholder with Gradient */}
                <LinearGradient
                    colors={['#4F46E5', '#818CF8', '#C7D2FE']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{ height: 192, position: 'relative' }}
                >
                    <TouchableOpacity
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            router.back();
                        }}
                        style={styles.backBtn}
                    >
                        <X size={24} color="white" />
                    </TouchableOpacity>

                    {/* Decorative Pattern / Glassmorphism touch */}
                    <View style={{ position: 'absolute', right: -20, top: -20, width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(255,255,255,0.1)' }} />
                    <View style={{ position: 'absolute', left: 40, bottom: -30, width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.05)' }} />
                </LinearGradient>

                {/* Profile Info */}
                <View className="px-6 -mt-20">
                    <View className="items-center">
                        <View className="w-32 h-32 bg-white rounded-[40px] border-4 border-white shadow-2xl overflow-hidden items-center justify-center">
                            {loading ? (
                                <View className="w-full h-full bg-slate-100" />
                            ) : merchant?.avatar_url ? (
                                <Image source={{ uri: merchant.avatar_url }} className="w-full h-full" />
                            ) : merchant?.role === 'vendor' ? (
                                <Store size={64} color="#8b5cf6" />
                            ) : (
                                <User size={64} color="#8b5cf6" />
                            )}
                        </View>
                        {loading ? (
                            <View className="w-48 h-8 bg-slate-200 rounded-full mt-6" />
                        ) : (
                            <View className="flex-row items-center mt-6">
                                <Text className="text-3xl font-black text-slate-900 text-center">{merchant?.full_name}</Text>
                                {merchant?.is_verified && (
                                    <View className="ml-2">
                                        <BadgeCheck size={28} color="#8b5cf6" fill="#f5f3ff" />
                                    </View>
                                )}
                            </View>
                        )}
                        <View className="bg-brand-50 px-4 py-1.5 rounded-full mt-2 border border-brand-100">
                            <Text className="text-brand-600 font-black text-[10px] uppercase tracking-widest">
                                {loading ? 'Cargando...' : merchant?.role === 'vendor' ? 'Comerciante' : 'Vecino'}
                            </Text>
                        </View>

                        <View className="flex-row items-center mt-4 space-x-3">
                            <View className="bg-brand-50 px-3 py-1.5 rounded-2xl border border-brand-100 flex-row items-center">
                                <Star size={14} fill="#8b5cf6" color="#8b5cf6" />
                                <Text className="text-brand-600 font-black text-xs ml-2">
                                    {products.length > 0 && products.some(p => (p.review_count || 0) > 0)
                                        ? (products.reduce((acc, p) => acc + (p.rating || 0), 0) / products.filter(p => (p.review_count || 0) > 0).length || 0).toFixed(1)
                                        : '0.0'} Rating
                                </Text>
                            </View>

                            {/* Follow Button */}
                            {!loading && userRole === 'client' && (
                                <TouchableOpacity
                                    onPress={toggleFollow}
                                    disabled={loadingFollow}
                                    activeOpacity={0.8}
                                    style={[
                                        styles.followBtn,
                                        isFollowing && styles.followingBtn
                                    ]}
                                >
                                    {isFollowing ? (
                                        <BadgeCheck size={16} color="#8b5cf6" />
                                    ) : (
                                        <UserPlus size={16} color="white" />
                                    )}
                                    <Text style={[
                                        styles.followBtnText,
                                        isFollowing && styles.followingBtnText
                                    ]}>
                                        {isFollowing ? 'Siguiendo' : 'Seguir'}
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>

                    {/* Stats or Products Header */}
                    <View className="mt-12 mb-6">
                        <Text className="text-slate-900 font-black text-2xl px-2">Sus Publicaciones</Text>
                    </View>

                    {/* Products Grid */}
                    <View className="flex-row flex-wrap">
                        {loading ? (
                            Array.from({ length: 4 }).map((_, i) => (
                                <SkeletonProductCard key={i} />
                            ))
                        ) : products.length > 0 ? (
                            products.map((product, index) => (
                                <ProductCard
                                    key={product.id}
                                    product={product}
                                    onPress={(p) => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                        setSelectedProduct(p);
                                    }}
                                    index={index}
                                    userRole={userRole}
                                />
                            ))
                        ) : (
                            <View className="w-full py-20 items-center justify-center bg-white rounded-[40px] border border-slate-100">
                                <Text className="text-slate-400 font-bold">Este comerciante no tiene productos activos.</Text>
                            </View>
                        )}
                    </View>
                </View>
            </ScrollView>

            <ProductDetailModal
                visible={!!selectedProduct}
                product={selectedProduct}
                onClose={() => setSelectedProduct(null)}
                userRole={userRole}
                onInternalChat={handleInternalChat}
                isFavorite={false} // Favoritos se manejan diferente aquí
            />
            {/* Product Gallery Modal */}
            <ProductGalleryModal
                visible={showGallery}
                images={galleryImages}
                initialIndex={galleryInitialIndex}
                onClose={() => setShowGallery(false)}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    backBtn: {
        position: 'absolute',
        top: 24,
        left: 24,
        width: 40,
        height: 40,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.7)',
        justifyContent: 'flex-end',
    },
    modalCloseBtn: {
        position: 'absolute',
        top: 24,
        right: 24,
        width: 48,
        height: 48,
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
    },
    ratingBadge: {
        position: 'absolute',
        bottom: 24,
        left: 24,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'white',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 3,
    },
    whatsappBtn: {
        width: '100%',
        padding: 24,
        borderRadius: 32,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
        backgroundColor: '#25D366',
        shadowColor: '#25D366',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 15,
        elevation: 8,
    },
    whatsappBtnDisabled: {
        backgroundColor: '#e2e8f0',
        shadowOpacity: 0,
        elevation: 0,
    },
    whatsappBtnText: {
        color: 'white',
        fontWeight: '900',
        fontSize: 20,
        marginLeft: 12,
    },
    whatsappBtnTextDisabled: {
        color: '#94a3b8',
    },
    followBtn: {
        backgroundColor: '#4F46E5',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#4338CA',
    },
    followingBtn: {
        backgroundColor: '#F5F3FF',
        borderColor: '#DDD6FE',
    },
    followBtnText: {
        color: 'white',
        fontWeight: '900',
        fontSize: 14,
        marginLeft: 8,
    },
    followingBtnText: {
        color: '#7C3AED',
    }
});
