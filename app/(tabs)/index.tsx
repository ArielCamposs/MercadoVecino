import ProactiveReviewModal from '@/components/ProactiveReviewModal';
import ProductCard, { Product } from '@/components/ProductCard';
import ProductDetailModal from '@/components/ProductDetailModal';
import SkeletonProductCard from '@/components/SkeletonProductCard';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  AlertCircle,
  BadgeCheck,
  Bell,
  ChevronRight,
  Clock,
  Flag,
  Gift,
  LayoutGrid,
  Megaphone,
  PartyPopper,
  Search,
  SearchX,
  ShoppingBasket,
  SlidersHorizontal,
  Smartphone,
  Snowflake,
  Sparkles,
  Star,
  User,
  Utensils,
  Wrench,
  X
} from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Dimensions,
  Easing,
  Image,
  Linking,
  Modal,
  RefreshControl,
  Animated as RNAnimated,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import Animated, {
  FadeInDown,
  Layout
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { supabase } from '@/lib/supabase';

const { width } = Dimensions.get('window');

const CATEGORIES = [
  { id: 'all', name: 'Todos', icon: LayoutGrid },
  { id: 'comida', name: 'Comida', icon: Utensils },
  { id: 'almacen', name: 'Almacén', icon: ShoppingBasket },
  { id: 'servicios', name: 'Servicios', icon: Wrench },
  { id: 'tecnologia', name: 'Tecnología', icon: Smartphone },
  { id: 'otros', name: 'Otros', icon: Sparkles },
];

const DEFAULT_IMAGES: Record<string, string> = {
  'comida': 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=500&auto=format&fit=crop',
  'almacén': 'https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=500&auto=format&fit=crop',
  'almacen': 'https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=500&auto=format&fit=crop',
  'servicios': 'https://images.unsplash.com/photo-1581578731548-c64695cc6958?q=80&w=500&auto=format&fit=crop',
  'tecnología': 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=500&auto=format&fit=crop',
  'tecnologia': 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=500&auto=format&fit=crop',
  'otros': 'https://images.unsplash.com/photo-1549931319-a545dcf3bc73?q=80&w=500&auto=format&fit=crop',
};

const FestiveAtmosphere = ({ event, themeColor }: { event: any, themeColor: string }) => {
  if (!event) return null;
  const isChristmas = event.name.toLowerCase().includes('navidad') || event.name.toLowerCase().includes('nochebuena');
  const isSummer = event.name.toLowerCase().includes('verano') || event.name.toLowerCase().includes('vacaciones');
  const isCyber = event.name.toLowerCase().includes('cyber') || themeColor === '#8b5cf6';

  const DecorationIcon = isChristmas ? Snowflake : (isSummer ? Sparkles : (isCyber ? PartyPopper : Gift));

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 200, overflow: 'hidden' }} pointerEvents="none">
      <Animated.View entering={FadeInDown.delay(100).springify()} style={{ position: 'absolute', top: 20, right: -10, opacity: 0.1 }}>
        <DecorationIcon size={120} color={themeColor} />
      </Animated.View>
      <Animated.View entering={FadeInDown.delay(300).springify()} style={{ position: 'absolute', top: 120, left: -20, opacity: 0.05 }}>
        <DecorationIcon size={80} color={themeColor} />
      </Animated.View>
      {isChristmas && (
        <View className="absolute top-0 left-0 right-0 flex-row justify-around opacity-20">
          <Snowflake size={12} color={themeColor} />
          <Snowflake size={16} color={themeColor} />
          <Snowflake size={14} color={themeColor} />
          <Snowflake size={18} color={themeColor} />
        </View>
      )}
    </View>
  );
};

const EventCountdown = ({ endDate, themeColor }: { endDate: string, themeColor: string }) => {
  const [timeLeft, setTimeLeft] = useState<{ d: number, h: number, m: number, s: number } | null>(null);

  useEffect(() => {
    const calculateTime = () => {
      const difference = +new Date(endDate) - +new Date();
      if (difference > 0) {
        setTimeLeft({
          d: Math.floor(difference / (1000 * 60 * 60 * 24)),
          h: Math.floor((difference / (1000 * 60 * 60)) % 24),
          m: Math.floor((difference / 1000 / 60) % 60),
          s: Math.floor((difference / 1000) % 60),
        });
      } else {
        setTimeLeft(null);
      }
    };

    calculateTime();
    const timer = setInterval(calculateTime, 1000);
    return () => clearInterval(timer);
  }, [endDate]);

  if (!timeLeft) return null;

  return (
    <Animated.View
      entering={FadeInDown.delay(200).springify()}
      className="mx-6 mt-4 p-4 rounded-[32px] border flex-row items-center justify-between shadow-sm"
      style={{ backgroundColor: `${themeColor}15`, borderColor: `${themeColor}30` }}
    >
      <View className="flex-row items-center">
        <View style={{ backgroundColor: themeColor }} className="w-8 h-8 rounded-full items-center justify-center mr-3">
          <Clock size={16} color="white" />
        </View>
        <Text style={{ color: themeColor }} className="font-black text-[10px] uppercase tracking-widest">Termina en:</Text>
      </View>

      <View className="flex-row items-center gap-2">
        {[
          { label: 'd', val: timeLeft.d },
          { label: 'h', val: timeLeft.h },
          { label: 'm', val: timeLeft.m },
          { label: 's', val: timeLeft.s }
        ].map((unit, i) => (
          <View key={unit.label} className="flex-row items-center">
            <View className="items-center">
              <Text style={{ color: themeColor }} className="font-black text-sm">
                {String(unit.val).padStart(2, '0')}
              </Text>
              <Text style={{ color: themeColor, opacity: 0.5 }} className="text-[7px] font-bold uppercase">{unit.label}</Text>
            </View>
            {i < 3 && <Text style={{ color: themeColor, opacity: 0.3 }} className="mx-1 font-black text-sm">:</Text>}
          </View>
        ))}
      </View>
    </Animated.View>
  );
};

export default function TabOneScreen() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportingProduct, setReportingProduct] = useState<Product | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [pendingSalesCount, setPendingSalesCount] = useState(0);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [dbCategories, setDbCategories] = useState(CATEGORIES);
  const [personalAlert, setPersonalAlert] = useState<any | null>(null);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [banners, setBanners] = useState<any[]>([]);
  const [currentEvent, setCurrentEvent] = useState<any | null>(null);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const slideAnim = React.useRef(new RNAnimated.Value(-1000)).current;
  const bannerScrollRef = React.useRef<ScrollView>(null);

  useEffect(() => {
    if (showNotificationsModal) {
      RNAnimated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 8
      }).start();
    } else {
      RNAnimated.timing(slideAnim, {
        toValue: -1000,
        duration: 300,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true
      }).start();
    }
  }, [showNotificationsModal]);

  const fetchProducts = async () => {
    try {
      // 1. Fetch products simply (attempting to filter by status if it exists)
      let { data: rawProducts, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

      // Fallback: If status column doesn't exist (Error 42703), fetch all products
      if (productsError && productsError.code === '42703') {
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('products')
          .select('*')
          .order('created_at', { ascending: false });

        rawProducts = fallbackData;
        productsError = fallbackError;
      }

      if (productsError) throw productsError;

      // 2. Extract unique user IDs for merchants
      const sellerIds = [...new Set((rawProducts || []).map(p => p.user_id).filter(id => !!id))];

      // 3. Manual Join: Fetch profiles for these IDs
      let sellerProfiles: Record<string, { name: string, role: string, is_verified: boolean }> = {};
      if (sellerIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name, role, is_verified')
          .in('id', sellerIds);

        if (profilesData) {
          profilesData.forEach(prof => {
            sellerProfiles[prof.id] = {
              name: prof.full_name,
              role: prof.role || 'client',
              is_verified: !!prof.is_verified
            };
          });
        }
      }

      // 4. Fetch Rating Averages
      let ratingLookup: Record<string, { avg: number, count: number }> = {};
      const { data: reviewsData } = await supabase
        .from('product_reviews')
        .select('product_id, rating');

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

      // 5. Format products with looked-up names and real ratings
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
          is_featured: !!p.is_featured,
          image_urls: p.image_urls || [imageUrl],
          allows_pickup: p.allows_pickup ?? true,
          allows_delivery: p.allows_delivery ?? false,
          delivery_fee: p.delivery_fee || 0,
        };
      });

      setProducts(formattedProducts);
      const featured = formattedProducts.filter(p => p.is_featured);
      console.log('[Inicio] Total de productos:', formattedProducts.length);
      console.log('[Inicio] Productos destacados:', featured.length);
      if (formattedProducts.length > 0) {
        console.log('[Inicio] Estado destacado de primer producto:', formattedProducts[0].title, formattedProducts[0].is_featured);
      }
      setFeaturedProducts(featured);
    } catch (error: any) {
      console.error('[Inicio] Error al cargar productos:', error);
      if (error.message !== 'Unexpected token') {
        Alert.alert('Error de Conexión', 'No pudimos sincronizar los productos.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchActiveEvent = async () => {
    try {
      const { data, error } = await supabase
        .from('special_events')
        .select('*')
        .eq('is_active', true)
        .lte('start_date', new Date().toISOString())
        .gte('end_date', new Date().toISOString())
        .single();

      if (!error && data) {
        setCurrentEvent(data);
      } else {
        setCurrentEvent(null);
      }
    } catch (err) {
      console.log('[Eventos] Error:', err);
    }
  };

  const fetchBanners = async () => {
    try {
      const { data, error } = await supabase
        .from('promotional_banners')
        .select('*')
        .eq('is_active', true)
        .order('order_index', { ascending: true });
      if (error) throw error;
      setBanners(data || []);
    } catch (err) {
      console.error('[Banners] Error al cargar:', err);
    }
  };

  const fetchAnnouncements = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      let query = supabase
        .from('system_announcements')
        .select('*')
        .eq('is_active', true);

      if (user) {
        query = query.or(`recipient_id.is.null,recipient_id.eq.${user.id}`);
      } else {
        query = query.is('recipient_id', null);
      }

      const { data } = await query.order('created_at', { ascending: false });

      if (data) {
        // Separate Global vs Personal
        const globals = data.filter(a => a.recipient_id === null);
        const personals = data.filter(a => a.recipient_id !== null && !a.is_read);

        setAnnouncements(globals);

        // If there's an unread personal alert, show it in modal
        if (personals.length > 0) {
          setPersonalAlert(personals[0]);
          setShowAlertModal(true);
        }
      }
    } catch (err) {
      console.error('[Inicio] Error al cargar anuncios:', err);
    }
  };

  const handleCloseAlertModal = async () => {
    if (personalAlert) {
      try {
        // Mark as read in DB
        await supabase
          .from('system_announcements')
          .update({ is_read: true })
          .eq('id', personalAlert.id);
      } catch (err) {
        console.error('[Notificaciones] Error al marcar como leída:', err);
      }
    }
    setShowAlertModal(false);
    setPersonalAlert(null);
  };

  const fetchNotifications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get all products of this vendor to check for pending sales
      const { data: myProducts } = await supabase
        .from('products')
        .select('id')
        .eq('user_id', user.id);

      if (myProducts && myProducts.length > 0) {
        const productIds = myProducts.map(p => p.id);
        const { data: contacts, count } = await supabase
          .from('product_contacts')
          .select('*, profiles!user_id(full_name), products!product_id(title, image_url)')
          .in('product_id', productIds)
          .eq('status', 'pending')
          .order('created_at', { ascending: false });

        setPendingSalesCount(count || 0);
        setNotifications(contacts || []);
      } else {
        setPendingSalesCount(0);
        setNotifications([]);
      }
    } catch (err) {
      console.error('[Notificaciones] Error al cargar:', err);
    }
  };

  const fetchUserRole = async () => {
    try {
      // Check session first to avoid non-session errors
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setUserRole('client');
        return;
      }

      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) {
        // Silently ignore session missing errors (race condition on logout)
        if (authError.message?.includes('session missing')) {
          setUserRole('client');
          return;
        }
        throw authError;
      }

      if (user) {
        const { data, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (profileError) throw profileError;

        if (data && data.role) {
          const role = data.role.toLowerCase().trim();
          setUserRole(role);
          if (role === 'vendor') {
            await fetchNotifications();
          }
        } else {
          setUserRole('client');
        }
      }
    } catch (err: any) {
      // Silent log for debug but no crash/alert for user
      console.log('[Home Screen] Role hint:', err.message);
      setUserRole('client');
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchUserRole();
    fetchAnnouncements();
    fetchCategories();
    fetchBanners();
    fetchActiveEvent();

    // Realtime subscription for announcements and banners
    const channel = supabase
      .channel('home-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'system_announcements' }, () => {
        fetchAnnouncements();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'promotional_banners' }, () => {
        fetchBanners();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'special_events' }, () => {
        fetchActiveEvent();
      })
      .subscribe();

    // Auto-scroll for banners
    const bannerTimer = setInterval(() => {
      if (banners.length > 1) {
        const nextIndex = (currentBannerIndex + 1) % banners.length;
        bannerScrollRef.current?.scrollTo({
          x: nextIndex * (Dimensions.get('window').width - 48),
          animated: true
        });
        setCurrentBannerIndex(nextIndex);
      }
    }, 5000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(bannerTimer);
    };
  }, [banners.length]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchProducts();
    fetchUserRole();
    fetchAnnouncements();
    fetchCategories();
    fetchBanners();
    fetchActiveEvent();
  }, []);

  // Sync notifications when screen gains focus
  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
    }, [])
  );

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase.from('app_config').select('value').eq('key', 'product_categories').single();
      if (!error && data?.value) {
        // Map string array to Icon objects
        const mapped = [
          { id: 'all', name: 'Todos', icon: LayoutGrid },
          ...data.value.map((name: string) => {
            const lower = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            let Icon = Sparkles;
            if (lower.includes('comida')) Icon = Utensils;
            if (lower.includes('almacen')) Icon = ShoppingBasket;
            if (lower.includes('serv')) Icon = Wrench;
            if (lower.includes('tec')) Icon = Smartphone;
            return { id: lower, name, icon: Icon };
          })
        ];
        setDbCategories(mapped);
      }
    } catch (err) {
      console.log('[Categorías] Error al cargar:', err);
    }
  };

  const handleReport = (product: Product) => {
    setReportingProduct(product);
    setShowReportModal(true);
  };

  const submitReport = async () => {
    if (!reportReason.trim() || !reportingProduct) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('product_reports').insert({
        product_id: reportingProduct.id,
        reporter_id: user?.id,
        reason: reportReason.trim(),
        status: 'pending'
      });

      if (error) {
        console.log('[Reporte] Error al guardar (posible restricción de tabla):', error.message);
      }
      setShowReportModal(false);
      setReportReason('');
      setReportingProduct(null);
      Alert.alert('¡Gracias!', 'Tu reporte ha sido enviado y será revisado por un administrador.');
    } catch (err) {
      console.error('[Reporte] Error:', err);
    }
  };

  const handleProductPress = (product: Product) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedProduct(product);
    // Incrementar contador de vistas de forma silenciosa
    supabase.rpc('increment_product_view', { product_id: product.id }).then(({ error }) => {
      if (error) console.log('[Contador] Error al incrementar vistas:', error.message);
    });
  };

  const handleWhatsApp = async (product: Product) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (userRole === 'vendor') {
      Alert.alert('Rol de Comerciante', 'Como comerciante, no puedes contactar para comprar productos. Esta función es para los vecinos.');
      return;
    }

    if (!product.whatsapp_number) {
      Alert.alert('Sin contacto', 'Este vecino no ha proporcionado un número de WhatsApp.');
      return;
    }

    // Register contact so user can rate later
    // Register contact so user can rate later
    // We use a manual check/update to be more resilient to RLS policies 
    // that might hide 'finalized' records from a standard upsert.
    const { data: { user } } = await supabase.auth.getUser();
    if (user && user.id !== product.user_id) {
      try {
        const { data: existing } = await supabase
          .from('product_contacts')
          .select('id, status')
          .eq('product_id', product.id)
          .eq('user_id', user.id)
          .single();

        if (existing) {
          // If it exists, we RESET it to pending to start a new cycle
          const { error: updateError } = await supabase
            .from('product_contacts')
            .update({
              status: 'pending',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', existing.id);

          if (updateError) console.error('[Contacto] Error al actualizar:', updateError);
        } else {
          // If it doesn't exist, we insert
          const { error: insertError } = await supabase
            .from('product_contacts')
            .insert({
              product_id: product.id,
              user_id: user.id,
              status: 'pending'
            });

          if (insertError) console.error('[Contacto] Error al insertar:', insertError);
        }
      } catch (err) {
        console.error('[Contacto] Error inesperado en registro de WhatsApp:', err);
      }
    }

    // Limpiamos el número y preparamos el mensaje
    const cleanNumber = product.whatsapp_number.replace(/[^0-9]/g, '');
    const message = `Hola, vi tu producto "${product.title}" en MercadoVecino y me interesa. ¿Sigue disponible?`;
    const encodedMessage = encodeURIComponent(message);

    // Usamos wa.me que es más universal y funciona mejor con Linking
    const url = `https://wa.me/${cleanNumber}?text=${encodedMessage}`;

    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
      } else {
        // Fallback directo a protocolo whatsapp://
        Linking.openURL(`whatsapp://send?phone=${cleanNumber}&text=${encodedMessage}`).catch(err => {
          console.error('[WhatsApp] Error de enlace:', err);
          Alert.alert('No se pudo abrir WhatsApp', 'Asegúrate de tener la aplicación instalada en tu dispositivo para contactar al vecino.');
        });
      }
    }).catch(err => {
      console.error('[Enlace] Error de validación:', err);
      Alert.alert('Error de Enlace', 'Ocurrió un problema al intentar abrir WhatsApp.');
    });
  };

  const handleInternalChat = async (product: Product) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
        // 3. Send context message (every time user contacts for this product)
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

  const currentCategoryObj = CATEGORIES.find(c => c.id === activeCategory);

  const filteredProducts = products.filter(p => {
    // Filter by Category
    const categoryMatch = activeCategory === 'all' ||
      (p.category || '').toLowerCase() === currentCategoryObj?.name.toLowerCase();

    // Filter by Search Query
    const query = searchQuery.toLowerCase().trim();
    const searchMatch = !query ||
      (p.title || '').toLowerCase().includes(query) ||
      (p.description || '').toLowerCase().includes(query) ||
      (p.category || '').toLowerCase().includes(query);

    // Filter by Price
    const min = parseFloat(minPrice) || 0;
    const max = parseFloat(maxPrice) || Infinity;
    const priceMatch = p.price >= min && p.price <= max;

    return categoryMatch && searchMatch && priceMatch;
  });

  const insets = useSafeAreaInsets();
  const themeColor = currentEvent?.theme_color || '#8b5cf6';
  const themeColorLight = currentEvent ? `${currentEvent.theme_color}20` : '#f5f3ff'; // 12% opacity roughly
  const themeColorVeryLight = currentEvent ? `${currentEvent.theme_color}10` : '#f5f3ff';

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 20) + 40 }]}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={true}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={themeColor} />
        }
      >
        <FestiveAtmosphere event={currentEvent} themeColor={themeColor} />
        {currentEvent && (
          <EventCountdown endDate={currentEvent.end_date} themeColor={themeColor} />
        )}
        {/* Promotional Banners Carousel */}
        {banners.length > 0 && (
          <Animated.View
            entering={FadeInDown.delay(300).springify()}
            className="mt-4 mb-2 px-6"
          >
            <View className="h-44 w-full rounded-[36px] overflow-hidden shadow-xl shadow-brand-200">
              <ScrollView
                ref={bannerScrollRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(e) => {
                  const offset = e.nativeEvent.contentOffset.x;
                  const index = Math.round(offset / (Dimensions.get('window').width - 48));
                  setCurrentBannerIndex(index);
                }}
              >
                {banners.map((banner) => (
                  <TouchableOpacity
                    key={banner.id}
                    activeOpacity={0.9}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      if (banner.link_route) router.push(banner.link_route as any);
                    }}
                    style={{ width: Dimensions.get('window').width - 48 }}
                  >
                    <Image
                      source={{ uri: banner.image_url }}
                      className="w-full h-full"
                      resizeMode="cover"
                    />
                    {(banner.title || banner.description) && (
                      <View className="absolute bottom-0 left-0 right-0 p-6 bg-black/30">
                        {banner.title && (
                          <Text className="text-white font-black text-lg shadow-sm">{banner.title}</Text>
                        )}
                        {banner.description && (
                          <Text className="text-white/80 font-bold text-xs" numberOfLines={1}>{banner.description}</Text>
                        )}
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Pagination Dots */}
              <View className="absolute bottom-4 left-0 right-0 flex-row justify-center space-x-1.5">
                {banners.map((_, i) => (
                  <View
                    key={i}
                    className={`h-1.5 rounded-full ${i === currentBannerIndex ? 'w-6 bg-white' : 'w-1.5 bg-white/40'}`}
                  />
                ))}
              </View>
            </View>
          </Animated.View>
        )}

        {/* Global & Private Announcements Content */}
        {announcements.length > 0 && (
          <View className="mx-6 mt-4 mb-2">
            {announcements.map((ann, index) => {
              const isAlert = ann.type === 'alert';
              return (
                <Animated.View
                  key={ann.id}
                  entering={FadeInDown.delay(400 + index * 100).springify()}
                  layout={Layout.springify()}
                  className={`${isAlert ? 'bg-red-600 border-red-400 shadow-red-200' : ''} p-5 rounded-[32px] flex-row items-center border shadow-xl mb-3`}
                  style={!isAlert ? { backgroundColor: themeColor, borderColor: themeColor, shadowColor: themeColor } : {}}
                >
                  <View className={`w-12 h-12 ${isAlert ? 'bg-white/30' : 'bg-white/20'} rounded-2xl items-center justify-center mr-4`}>
                    {isAlert ? <AlertCircle size={22} color="white" /> : <Megaphone size={22} color="white" />}
                  </View>
                  <View className="flex-1">
                    <Text className="text-white font-black text-sm uppercase tracking-wider">
                      {isAlert ? '⚠️ Alerta de Seguridad/Admin' : ann.title}
                    </Text>
                    <Text className={`text-white font-medium mt-0.5 leading-tight ${isAlert ? 'opacity-100' : 'opacity-90'}`}>
                      {ann.content}
                    </Text>
                  </View>
                </Animated.View>
              );
            })}
          </View>
        )}

        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View className="w-10 h-10 items-center justify-center mr-3">
                <Image
                  source={require('../../assets/images/logo.png')}
                  className="w-full h-full"
                  resizeMode="contain"
                />
              </View>
              <View>
                <Text style={[styles.headerLabel, { color: themeColor }]}>
                  {currentEvent ? currentEvent.name.toUpperCase() : 'DESCUBRE LA LIGUA'}
                </Text>
                <Text style={styles.headerTitle}>MercadoVecino</Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                if (userRole === 'vendor') {
                  setShowNotificationsModal(true);
                } else {
                  Alert.alert('Notificaciones', 'No tienes actividad pendiente.');
                }
              }}
              activeOpacity={0.7}
              style={[styles.iconButton, { shadowColor: themeColor }]}
            >
              <Bell size={22} color={themeColor} />
              {pendingSalesCount > 0 && (
                <View style={{
                  position: 'absolute',
                  top: -6,
                  right: -6,
                  backgroundColor: '#ef4444',
                  minWidth: 20,
                  height: 20,
                  borderRadius: 10,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 2,
                  borderColor: 'white',
                  zIndex: 10,
                  paddingHorizontal: 4
                }}>
                  <Text style={{ color: 'white', fontSize: 10, fontWeight: '900' }}>{pendingSalesCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          <View style={[styles.searchBar, { shadowColor: themeColor }]}>
            <Search size={20} color={themeColor} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="¿Qué buscas hoy?"
              placeholderTextColor="#94A3B8"
              style={styles.searchInput}
              autoCapitalize="none"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSearchQuery(''); }} className="p-1">
                <X size={16} color="#94A3B8" />
              </TouchableOpacity>
            )}
            <View className="w-px h-6 bg-slate-200 mx-2" />
            <TouchableOpacity
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowFilters(!showFilters); }}
              style={[
                styles.filterToggle,
                showFilters && styles.filterToggleActive
              ]}
            >
              <SlidersHorizontal size={20} color={showFilters ? '#2563EB' : '#94A3B8'} />
            </TouchableOpacity>
          </View>

          {showFilters && (
            <View style={styles.filtersPanel}>
              <View className="flex-row items-center justify-between mb-4">
                <Text style={styles.filterLabel}>Rango de Precio</Text>
                {(minPrice || maxPrice) && (
                  <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setMinPrice(''); setMaxPrice(''); }}>
                    <Text className="text-blue-600 font-bold text-xs">Limpiar precios</Text>
                  </TouchableOpacity>
                )}
              </View>
              <View className="flex-row gap-4">
                <View className="flex-1">
                  <TextInput
                    placeholder="Mínimo"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    value={minPrice}
                    onChangeText={setMinPrice}
                    style={styles.filterInput}
                  />
                </View>
                <View className="flex-1">
                  <TextInput
                    placeholder="Máximo"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    value={maxPrice}
                    onChangeText={setMaxPrice}
                    style={styles.filterInput}
                  />
                </View>
              </View>
            </View>
          )}

        </View>

        {/* Featured Products Carousel */}
        {featuredProducts.length > 0 && (
          <View style={styles.section}>
            <View className="flex-row items-center justify-between px-6 mb-4">
              <View>
                <Text className="text-slate-900 font-extrabold text-xl">Recomendados</Text>
                <Text style={{ color: themeColor }} className="font-bold text-[10px] uppercase tracking-widest">Selección del Admin</Text>
              </View>
              <View className="bg-amber-100 px-3 py-1 rounded-full flex-row items-center border border-amber-200">
                <Star size={10} color="#D97706" fill="#D97706" />
                <Text className="text-amber-700 text-[10px] font-black ml-1 uppercase">Premium</Text>
              </View>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 24, gap: 16 }}
            >
              {featuredProducts.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  activeOpacity={0.9}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setSelectedProduct(p); }}
                  style={[styles.featuredCard, { shadowColor: themeColor }]}
                >
                  <Image source={{ uri: p.image }} style={styles.featuredCardImage} />
                  <View style={styles.featuredBadge}>
                    <Sparkles size={10} color="white" />
                  </View>
                  <View className="p-4">
                    <Text className="text-slate-900 font-black text-sm mb-1" numberOfLines={1}>{p.title}</Text>
                    <View className="flex-row items-center justify-between mb-1">
                      <Text style={{ color: themeColor }} className="font-black text-xs">${String(p.price).toLocaleString()}</Text>
                      <View className="flex-row items-center bg-slate-50 px-1.5 py-0.5 rounded-lg border border-slate-100">
                        <Star size={10} fill="#FACC15" color="#FACC15" />
                        <Text className="text-slate-700 font-black text-[9px] ml-1">{(p.rating || 0).toFixed(1)}</Text>
                      </View>
                    </View>
                    <View className="flex-row items-center mt-3 pt-3 border-t border-slate-50">
                      <View style={{ backgroundColor: themeColorLight }} className="w-5 h-5 rounded-lg items-center justify-center mr-2">
                        <User size={10} color={themeColor} />
                      </View>
                      <View className="flex-1 flex-row items-center">
                        <Text className="text-slate-500 font-bold text-[10px] mr-1" numberOfLines={1}>{p.seller}</Text>
                        {p.is_verified && (
                          <BadgeCheck size={12} color={themeColor} fill={themeColorVeryLight} />
                        )}
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Categories */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Categorías</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesScroll}
          >
            {dbCategories.map((cat) => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => setActiveCategory(cat.id)}
                  activeOpacity={0.8}
                  style={[
                    styles.categoryCard,
                    isActive && { backgroundColor: themeColor, borderColor: themeColor, shadowColor: themeColor }
                  ]}
                >
                  <View style={[
                    styles.categoryIconCircle,
                    isActive && styles.categoryIconCircleActive,
                    { backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : themeColorLight }
                  ]}>
                    <Icon size={20} color={isActive ? 'white' : themeColor} />
                  </View>
                  <Text style={[
                    styles.categoryName,
                    isActive && styles.categoryNameActive
                  ]}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Products */}
        <View style={styles.productsSection}>
          <View style={styles.productsHeader}>
            <Text style={styles.sectionTitle}>
              {activeCategory === 'all' ? 'Novedades' : currentCategoryObj?.name}
            </Text>
            <TouchableOpacity onPress={onRefresh} style={[styles.refreshButton, { backgroundColor: themeColorLight }]}>
              <Text style={[styles.refreshButtonText, { color: themeColor }]}>Actualizar</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.productsGrid}>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <SkeletonProductCard key={i} />
              ))
            ) : filteredProducts.length > 0 ? (
              filteredProducts.map((product, idx) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  index={idx}
                  userRole={userRole}
                  onPress={handleProductPress}
                  themeColor={themeColor}
                  eventBadge={currentEvent && (currentEvent.highlighted_categories || []).includes(product.category) ? currentEvent.name : null}
                />
              ))
            ) : searchQuery ? (
              <View style={styles.emptyContainer}>
                <View style={[styles.emptyIconCircle, { backgroundColor: '#F8FAFC' }]}>
                  <SearchX size={45} color="#64748B" />
                </View>
                <Text style={styles.emptyTitle}>Sin resultados</Text>
                <Text style={styles.emptyText}>
                  No encontramos nada que coincida con "{searchQuery}". Prueba con otras palabras o limpia los filtros.
                </Text>
                <TouchableOpacity
                  onPress={() => setSearchQuery('')}
                  style={[styles.emptyButton, { backgroundColor: themeColor, shadowColor: themeColor }]}
                >
                  <Text style={styles.emptyButtonText}>Limpiar Búsqueda</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconCircle}>
                  {userRole === 'vendor' ? (
                    <AlertCircle size={45} color="#8b5cf6" />
                  ) : (
                    <Clock size={45} color="#8b5cf6" />
                  )}
                </View>
                <Text style={styles.emptyTitle}>
                  {userRole === 'vendor' ? '¡Sé el primero!' : 'Mercado en preparación'}
                </Text>
                <Text style={styles.emptyText}>
                  {userRole === 'vendor'
                    ? `Aún nadie ha publicado nada en ${currentCategoryObj?.name || 'esta sección'}. ¿Tienes algo que ofrecer?`
                    : `Estamos esperando a que los vecinos publiquen en ${currentCategoryObj?.name || 'esta sección'}. ¡Vuelve pronto!`}
                </Text>
                {userRole?.toLowerCase().trim() === 'vendor' && (
                  <TouchableOpacity
                    onPress={() => router.push('/post')}
                    style={[styles.emptyButton, { backgroundColor: themeColor, shadowColor: themeColor }]}
                  >
                    <Text style={styles.emptyButtonText}>Publicar Algo</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      <ProductDetailModal
        visible={!!selectedProduct}
        product={selectedProduct as any}
        onClose={() => setSelectedProduct(null)}
        userRole={userRole}
        onInternalChat={handleInternalChat}
      />

      <ProactiveReviewModal />

      {/* MODAL DE NOTIFICACIONES */}
      <Modal
        visible={showNotificationsModal}
        animationType="none"
        transparent={true}
        onRequestClose={() => setShowNotificationsModal(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={styles.notificationOverlay}
          onPress={() => setShowNotificationsModal(false)}
        >
          <Animated.View
            style={[
              styles.notificationsContainer,
              { transform: [{ translateY: slideAnim }] }
            ]}
          >
            <TouchableOpacity activeOpacity={1} style={{ flex: 1 }}>
              <View style={styles.modalHeader}>
                <View className="flex-row items-center">
                  <View style={{ backgroundColor: themeColorLight }} className="w-10 h-10 rounded-2xl items-center justify-center mr-3">
                    <Bell size={20} color={themeColor} />
                  </View>
                  <Text style={styles.modalTitle}>Notificaciones</Text>
                </View>
                <TouchableOpacity onPress={() => setShowNotificationsModal(false)} className="p-2">
                  <X size={24} color="#94A3B8" />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
                <View style={{ backgroundColor: themeColorLight, borderColor: themeColorVeryLight }} className="p-4 rounded-3xl mb-6 border">
                  <Text style={{ color: themeColor }} className="font-black text-sm text-center">Centro de Negocios</Text>
                  <Text style={{ color: themeColor }} className="text-[10px] uppercase font-bold tracking-widest text-center mt-1">Gestión de Notificaciones para Comerciantes</Text>
                </View>

                {notifications.length > 0 ? (
                  notifications.map((notif) => (
                    <TouchableOpacity
                      key={notif.id}
                      onPress={() => {
                        setShowNotificationsModal(false);
                        router.push('/(tabs)/two');
                      }}
                      activeOpacity={0.7}
                      style={{
                        backgroundColor: '#f8fafc',
                        padding: 24,
                        borderRadius: 32,
                        borderWidth: 1,
                        borderColor: '#f1f5f9',
                        flexDirection: 'row',
                        alignItems: 'center',
                        marginBottom: 16,
                      }}
                    >
                      <View className="w-14 h-14 bg-white rounded-[20px] items-center justify-center mr-5 border border-slate-100 shadow-sm overflow-hidden">
                        {notif.products?.image_url ? (
                          <Image source={{ uri: notif.products.image_url }} className="w-full h-full opacity-90" />
                        ) : (
                          <ShoppingBasket size={24} color="#CBD5E1" />
                        )}
                      </View>
                      <View className="flex-1">
                        <View className="flex-row items-center mb-1">
                          <View className="w-2 h-2 bg-brand-500 rounded-full mr-2" />
                          <Text className="text-slate-900 font-black text-[10px] uppercase tracking-wider">Nueva Solicitud</Text>
                        </View>
                        <Text className="text-slate-700 font-bold text-sm leading-tight">
                          <Text className="text-brand-600 font-black">{notif.profiles?.full_name}</Text> se interesó en tu producto
                        </Text>
                        <Text className="text-slate-400 text-[10px] font-bold mt-2 uppercase tracking-tighter">"{notif.products?.title}"</Text>
                      </View>
                      <View style={{ backgroundColor: themeColorLight }} className="w-8 h-8 rounded-xl items-center justify-center">
                        <ChevronRight size={16} color={themeColor} />
                      </View>
                    </TouchableOpacity>
                  ))
                ) : (
                  <View className="items-center justify-center py-20">
                    <View className="w-20 h-20 bg-slate-50 rounded-[32px] items-center justify-center mb-4">
                      <Bell size={32} color="#E2E8F0" />
                    </View>
                    <Text className="text-slate-400 font-bold text-base">Sin ventas nuevas</Text>
                    <Text className="text-slate-300 text-xs mt-1">Te avisaremos cuando alguien te contacte</Text>
                  </View>
                )}
              </ScrollView>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      {/* Report Product Modal */}
      <Modal visible={showReportModal} animationType="fade" transparent={true}>
        <View className="flex-1 bg-black/60 items-center justify-center p-6">
          <View className="bg-white w-full rounded-[40px] p-8 shadow-2xl">
            <View className="flex-row justify-between items-center mb-6">
              <View>
                <Text className="text-slate-900 font-bold text-xl">Reportar Problema</Text>
                <Text className="text-slate-400 text-xs mt-1">Tu reporte ayuda a mantener segura la comunidad.</Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setShowReportModal(false);
                  setReportReason('');
                }}
                className="w-10 h-10 bg-slate-50 items-center justify-center rounded-full"
              >
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View className="mb-6">
              <Text className="text-slate-500 font-bold text-xs mb-2 uppercase tracking-widest">Motivo del Reporte</Text>
              <TextInput
                style={[styles.filterInput, { height: 100, textAlignVertical: 'top', paddingTop: 16 }]}
                multiline
                value={reportReason}
                onChangeText={setReportReason}
                placeholder="Ej: Contenido ofensivo, estafa, producto ilegal..."
                placeholderTextColor="#94A3B8"
              />
            </View>

            <TouchableOpacity
              onPress={submitReport}
              disabled={!reportReason.trim()}
              activeOpacity={0.8}
              className={`py-5 rounded-3xl flex-row items-center justify-center ${!reportReason.trim() ? 'bg-slate-200' : 'bg-red-600'}`}
            >
              <Flag size={20} color="white" className="mr-2" />
              <Text className="text-white font-black text-base">Enviar Reporte</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Alerta Maestro (Targeted) */}
      <Modal visible={showAlertModal} animationType="slide" transparent={true}>
        <View style={styles.alertModalOverlay}>
          <View style={styles.alertModalContent}>
            <View style={styles.alertModalHeader}>
              <Sparkles size={24} color="#F59E0B" />
              <Text style={styles.alertModalTitle}>MENSAJE DEL MAESTRO</Text>
              <Sparkles size={24} color="#F59E0B" />
            </View>

            <View style={styles.alertModalBody}>
              <View style={styles.alertIconCircle}>
                <Megaphone size={32} color="white" />
              </View>
              <Text style={styles.alertModalMessage}>
                {personalAlert?.content || 'Tienes una nueva notificación personalizada.'}
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleCloseAlertModal}
              activeOpacity={0.8}
              style={styles.alertModalButton}
            >
              <Text style={styles.alertModalButtonText}>Entendido</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView >
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF9FF', // Warmer background
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLabel: {
    color: '#8b5cf6',
    fontWeight: '900',
    fontSize: 10,
    letterSpacing: 3,
    marginBottom: 4,
  },
  headerTitle: {
    color: '#1e1b4b',
    fontWeight: '900',
    fontSize: 32,
    letterSpacing: -1,
  },
  iconButton: {
    width: 52,
    height: 52,
    backgroundColor: 'white',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ede9fe',
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
    position: 'relative',
  },
  searchBar: {
    marginTop: 28,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#ede9fe',
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 15,
    elevation: 6,
  },
  searchText: { // This can be removed or kept if needed elsewhere
    color: '#94A3B8',
    marginLeft: 12,
    fontWeight: '500',
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    color: '#0F172A',
    fontWeight: '500',
    fontSize: 16,
    padding: 0, // Reset default Android padding
  },
  section: {
    marginTop: 32,
  },
  sectionTitle: {
    paddingHorizontal: 24,
    color: '#0F172A',
    fontWeight: '900',
    fontSize: 20,
    marginBottom: 16,
  },
  categoriesScroll: {
    paddingHorizontal: 24,
  },
  categoryCard: {
    marginRight: 16,
    alignItems: 'center',
    padding: 12,
    borderRadius: 24,
    minWidth: 85,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  categoryCardActive: {
    backgroundColor: '#8b5cf6',
    borderColor: '#8b5cf6',
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  categoryIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 20,
    backgroundColor: '#f5f3ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  categoryIconCircleActive: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  categoryName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  categoryNameActive: {
    color: 'white',
  },
  productsSection: {
    marginTop: 40,
    paddingHorizontal: 16,
  },
  productsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    marginBottom: 24,
  },
  refreshButton: {
    backgroundColor: '#8b5cf61a',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
  },
  refreshButtonText: {
    color: '#8b5cf6',
    fontWeight: '900',
    fontSize: 12,
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  loaderContainer: {
    width: '100%',
    paddingVertical: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loaderText: {
    color: '#94A3B8',
    fontWeight: 'bold',
    marginTop: 16,
  },
  emptyContainer: {
    width: '100%',
    paddingVertical: 64,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderRadius: 40,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginHorizontal: 8,
  },
  emptyIconCircle: {
    width: 96,
    height: 96,
    backgroundColor: '#FEF2F2',
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    color: '#0F172A',
    fontWeight: '900',
    fontSize: 24,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  emptyText: {
    color: '#64748B',
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 12,
    paddingHorizontal: 40,
    lineHeight: 20,
  },
  emptyButton: {
    marginTop: 40,
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 48,
    paddingVertical: 22,
    borderRadius: 28,
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  emptyButtonText: {
    color: 'white',
    fontWeight: '900',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    height: '92%',
    borderTopLeftRadius: 50,
    borderTopRightRadius: 50,
    overflow: 'hidden',
  },
  filterToggle: {
    padding: 8,
    borderRadius: 12,
  },
  filterToggleActive: {
    backgroundColor: '#8b5cf615',
  },
  filtersPanel: {
    marginTop: 16,
    padding: 24,
    backgroundColor: '#f5f3ff',
    borderRadius: 32,
    borderWidth: 1,
    borderColor: '#ede9fe',
  },
  filterLabel: {
    color: '#4c1d95',
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: -0.2,
  },
  filterInput: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ede9fe',
    color: '#1e1b4b',
    fontWeight: '700',
    fontSize: 15,
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
  notificationOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-start',
  },
  notificationsContainer: {
    backgroundColor: 'white',
    borderBottomLeftRadius: 50,
    borderBottomRightRadius: 50,
    padding: 32,
    paddingTop: 60,
    height: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  featuredCard: {
    width: 200,
    backgroundColor: 'white',
    borderRadius: 32,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    overflow: 'hidden',
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
    marginRight: 16,
  },
  featuredCardImage: {
    width: '100%',
    height: 120,
    resizeMode: 'cover',
  },
  featuredBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#F59E0B',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'white',
    zIndex: 10,
  },
  alertModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  alertModalContent: {
    backgroundColor: 'white',
    width: '100%',
    borderRadius: 48,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
    elevation: 25,
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  alertModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  alertModalTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#F59E0B',
    letterSpacing: 2,
    marginHorizontal: 16,
  },
  alertModalBody: {
    alignItems: 'center',
    marginBottom: 40,
  },
  alertIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 35,
    backgroundColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
  },
  alertModalMessage: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1E293B',
    textAlign: 'center',
    lineHeight: 30,
    letterSpacing: -0.5,
  },
  alertModalButton: {
    backgroundColor: '#1E293B',
    paddingVertical: 20,
    paddingHorizontal: 40,
    borderRadius: 24,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  alertModalButtonText: {
    color: 'white',
    fontWeight: '900',
    fontSize: 18,
  },
});
