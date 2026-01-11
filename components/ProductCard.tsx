import { BadgeCheck, Gift, Heart, MapPin, ShoppingBag, Sparkles, Star, User } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring
} from 'react-native-reanimated';
import { supabase } from '../lib/supabase';
import { translateError } from '../lib/translations';

export interface Product {
  id: string;
  title: string;
  price: number;
  image: string;
  category: string;
  seller: string;
  rating: number;
  review_count?: number;
  location?: string;
  whatsapp_number?: string;
  description?: string;
  extra_services?: { name: string, price: string }[];
  user_id?: string;
  is_verified?: boolean;
  is_featured?: boolean;
  image_urls?: string[];
  allows_pickup?: boolean;
  allows_delivery?: boolean;
  delivery_fee?: number;
}

interface ProductCardProps {
  product: Product;
  onPress: (product: Product) => void;
  index: number;
  userRole?: string | null;
  themeColor?: string;
  eventBadge?: string | null;
}

export default function ProductCard({ product, onPress, index, userRole, themeColor = '#8b5cf6', eventBadge }: ProductCardProps) {
  const [isFavorite, setIsFavorite] = useState(false);
  const [loadingFav, setLoadingFav] = useState(false);

  // Animation values
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }]
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.97, { damping: 15, stiffness: 400 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
  };

  useEffect(() => {
    checkIfFavorite();
  }, [product.id]);

  const checkIfFavorite = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data } = await supabase
        .from('user_favorites')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('product_id', product.id)
        .maybeSingle();

      if (data) setIsFavorite(true);
    } catch (err) {
      console.log('[ProductCard] Error al verificar favorito:', err);
    }
  };

  const toggleFavorite = async () => {
    try {
      setLoadingFav(true);
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        Alert.alert('Inicia Sesión', 'Debes entrar a tu cuenta para guardar favoritos.');
        setLoadingFav(false);
        return;
      }

      const userId = session.user.id;
      const productId = product.id;

      if (isFavorite) {
        // Optimistic UI update
        setIsFavorite(false);
        const { error } = await supabase
          .from('user_favorites')
          .delete()
          .eq('user_id', userId)
          .eq('product_id', productId);

        if (error) {
          console.error('[Favoritos] Error al eliminar:', error);
          setIsFavorite(true); // Rollback
        }
      } else {
        // Optimistic UI update
        setIsFavorite(true);
        const { error } = await supabase
          .from('user_favorites')
          .insert({ user_id: userId, product_id: productId });

        if (error) {
          console.error('[Favoritos] Error al insertar:', error);
          setIsFavorite(false); // Rollback
          if (error.code === '42P01') {
            Alert.alert('Error de Configuración', 'La tabla de favoritos no existe en la base de datos.');
          }
        }
      }
    } catch (err: any) {
      console.error('[Favoritos] Error al cambiar estado:', err);
      Alert.alert('Error', translateError(err.message));
    } finally {
      setLoadingFav(false);
    }
  };

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 50).springify().damping(15).stiffness(200)}
      style={styles.container}
    >
      <Animated.View style={[styles.card, animatedStyle]}>
        <Pressable
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onPress={() => onPress(product)}
        >
          <View className="relative">
            <Image
              source={{ uri: product.image }}
              className="w-full aspect-[4/5]"
              resizeMode="cover"
            />
            <View style={styles.ratingBadge}>
              <Star size={12} fill="#FACC15" color="#FACC15" />
              <Text className="text-[11px] font-black text-slate-800 ml-1">{product.rating.toFixed(1)}</Text>
              {product.review_count !== undefined && (
                <Text className="text-[9px] font-bold text-slate-400 ml-1">({product.review_count})</Text>
              )}
            </View>
            {(userRole === 'client' || !userRole) && (
              <TouchableOpacity
                style={styles.favoriteBtn}
                onPress={toggleFavorite}
                disabled={loadingFav}
                activeOpacity={0.7}
              >
                <Heart
                  size={18}
                  fill={isFavorite ? '#FF0000' : 'transparent'}
                  color={isFavorite ? '#FF0000' : 'white'}
                />
              </TouchableOpacity>
            )}

            {eventBadge && (
              <View
                style={{ backgroundColor: themeColor, position: 'absolute', top: 12, left: 12 }}
                className="px-3 py-1.5 rounded-xl flex-row items-center border border-white/20 shadow-sm"
              >
                <Gift size={10} color="white" />
                <Text className="text-white text-[9px] font-black uppercase ml-1.5 tracking-wider">{eventBadge}</Text>
              </View>
            )}
          </View>

          <View className="p-4">
            <Text className="text-brand-500 text-[10px] font-black uppercase tracking-[2px] mb-1.5">
              {product.category || 'Otros'}
            </Text>
            <Text className="text-slate-900 font-extrabold text-sm mb-3 leading-tight" numberOfLines={1}>
              {product.title || 'Sin título'}
            </Text>

            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-brand-600 font-black text-lg">
                ${(Number(product.price) || 0).toLocaleString()}
              </Text>
              <View className="w-9 h-9 bg-brand-50 rounded-2xl items-center justify-center border border-brand-100">
                <ShoppingBag size={16} color="#8b5cf6" />
              </View>
            </View>

            {(product.rating >= 4.5 && (product.review_count || 0) > 0) && (
              <View className="flex-row items-center mb-3 bg-amber-50 self-start px-2 py-1 rounded-lg border border-amber-100">
                <Sparkles size={10} color="#D97706" />
                <Text className="text-amber-700 text-[8px] font-black uppercase ml-1 tracking-wider">Altamente Recomendado</Text>
              </View>
            )}

            <View className="flex-row items-center pt-3 border-t border-slate-50">
              <View className="w-6 h-6 bg-brand-100 rounded-xl items-center justify-center mr-2">
                <User size={12} color="#7c3aed" />
              </View>
              <View className="flex-1">
                <View className="flex-row items-center">
                  <Text className="text-slate-900 font-extrabold text-[11px] mr-1" numberOfLines={1}>
                    {product.seller || 'Vecino'}
                  </Text>
                  {product.is_verified && (
                    <View className="ml-1">
                      <BadgeCheck size={16} color="#8b5cf6" fill="#f5f3ff" />
                    </View>
                  )}
                  {product.is_featured && (
                    <View className="bg-brand-500 p-0.5 rounded-full items-center justify-center border border-brand-600 shadow-sm" style={{ width: 14, height: 14 }}>
                      <Star size={8} color="white" fill="white" />
                    </View>
                  )}
                </View>
                {product.location && (
                  <View className="flex-row items-center mt-0.5">
                    <MapPin size={8} color="#94A3B8" />
                    <Text className="text-slate-400 text-[8px] ml-0.5 font-medium" numberOfLines={1}>
                      {product.location}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '47%',
    marginHorizontal: '1.5%',
    marginBottom: 24,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 32,
    borderWidth: 1,
    borderColor: '#f4f4f5',
    overflow: 'hidden',
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 4,
  },
  ratingBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  favoriteBtn: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  }
});
