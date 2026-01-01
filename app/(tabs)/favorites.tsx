import ProductCard, { Product } from '@/components/ProductCard';
import ReviewSection from '@/components/ReviewSection';
import SkeletonProductCard from '@/components/SkeletonProductCard';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { BadgeCheck, Heart, MessageCircle, SearchX, Star, User, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Alert, Dimensions, Image, Linking, Modal, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const DEFAULT_IMAGES: Record<string, string> = {
    'comida': 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=500&auto=format&fit=crop',
    'almacén': 'https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=500&auto=format&fit=crop',
    'servicios': 'https://images.unsplash.com/photo-1581578731548-c64695cc6958?q=80&w=500&auto=format&fit=crop',
    'tecnología': 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=500&auto=format&fit=crop',
    'otros': 'https://images.unsplash.com/photo-1549931319-a545dcf3bc73?q=80&w=500&auto=format&fit=crop',
};

export default function FavoritesScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [userRole, setUserRole] = useState<string | null>(null);

    useEffect(() => {
        fetchFavorites();
        checkUserRole();
    }, []);

    const checkUserRole = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single();
            setUserRole(data?.role || 'client');
        }
    };

    const fetchFavorites = async () => {
        try {
            setLoading(true);
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) {
                setProducts([]);
                setLoading(false);
                return;
            }

            // 1. Get favorite IDs
            const { data: favs, error: favError } = await supabase
                .from('user_favorites')
                .select('product_id')
                .eq('user_id', session.user.id);

            if (favError) throw favError;
            if (!favs || favs.length === 0) {
                setProducts([]);
                setLoading(false);
                return;
            }

            const productIds = favs.map(f => f.product_id);

            // 2. Fetch products
            const { data: rawProducts, error: productsError } = await supabase
                .from('products')
                .select('*')
                .in('id', productIds);

            if (productsError) throw productsError;

            // 3. Manual Join (Names & Ratings) - reusing logic from index.tsx
            const sellerIds = [...new Set((rawProducts || []).map(p => p.user_id).filter(id => !!id))];
            let sellerProfiles: Record<string, { name: string, role: string, is_verified: boolean }> = {};
            if (sellerIds.length > 0) {
                const { data: profilesData } = await supabase
                    .from('profiles')
                    .select('id, full_name, role, is_verified')
                    .in('id', sellerIds);
                profilesData?.forEach(prof => {
                    sellerProfiles[prof.id] = {
                        name: prof.full_name,
                        role: prof.role || 'client',
                        is_verified: !!prof.is_verified
                    };
                });
            }

            const { data: reviewsData } = await supabase.from('product_reviews').select('product_id, rating');
            const ratingLookup: Record<string, { avg: number, count: number }> = {};
            if (reviewsData) {
                const stats: Record<string, { sum: number, count: number }> = {};
                reviewsData.forEach(r => {
                    if (!stats[r.product_id]) stats[r.product_id] = { sum: 0, count: 0 };
                    stats[r.product_id].sum += r.rating;
                    stats[r.product_id].count += 1;
                });
                Object.keys(stats).forEach(pid => {
                    ratingLookup[pid] = { avg: stats[pid].sum / stats[pid].count, count: stats[pid].count };
                });
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
                    seller: sellerProfiles[p.user_id]?.name || 'Vecino',
                    is_verified: sellerProfiles[p.user_id]?.is_verified || false,
                    rating: ratingLookup[p.id]?.avg || 0,
                    review_count: ratingLookup[p.id]?.count || 0,
                    image: imageUrl,
                    location: p.location,
                    whatsapp_number: p.whatsapp_number,
                    description: p.description,
                    extra_services: p.extra_services,
                    user_id: p.user_id,
                    image_urls: p.image_urls || [imageUrl],
                };
            });

            setProducts(formattedProducts);
        } catch (err) {
            console.error('Error fetching favorites:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleWhatsApp = async (product: Product) => {
        if (!product.whatsapp_number) return;
        const cleanNumber = product.whatsapp_number.replace(/[^0-9]/g, '');
        const message = `Hola, vi tu producto "${product.title}" en mis favoritos de MercadoVecino.`;
        const url = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;
        Linking.openURL(url);
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
                .single();

            if (existingRoom) {
                setSelectedProduct(null);
                router.push({
                    pathname: '/chat/[id]',
                    params: { id: existingRoom.id }
                });
                return;
            }

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

            if (newRoom) {
                setSelectedProduct(null);
                router.push({
                    pathname: '/chat/[id]',
                    params: { id: newRoom.id }
                });
            }
        } catch (err) {
            console.error('[Chat] Error initializing conversation:', err);
            Alert.alert('Error', 'No pudimos iniciar el chat. Inténtalo de nuevo.');
        }
    };

    return (
        <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#FAF9FF' }}>
            <View style={styles.header}>
                <Text style={styles.title}>Mis Favoritos</Text>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ padding: 24, paddingBottom: insets.bottom + 40 }}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchFavorites(); }} tintColor="#8b5cf6" />
                }
            >
                <View style={styles.introCard}>
                    <View style={styles.iconContainer}>
                        <Heart size={32} color="#FF0000" fill="#FF0000" />
                    </View>
                    <Text style={styles.introTitle}>Tu Colección Privada</Text>
                    <Text style={styles.introDesc}>Aquí guardamos las cosas que te gustaron para que no las pierdas de vista.</Text>
                </View>

                {loading ? (
                    <View className="flex-row flex-wrap">
                        {Array.from({ length: 4 }).map((_, i) => <SkeletonProductCard key={i} />)}
                    </View>
                ) : products.length > 0 ? (
                    <View className="flex-row flex-wrap">
                        {products.map(product => (
                            <ProductCard
                                key={product.id}
                                product={product}
                                onPress={(p) => setSelectedProduct(p)}
                                index={0}
                                userRole={userRole || 'client'} // Ensure userRole defaults gracefully
                            />
                        ))}
                    </View>
                ) : (
                    <View style={styles.emptyState}>
                        <SearchX size={64} color="#E2E8F0" />
                        <Text style={styles.emptyTitle}>Aún no tienes favoritos</Text>
                        <Text style={styles.emptyDesc}>Explora el mercado y toca el corazón en los productos que te encanten.</Text>
                        <TouchableOpacity
                            onPress={() => router.push('/(tabs)')}
                            style={styles.exploreBtn}
                        >
                            <Text style={styles.exploreBtnText}>Explorar Bazar</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>

            {/* Product Detail Modal */}
            <Modal visible={!!selectedProduct} animationType="slide" transparent={true}>
                <View style={styles.modalOverlay}>
                    <View className="bg-white h-[90%] rounded-t-[50px] overflow-hidden">
                        {selectedProduct && (
                            <ScrollView showsVerticalScrollIndicator={false}>
                                <View className="relative">
                                    {/* Carousel de Imágenes */}
                                    {selectedProduct.image_urls && selectedProduct.image_urls.length > 1 ? (
                                        <View>
                                            <ScrollView
                                                horizontal
                                                pagingEnabled
                                                showsHorizontalScrollIndicator={false}
                                                style={{ width: width - 32, height: width - 32 }}
                                            >
                                                {selectedProduct.image_urls.map((url, index) => (
                                                    <Image
                                                        key={index}
                                                        source={{ uri: url }}
                                                        style={{ width: width - 32, height: width - 32 }}
                                                        className="rounded-[40px]"
                                                        resizeMode="cover"
                                                    />
                                                ))}
                                            </ScrollView>

                                            <View className="absolute bottom-6 w-full flex-row justify-center space-x-2">
                                                {selectedProduct.image_urls.map((_, index) => (
                                                    <View
                                                        key={index}
                                                        style={{
                                                            width: 8,
                                                            height: 8,
                                                            borderRadius: 4,
                                                            backgroundColor: 'white',
                                                            opacity: 0.8,
                                                            shadowColor: '#000',
                                                            shadowOffset: { width: 0, height: 2 },
                                                            shadowOpacity: 0.2,
                                                            shadowRadius: 4,
                                                        }}
                                                    />
                                                ))}
                                            </View>
                                        </View>
                                    ) : (
                                        <Image
                                            source={{ uri: selectedProduct.image }}
                                            className="w-full aspect-square rounded-[40px]"
                                            resizeMode="cover"
                                        />
                                    )}
                                    <TouchableOpacity onPress={() => setSelectedProduct(null)} style={styles.modalCloseBtn}>
                                        <X size={24} color="black" />
                                    </TouchableOpacity>
                                    <View style={styles.ratingBadge}>
                                        <Star size={14} fill="#FACC15" color="#FACC15" />
                                        <Text className="text-slate-800 font-black ml-2 text-sm">{selectedProduct.rating.toFixed(1)}</Text>
                                        <Text className="text-slate-400 font-bold ml-1 text-xs">({selectedProduct.review_count})</Text>
                                    </View>

                                    {(userRole === 'client' || !userRole) && (
                                        <TouchableOpacity
                                            style={[styles.modalCloseBtn, { right: 84 }]}
                                            onPress={() => {
                                                // Simplified feedback to show heart is working visually
                                                Alert.alert('Favorito', 'Producto guardado en tu colección.');
                                            }}
                                        >
                                            <Heart size={24} color="#FF0000" fill="#FF0000" />
                                        </TouchableOpacity>
                                    )}
                                </View>
                                <View className="p-8">
                                    <Text className="text-brand-600 font-black text-xs uppercase tracking-widest mb-1">{selectedProduct.category}</Text>
                                    <Text className="text-slate-900 font-black text-3xl mb-4">{selectedProduct.title}</Text>
                                    <Text className="text-2xl font-black text-brand-600 mb-6">${selectedProduct.price.toLocaleString()}</Text>

                                    <View className="mb-8">
                                        <Text className="text-slate-400 font-black text-[10px] uppercase tracking-widest mb-2">Descripción</Text>
                                        <Text className="text-slate-600 text-lg leading-6">{selectedProduct.description || 'Sin descripción.'}</Text>
                                    </View>

                                    <ReviewSection productId={selectedProduct.id} />

                                    <View className="flex-row items-center justify-center py-4 mb-4">
                                        <View className="w-10 h-10 bg-slate-100 rounded-2xl items-center justify-center mr-3">
                                            <User size={18} color="#64748B" />
                                        </View>
                                        <TouchableOpacity
                                            onPress={() => {
                                                if (selectedProduct.user_id) {
                                                    setSelectedProduct(null);
                                                    router.push({
                                                        pathname: '/merchant/[id]',
                                                        params: { id: selectedProduct.user_id }
                                                    });
                                                }
                                            }}
                                        >
                                            <Text className="text-slate-400 font-bold text-[10px] uppercase">Vendedor</Text>
                                            <View className="flex-row items-center">
                                                <Text className="text-slate-800 font-black text-sm mr-1.5">{selectedProduct.seller}</Text>
                                                {selectedProduct.is_verified && (
                                                    <BadgeCheck size={16} color="#8b5cf6" fill="#f5f3ff" />
                                                )}
                                            </View>
                                        </TouchableOpacity>
                                    </View>

                                    <View className="space-y-3 mb-8">
                                        <TouchableOpacity
                                            onPress={() => handleInternalChat(selectedProduct)}
                                            activeOpacity={0.8}
                                            style={[styles.whatsappBtn, { backgroundColor: '#4F46E5', shadowColor: '#4F46E5', marginBottom: 0 }]}
                                        >
                                            <MessageCircle size={22} color="white" style={{ marginRight: 10 }} />
                                            <Text style={styles.whatsappBtnText}>Chat Vecinal (Privado)</Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            onPress={() => handleWhatsApp(selectedProduct)}
                                            activeOpacity={0.8}
                                            style={[
                                                styles.whatsappBtn,
                                                {
                                                    backgroundColor: 'transparent',
                                                    borderColor: '#25D366',
                                                    borderWidth: 2,
                                                    shadowOpacity: 0,
                                                    elevation: 0,
                                                    marginTop: 12
                                                }
                                            ]}
                                        >
                                            <MessageCircle size={22} color="#25D366" style={{ marginRight: 10 }} />
                                            <Text style={[styles.whatsappBtnText, { color: '#25D366' }]}>WhatsApp Directo</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </ScrollView>
                        )}
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    title: {
        fontSize: 18,
        fontWeight: '900',
        color: '#1E293B',
    },
    introCard: {
        backgroundColor: 'white',
        borderRadius: 32,
        padding: 32,
        alignItems: 'center',
        marginBottom: 32,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    iconContainer: {
        width: 64,
        height: 64,
        backgroundColor: '#FFF1F2',
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    introTitle: {
        fontSize: 20,
        fontWeight: '900',
        color: '#0F172A',
        marginBottom: 8,
    },
    introDesc: {
        fontSize: 14,
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 20,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '900',
        color: '#475569',
        marginTop: 24,
    },
    emptyDesc: {
        fontSize: 14,
        color: '#94A3B8',
        textAlign: 'center',
        marginTop: 8,
        paddingHorizontal: 40,
    },
    exploreBtn: {
        marginTop: 32,
        backgroundColor: '#8b5cf6',
        paddingHorizontal: 32,
        paddingVertical: 16,
        borderRadius: 20,
    },
    exploreBtnText: {
        color: 'white',
        fontWeight: '900',
        fontSize: 16,
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
    },
    ratingBadge: {
        position: 'absolute',
        bottom: 24,
        left: 24,
        backgroundColor: 'white',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
    },
    whatsappBtn: {
        backgroundColor: '#25D366',
        padding: 20,
        borderRadius: 24,
        alignItems: 'center',
        marginTop: 24,
    },
    whatsappBtnText: {
        color: 'white',
        fontWeight: '900',
        fontSize: 16,
    }
});
