import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import {
  BadgeCheck,
  Ban,
  Bell,
  Camera,
  Check,
  ChevronRight,
  Clock,
  DollarSign,
  HelpCircle,
  LayoutGrid,
  LogOut,
  MessageCircle,
  Package,
  Settings,
  Shield,
  ShoppingBag,
  Sparkles,
  Store,
  TrendingUp,
  Truck,
  User as UserIcon,
  X
} from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  DeviceEventEmitter,
  Dimensions,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { translateError } from '../../lib/translations';

// Reusable helper for base64 to ArrayBuffer
function decodeBase64(base64: string) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const lookup = new Uint8Array(256);
  for (let i = 0; i < chars.length; i++) {
    lookup[chars.charCodeAt(i)] = i;
  }
  let bufferLength = base64.length * 0.75;
  let len = base64.length;
  let i, p = 0;
  let encoded1, encoded2, encoded3, encoded4;
  if (base64[base64.length - 1] === '=') {
    bufferLength--;
    if (base64[base64.length - 2] === '=') bufferLength--;
  }
  const arraybuffer = new ArrayBuffer(bufferLength);
  const bytes = new Uint8Array(arraybuffer);
  for (i = 0; i < len; i += 4) {
    encoded1 = lookup[base64.charCodeAt(i)];
    encoded2 = lookup[base64.charCodeAt(i + 1)];
    encoded3 = lookup[base64.charCodeAt(i + 2)];
    encoded4 = lookup[base64.charCodeAt(i + 3)];
    bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);
    bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
    bytes[p++] = ((encoded3 & 3) << 6) | (encoded4 & 63);
  }
  return arraybuffer;
}

export default function ProfileScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<{ full_name: string, role: string, avatar_url?: string, profile_views?: number, is_verified?: boolean } | null>(null);
  const [loading, setLoading] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAvatar, setNewAvatar] = useState<string | null>(null);
  const [base64Data, setBase64Data] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [pendingSales, setPendingSales] = useState<any[]>([]);
  const [fetchingSales, setFetchingSales] = useState(false);
  const [purchaseHistory, setPurchaseHistory] = useState<any[]>([]);
  const [salesHistory, setSalesHistory] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [businessMetrics, setBusinessMetrics] = useState({
    totalContacts: 0,
    monthlyContacts: 0,
    todayContacts: 0,
    topProducts: [] as { title: string, count: number }[],
    weeklyData: [0, 0, 0, 0, 0, 0, 0]
  });
  const [myTickets, setMyTickets] = useState<any[]>([]);
  const [isSupportModalVisible, setIsSupportModalVisible] = useState(false);
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');
  const [submittingTicket, setSubmittingTicket] = useState(false);

  async function fetchBusinessMetrics(userId: string) {
    try {
      const now = new Date();
      const startOfDay = new Date(now.setHours(0, 0, 0, 0)).toISOString();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      // 1. Get all products of this vendor
      const { data: myProducts } = await supabase
        .from('products')
        .select('id, title')
        .eq('user_id', userId);

      if (!myProducts || myProducts.length === 0) return;

      const productIds = myProducts.map(p => p.id);
      const productLookup: Record<string, string> = {};
      myProducts.forEach(p => productLookup[p.id] = p.title);

      // 2. Fetch all contacts for these products
      const { data: allContacts } = await supabase
        .from('product_contacts')
        .select('product_id, created_at')
        .in('product_id', productIds);

      if (!allContacts) return;

      // 3. Calculate metrics
      const today = allContacts.filter(c => c.created_at >= startOfDay).length;
      const monthly = allContacts.filter(c => c.created_at >= startOfMonth).length;

      // Calculate top products
      const counts: Record<string, number> = {};
      allContacts.forEach(c => {
        counts[c.product_id] = (counts[c.product_id] || 0) + 1;
      });

      const topProducts = Object.entries(counts)
        .map(([id, count]) => ({ title: productLookup[id] || 'Producto', count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);

      // 4. Calculate weekly data (last 7 days)
      const weeklyData = [0, 0, 0, 0, 0, 0, 0];
      const days: string[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        d.setHours(0, 0, 0, 0);
        days.push(d.toISOString().split('T')[0]);
      }

      allContacts.forEach(c => {
        const dateStr = c.created_at.split('T')[0];
        const dayIndex = days.indexOf(dateStr);
        if (dayIndex !== -1) {
          weeklyData[dayIndex]++;
        }
      });

      setBusinessMetrics({
        totalContacts: allContacts.length,
        todayContacts: today,
        monthlyContacts: monthly,
        topProducts,
        weeklyData
      });

    } catch (err) {
      console.error('[Perfil] Error al obtener métricas de negocio:', err);
    }
  }

  async function fetchProfile() {
    try {
      setLoading(true);
      // Check session first to avoid noise during transitions (e.g. logout)
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        return;
      }

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) {
        // Silently skip if session is missing
        if (userError.message?.includes('session missing')) {
          setLoading(false);
          return;
        }
        throw userError;
      }

      if (user) {
        let { data, error: profileError } = await supabase
          .from('profiles')
          .select('full_name, role, avatar_url, profile_views, is_verified')
          .eq('id', user.id)
          .single();

        // If profile doesn't exist (PGRST116), create a default one
        if (profileError && profileError.code === 'PGRST116') {
          console.log('[Perfil] El perfil no existe, creando uno por defecto...');
          const { data: newData, error: createError } = await supabase
            .from('profiles')
            .insert({
              id: user.id,
              full_name: user.user_metadata?.full_name || 'Nuevo Vecino',
              role: user.user_metadata?.role || 'client',
              avatar_url: null
            })
            .select()
            .single();

          if (createError) throw createError;
          data = newData;
        } else if (profileError) {
          throw profileError;
        }

        if (data) {
          setProfile(data);
          setNewName(data.full_name || '');
          setNewAvatar(data.avatar_url || null);
          fetchHistories(user.id, data.role);
          fetchMyTickets(user.id);
          if (data.role?.toLowerCase().trim() === 'vendor') {
            fetchPendingSales(user.id);
            fetchBusinessMetrics(user.id);
          }
        }
      }
    } catch (err: any) {
      console.log('[Perfil] Error al obtener el perfil:', err);
      Alert.alert(
        'Error de Conexión',
        `No pudimos cargar tu perfil. Detalle: ${err.message || 'Error desconocido'}`
      );
    } finally {
      setLoading(false);
    }
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchProfile();
    setRefreshing(false);
  }, []);

  async function fetchPendingSales(userId: string) {
    try {
      setFetchingSales(true);
      const { data: myProducts } = await supabase
        .from('products')
        .select('id')
        .eq('user_id', userId);

      if (myProducts && myProducts.length > 0) {
        const productIds = myProducts.map(p => p.id);

        // Get active orders (everything except delivered/cancelled)
        const { data: contacts } = await supabase
          .from('product_contacts')
          .select('*, profiles!user_id(full_name, avatar_url), products!product_id(title, image_url)')
          .in('product_id', productIds)
          .not('status', 'in', '("delivered","cancelled")')
          .order('created_at', { ascending: false });

        setPendingSales(contacts || []);
      }
    } catch (err) {
      console.error('[Perfil] Error al obtener ventas:', err);
    } finally {
      setFetchingSales(false);
    }
  }

  async function fetchHistories(userId: string, role: string) {
    try {
      const currentYear = new Date().getFullYear();
      const startOfYear = `${currentYear}-01-01T00:00:00Z`;

      // 1. Fetch My Purchases (Always fetch all statuses)
      const { data: contactPurchases } = await supabase
        .from('product_contacts')
        .select('*, products!product_id(title, user_id), profiles!user_id(full_name)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (contactPurchases) {
        // We need to fetch the MERCHANT names since the 'profiles' join above is the CLIENT
        const merchantIds = [...new Set(contactPurchases.map(c => c.products?.user_id).filter(id => !!id))];
        const { data: merchantProfiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', merchantIds);

        const merchantLookup: Record<string, string> = {};
        merchantProfiles?.forEach(m => merchantLookup[m.id] = m.full_name);

        const formattedPurchases = contactPurchases.map(c => ({
          ...c,
          merchant_name: merchantLookup[c.products?.user_id] || 'Comerciante'
        }));

        setPurchaseHistory(formattedPurchases);
      }

      // 2. if vendor, fetch Sales History
      if (role === 'vendor') {
        const { data: myProducts } = await supabase
          .from('products')
          .select('id')
          .eq('user_id', userId);

        if (myProducts && myProducts.length > 0) {
          const productIds = myProducts.map(p => p.id);
          const { data: contactSales } = await supabase
            .from('product_contacts')
            .select('*')
            .in('product_id', productIds)
            .in('status', ['confirmed', 'preparing', 'shipped', 'delivered'])
            .gte('created_at', startOfYear)
            .order('created_at', { ascending: false });

          if (contactSales && contactSales.length > 0) {
            // Fetch customer profiles
            const customerIds = [...new Set(contactSales.map(s => s.user_id))];
            const { data: customerProfiles } = await supabase
              .from('profiles')
              .select('id, full_name')
              .in('id', customerIds);

            // Fetch product titles
            const { data: productTitles } = await supabase
              .from('products')
              .select('id, title')
              .in('id', productIds);

            // Map it together
            const customerLookup: Record<string, string> = {};
            customerProfiles?.forEach(cp => customerLookup[cp.id] = cp.full_name);

            const titleLookup: Record<string, string> = {};
            productTitles?.forEach(pt => titleLookup[pt.id] = pt.title);

            const formattedSales = contactSales.map(s => ({
              ...s,
              profiles: {
                full_name: customerLookup[s.user_id] || 'Vecino'
              },
              products: {
                title: titleLookup[s.product_id] || 'Producto'
              }
            }));

            setSalesHistory(formattedSales);
          } else {
            setSalesHistory([]);
          }
        }
      }
    } catch (err) {
      console.error('[Perfil] Error al obtener historiales:', err);
    }
  }

  async function fetchMyTickets(userId: string) {
    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (!error) setMyTickets(data || []);
    } catch (err) {
      console.error('[Perfil] Error al obtener tickets:', err);
    }
  }

  const handleSubmitTicket = async () => {
    if (!ticketSubject.trim() || !ticketMessage.trim()) {
      Alert.alert('Error', 'Por favor completa todos los campos.');
      return;
    }

    try {
      setSubmittingTicket(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Sesión no encontrada');

      const { error } = await supabase
        .from('support_tickets')
        .insert({
          user_id: user.id,
          subject: ticketSubject.trim(),
          message: ticketMessage.trim()
        });

      if (error) throw error;

      Alert.alert('Éxito', 'Tu ticket ha sido enviado correctamente. Revisaremos tu caso pronto.');
      setTicketSubject('');
      setTicketMessage('');
      setIsSupportModalVisible(false);
      fetchMyTickets(user.id);
    } catch (err: any) {
      Alert.alert('Error', translateError(err.message));
    } finally {
      setSubmittingTicket(false);
    }
  };

  async function updateOrderStatus(contactId: string, newStatus: string) {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const { error } = await supabase
        .from('product_contacts')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', contactId);

      if (error) throw error;

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      const statusLabels: Record<string, string> = {
        'confirmed': 'Pedido Confirmado',
        'preparing': 'En Preparación',
        'shipped': 'Enviado',
        'delivered': 'Entregado',
        'cancelled': 'Cancelado'
      };

      Alert.alert('Estado Actualizado', `El pedido ahora está: ${statusLabels[newStatus] || newStatus}`);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        fetchPendingSales(user.id);
        fetchHistories(user.id, profile?.role || 'vendor');
      }
    } catch (err) {
      Alert.alert('Error', 'No se pudo actualizar el estado del pedido.');
    }
  }

  function getStatusStyle(status: string) {
    switch (status) {
      case 'pending': return { bg: '#FFF7ED', text: '#EA580C', icon: Clock, label: 'Pendiente' };
      case 'confirmed': return { bg: '#EFF6FF', text: '#2563EB', icon: Check, label: 'Confirmado' };
      case 'preparing': return { bg: '#FEFCE8', text: '#CA8A04', icon: Package, label: 'Cocinando/Prep' };
      case 'shipped': return { bg: '#FAF5FF', text: '#9333EA', icon: Truck, label: 'En Camino' };
      case 'delivered': return { bg: '#F0FDF4', text: '#16A34A', icon: ShoppingBag, label: 'Entregado' };
      case 'cancelled': return { bg: '#FEF2F2', text: '#DC2626', icon: Ban, label: 'Cancelado' };
      default: return { bg: '#F1F5F9', text: '#64748B', icon: HelpCircle, label: status };
    }
  }

  useEffect(() => {
    fetchProfile();
  }, []);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso Denegado', 'Necesitamos acceso a tu galería.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      setNewAvatar(asset.uri);
      if (asset.base64) {
        setBase64Data(asset.base64);
      }
    }
  };

  const handleUpdateProfile = async () => {
    if (!newName.trim()) {
      Alert.alert('Error', 'El nombre no puede estar vacío');
      return;
    }

    setUpdating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No hay sesión activa');

      let finalAvatarUrl = newAvatar;

      // Upload image if it's a local file
      if (newAvatar && (newAvatar.startsWith('file://') || newAvatar.startsWith('content://')) && base64Data) {
        const fileExt = newAvatar.split('.').pop()?.toLowerCase() || 'jpg';
        const fileName = `avatar_${user.id}_${Date.now()}.${fileExt}`;
        const arrayBuffer = decodeBase64(base64Data);

        const { error: uploadError } = await supabase.storage
          .from('product-images') // Reusing product-images bucket as it exists
          .upload(fileName, arrayBuffer, {
            contentType: `image/${fileExt === 'png' ? 'png' : 'jpeg'}`,
            upsert: true
          });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('product-images')
          .getPublicUrl(fileName);

        finalAvatarUrl = publicUrl;
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          full_name: newName.trim(),
          avatar_url: finalAvatarUrl
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      Alert.alert('Éxito', 'Perfil actualizado correctamente');
      setIsEditModalVisible(false);
      fetchProfile();
    } catch (error: any) {
      console.error('[Perfil] Error de actualización:', error);
      Alert.alert('Error', translateError(error.message));
    } finally {
      setUpdating(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro de que quieres salir?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Salir',
          style: 'destructive',
          onPress: async () => {
            // console.log('--- ACTION: MANUAL SIGNOUT ---');
            try {
              DeviceEventEmitter.emit('force-logout');
              const keys = await AsyncStorage.getAllKeys();
              const authKeys = keys.filter(key => key.includes('auth-token') || key.includes('supabase'));
              if (authKeys.length > 0) {
                await AsyncStorage.multiRemove(authKeys);
              }
              supabase.auth.signOut().catch(() => { });
            } catch (err: any) {
              console.log('[Perfil] Error al cerrar sesión (ignorado):', err.message);
              DeviceEventEmitter.emit('force-logout');
            }
          }
        },
      ]
    );
  };

  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#FAF9FF' }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 20) + 20 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8b5cf6" />
        }
      >
        <View style={{ paddingHorizontal: 24, paddingTop: 40, paddingBottom: 32 }}>
          {/* Profile Header */}
          <View style={{ alignItems: 'center', marginBottom: 48 }}>
            <View style={styles.profileAvatarContainer}>
              {profile?.avatar_url ? (
                <Image source={{ uri: profile.avatar_url }} className="w-full h-full" />
              ) : profile?.role === 'vendor' ? (
                <Store size={56} color="white" />
              ) : (
                <UserIcon size={56} color="white" />
              )}
            </View>
            <Text className="text-4xl font-black text-slate-900 tracking-tight">{profile?.full_name || 'Mi Perfil'}</Text>
            <View className="bg-brand-50 px-4 py-1.5 rounded-full mt-3 border border-brand-100 flex-row items-center">
              <Text className="text-brand-600 font-black text-[10px] uppercase tracking-[2px]">
                {profile?.role?.toLowerCase().trim() === 'admin' ? 'Administrador Maestro' : profile?.role?.toLowerCase().trim() === 'vendor' ? (profile.is_verified ? 'Comerciante Verificado' : 'Comerciante') : 'Vecino'}
              </Text>
              {profile?.is_verified && profile?.role === 'vendor' && (
                <BadgeCheck size={12} color="#8b5cf6" fill="#f5f3ff" style={{ marginLeft: 6 }} />
              )}
            </View>
          </View>

          {/* Section: Business Metrics (Merchants Only) */}
          {profile?.role === 'vendor' && (
            <View className="mb-8">
              <Text className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mb-4 ml-4">Tu Impacto esta Semana</Text>
              <View className="flex-row gap-4 mb-4">
                <View className="flex-1 bg-white p-5 rounded-[32px] border border-slate-100 shadow-sm items-center">
                  <Text className="text-slate-400 font-black text-[10px] uppercase mb-1">Visitas Perfil</Text>
                  <Text className="text-indigo-600 font-black text-3xl">{profile?.profile_views || 0}</Text>
                </View>
                <View className="flex-1 bg-white p-5 rounded-[32px] border border-slate-100 shadow-sm items-center">
                  <Text className="text-slate-400 font-black text-[10px] uppercase mb-1">Total Clics</Text>
                  <Text className="text-brand-600 font-black text-3xl">{businessMetrics.totalContacts}</Text>
                </View>
              </View>

              <View className="bg-brand-600 p-6 rounded-[32px] shadow-lg shadow-brand-200">
                <View className="flex-row items-center justify-between mb-4">
                  <View className="flex-row items-center">
                    <TrendingUp size={20} color="white" />
                    <Text className="text-white font-black ml-3 text-lg">Productos Estrella</Text>
                  </View>
                  <Sparkles size={18} color="rgba(255,255,255,0.6)" />
                </View>

                {businessMetrics.topProducts.length > 0 ? (
                  <View className="space-y-3">
                    {businessMetrics.topProducts.map((p, i) => (
                      <View key={i} className="flex-row items-center justify-between bg-white/10 p-3 rounded-2xl mb-2">
                        <Text className="text-white font-bold flex-1 mr-2" numberOfLines={1}>{p.title}</Text>
                        <View className="bg-white/20 px-3 py-1 rounded-lg">
                          <Text className="text-white font-black text-xs">{p.count} clics</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text className="text-white/60 text-sm italic py-2">Pronto verás aquí tus productos más buscados.</Text>
                )}
              </View>

              {/* Weekly Evolution Chart */}
              <View className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm mb-4">
                <View className="flex-row items-center justify-between mb-4">
                  <Text className="text-slate-900 font-black text-lg">Evolución Semanal</Text>
                  <View className="bg-brand-50 px-2 py-1 rounded-lg">
                    <Text className="text-brand-600 font-black text-[8px] uppercase">Últimos 7 días</Text>
                  </View>
                </View>

                <LineChart
                  data={{
                    labels: ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'].slice(-7), // Simplified, ideally dynamic
                    datasets: [{
                      data: businessMetrics.weeklyData
                    }]
                  }}
                  width={Dimensions.get('window').width - 80}
                  height={180}
                  chartConfig={{
                    backgroundColor: '#ffffff',
                    backgroundGradientFrom: '#ffffff',
                    backgroundGradientTo: '#ffffff',
                    decimalPlaces: 0,
                    color: (opacity = 1) => `rgba(139, 92, 246, ${opacity})`,
                    labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
                    style: {
                      borderRadius: 16
                    },
                    propsForDots: {
                      r: '4',
                      strokeWidth: '2',
                      stroke: '#8b5cf6'
                    }
                  }}
                  bezier
                  style={{
                    marginVertical: 8,
                    borderRadius: 16,
                    paddingRight: 40
                  }}
                  withInnerLines={false}
                  withOuterLines={false}
                  withVerticalLines={false}
                  withHorizontalLines={true}
                />
              </View>
            </View>
          )}

          {/* Section: Preferencias */}
          <Text className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mb-4 ml-4">Preferencias</Text>
          <View style={styles.sectionCard}>
            <TouchableOpacity
              onPress={() => setIsEditModalVisible(true)}
              activeOpacity={0.6}
              className="flex-row items-center p-5 border-b border-slate-50"
            >
              <View className="w-10 h-10 bg-slate-100 rounded-2xl items-center justify-center mr-4">
                <Settings size={20} color="#475569" />
              </View>
              <Text className="flex-1 text-slate-700 font-bold">Editar Perfil</Text>
              <ChevronRight size={20} color="#cbd5e1" />
            </TouchableOpacity>



            {profile?.role?.toLowerCase().trim() !== 'admin' && (
              <TouchableOpacity
                onPress={() => Alert.alert('Notificaciones', `Tienes ${pendingSales.length} ventas pendientes por confirmar.`)}
                activeOpacity={0.6}
                className="flex-row items-center p-5 border-b border-slate-50"
              >
                <View className="w-10 h-10 bg-slate-100 rounded-2xl items-center justify-center mr-4 relative">
                  <Bell size={20} color="#475569" />
                  {pendingSales.length > 0 && (
                    <View className="absolute -top-1 -right-1 bg-red-500 w-5 h-5 rounded-full items-center justify-center border-2 border-white">
                      <Text className="text-white text-[10px] font-black">{pendingSales.length}</Text>
                    </View>
                  )}
                </View>
                <View className="flex-1">
                  <Text className="text-slate-700 font-bold">Notificaciones</Text>
                  {profile?.role === 'vendor' && pendingSales.length > 0 && (
                    <Text className="text-slate-400 text-[10px] font-medium">Ventas pendientes de confirmar</Text>
                  )}
                </View>
                <ChevronRight size={20} color="#cbd5e1" />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={() => Alert.alert('Seguridad', 'Próximamente: Cambio de clave y privacidad')}
              activeOpacity={0.6}
              className="flex-row items-center p-5 border-b border-slate-50"
            >
              <View className="w-10 h-10 bg-slate-100 rounded-2xl items-center justify-center mr-4">
                <Shield size={20} color="#475569" />
              </View>
              <Text className="flex-1 text-slate-700 font-bold">Privacidad y Seguridad</Text>
              <ChevronRight size={20} color="#cbd5e1" />
            </TouchableOpacity>

            {profile?.role === 'vendor' && (
              <TouchableOpacity
                onPress={() => router.push('/manage-posts')}
                activeOpacity={0.6}
                className="flex-row items-center p-5 bg-brand-50/20"
              >
                <View style={styles.managePostsIcon}>
                  <LayoutGrid size={22} color="white" />
                </View>
                <View className="flex-1">
                  <Text className="text-brand-900 font-black text-base">Mis Publicaciones</Text>
                  <Text className="text-brand-400 text-[10px] font-bold uppercase tracking-wider">Gestionar mi bazar</Text>
                </View>
                <ChevronRight size={20} color="#8b5cf6" />
              </TouchableOpacity>
            )}
          </View>

          {/* Section: Pedidos Activos (Merchants Only) */}
          {profile?.role === 'vendor' && pendingSales.length > 0 && (
            <>
              <Text className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mb-4 ml-4 mt-8">Gestión de Pedidos</Text>
              <View className="bg-white rounded-[32px] overflow-hidden shadow-sm border border-slate-100 mb-8 p-6">
                {fetchingSales ? (
                  <ActivityIndicator color="#8b5cf6" />
                ) : (
                  <View className="space-y-6">
                    {pendingSales.map((sale) => {
                      const style = getStatusStyle(sale.status);
                      const StatusIcon = style.icon;
                      return (
                        <View key={sale.id} className="bg-slate-50 p-5 rounded-[28px] border border-slate-100 mb-4">
                          <View className="flex-row justify-between items-start mb-4">
                            <View className="flex-1 mr-4">
                              <Text className="text-slate-900 font-black text-base">{sale.profiles?.full_name || 'Alguien'}</Text>
                              <Text className="text-slate-500 text-[10px] uppercase font-bold tracking-tight mb-2">"{sale.products?.title}"</Text>
                              <View style={{ backgroundColor: style.bg }} className="flex-row items-center self-start px-3 py-1.5 rounded-xl border border-white">
                                <StatusIcon size={12} color={style.text} />
                                <Text style={{ color: style.text }} className="font-black text-[10px] uppercase ml-2">{style.label}</Text>
                              </View>
                            </View>
                            {sale.profiles?.avatar_url && (
                              <Image source={{ uri: sale.profiles.avatar_url }} className="w-12 h-12 rounded-full border-2 border-white shadow-sm" />
                            )}
                          </View>

                          <View className="flex-row flex-wrap gap-2 pt-4 border-t border-slate-200/50">
                            {sale.status === 'pending' && (
                              <TouchableOpacity
                                onPress={() => updateOrderStatus(sale.id, 'confirmed')}
                                className="bg-indigo-600 h-10 px-4 rounded-xl items-center justify-center"
                              >
                                <Text className="text-white font-black text-xs uppercase">Confirmar</Text>
                              </TouchableOpacity>
                            )}
                            {sale.status === 'confirmed' && (
                              <TouchableOpacity
                                onPress={() => updateOrderStatus(sale.id, 'preparing')}
                                className="bg-yellow-500 h-10 px-4 rounded-xl items-center justify-center"
                              >
                                <Text className="text-white font-black text-xs uppercase">Preparar</Text>
                              </TouchableOpacity>
                            )}
                            {['confirmed', 'preparing'].includes(sale.status) && (
                              <TouchableOpacity
                                onPress={() => updateOrderStatus(sale.id, 'shipped')}
                                className="bg-purple-600 h-10 px-4 rounded-xl items-center justify-center"
                              >
                                <Text className="text-white font-black text-xs uppercase">Enviado</Text>
                              </TouchableOpacity>
                            )}
                            {['shipped'].includes(sale.status) && (
                              <TouchableOpacity
                                onPress={() => updateOrderStatus(sale.id, 'delivered')}
                                className="bg-emerald-600 h-10 px-4 rounded-xl items-center justify-center"
                              >
                                <Text className="text-white font-black text-xs uppercase">Entregado</Text>
                              </TouchableOpacity>
                            )}
                            {['pending', 'confirmed'].includes(sale.status) && (
                              <TouchableOpacity
                                onPress={() => updateOrderStatus(sale.id, 'cancelled')}
                                className="bg-red-50 h-10 px-4 rounded-xl items-center justify-center border border-red-100"
                              >
                                <Text className="text-red-500 font-black text-xs uppercase">Cancelar</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            </>
          )}

          {/* Section: Mis Seguimientos (Neighbors Only) */}
          {profile?.role !== 'vendor' && profile?.role?.toLowerCase().trim() !== 'admin' && (
            <>
              <Text className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mb-4 ml-4 mt-8">Mis Compras y Seguimientos</Text>
              <View className="bg-white rounded-[32px] overflow-hidden shadow-sm border border-slate-100 mb-8 p-6">
                {purchaseHistory.length > 0 ? (
                  <View className="space-y-4">
                    {purchaseHistory.map((pur) => {
                      const style = getStatusStyle(pur.status);
                      const StatusIcon = style.icon;
                      return (
                        <View key={pur.id} className="flex-row items-center mb-6 last:mb-0">
                          <View className="w-12 h-12 bg-indigo-50 rounded-2xl items-center justify-center mr-4 border border-indigo-100">
                            <StatusIcon size={20} color={style.text} />
                          </View>
                          <View className="flex-1">
                            <View className="flex-row justify-between items-center mb-1">
                              <Text className="text-slate-900 font-black text-sm pr-2" numberOfLines={1}>{pur.products?.title}</Text>
                              <View style={{ backgroundColor: style.bg }} className="px-2 py-0.5 rounded-lg">
                                <Text style={{ color: style.text }} className="text-[8px] font-black uppercase">{style.label}</Text>
                              </View>
                            </View>
                            <Text className="text-slate-400 text-[10px] uppercase font-bold tracking-tight">
                              Vendedor: {pur.merchant_name} • {new Date(pur.created_at).toLocaleDateString()}
                            </Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                ) : (
                  <View className="items-center py-4">
                    <Text className="text-slate-400 font-bold text-sm italic">Sin compras registradas aún.</Text>
                  </View>
                )}
              </View>
            </>
          )}

          {/* Section: Historial de Ventas (Vendor Only) */}
          {profile?.role === 'vendor' && (
            <>
              <Text className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mb-4 ml-4 mt-8">Mis Ventas del Año</Text>
              <View className="bg-white rounded-[32px] overflow-hidden shadow-sm border border-slate-100 mb-8 p-6">
                {salesHistory.length > 0 ? (
                  <View className="space-y-3">
                    {salesHistory.map((sale) => (
                      <View key={sale.id} className="flex-row items-center mb-4">
                        <View className="w-10 h-10 bg-emerald-50 rounded-2xl items-center justify-center mr-4">
                          <DollarSign size={18} color="#059669" />
                        </View>
                        <View className="flex-1">
                          <Text className="text-slate-900 font-bold text-sm">{sale.products?.title}</Text>
                          <Text className="text-slate-400 text-[10px] uppercase font-bold tracking-tight">
                            Comprador: {sale.profiles?.full_name || 'Vecino'} • {new Date(sale.created_at).toLocaleDateString()}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                ) : (
                  <View className="items-center py-4">
                    <Text className="text-slate-400 font-bold text-sm italic">Aún no has confirmado ventas este año.</Text>
                  </View>
                )}
              </View>
            </>
          )}

          {/* Section: Soporte */}
          <Text className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mb-4 ml-4">Soporte</Text>
          <View className="bg-white rounded-[32px] overflow-hidden shadow-sm border border-slate-100 mb-8">
            <TouchableOpacity
              onPress={() => setIsSupportModalVisible(true)}
              activeOpacity={0.6}
              className="flex-row items-center p-5 border-b border-slate-50"
            >
              <View className="w-10 h-10 bg-brand-50 rounded-2xl items-center justify-center mr-4">
                <HelpCircle size={20} color="#8b5cf6" />
              </View>
              <View className="flex-1">
                <Text className="text-slate-700 font-bold">Ayuda y Soporte</Text>
                <Text className="text-slate-400 text-[10px] font-medium">Contacta con administración</Text>
              </View>
              <ChevronRight size={20} color="#cbd5e1" />
            </TouchableOpacity>

            {/* Remove Admin Panel Link from profile as it is now a tab */}
          </View>

          {/* Sign Out Button */}
          <TouchableOpacity
            onPress={handleSignOut}
            activeOpacity={0.8}
            style={styles.signOutBtn}
          >
            <LogOut size={20} color="#e11d48" />
            <Text className="text-accent-600 font-black text-base ml-3">Cerrar Sesión</Text>
          </TouchableOpacity>
          <Text className="text-slate-400 text-center mt-12 text-xs font-medium">Versión 1.0.0</Text>
        </View>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        visible={isEditModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View className="bg-white rounded-t-[50px] p-8 h-[80%]">
            <View className="flex-row justify-between items-center mb-8">
              <Text className="text-3xl font-black text-slate-900">Editar Perfil</Text>
              <TouchableOpacity onPress={() => setIsEditModalVisible(false)} className="w-10 h-10 bg-slate-100 rounded-full items-center justify-center">
                <X size={24} color="#0F172A" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Avatar Picker */}
              <View className="items-center mb-8">
                <TouchableOpacity onPress={pickImage} activeOpacity={0.8} className="relative">
                  <View className="w-32 h-32 bg-brand-100 rounded-[40px] items-center justify-center border-4 border-white shadow-lg overflow-hidden">
                    {newAvatar ? (
                      <Image source={{ uri: newAvatar }} className="w-full h-full" />
                    ) : (
                      <UserIcon size={64} color="#8b5cf6" />
                    )}
                  </View>
                  <View className="absolute bottom-0 right-0 bg-brand-600 w-10 h-10 rounded-2xl items-center justify-center border-2 border-white shadow-sm">
                    <Camera size={20} color="white" />
                  </View>
                </TouchableOpacity>
                <Text className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-4">Toca para cambiar foto</Text>
              </View>

              {/* Form */}
              <View className="space-y-6">
                <View>
                  <Text className="text-slate-700 font-bold mb-3 ml-2">Nombre completo</Text>
                  <TextInput
                    value={newName}
                    onChangeText={setNewName}
                    placeholder="Tu nombre"
                    className="bg-slate-50 p-5 rounded-3xl border border-slate-100 text-slate-900 font-bold"
                  />
                </View>
              </View>

              <TouchableOpacity
                onPress={handleUpdateProfile}
                disabled={updating}
                activeOpacity={0.8}
                className={`w-full p-6 rounded-[32px] flex-row items-center justify-center shadow-xl mt-10 ${updating ? 'bg-brand-400' : 'bg-brand-600'}`}
              >
                {updating ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <Check size={24} color="white" />
                    <Text className="text-white font-black text-xl ml-3">Guardar Cambios</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Support Ticket Modal */}
      <Modal
        visible={isSupportModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsSupportModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View className="bg-white rounded-t-[50px] p-8 h-[90%]">
            <View className="flex-row justify-between items-center mb-8">
              <View>
                <Text className="text-3xl font-black text-slate-900">Soporte</Text>
                <Text className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-1">Centro de Ayuda</Text>
              </View>
              <TouchableOpacity onPress={() => setIsSupportModalVisible(false)} className="w-10 h-10 bg-slate-100 rounded-full items-center justify-center">
                <X size={24} color="#0F172A" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
              <View className="bg-brand-50 p-6 rounded-[32px] border border-brand-100 mb-8">
                <Text className="text-brand-900 font-black text-base mb-2">¿Cómo podemos ayudarte?</Text>
                <Text className="text-brand-600 text-xs font-medium leading-relaxed">
                  Envíanos un mensaje y el equipo de administración te responderá lo antes posible.
                </Text>
              </View>

              <View className="space-y-6">
                <View>
                  <Text className="text-slate-700 font-bold mb-3 ml-2">Asunto</Text>
                  <TextInput
                    value={ticketSubject}
                    onChangeText={setTicketSubject}
                    placeholder="Ej: Problema con un pedido"
                    placeholderTextColor="#94A3B8"
                    className="bg-slate-50 p-5 rounded-3xl border border-slate-100 text-slate-900 font-bold"
                  />
                </View>

                <View>
                  <Text className="text-slate-700 font-bold mb-3 ml-2">Mensaje</Text>
                  <TextInput
                    value={ticketMessage}
                    onChangeText={setTicketMessage}
                    placeholder="Describe tu problema en detalle..."
                    placeholderTextColor="#94A3B8"
                    multiline
                    numberOfLines={6}
                    textAlignVertical="top"
                    style={{ minHeight: 150 }}
                    className="bg-slate-50 p-5 rounded-3xl border border-slate-100 text-slate-900 font-bold"
                  />
                </View>

                <TouchableOpacity
                  onPress={handleSubmitTicket}
                  disabled={submittingTicket}
                  activeOpacity={0.8}
                  style={{ marginTop: 20 }}
                  className={`w-full p-6 rounded-[32px] flex-row items-center justify-center shadow-xl ${submittingTicket ? 'bg-brand-400' : 'bg-brand-600'}`}
                >
                  {submittingTicket ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <>
                      <MessageCircle size={24} color="white" />
                      <Text className="text-white font-black text-xl ml-3">Enviar Ticket</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              {/* My Tickets List */}
              {myTickets.length > 0 && (
                <View style={{ marginTop: 40 }}>
                  <Text className="text-slate-900 font-black text-xl mb-6">Mis Tickets</Text>
                  {myTickets.map((ticket) => (
                    <View key={ticket.id} className="bg-slate-50 p-6 rounded-[32px] border border-slate-100 mb-4">
                      <View className="flex-row justify-between items-start mb-2">
                        <Text className="text-slate-900 font-bold text-base flex-1 mr-2">{ticket.subject}</Text>
                        <View className={`px-3 py-1 rounded-full ${ticket.status === 'open' ? 'bg-red-100' : ticket.status === 'resolved' ? 'bg-green-100' : 'bg-brand-100'}`}>
                          <Text className={`text-[9px] font-black uppercase ${ticket.status === 'open' ? 'text-red-600' : ticket.status === 'resolved' ? 'text-green-600' : 'text-brand-600'}`}>
                            {ticket.status === 'open' ? 'Abierto' : ticket.status === 'resolved' ? 'Resuelto' : 'En Proceso'}
                          </Text>
                        </View>
                      </View>
                      <Text className="text-slate-500 text-xs mb-4">{ticket.message}</Text>

                      {ticket.admin_reply && (
                        <View className="bg-white p-4 rounded-2xl border border-slate-100 mt-2">
                          <Text className="text-brand-600 font-black text-[9px] uppercase tracking-widest mb-2">Respuesta de Admin:</Text>
                          <Text className="text-slate-700 text-xs italic">{ticket.admin_reply}</Text>
                        </View>
                      )}
                      <Text className="text-slate-300 text-[9px] font-bold uppercase mt-4">
                        {new Date(ticket.created_at).toLocaleDateString()}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  profileAvatarContainer: {
    width: 112,
    height: 112,
    backgroundColor: '#7c3aed',
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 4,
    borderColor: 'white',
    overflow: 'hidden',
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 25,
    elevation: 10,
  },
  sectionCard: {
    backgroundColor: 'white',
    borderRadius: 32,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    marginBottom: 32,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  managePostsIcon: {
    width: 48,
    height: 48,
    backgroundColor: '#7c3aed',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ffe4e6',
    borderRadius: 32,
    marginTop: 16,
    shadowColor: '#e11d48',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  }
});
