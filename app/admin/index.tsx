import { logAdminAction } from '@/lib/admin_logger';
import { broadcastPushNotification } from '@/lib/notification_sender';
import { supabase } from '@/lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import {
    Activity,
    AlertCircle,
    AlertTriangle,
    BadgeCheck,
    Calendar,
    Camera,
    ChevronLeft,
    Clock,
    DollarSign,
    Flag,
    History as HistoryLogIcon,
    Image as ImageIcon,
    Info,
    LayoutGrid,
    MapPin,
    Megaphone,
    MessageSquare,
    Package,
    Phone,
    Search,
    Send,
    ShieldCheck,
    Sparkles,
    Star,
    ToggleRight as ToggleIcon,
    Trash2,
    TrendingUp,
    Trophy,
    UserMinus,
    UserPlus,
    Users,
    X
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

export default function AdminDashboard() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(false);
    const [announcements, setAnnouncements] = useState<any[]>([]);
    const [stats, setStats] = useState({ users: 0, vendors: 0, products: 0 });
    const [refreshing, setRefreshing] = useState(false);

    // New state for Tabs
    const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'products' | 'reviews' | 'activity' | 'gallery' | 'categories' | 'reports' | 'banners' | 'audit'>('dashboard');
    const [auditLogs, setAuditLogs] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [reviews, setReviews] = useState<any[]>([]);
    const [activityLogs, setActivityLogs] = useState<any[]>([]);
    const [galleryProducts, setGalleryProducts] = useState<any[]>([]);
    const [categoriesConfig, setCategoriesConfig] = useState<string[]>(['Comida', 'Almacén', 'Servicios', 'Tecnología', 'Otros']);
    const [reports, setReports] = useState<any[]>([]);
    const [banners, setBanners] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [whatsappContactsCount, setWhatsappContactsCount] = useState(0);

    // Advanced Metrics State
    const [confirmedContactsCount, setConfirmedContactsCount] = useState(0);
    const [conversionRate, setConversionRate] = useState(0);
    const [topProducts, setTopProducts] = useState<any[]>([]);
    const [topSellers, setTopSellers] = useState<any[]>([]);
    const [openTicketsCount, setOpenTicketsCount] = useState(0);

    // Real-time Intelligence State
    const [onlineCount, setOnlineCount] = useState(0);
    const [economicVolume, setEconomicVolume] = useState(0);
    const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);
    const [selectedUser, setSelectedUser] = useState<any | null>(null);
    const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
    const [showUserModal, setShowUserModal] = useState(false);
    const [showProductModal, setShowProductModal] = useState(false);
    const [targetedMessage, setTargetedMessage] = useState('');
    const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [showBannerModal, setShowBannerModal] = useState(false);
    const [newBanner, setNewBanner] = useState({ image_url: '', title: '', description: '', link_route: '' });
    const [pickingImage, setPickingImage] = useState(false);

    // Ban System State
    const [banDuration, setBanDuration] = useState('');
    const [banReason, setBanReason] = useState('');

    const handleToggleVerification = async () => {
        if (!selectedUser) return;

        const isVendor = selectedUser.role?.toLowerCase() === 'vendor';
        console.log(`[Admin] Toggle verification for ${selectedUser.full_name}. Role: ${selectedUser.role}, IsVerified: ${selectedUser.is_verified}`);

        if (!isVendor) {
            Alert.alert('Acción no permitida', 'Solo los usuarios con el rol de Comerciante pueden ser verificados.');
            return;
        }

        try {
            setIsActionLoading(true);
            const newStatus = !selectedUser.is_verified;
            console.log(`[Admin] Updating verification to: ${newStatus}`);

            const { error } = await supabase
                .from('profiles')
                .update({ is_verified: newStatus })
                .eq('id', selectedUser.id);

            if (error) {
                console.error('[Admin] Error de Supabase al verificar:', error);
                throw error;
            }

            Alert.alert(
                newStatus ? 'Vendedor Verificado' : 'Verificación Removida',
                newStatus ? 'Se ha otorgado el sello de confianza.' : 'Se ha retirado el sello de confianza.'
            );

            await logAdminAction(
                newStatus ? 'verify_vendor' : 'unverify_vendor',
                selectedUser.id,
                'user',
                { full_name: selectedUser.full_name }
            );

            // Refresh local state to reflect change immediately in modal if open
            const updatedUser = { ...selectedUser, is_verified: newStatus };
            setSelectedUser(updatedUser);

            // Also update the user in the main list immediately for better UX
            setUsers(prev => prev.map(u => u.id === selectedUser.id ? updatedUser : u));

            fetchData();
        } catch (err: any) {
            console.error('[Admin] Error al capturar verificación:', err);
            Alert.alert('Error', err.message);
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleUnbanUser = async () => {
        if (!selectedUser) return;

        try {
            setIsActionLoading(true);
            const { error } = await supabase
                .from('profiles')
                .update({
                    banned_until: null,
                    ban_reason: null
                })
                .eq('id', selectedUser.id);

            if (error) throw error;

            Alert.alert('Ban Levantado', 'El usuario ya puede acceder nuevamente a la plataforma.');
            await logAdminAction('unban_user', selectedUser.id, 'user', { full_name: selectedUser.full_name });
            setShowUserModal(false);
            fetchData();
        } catch (err: any) {
            Alert.alert('Error', err.message);
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleBanUser = async () => {
        if (!selectedUser || !banDuration || !banReason) {
            Alert.alert('Error', 'Debes ingresar duración y motivo.');
            return;
        }

        const days = parseInt(banDuration);
        if (isNaN(days) || days <= 0) {
            Alert.alert('Error', 'La duración debe ser un número válido de días.');
            return;
        }

        const bannedUntil = new Date();
        bannedUntil.setDate(bannedUntil.getDate() + days);

        try {
            setIsActionLoading(true);
            const { error } = await supabase
                .from('profiles')
                .update({
                    banned_until: bannedUntil.toISOString(),
                    ban_reason: banReason
                })
                .eq('id', selectedUser.id);

            if (error) throw error;

            Alert.alert('Usuario Baneado', `El usuario ha sido suspendido por ${days} días.`);
            await logAdminAction('ban_user', selectedUser.id, 'user', {
                full_name: selectedUser.full_name,
                duration_days: days,
                reason: banReason
            });
            setBanDuration('');
            setBanReason('');
            setShowUserModal(false);
            fetchData();
        } catch (err: any) {
            Alert.alert('Error', err.message);
        } finally {
            setIsActionLoading(false);
        }
    };

    const fetchData = async () => {
        try {
            setLoading(true);

            // Fetch open tickets count (Always fetch for notification dot)
            const { count: supportCount, error: supportErr } = await supabase
                .from('support_tickets')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'open');

            if (supportErr) {
                console.error('[Admin] Error al obtener el conteo de soporte:', supportErr);
                // If table is missing, this will fail. We set to 0 to avoid crashing.
                setOpenTicketsCount(0);
            } else {
                setOpenTicketsCount(supportCount || 0);
            }

            // Fetch announcements (Dashboard)
            if (activeTab === 'dashboard') {
                const { data: annData } = await supabase
                    .from('system_announcements')
                    .select('*')
                    .order('created_at', { ascending: false });
                setAnnouncements(annData || []);

                const { count: userCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'client');
                const { count: vendorCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'vendor');
                const { count: productCount } = await supabase.from('products').select('*', { count: 'exact', head: true });

                setStats({
                    users: userCount || 0,
                    vendors: vendorCount || 0,
                    products: productCount || 0
                });

                // Fetch Economic Volume
                const { data: allProds } = await supabase.from('products').select('price');
                const total = allProds?.reduce((acc, p) => acc + (p.price || 0), 0) || 0;
                setEconomicVolume(total);

                // Fetch Maintenance Status
                const { data: config } = await supabase.from('app_config').select('value').eq('key', 'maintenance_mode').single();
                setMaintenanceEnabled(config?.value?.enabled || false);

                // Fetch WhatsApp Metrics
                const { count: waCount } = await supabase.from('product_contacts').select('*', { count: 'exact', head: true });
                setWhatsappContactsCount(waCount || 0);

                const { count: confirmedCount } = await supabase.from('product_contacts').select('*', { count: 'exact', head: true }).eq('status', 'confirmed');
                setConfirmedContactsCount(confirmedCount || 0);

                if (waCount && waCount > 0) {
                    setConversionRate(((confirmedCount || 0) / waCount) * 100);
                }

                // Fetch Top Products
                const { data: topProds } = await supabase
                    .from('products')
                    .select('id, title, view_count, price')
                    .order('view_count', { ascending: false })
                    .limit(5);
                setTopProducts(topProds || []);

                // Fetch Top Sellers (by confirmed sales)
                const { data: confirmedSales } = await supabase
                    .from('product_contacts')
                    .select('merchant_id')
                    .eq('status', 'confirmed');

                if (confirmedSales && confirmedSales.length > 0) {
                    const sellerSalesMap: Record<string, number> = {};
                    confirmedSales.forEach(s => {
                        sellerSalesMap[s.merchant_id] = (sellerSalesMap[s.merchant_id] || 0) + 1;
                    });

                    const sortedSellerIds = Object.keys(sellerSalesMap).sort((a, b) => sellerSalesMap[b] - sellerSalesMap[a]).slice(0, 5);
                    const { data: sellersInfo } = await supabase.from('profiles').select('id, full_name').in('id', sortedSellerIds);

                    const topSellersList = sortedSellerIds.map(id => ({
                        id,
                        full_name: sellersInfo?.find(s => s.id === id)?.full_name || 'Desconocido',
                        sales_count: sellerSalesMap[id]
                    }));
                    setTopSellers(topSellersList);
                }
            }

            // Fetch Online Count (Always)
            const fiveMinsAgo = new Date(Date.now() - 300000).toISOString();
            const { count: activeCount } = await supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true })
                .gt('last_seen', fiveMinsAgo);

            if (activeCount !== null) {
                setOnlineCount(prev => Math.max(prev, activeCount));
            }

            // Fetch Activity Feed
            if (activeTab === 'activity') {
                const [
                    { data: usersLog },
                    { data: productsLog },
                    { data: reviewsLog }
                ] = await Promise.all([
                    supabase.from('profiles').select('id, full_name, created_at').order('created_at', { ascending: false }).limit(10),
                    supabase.from('products').select('id, title, created_at').order('created_at', { ascending: false }).limit(10),
                    supabase.from('product_reviews').select('id, comment, created_at').order('created_at', { ascending: false }).limit(10)
                ]);

                const combined = [
                    ...(usersLog || []).map(u => ({ ...u, type: 'user', icon: 'user' })),
                    ...(productsLog || []).map(p => ({ ...p, type: 'product', icon: 'package' })),
                    ...(reviewsLog || []).map(r => ({ ...r, type: 'review', icon: 'message' }))
                ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

                setActivityLogs(combined);
            }

            // Fetch Gallery (just all products for now, but focus on visuals)
            if (activeTab === 'gallery') {
                const { data } = await supabase.from('products').select('*').order('created_at', { ascending: false });
                setGalleryProducts(data || []);
            }

            // Fetch Categories (from app_config)
            if (activeTab === 'categories') {
                const { data } = await supabase.from('app_config').select('value').eq('key', 'product_categories').single();
                if (data?.value && Array.isArray(data.value) && data.value.length > 0) {
                    setCategoriesConfig(data.value);
                }
            }

            // Fetch Reports
            if (activeTab === 'reports') {
                // We try to fetch from product_reports, if it fails because table doesn't exist, we fallback
                const { data, error } = await supabase.from('product_reports').select('*, products(title), profiles!reporter_id(full_name)').order('created_at', { ascending: false });
                if (!error) {
                    setReports(data || []);
                } else {
                    console.log('La tabla product_reports podría no existir aún:', error.message);
                    setReports([]);
                }
            }

            // Fetch Users
            if (activeTab === 'users') {
                console.log('[Admin] Obteniendo todos los usuarios...');
                let query = supabase.from('profiles').select('*').order('last_seen', { ascending: false });
                if (searchQuery) {
                    query = query.or(`full_name.ilike.%${searchQuery}%,role.ilike.%${searchQuery}%`);
                }
                const { data: userData, error } = await query;
                if (error) console.error('[Admin] Error al obtener usuarios:', error);

                if (userData && userData.length > 0) {
                    console.log('[Admin] Muestra del primer usuario:', JSON.stringify(userData[0], null, 2));
                    console.log('[Admin] Verificar campos de baneo en los datos:', {
                        has_banned_until: 'banned_until' in userData[0],
                        has_ban_reason: 'ban_reason' in userData[0]
                    });
                }

                setUsers(userData || []);
            }

            // Fetch Products
            if (activeTab === 'products') {
                let query = supabase.from('products').select('*').order('view_count', { ascending: false });
                if (searchQuery) {
                    query = query.ilike('title', `%${searchQuery}%`);
                }
                const { data: prodData } = await query;

                if (prodData && prodData.length > 0) {
                    const sellerIds = [...new Set(prodData.map(p => p.user_id).filter(id => !!id))];
                    const { data: sellers } = await supabase.from('profiles').select('id, full_name').in('id', sellerIds);

                    const sellerMap: Record<string, string> = {};
                    sellers?.forEach(s => { sellerMap[s.id] = s.full_name; });

                    const formatted = prodData.map(p => ({
                        ...p,
                        profiles: { full_name: sellerMap[p.user_id] || 'Desconocido' }
                    }));
                    setProducts(formatted);
                } else {
                    setProducts([]);
                }
            }

            // Fetch Reviews (Manual Join for robustness)
            if (activeTab === 'reviews') {
                let query = supabase
                    .from('product_reviews')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (searchQuery) {
                    query = query.ilike('comment', `%${searchQuery}%`);
                }
                const { data: reviewData } = await query;

                if (reviewData && reviewData.length > 0) {
                    const reviewerIds = [...new Set(reviewData.map(r => r.user_id).filter(id => !!id))];
                    const productIds = [...new Set(reviewData.map(r => r.product_id).filter(id => !!id))];

                    const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', reviewerIds);
                    const { data: prods } = await supabase.from('products').select('id, title').in('id', productIds);

                    const profileMap: Record<string, string> = {};
                    profiles?.forEach(p => { profileMap[p.id] = p.full_name; });

                    const productMap: Record<string, string> = {};
                    prods?.forEach(p => { productMap[p.id] = p.title; });

                    const formatted = reviewData.map(r => ({
                        ...r,
                        profiles: { full_name: profileMap[r.user_id] || 'Anónimo' },
                        products: { title: productMap[r.product_id] || 'Producto Eliminado' }
                    }));
                    setReviews(formatted);
                } else {
                    setReviews([]);
                }
            }

            // Fetch Banners
            if (activeTab === 'banners') {
                const { data } = await supabase
                    .from('promotional_banners')
                    .select('*')
                    .order('created_at', { ascending: false });
                setBanners(data || []);
            }


            // Fetch Audit Logs
            if (activeTab === 'audit') {
                const { data, error } = await supabase
                    .from('admin_audit_logs')
                    .select('*, profiles!admin_id(full_name)')
                    .order('created_at', { ascending: false });

                if (!error) {
                    setAuditLogs(data || []);
                } else {
                    console.error('[Admin] Error al obtener logs de auditoría:', error);
                }
            }

        } catch (err) {
            console.error('Error fetching admin data:', err);
        } finally {
            setLoading(false);
        }
    };

    // Presence / Realtime Channel
    useEffect(() => {
        const channel = supabase.channel('online-users');

        channel
            .on('presence', { event: 'sync' }, () => {
                const state = channel.presenceState();
                const uniqueUsers = Object.keys(state).length;
                // Only update if presence detects more users than our DB fallback
                setOnlineCount(prev => Math.max(prev, uniqueUsers));
            })
            .subscribe();

        return () => {
            // Unsubscribe from this channel instance without removing it globally from the client
            channel.unsubscribe();
        };
    }, []);

    useEffect(() => {
        fetchData();
    }, [activeTab, searchQuery]);

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchData();
        setRefreshing(false);
    };

    const handleBroadcast = async () => {
        if (!title.trim() || !content.trim()) {
            Alert.alert('Campos incompletos', 'Por favor ingresa un título y mensaje.');
            return;
        }

        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();

            const { error } = await supabase
                .from('system_announcements')
                .insert({
                    title: title.trim(),
                    content: content.trim(),
                    user_id: user?.id,
                    type: 'info',
                    is_active: true
                });

            if (error) throw error;

            Alert.alert('¡Éxito!', 'Notificación enviada correctamente.');
            await logAdminAction('broadcast_announcement', undefined, 'system', { title: title.trim() });

            // Send real push notifications to everyone
            broadcastPushNotification(
                `📢 ${title.trim()}`,
                content.trim(),
                { type: 'broadcast' }
            );

            setTitle('');
            setContent('');
            fetchData();
        } catch (err: any) {
            Alert.alert('Error', err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateUserRole = async (userId: string, newRole: string) => {
        try {
            setIsActionLoading(true);
            const { error } = await supabase
                .from('profiles')
                .update({ role: newRole })
                .eq('id', userId);

            if (error) throw error;
            Alert.alert('Éxito', `Usuario actualizado a ${newRole}.`);
            fetchData();
        } catch (err: any) {
            Alert.alert('Error', err.message);
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleDeleteUser = async (userId: string) => {
        Alert.alert(
            '¡Atención!',
            '¿Estás seguro de eliminar este usuario? Esta acción es irreversible y eliminará su perfil.',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Eliminar definitivamente',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setIsActionLoading(true);
                            // Note: In Supabase, deleting from profiles will only work if there's no auth restriction
                            // Most systems use an edge function to delete the auth user as well.
                            const { error } = await supabase.from('profiles').delete().eq('id', userId);
                            if (error) throw error;
                            Alert.alert('Eliminado', 'Usuario eliminado correctamente.');
                            await logAdminAction('delete_user', userId, 'user');
                            fetchData();
                        } catch (err: any) {
                            Alert.alert('Error', err.message);
                        } finally {
                            setIsActionLoading(false);
                        }
                    }
                }
            ]
        );
    };

    const handleDeleteProduct = async (productId: string) => {
        Alert.alert(
            'Eliminar Producto',
            '¿Estás seguro de eliminar este producto del mercado?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Eliminar',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setIsActionLoading(true);
                            const { error } = await supabase.from('products').delete().eq('id', productId);
                            if (error) throw error;
                            await logAdminAction('delete_product', productId, 'product');
                            fetchData();
                        } catch (err: any) {
                            Alert.alert('Error', err.message);
                        } finally {
                            setIsActionLoading(false);
                        }
                    }
                }
            ]
        );
    };

    const pickBannerImage = async () => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permiso Denegado', 'Necesitamos acceso a tu galería para subir el banner.');
                return;
            }

            setPickingImage(true);
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [16, 9],
                quality: 0.8,
                base64: true, // Enable base64
            });

            if (!result.canceled) {
                // If we have base64, we store it in a way we can identify later
                const base64Data = result.assets[0].base64;
                if (base64Data) {
                    setNewBanner(prev => ({ ...prev, image_url: `base64:${base64Data}` }));
                } else {
                    setNewBanner(prev => ({ ...prev, image_url: result.assets[0].uri }));
                }
            }
        } catch (err) {
            console.error('[Selector] Error al seleccionar imagen:', err);
        } finally {
            setPickingImage(false);
        }
    };

    const handleCreateBanner = async () => {
        if (!newBanner.image_url) {
            Alert.alert('Error', 'Debes seleccionar o ingresar una imagen.');
            return;
        }

        setIsActionLoading(true);
        try {
            let finalImageUrl = newBanner.image_url;

            // If it's a base64 encoded string from our picker
            if (newBanner.image_url.startsWith('base64:')) {
                const base64Content = newBanner.image_url.split('base64:')[1];
                const filename = `banner_${Date.now()}.jpg`;

                // Helper to convert base64 to ArrayBuffer (more stable in RN than Blob/FormData)
                const base64ToArrayBuffer = (base64: string) => {
                    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
                    const lookup = new Uint8Array(256);
                    for (let i = 0; i < chars.length; i++) lookup[chars.charCodeAt(i)] = i;

                    const len = base64.length;
                    let bufferLength = len * 0.75;
                    if (base64[len - 1] === '=') bufferLength--;
                    if (base64[len - 2] === '=') bufferLength--;

                    const arrayBuffer = new ArrayBuffer(bufferLength);
                    const bytes = new Uint8Array(arrayBuffer);

                    for (let i = 0, j = 0; i < len; i += 4, j += 3) {
                        const encoded1 = lookup[base64.charCodeAt(i)];
                        const encoded2 = lookup[base64.charCodeAt(i + 1)];
                        const encoded3 = lookup[base64.charCodeAt(i + 2)];
                        const encoded4 = lookup[base64.charCodeAt(i + 3)];

                        bytes[j] = (encoded1 << 2) | (encoded2 >> 4);
                        bytes[j + 1] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
                        bytes[j + 2] = ((encoded3 & 3) << 6) | (encoded4 & 63);
                    }
                    return arrayBuffer;
                };

                const arrayBuffer = base64ToArrayBuffer(base64Content);

                const { data, error: uploadError } = await supabase.storage
                    .from('banners')
                    .upload(filename, arrayBuffer, {
                        contentType: 'image/jpeg',
                        upsert: true
                    });

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('banners')
                    .getPublicUrl(filename);

                finalImageUrl = publicUrl;
            } else if (newBanner.image_url.startsWith('file://') || newBanner.image_url.startsWith('content://')) {
                const filename = `banner_${Date.now()}.jpg`;
                // Use XMLHttpRequest because fetch().blob() is unstable in some RN environments
                const blob: any = await new Promise((resolve, reject) => {
                    const xhr = new XMLHttpRequest();
                    xhr.onload = function () {
                        resolve(xhr.response);
                    };
                    xhr.onerror = function (e) {
                        console.error('[XHR] Error al leer el archivo local:', e);
                        reject(new TypeError("Error al leer el archivo local para subirlo."));
                    };
                    xhr.responseType = "blob";
                    xhr.open("GET", newBanner.image_url, true);
                    xhr.send(null);
                });

                if (!blob) throw new Error("No se pudo generar el archivo para subir.");

                const { data, error: uploadError } = await supabase.storage
                    .from('banners')
                    .upload(filename, blob, {
                        contentType: 'image/jpeg',
                        upsert: true
                    });

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('banners')
                    .getPublicUrl(filename);

                finalImageUrl = publicUrl;
            }

            const { error } = await supabase.from('promotional_banners').insert([{
                ...newBanner,
                image_url: finalImageUrl
            }]);

            if (error) throw error;

            setShowBannerModal(false);
            setNewBanner({ image_url: '', title: '', description: '', link_route: '' });
            fetchData();
            Alert.alert('Éxito', 'Banner creado correctamente.');
        } catch (err: any) {
            console.error('[CrearBanner] Error:', err);
            Alert.alert('Error', err.message);
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleToggleBanner = async (bannerId: string, currentState: boolean) => {
        try {
            const { error } = await supabase.from('promotional_banners').update({ is_active: !currentState }).eq('id', bannerId);
            if (error) throw error;
            fetchData();
        } catch (err: any) {
            Alert.alert('Error', err.message);
        }
    };

    const handleDeleteBanner = async (bannerId: string) => {
        Alert.alert('Confirmar', '¿Estás seguro de eliminar este banner?', [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Eliminar',
                style: 'destructive',
                onPress: async () => {
                    try {
                        const { error } = await supabase.from('promotional_banners').delete().eq('id', bannerId);
                        if (error) throw error;
                        fetchData();
                    } catch (err: any) {
                        Alert.alert('Error', err.message);
                    }
                }
            }
        ]);
    };

    const handleDeleteReview = async (reviewId: string) => {
        Alert.alert(
            'Eliminar Reseña',
            '¿Borrar este comentario definitivamente?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Borrar',
                    style: 'destructive',
                    onPress: async () => {
                        const { error } = await supabase.from('product_reviews').delete().eq('id', reviewId);
                        if (!error) fetchData();
                    }
                }
            ]
        );
    };

    const handleToggleMaintenance = async () => {
        const newState = !maintenanceEnabled;

        Alert.alert(
            'Confirmar Acción',
            `¿Estás seguro que deseas ${newState ? 'ACTIVAR' : 'DESACTIVAR'} el modo mantenimiento?\n\n${newState ? 'Esto bloqueará el acceso a todos los usuarios excepto administradores.' : 'Esto permitirá el acceso normal a todos los usuarios.'}`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: newState ? 'Activar Mantenimiento' : 'Desactivar',
                    style: newState ? 'destructive' : 'default',
                    onPress: async () => {
                        console.log('[Admin] Cambiando mantenimiento. Actual:', maintenanceEnabled, 'Target:', newState);
                        try {
                            const { data, error } = await supabase
                                .from('app_config')
                                .upsert({
                                    key: 'maintenance_mode',
                                    value: { enabled: newState, message: 'La aplicación está en mantenimiento técnico.' },
                                    updated_at: new Date().toISOString()
                                }, { onConflict: 'key' })
                                .select();

                            console.log('[Admin] Upsert result:', { data, error });

                            if (error) throw error;
                            setMaintenanceEnabled(newState);
                            await logAdminAction('toggle_maintenance', undefined, 'system', { enabled: newState });
                            Alert.alert('Configuración Actualizada', `Modo mantenimiento ${newState ? 'ACTIVADO' : 'DESACTIVADO'}.`);
                        } catch (err: any) {
                            console.error('[Admin] Error al cambiar Mantenimiento:', err);
                            Alert.alert('Error', err.message);
                        }
                    }
                }
            ]
        );
    };

    const handleSendTargetedAlert = async () => {
        if (!targetedMessage.trim() || !selectedUser) {
            Alert.alert('Mensaje Vacío', 'Por favor escribe un mensaje para enviarlo.');
            return;
        }

        try {
            setIsActionLoading(true);
            const { data: { user: adminUser } } = await supabase.auth.getUser();

            const { error } = await supabase
                .from('system_announcements')
                .insert({
                    title: 'Alerta de Administrador',
                    content: targetedMessage.trim(),
                    user_id: adminUser?.id,
                    recipient_id: selectedUser.id,
                    type: 'alert',
                    is_active: true
                });

            if (error) throw error;

            Alert.alert('¡Enviado!', `Notificación enviada exitosamente a ${selectedUser.full_name}.`);
            setTargetedMessage('');
        } catch (err: any) {
            console.error('[Admin] Error al enviar alerta dirigida:', err);
            Alert.alert('Error', 'No se pudo enviar la notificación: ' + err.message);
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleToggleFeatured = async (productId: string, currentState: boolean) => {
        try {
            console.log('--- INICIO CAMBIO DE DESTACADO ---');
            console.log('ID:', productId, 'Actual:', currentState);
            setIsActionLoading(true);

            const { data, error } = await supabase
                .from('products')
                .update({ is_featured: !currentState })
                .eq('id', productId)
                .select();

            console.log('Respuesta de actualización de Supabase:', { data, error });

            if (error) {
                console.error('Detalle del error de actualización:', error);
                throw error;
            }

            if (!data || data.length === 0) {
                console.log('Aviso: No se actualizaron filas. Verifique si el ID existe y RLS permite actualizaciones.');
                Alert.alert('Aviso de Admin', 'No se actualizó ningún registro. Verifica que el producto exista y tengas permisos.');
            } else {
                console.log('Actualización exitosa, nuevo estado:', data[0].is_featured);
                Alert.alert('Sistema de Admin', `El producto se ha ${!currentState ? 'DESTACADO' : 'QUITADO DE DESTACADOS'} correctamente.`);
            }

            // Re-fetch to update UI
            await fetchData();
        } catch (err: any) {
            console.error('Error al cambiar destacado:', err);
            Alert.alert(
                'Error al Destacar',
                'No se pudo actualizar el estado.\n\nIMPORTANTE: Es probable que necesites ejecutar el siguiente comando en el SQL Editor de Supabase:\n\nALTER TABLE products ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE;'
            );
        } finally {
            console.log('--- FIN CAMBIO DE DESTACADO ---');
            setIsActionLoading(false);
        }
    };

    const handleDeleteAnnouncement = async (id: string) => {
        Alert.alert(
            'Eliminar Notificación',
            '¿Estás seguro de que quieres eliminar este anuncio?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Eliminar',
                    style: 'destructive',
                    onPress: async () => {
                        const { error } = await supabase
                            .from('system_announcements')
                            .delete()
                            .eq('id', id);

                        if (!error) fetchData();
                    }
                }
            ]
        );
    };

    const handleDeleteCategory = async (categoryName: string) => {
        Alert.alert(
            'Eliminar Categoría',
            `¿Estás seguro de eliminar "${categoryName}"? Los productos existentes mantendrán esta etiqueta pero no se podrá filtrar por ella fácilmente.`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Eliminar',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const newCategories = categoriesConfig.filter(c => c !== categoryName);
                            const { error } = await supabase
                                .from('app_config')
                                .upsert({
                                    key: 'product_categories',
                                    value: newCategories,
                                    updated_at: new Date().toISOString()
                                }, { onConflict: 'key' });
                            if (error) throw error;
                            setCategoriesConfig(newCategories);
                            fetchData();
                        } catch (err: any) {
                            Alert.alert('Error', err.message);
                        }
                    }
                }
            ]
        );
    };

    const handleAddCategory = () => {
        setShowAddCategoryModal(true);
    };

    const submitNewCategory = async () => {
        if (!newCategoryName.trim()) return;
        try {
            setIsActionLoading(true);
            const newCategories = [...categoriesConfig, newCategoryName.trim()];
            const { error } = await supabase
                .from('app_config')
                .upsert({
                    key: 'product_categories',
                    value: newCategories,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'key' });
            if (error) throw error;
            setCategoriesConfig(newCategories);
            setNewCategoryName('');
            setShowAddCategoryModal(false);
            fetchData();
        } catch (err: any) {
            Alert.alert('Error', err.message);
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleResolveReport = async (reportId: string) => {
        try {
            const { error } = await supabase
                .from('product_reports')
                .update({ status: 'resolved' })
                .eq('id', reportId);
            if (error) throw error;
            Alert.alert('Resuelto', 'El reporte ha sido marcado como revisado.');
            fetchData();
        } catch (err: any) {
            Alert.alert('Error', err.message);
        }
    };

    const handleRankProductClick = async (productId: string) => {
        try {
            setIsActionLoading(true);
            // Fetch product first
            const { data: product, error: pError } = await supabase
                .from('products')
                .select('*')
                .eq('id', productId)
                .single();

            if (pError) throw pError;

            if (product) {
                // Fetch seller details manually to avoid join/relationship errors
                const { data: profile, error: uError } = await supabase
                    .from('profiles')
                    .select('full_name')
                    .eq('id', product.user_id)
                    .single();

                // Format the object to match what the modal expects
                const formattedProduct = {
                    ...product,
                    profiles: { full_name: profile?.full_name || 'Desconocido' }
                };

                setSelectedProduct(formattedProduct);
                setShowProductModal(true);
            }
        } catch (err: any) {
            console.error('Error al seleccionar producto destacado:', err);
            Alert.alert('Error', 'No se pudo cargar el detalle del producto: ' + err.message);
        } finally {
            setIsActionLoading(false);
        }
    };


    const handleRankSellerClick = async (sellerId: string) => {
        try {
            setIsActionLoading(true);
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', sellerId)
                .single();

            if (error) throw error;
            if (data) {
                setSelectedUser(data);
                setShowUserModal(true);
            }
        } catch (err) {
            console.error('Error al seleccionar vendedor destacado:', err);
            Alert.alert('Error', 'No se pudo cargar el detalle del perfil.');
        } finally {
            setIsActionLoading(false);
        }
    };

    return (
        <SafeAreaView edges={['top']} style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={styles.backButton}
                >
                    <ChevronLeft size={24} color="#0F172A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Panel de Control</Text>
                <View style={{ width: 44 }} />
            </View>

            {/* Tab Navigation (Scrollable for narrow screens) */}
            <View style={{ backgroundColor: 'white' }}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.tabBar}
                >
                    <TouchableOpacity
                        onPress={() => setActiveTab('dashboard')}
                        style={[styles.tabItem, activeTab === 'dashboard' && styles.activeTabItem]}
                    >
                        <ShieldCheck size={18} color={activeTab === 'dashboard' ? '#8b5cf6' : '#94A3B8'} />
                        <Text style={[styles.tabText, activeTab === 'dashboard' && styles.activeTabText]}>Stats</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => setActiveTab('activity')}
                        style={[styles.tabItem, activeTab === 'activity' && styles.activeTabItem]}
                    >
                        <HistoryLogIcon size={18} color={activeTab === 'activity' ? '#8b5cf6' : '#94A3B8'} />
                        <Text style={[styles.tabText, activeTab === 'activity' && styles.activeTabText]}>Actividad</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => setActiveTab('gallery')}
                        style={[styles.tabItem, activeTab === 'gallery' && styles.activeTabItem]}
                    >
                        <ImageIcon size={18} color={activeTab === 'gallery' ? '#8b5cf6' : '#94A3B8'} />
                        <Text style={[styles.tabText, activeTab === 'gallery' && styles.activeTabText]}>Galería</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => setActiveTab('users')}
                        style={[styles.tabItem, activeTab === 'users' && styles.activeTabItem]}
                    >
                        <Users size={18} color={activeTab === 'users' ? '#8b5cf6' : '#94A3B8'} />
                        <Text style={[styles.tabText, activeTab === 'users' && styles.activeTabText]}>Usuarios</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => setActiveTab('products')}
                        style={[styles.tabItem, activeTab === 'products' && styles.activeTabItem]}
                    >
                        <Package size={18} color={activeTab === 'products' ? '#8b5cf6' : '#94A3B8'} />
                        <Text style={[styles.tabText, activeTab === 'products' && styles.activeTabText]}>Productos</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => setActiveTab('reviews')}
                        style={[styles.tabItem, activeTab === 'reviews' && styles.activeTabItem]}
                    >
                        <MessageSquare size={18} color={activeTab === 'reviews' ? '#8b5cf6' : '#94A3B8'} />
                        <Text style={[styles.tabText, activeTab === 'reviews' && styles.activeTabText]}>Reseñas</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => setActiveTab('categories')}
                        style={[styles.tabItem, activeTab === 'categories' && styles.activeTabItem]}
                    >
                        <LayoutGrid size={18} color={activeTab === 'categories' ? '#8b5cf6' : '#94A3B8'} />
                        <Text style={[styles.tabText, activeTab === 'categories' && styles.activeTabText]}>Categorías</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => setActiveTab('reports')}
                        style={[styles.tabItem, activeTab === 'reports' && styles.activeTabItem]}
                    >
                        <Flag size={18} color={activeTab === 'reports' ? '#8b5cf6' : '#94A3B8'} />
                        <Text style={[styles.tabText, activeTab === 'reports' && styles.activeTabText]}>Reportes</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => setActiveTab('banners')}
                        style={[styles.tabItem, activeTab === 'banners' && styles.activeTabItem]}
                    >
                        <ImageIcon size={18} color={activeTab === 'banners' ? '#8b5cf6' : '#94A3B8'} />
                        <Text style={[styles.tabText, activeTab === 'banners' && styles.activeTabText]}>Banners</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => setActiveTab('audit')}
                        style={[styles.tabItem, activeTab === 'audit' && styles.activeTabItem]}
                    >
                        <ShieldCheck size={18} color={activeTab === 'audit' ? '#8b5cf6' : '#94A3B8'} />
                        <Text style={[styles.tabText, activeTab === 'audit' && styles.activeTabText]}>Auditoría</Text>
                    </TouchableOpacity>
                </ScrollView>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ padding: 20 }}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8b5cf6" />
                }
            >
                {activeTab === 'dashboard' && (
                    <>
                        {/* Statistics Cards */}
                        <View className="flex-row flex-wrap justify-between gap-y-4 mb-4">
                            <View style={[styles.statCardSmall, { backgroundColor: '#EEF2FF', borderColor: '#C7D2FE' }]}>
                                <Users size={16} color="#4F46E5" />
                                <Text style={styles.statValueSmall}>{stats.users + stats.vendors}</Text>
                                <Text style={styles.statLabelSmall}>Registros</Text>
                            </View>
                            <View style={[styles.statCardSmall, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
                                <Activity size={16} color="#16A34A" />
                                <Text style={styles.statValueSmall}>{onlineCount}</Text>
                                <Text style={styles.statLabelSmall}>Online Ahora</Text>
                            </View>
                            <View style={[styles.statCardSmall, { backgroundColor: '#F5F5FF', borderColor: '#E0E7FF' }]}>
                                <BadgeCheck size={16} color="#6366F1" />
                                <Text style={styles.statValueSmall}>{confirmedContactsCount}</Text>
                                <Text style={styles.statLabelSmall}>Ventas</Text>
                            </View>
                            <View style={[styles.statCardSmall, { backgroundColor: '#FFFBEB', borderColor: '#FEF3C7' }]}>
                                <TrendingUp size={16} color="#D97706" />
                                <Text style={styles.statValueSmall}>{conversionRate.toFixed(1)}%</Text>
                                <Text style={styles.statLabelSmall}>Éxito</Text>
                            </View>
                            <View style={[styles.statCardSmall, { backgroundColor: '#FDF2F8', borderColor: '#FCE7F3' }]}>
                                <DollarSign size={16} color="#DB2777" />
                                <Text style={styles.statValueSmall}>${(economicVolume / 1000).toFixed(1)}k</Text>
                                <Text style={styles.statLabelSmall}>V. Mercado</Text>
                            </View>
                            <View style={[styles.statCardSmall, { backgroundColor: '#F0FDFA', borderColor: '#CCFBF1' }]}>
                                <Phone size={16} color="#0D9488" />
                                <Text style={styles.statValueSmall}>{whatsappContactsCount}</Text>
                                <Text style={styles.statLabelSmall}>WhatsApp</Text>
                            </View>
                        </View>

                        {/* Maintenance Mode Toggle */}
                        <TouchableOpacity
                            onPress={handleToggleMaintenance}
                            style={[
                                styles.maintenanceCard,
                                maintenanceEnabled ? styles.maintenanceActive : styles.maintenanceInactive
                            ]}
                        >
                            <View className="flex-row items-center justify-between">
                                <View className="flex-row items-center">
                                    <View className={`w-10 h-10 rounded-2xl items-center justify-center mr-3 ${maintenanceEnabled ? 'bg-red-100' : 'bg-slate-100'}`}>
                                        <AlertTriangle size={20} color={maintenanceEnabled ? '#EF4444' : '#64748B'} />
                                    </View>
                                    <View>
                                        <Text className={`font-black text-base ${maintenanceEnabled ? 'text-red-900' : 'text-slate-900'}`}>
                                            Modo Mantenimiento
                                        </Text>
                                        <Text className={`font-bold text-[10px] uppercase tracking-widest ${maintenanceEnabled ? 'text-red-500' : 'text-slate-400'}`}>
                                            {maintenanceEnabled ? 'BLOQUEO ACTIVO' : 'SIN RESTRICCIONES'}
                                        </Text>
                                    </View>
                                </View>
                                {maintenanceEnabled ? <ToggleIcon size={32} color="#EF4444" /> : <ToggleIcon size={32} color="#CBD5E1" style={{ transform: [{ rotate: '180deg' }] }} />}
                            </View>
                        </TouchableOpacity>


                        {/* Global Broadcast Form */}
                        <View style={styles.formContainer}>
                            <View className="flex-row items-center mb-6">
                                <View className="w-10 h-10 bg-brand-50 rounded-2xl items-center justify-center mr-3">
                                    <Megaphone size={20} color="#8b5cf6" />
                                </View>
                                <View>
                                    <Text className="text-slate-900 font-black text-lg">Difusión Global</Text>
                                    <Text className="text-slate-400 text-xs font-bold uppercase tracking-widest">Broadcast App-Wide</Text>
                                </View>
                            </View>

                            <View className="space-y-4">
                                <View>
                                    <Text className="text-slate-500 font-bold text-xs mb-2 ml-1">TÍTULO DEL ANUNCIO</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={title}
                                        onChangeText={setTitle}
                                        placeholder="Ej: Mantenimiento programado"
                                        placeholderTextColor="#94A3B8"
                                    />
                                </View>

                                <View>
                                    <Text className="text-slate-500 font-bold text-xs mb-2 ml-1">MENSAJE DETALLADO</Text>
                                    <TextInput
                                        style={[styles.input, { height: 120, textAlignVertical: 'top', paddingTop: 16 }]}
                                        value={content}
                                        onChangeText={setContent}
                                        placeholder="Escribe aquí el mensaje para todos los usuarios..."
                                        placeholderTextColor="#94A3B8"
                                        multiline
                                    />
                                </View>

                                <TouchableOpacity
                                    onPress={handleBroadcast}
                                    disabled={loading}
                                    activeOpacity={0.8}
                                    style={styles.broadcastButton}
                                >
                                    {loading ? (
                                        <ActivityIndicator color="white" />
                                    ) : (
                                        <>
                                            <Send size={20} color="white" />
                                            <Text style={styles.broadcastButtonText}>Enviar a todos los Vecinos</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Ranking Section */}
                        <View className="mt-10">
                            <View className="flex-row items-center mb-6">
                                <View className="w-10 h-10 bg-amber-50 rounded-2xl items-center justify-center mr-3">
                                    <Trophy size={20} color="#D97706" />
                                </View>
                                <View>
                                    <Text className="text-slate-900 font-black text-lg">Ranking de Rendimiento</Text>
                                    <Text className="text-slate-400 text-xs font-bold uppercase tracking-widest">Top Desempeño</Text>
                                </View>
                            </View>

                            <View className="flex-row justify-between">
                                <View style={[styles.rankingCard, { marginRight: 8 }]}>
                                    <Text style={styles.rankingTitle}>Top 5 Productos</Text>
                                    {topProducts.map((p, i) => (
                                        <TouchableOpacity
                                            key={p.id}
                                            style={styles.rankingItem}
                                            onPress={() => handleRankProductClick(p.id)}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={styles.rankingNumber}>{i + 1}</Text>
                                            <View className="flex-1">
                                                <Text numberOfLines={1} style={styles.rankingName}>{p.title}</Text>
                                                <Text style={styles.rankingValue}>{p.view_count || 0} vistas</Text>
                                            </View>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                                <View style={[styles.rankingCard, { marginLeft: 8 }]}>
                                    <Text style={styles.rankingTitle}>Top 5 Vendedores</Text>
                                    {topSellers.map((s, i) => (
                                        <TouchableOpacity
                                            key={s.id}
                                            style={styles.rankingItem}
                                            onPress={() => handleRankSellerClick(s.id)}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={styles.rankingNumber}>{i + 1}</Text>
                                            <View className="flex-1">
                                                <Text numberOfLines={1} style={styles.rankingName}>{s.full_name}</Text>
                                                <Text style={styles.rankingValue}>{s.sales_count} ventas</Text>
                                            </View>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        </View>

                        {/* Recent Announcements List */}
                        <View className="mt-10">
                            <Text className="text-slate-400 font-black uppercase tracking-widest text-xs mb-6 px-1">Historial de Notificaciones</Text>

                            {announcements.length > 0 ? (
                                announcements.map((ann) => (
                                    <View key={ann.id} style={styles.announcementCard}>
                                        <View className="flex-row justify-between items-start mb-2">
                                            <View className="flex-1">
                                                <Text className="text-slate-900 font-black text-base">{ann.title}</Text>
                                                <View className="flex-row items-center mt-1">
                                                    <Clock size={12} color="#94A3B8" />
                                                    <Text className="text-slate-400 text-[10px] font-bold uppercase ml-1">
                                                        {new Date(ann.created_at).toLocaleDateString()}
                                                    </Text>
                                                </View>
                                            </View>
                                            <TouchableOpacity
                                                onPress={() => handleDeleteAnnouncement(ann.id)}
                                                className="p-2 bg-red-50 rounded-xl"
                                            >
                                                <Trash2 size={16} color="#EF4444" />
                                            </TouchableOpacity>
                                        </View>
                                        <Text className="text-slate-600 font-medium leading-5">{ann.content}</Text>
                                    </View>
                                ))
                            ) : (
                                <View className="items-center justify-center py-10 bg-slate-50 rounded-[32px] border border-dashed border-slate-200">
                                    <AlertCircle size={32} color="#CBD5E1" />
                                    <Text className="text-slate-400 font-bold mt-2">No has enviado anuncios globales</Text>
                                </View>
                            )}
                        </View>
                    </>
                )}

                {activeTab === 'users' && (
                    <View>
                        <View style={styles.searchContainer}>
                            <Search size={20} color="#94A3B8" />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Buscar usuario por nombre..."
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                placeholderTextColor="#94A3B8"
                            />
                        </View>

                        {users.map(user => {
                            const isBanned = user.banned_until && new Date(user.banned_until) > new Date();
                            if (isBanned) console.log(`[Admin] User ${user.full_name} is detected as BANNED until ${user.banned_until}`);

                            return (
                                <TouchableOpacity
                                    key={user.id}
                                    style={[
                                        styles.adminListCard,
                                        isBanned && { backgroundColor: '#FFEEF2', borderColor: '#FFC1CF', borderWidth: 2, borderStyle: 'solid' }
                                    ]}
                                    onPress={() => { setSelectedUser(user); setShowUserModal(true); }}
                                >
                                    <View className="flex-row justify-between items-center">
                                        <View className="flex-1">
                                            <View className="flex-row items-center">
                                                <Text className={`font-black text-base ${isBanned ? 'text-red-900' : 'text-slate-900'}`}>{user.full_name}</Text>
                                                {user.is_verified && (
                                                    <View className="ml-1.5">
                                                        <BadgeCheck size={16} color="#8b5cf6" fill="#f5f3ff" />
                                                    </View>
                                                )}
                                                {isBanned && (
                                                    <View className="ml-2 bg-red-100 px-2 py-0.5 rounded-full border border-red-200">
                                                        <Text className="text-red-700 text-[8px] font-bold uppercase">BANEADO</Text>
                                                    </View>
                                                )}
                                            </View>
                                            <View className="flex-row items-center mt-1">
                                                <View className={`w-2 h-2 rounded-full mr-2 ${isBanned ? 'bg-red-500' : (user.last_seen && (new Date().getTime() - new Date(user.last_seen).getTime() < 300000) ? 'bg-emerald-500' : 'bg-slate-300')}`} />
                                                <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                                                    {user.role === 'admin' ? 'Administrador' : user.role === 'vendor' ? 'Comerciante' : 'Vecino'}
                                                </Text>
                                            </View>
                                        </View>
                                        <View className="flex-row gap-2">
                                            <TouchableOpacity
                                                onPress={() => handleUpdateUserRole(user.id, user.role === 'vendor' ? 'client' : 'vendor')}
                                                className={`w-10 h-10 rounded-xl items-center justify-center ${user.role === 'vendor' ? 'bg-amber-50' : 'bg-emerald-50'}`}
                                            >
                                                {user.role === 'vendor' ? <UserMinus size={18} color="#D97706" /> : <UserPlus size={18} color="#059669" />}
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                onPress={() => handleDeleteUser(user.id)}
                                                className="w-10 h-10 bg-red-50 rounded-xl items-center justify-center"
                                            >
                                                <Trash2 size={18} color="#EF4444" />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                )}

                {activeTab === 'products' && (
                    <View>
                        <View style={styles.searchContainer}>
                            <Search size={20} color="#94A3B8" />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Buscar producto por título..."
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                placeholderTextColor="#94A3B8"
                            />
                        </View>

                        {products.map(prod => (
                            <View
                                key={prod.id}
                                style={styles.adminListCard}
                            >
                                <View className="flex-row justify-between items-start">
                                    <TouchableOpacity
                                        className="flex-1 mr-4"
                                        onPress={() => { setSelectedProduct(prod); setShowProductModal(true); }}
                                    >
                                        <Text className="text-slate-900 font-black text-base">{prod.title}</Text>
                                        <Text className="text-slate-400 text-[10px] font-bold uppercase mt-0.5">
                                            Vendedor: {prod.profiles?.full_name || 'Desconocido'}
                                        </Text>
                                        <View className="flex-row items-center mt-1">
                                            <Text className="text-brand-600 font-black text-sm">
                                                ${prod.price.toLocaleString()}
                                            </Text>
                                            <View className="w-px h-3 bg-slate-200 mx-2" />
                                            <View className="flex-row items-center">
                                                <Activity size={12} color="#94A3B8" />
                                                <Text className="text-slate-400 font-bold text-[10px] ml-1 uppercase">
                                                    {prod.view_count || 0} Vistas
                                                </Text>
                                            </View>
                                        </View>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        onPress={() => handleToggleFeatured(prod.id, !!prod.is_featured)}
                                        activeOpacity={0.7}
                                        style={[
                                            styles.featuredBtn,
                                            prod.is_featured ? styles.featuredBtnActive : styles.featuredBtnInactive,
                                        ]}
                                    >
                                        <Star size={14} color={prod.is_featured ? 'white' : '#94A3B8'} fill={prod.is_featured ? 'white' : 'transparent'} />
                                        <Text style={[styles.featuredBtnText, prod.is_featured && { color: 'white' }]}>
                                            {prod.is_featured ? 'QUITAR' : 'DESTACAR'}
                                        </Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        onPress={() => handleDeleteProduct(prod.id)}
                                        className="w-10 h-10 bg-red-50 rounded-xl items-center justify-center ml-2"
                                    >
                                        <Trash2 size={18} color="#EF4444" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))}
                    </View>
                )}

                {activeTab === 'reviews' && (
                    <View>
                        <View style={styles.searchContainer}>
                            <Search size={20} color="#94A3B8" />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Buscar en comentarios o productos..."
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                placeholderTextColor="#94A3B8"
                            />
                        </View>

                        {reviews.length > 0 ? (
                            reviews.map(rev => (
                                <View key={rev.id} style={styles.adminListCard}>
                                    <View className="flex-row justify-between items-start">
                                        <View className="flex-1">
                                            <View className="flex-row items-center mb-1">
                                                {[1, 2, 3, 4, 5].map(s => (
                                                    <Star key={s} size={12} fill={s <= rev.rating ? "#F59E0B" : "transparent"} color={s <= rev.rating ? "#F59E0B" : "#CBD5E1"} />
                                                ))}
                                                <Text className="text-slate-400 text-[10px] font-bold uppercase ml-2">
                                                    en {rev.products?.title || 'Producto Eliminado'}
                                                </Text>
                                            </View>
                                            <Text className="text-slate-900 font-bold text-sm mb-1">{rev.comment}</Text>
                                            <Text className="text-slate-400 text-[10px] font-bold uppercase">
                                                Por: {rev.profiles?.full_name || 'Anónimo'}
                                            </Text>
                                        </View>
                                        <TouchableOpacity
                                            onPress={() => handleDeleteReview(rev.id)}
                                            className="w-10 h-10 bg-red-50 rounded-xl items-center justify-center"
                                        >
                                            <Trash2 size={18} color="#EF4444" />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))
                        ) : (
                            <View className="items-center py-20">
                                <MessageSquare size={48} color="#CBD5E1" />
                                <Text className="text-slate-400 font-bold mt-4">No hay reseñas para moderar</Text>
                            </View>
                        )}
                    </View>
                )}

                {activeTab === 'activity' && (
                    <View>
                        {activityLogs.length > 0 ? (
                            activityLogs.map((log, idx) => (
                                <View key={idx} style={styles.activityItem}>
                                    <View style={[styles.activityIcon, { backgroundColor: log.type === 'user' ? '#EEF2FF' : log.type === 'product' ? '#F0FDF4' : '#F5F3FF' }]}>
                                        {log.type === 'user' ? <UserPlus size={16} color="#4F46E5" /> :
                                            log.type === 'product' ? <Package size={16} color="#16A34A" /> :
                                                <MessageSquare size={16} color="#7C3AED" />}
                                    </View>
                                    <View className="flex-1 ml-3">
                                        <Text className="text-slate-900 font-bold text-sm">
                                            {log.type === 'user' ? `Nuevo usuario: ${log.full_name}` :
                                                log.type === 'product' ? `Nuevo producto: ${log.title}` :
                                                    `Nueva reseña: "${log.comment.substring(0, 30)}..."`}
                                        </Text>
                                        <View className="flex-row items-center mt-1">
                                            <Clock size={10} color="#94A3B8" />
                                            <Text className="text-slate-400 text-[10px] font-bold uppercase ml-1">
                                                {new Date(log.created_at).toLocaleTimeString()} · {new Date(log.created_at).toLocaleDateString()}
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            ))
                        ) : (
                            <View className="items-center py-20">
                                <HistoryLogIcon size={48} color="#CBD5E1" />
                                <Text className="text-slate-400 font-bold mt-4">No hay actividad reciente</Text>
                            </View>
                        )}
                    </View>
                )}

                {activeTab === 'audit' && (
                    <View>
                        {auditLogs.length > 0 ? (
                            auditLogs.map((log) => (
                                <View key={log.id} style={styles.activityItem}>
                                    <View style={[styles.activityIcon, { backgroundColor: '#F8FAFC' }]}>
                                        <Activity size={16} color="#64748B" />
                                    </View>
                                    <View className="flex-1 ml-3">
                                        <Text className="text-slate-900 font-bold text-sm">
                                            {log.profiles?.full_name || 'Admin'}: <Text className="font-black text-brand-600">{log.action.toUpperCase().replace('_', ' ')}</Text>
                                        </Text>
                                        {log.details && (
                                            <Text className="text-slate-500 text-xs mt-0.5">
                                                {log.details.full_name ? `Usuario: ${log.details.full_name}` :
                                                    log.details.reason ? `Motivo: ${log.details.reason}` :
                                                        JSON.stringify(log.details)}
                                            </Text>
                                        )}
                                        <View className="flex-row items-center mt-1">
                                            <Clock size={10} color="#94A3B8" />
                                            <Text className="text-slate-400 text-[10px] font-bold uppercase ml-1">
                                                {new Date(log.created_at).toLocaleTimeString()} · {new Date(log.created_at).toLocaleDateString()}
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            ))
                        ) : (
                            <View className="items-center py-20">
                                <ShieldCheck size={48} color="#CBD5E1" />
                                <Text className="text-slate-400 font-bold mt-4">Historial de auditoría vacío</Text>
                                <Text className="text-slate-300 text-xs mt-2 text-center px-10">Asegúrate de haber creado la tabla `admin_audit_logs` en Supabase.</Text>
                            </View>
                        )}
                    </View>
                )}


                {activeTab === 'gallery' && (
                    <View style={styles.galleryGrid}>
                        {galleryProducts.length > 0 ? (
                            galleryProducts.map(prod => (
                                <View key={prod.id} style={styles.galleryItem}>
                                    <TouchableOpacity
                                        activeOpacity={0.9}
                                        onPress={() => {
                                            setSelectedProduct(prod);
                                            setShowProductModal(true);
                                        }}
                                    >
                                        <View style={styles.galleryImageContainer}>
                                            <View style={styles.galleryImagePlaceholder}>
                                                <ImageIcon size={24} color="#CBD5E1" />
                                            </View>
                                            {prod.image_url ? (
                                                <Image
                                                    source={{ uri: prod.image_url }}
                                                    style={StyleSheet.absoluteFill}
                                                    resizeMode="cover"
                                                />
                                            ) : null}

                                            {/* Action Overlays */}
                                            <View style={styles.galleryActions}>
                                                <TouchableOpacity
                                                    onPress={() => handleToggleFeatured(prod.id, !!prod.is_featured)}
                                                    style={[styles.galleryActionBtn, prod.is_featured ? styles.galleryActionActive : styles.galleryActionInactive]}
                                                >
                                                    <Star size={14} color={prod.is_featured ? 'white' : '#94A3B8'} fill={prod.is_featured ? 'white' : 'transparent'} />
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    onPress={() => handleDeleteProduct(prod.id)}
                                                    style={[styles.galleryActionBtn, styles.galleryDeleteBtn]}
                                                >
                                                    <Trash2 size={14} color="#EF4444" />
                                                </TouchableOpacity>
                                            </View>

                                            {prod.is_featured && (
                                                <View style={styles.featuredBadge}>
                                                    <Sparkles size={8} color="white" />
                                                    <Text style={styles.featuredBadgeText}>TOP</Text>
                                                </View>
                                            )}
                                        </View>
                                        <Text numberOfLines={1} style={styles.galleryText}>{prod.title}</Text>
                                    </TouchableOpacity>
                                </View>
                            ))
                        ) : (
                            <View className="items-center py-20 w-full">
                                <ImageIcon size={48} color="#CBD5E1" />
                                <Text className="text-slate-400 font-bold mt-4">No hay productos en galería</Text>
                            </View>
                        )}
                    </View>
                )}

                {activeTab === 'categories' && (
                    <View>
                        <View className="bg-amber-50 rounded-2xl p-4 border border-amber-100 mb-6">
                            <Text className="text-amber-800 font-bold text-xs uppercase tracking-widest mb-1">Nota del Sistema</Text>
                            <Text className="text-amber-700 text-sm">
                                Las categorías configuradas aquí se reflejan automáticamente en el feed principal de la aplicación.
                            </Text>
                        </View>
                        <View>
                            {categoriesConfig.length > 0 ? (
                                categoriesConfig.map((cat, idx) => (
                                    <View key={idx} className="bg-white p-4 rounded-2xl border border-slate-100 flex-row justify-between items-center mb-3">
                                        <Text className="text-slate-900 font-bold">{cat}</Text>
                                        <TouchableOpacity
                                            onPress={() => handleDeleteCategory(cat)}
                                            className="p-2"
                                        >
                                            <Trash2 size={16} color="#EF4444" />
                                        </TouchableOpacity>
                                    </View>
                                ))
                            ) : null}
                            <TouchableOpacity
                                onPress={handleAddCategory}
                                className="bg-slate-50 border border-dashed border-slate-300 p-4 rounded-2xl items-center mt-4"
                            >
                                <Text className="text-slate-400 font-bold">+ Agregar Nueva Categoría</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {activeTab === 'banners' && (
                    <View>
                        <View className="flex-row justify-between items-center mb-6">
                            <Text className="text-slate-900 font-extrabold text-xl">Gestión de Banners</Text>
                            <TouchableOpacity
                                onPress={() => setShowBannerModal(true)}
                                className="bg-brand-500 py-3 px-6 rounded-2xl flex-row items-center"
                            >
                                <Send size={16} color="white" className="mr-2" />
                                <Text className="text-white font-bold">Nuevo Banner</Text>
                            </TouchableOpacity>
                        </View>

                        {banners.length > 0 ? (
                            banners.map(banner => (
                                <View key={banner.id} style={styles.adminListCard}>
                                    <View className="flex-row">
                                        <View className="w-24 h-16 bg-slate-100 rounded-xl overflow-hidden mr-4">
                                            {banner.image_url ? (
                                                <Image source={{ uri: banner.image_url }} className="w-full h-full" resizeMode="cover" />
                                            ) : (
                                                <View className="items-center justify-center flex-1">
                                                    <ImageIcon size={20} color="#94A3B8" />
                                                </View>
                                            )}
                                        </View>
                                        <View className="flex-1">
                                            <Text className="text-slate-900 font-bold text-sm" numberOfLines={1}>
                                                {banner.title || 'Sin Título'}
                                            </Text>
                                            <Text className="text-slate-400 text-xs mt-1" numberOfLines={1}>
                                                {banner.image_url}
                                            </Text>
                                        </View>
                                    </View>
                                    <View className="flex-row justify-end mt-4 pt-4 border-t border-slate-50">
                                        <TouchableOpacity
                                            onPress={() => handleToggleBanner(banner.id, banner.is_active)}
                                            className={`py-2 px-4 rounded-xl mr-2 ${banner.is_active ? 'bg-green-50' : 'bg-slate-50'}`}
                                        >
                                            <Text className={`font-bold text-[10px] ${banner.is_active ? 'text-green-600' : 'text-slate-400'}`}>
                                                {banner.is_active ? 'ACTIVO' : 'PAUSADO'}
                                            </Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={() => handleDeleteBanner(banner.id)}
                                            className="bg-red-50 py-2 px-4 rounded-xl"
                                        >
                                            <Trash2 size={14} color="#EF4444" />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))
                        ) : (
                            <View className="items-center justify-center py-20 bg-white rounded-[40px] border border-slate-100">
                                <ImageIcon size={48} color="#E2E8F0" />
                                <Text className="text-slate-400 font-bold mt-4">No hay banners configurados</Text>
                            </View>
                        )}
                    </View>
                )}

                {activeTab === 'reports' && (
                    <View>
                        {reports.length > 0 ? (
                            reports.map(rep => (
                                <View key={rep.id} style={styles.adminListCard}>
                                    <View className="flex-row items-center mb-3">
                                        <View className="w-8 h-8 bg-red-100 rounded-full items-center justify-center mr-3">
                                            <Flag size={14} color="#EF4444" />
                                        </View>
                                        <View>
                                            <Text className="text-slate-900 font-black text-sm">Reporte de Producto</Text>
                                            <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-tighter">
                                                En: {rep.products?.title || 'Desconocido'}
                                            </Text>
                                        </View>
                                    </View>
                                    <Text className="text-slate-600 text-sm mb-4 leading-relaxed">
                                        "{rep.reason}"
                                    </Text>
                                    <View className="flex-row justify-between items-center border-t border-slate-50 pt-4">
                                        <Text className="text-slate-400 text-[10px] font-bold uppercase">
                                            De: {rep.profiles?.full_name || 'Veedor'}
                                        </Text>
                                        <TouchableOpacity
                                            onPress={() => handleResolveReport(rep.id)}
                                            className="bg-red-50 px-4 py-2 rounded-xl"
                                        >
                                            <Text className="text-red-500 font-black text-[10px] uppercase">Marcar Resuelto</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))
                        ) : (
                            <View className="items-center py-20">
                                <ShieldCheck size={48} color="#F0FDF4" />
                                <Text className="text-slate-400 font-bold mt-4">Todo en orden. No hay reportes pendientes.</Text>
                            </View>
                        )}
                    </View>
                )}
            </ScrollView>

            {/* Entity Modals */}
            <Modal visible={showAddCategoryModal} animationType="fade" transparent={true}>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { height: 'auto', padding: 32 }]}>
                        <View className="flex-row justify-between items-center mb-6">
                            <Text style={styles.modalTitle}>Nueva Categoría</Text>
                            <TouchableOpacity onPress={() => setShowAddCategoryModal(false)}>
                                <X size={24} color="#94A3B8" />
                            </TouchableOpacity>
                        </View>
                        <View className="mb-6">
                            <Text className="text-slate-500 font-bold text-xs mb-2 uppercase tracking-widest">Nombre</Text>
                            <TextInput
                                style={styles.input}
                                value={newCategoryName}
                                onChangeText={setNewCategoryName}
                                placeholder="Ej: Artesanías, Deporte, etc."
                                placeholderTextColor="#94A3B8"
                                autoFocus
                            />
                        </View>
                        <TouchableOpacity
                            onPress={submitNewCategory}
                            disabled={isActionLoading || !newCategoryName.trim()}
                            activeOpacity={0.8}
                            style={[styles.broadcastButton, (!newCategoryName.trim() || isActionLoading) && { opacity: 0.5 }]}
                        >
                            {isActionLoading ? <ActivityIndicator color="white" /> : <Text style={styles.broadcastButtonText}>Agregar Categoría</Text>}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
            <Modal visible={showUserModal} animationType="slide" transparent={true}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <View>
                                <Text style={styles.modalTitle}>Detalles de Usuario</Text>
                                <Text style={styles.modalSubtitle}>Inteligencia de Datos</Text>
                            </View>
                            <TouchableOpacity onPress={() => setShowUserModal(false)} style={styles.closeBtn}>
                                <X size={24} color="#64748B" />
                            </TouchableOpacity>
                        </View>

                        {selectedUser && (
                            <ScrollView showsVerticalScrollIndicator={false}>
                                <View style={styles.detailSection}>
                                    <View className="items-center mb-6">
                                        <View className="w-20 h-20 bg-brand-50 rounded-full items-center justify-center border-4 border-white shadow-sm mb-3">
                                            <Users size={32} color="#8b5cf6" />
                                        </View>
                                        <Text className="text-2xl font-black text-slate-900">{selectedUser.full_name}</Text>
                                        <View className="bg-brand-50 px-3 py-1 rounded-full mt-1">
                                            <Text className="text-brand-600 font-bold text-[10px] uppercase tracking-widest">{selectedUser.role}</Text>
                                        </View>
                                    </View>

                                    <View className="space-y-4">
                                        <View style={styles.detailRow}>
                                            <View style={styles.detailIcon}>
                                                <Calendar size={18} color="#64748B" />
                                            </View>
                                            <View>
                                                <Text style={styles.detailLabel}>FECHA DE REGISTRO</Text>
                                                <Text style={styles.detailValue}>{new Date(selectedUser.created_at || Date.now()).toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' })}</Text>
                                            </View>
                                        </View>

                                        <View style={styles.detailRow}>
                                            <View style={styles.detailIcon}>
                                                <Activity size={18} color="#64748B" />
                                            </View>
                                            <View>
                                                <Text style={styles.detailLabel}>ÚLTIMA ACTIVIDAD</Text>
                                                <Text style={styles.detailValue}>
                                                    {selectedUser.last_seen
                                                        ? new Date(selectedUser.last_seen).toLocaleString('es-CL')
                                                        : 'Nunca visto'}
                                                </Text>
                                            </View>
                                        </View>

                                        <View style={styles.detailRow}>
                                            <View style={styles.detailIcon}>
                                                <ShieldCheck size={18} color="#64748B" />
                                            </View>
                                            <View>
                                                <Text style={styles.detailLabel}>ID DE SUPABASE</Text>
                                                <Text style={styles.detailValueSmall}>{selectedUser.id}</Text>
                                            </View>
                                        </View>

                                        {/* Moderation / Ban Section */}
                                        <View className="mt-6 pt-6 border-t border-slate-100">
                                            <Text className="text-slate-900 font-black text-base mb-4">Suspensión Temporal (Ban/Kick)</Text>

                                            {selectedUser.banned_until && new Date(selectedUser.banned_until) > new Date() ? (
                                                <View className="bg-red-50 p-4 rounded-2xl border border-red-100 mb-2">
                                                    <View className="flex-row items-center mb-2">
                                                        <AlertTriangle size={20} color="#EF4444" />
                                                        <Text className="text-red-600 font-bold ml-2">USUARIO BANEADO</Text>
                                                    </View>
                                                    <Text className="text-slate-600 text-xs font-bold uppercase mb-1">Motivo:</Text>
                                                    <Text className="text-slate-800 text-sm mb-3">{selectedUser.ban_reason || 'No especificado'}</Text>

                                                    <Text className="text-slate-600 text-xs font-bold uppercase mb-1">Hasta:</Text>
                                                    <Text className="text-slate-800 text-sm mb-4">{new Date(selectedUser.banned_until).toLocaleString('es-CL')}</Text>

                                                    <TouchableOpacity
                                                        onPress={handleUnbanUser}
                                                        disabled={isActionLoading}
                                                        className="bg-red-500 py-3 rounded-xl items-center flex-row justify-center"
                                                    >
                                                        <ShieldCheck size={16} color="white" />
                                                        <Text className="text-white font-black ml-2 uppercase text-xs">Levantar Castigo (Unban)</Text>
                                                    </TouchableOpacity>
                                                </View>
                                            ) : (
                                                <View>
                                                    <View className="flex-row mb-3 space-x-2">
                                                        <TextInput
                                                            style={[styles.input, { flex: 1 }]}
                                                            placeholder="Días"
                                                            value={banDuration}
                                                            onChangeText={setBanDuration}
                                                            keyboardType="numeric"
                                                        />
                                                        <View style={[styles.input, { flex: 3, justifyContent: 'center' }]}>
                                                            <TextInput
                                                                placeholder="Motivo (Ej: Spam, Insultos)"
                                                                value={banReason}
                                                                onChangeText={setBanReason}
                                                            />
                                                        </View>
                                                    </View>

                                                    <TouchableOpacity
                                                        onPress={handleBanUser}
                                                        disabled={isActionLoading || !banDuration || !banReason}
                                                        className={`flex-row items-center justify-center p-4 rounded-2xl ${(!banDuration || !banReason) ? 'bg-slate-200' : 'bg-red-500'}`}
                                                    >
                                                        <UserMinus size={16} color="white" />
                                                        <Text className="text-white font-black ml-2 uppercase text-xs">Aplicar Ban</Text>
                                                    </TouchableOpacity>
                                                </View>
                                            )}
                                        </View>

                                        {/* Verification Section */}
                                        {selectedUser.role === 'vendor' && (
                                            <View className="mt-6 pt-6 border-t border-slate-100">
                                                <Text className="text-slate-900 font-black text-base mb-2">Verificación de Confianza</Text>
                                                <Text className="text-slate-500 text-xs mb-4">Otorga el sello oficial a este comerciante para destacar su fiabilidad.</Text>

                                                <TouchableOpacity
                                                    onPress={handleToggleVerification}
                                                    disabled={isActionLoading}
                                                    className={`flex-row items-center justify-center p-4 rounded-2xl border-2 ${selectedUser.is_verified ? 'bg-brand-50 border-brand-200' : 'bg-slate-50 border-slate-100'}`}
                                                >
                                                    <BadgeCheck size={20} color={selectedUser.is_verified ? "#8b5cf6" : "#94A3B8"} />
                                                    <Text className={`font-black ml-2 uppercase text-xs ${selectedUser.is_verified ? 'text-brand-600' : 'text-slate-500'}`}>
                                                        {selectedUser.is_verified ? 'Vendedor Verificado' : 'Verificar Comerciante'}
                                                    </Text>
                                                </TouchableOpacity>
                                            </View>
                                        )}

                                        {/* Targeted Alert Form */}
                                        <View className="mt-6 pt-6 border-t border-slate-100">
                                            <Text className="text-slate-900 font-black text-base mb-4">Enviar Alerta Maestro</Text>
                                            <TextInput
                                                style={[styles.input, { height: 80, fontSize: 13 }]}
                                                placeholder="Escribe un mensaje privado para este usuario..."
                                                value={targetedMessage}
                                                onChangeText={setTargetedMessage}
                                                multiline
                                            />
                                            <TouchableOpacity
                                                onPress={handleSendTargetedAlert}
                                                disabled={isActionLoading || !targetedMessage.trim()}
                                                className={`mt-3 flex-row items-center justify-center p-4 rounded-2xl ${targetedMessage.trim() ? 'bg-slate-900' : 'bg-slate-200'}`}
                                            >
                                                <Send size={16} color="white" />
                                                <Text className="text-white font-black ml-2 uppercase text-xs">Enviar Notificación</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                </View>
                            </ScrollView>
                        )}
                    </View>
                </View>
            </Modal>

            <Modal visible={showProductModal} animationType="slide" transparent={true}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <View>
                                <Text style={styles.modalTitle}>Detalles de Producto</Text>
                                <Text style={styles.modalSubtitle}>Moderación Avanzada</Text>
                            </View>
                            <TouchableOpacity onPress={() => setShowProductModal(false)} style={styles.closeBtn}>
                                <X size={24} color="#64748B" />
                            </TouchableOpacity>
                        </View>

                        {selectedProduct && (
                            <ScrollView showsVerticalScrollIndicator={false}>
                                <View style={styles.detailSection}>
                                    <View className="items-center mb-6">
                                        <View className="w-full h-48 bg-slate-50 rounded-[32px] overflow-hidden mb-4 border border-slate-100">
                                            {selectedProduct.image_url ? (
                                                <Text className="text-center mt-20 text-slate-400 font-bold">Imagen del producto</Text>
                                            ) : (
                                                <View className="flex-1 items-center justify-center">
                                                    <Package size={48} color="#CBD5E1" />
                                                </View>
                                            )}
                                        </View>
                                        <Text className="text-2xl font-black text-slate-900 text-center">{selectedProduct.title}</Text>
                                        <Text className="text-brand-600 font-black text-xl mt-1">${selectedProduct.price.toLocaleString()}</Text>
                                    </View>

                                    <View className="space-y-4">
                                        <View style={styles.detailRow}>
                                            <View style={styles.detailIcon}>
                                                <Users size={18} color="#64748B" />
                                            </View>
                                            <View>
                                                <Text style={styles.detailLabel}>VENDEDOR</Text>
                                                <Text style={styles.detailValue}>{selectedProduct.profiles?.full_name}</Text>
                                            </View>
                                        </View>

                                        <View style={styles.detailRow}>
                                            <View style={styles.detailIcon}>
                                                <Info size={18} color="#64748B" />
                                            </View>
                                            <View className="flex-1">
                                                <Text style={styles.detailLabel}>DESCRIPCIÓN</Text>
                                                <Text style={styles.detailValueText}>{selectedProduct.description || 'Sin descripción'}</Text>
                                            </View>
                                        </View>

                                        <View style={styles.detailRow}>
                                            <View style={styles.detailIcon}>
                                                <MapPin size={18} color="#64748B" />
                                            </View>
                                            <View>
                                                <Text style={styles.detailLabel}>UBICACIÓN</Text>
                                                <Text style={styles.detailValue}>{selectedProduct.location || 'No especificada'}</Text>
                                            </View>
                                        </View>

                                        <View style={styles.detailRow}>
                                            <View style={styles.detailIcon}>
                                                <Phone size={18} color="#64748B" />
                                            </View>
                                            <View>
                                                <Text style={styles.detailLabel}>WHATSAPP</Text>
                                                <Text style={styles.detailValue}>{selectedProduct.whatsapp_number || 'N/A'}</Text>
                                            </View>
                                        </View>
                                    </View>
                                </View>
                            </ScrollView>
                        )}
                    </View>
                </View>
            </Modal>

            {/* Modal Crear Banner */}
            <Modal visible={showBannerModal} animationType="slide" transparent={true}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <View>
                                <Text style={styles.modalTitle}>Nuevo Banner</Text>
                                <Text style={styles.modalSubtitle}>Carrusel de Publicidad</Text>
                            </View>
                            <TouchableOpacity onPress={() => setShowBannerModal(false)} style={styles.closeBtn}>
                                <X size={24} color="#94A3B8" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            <View className="mb-6">
                                <Text className="text-slate-500 font-bold text-xs mb-3 uppercase tracking-widest">Imagen del Banner</Text>

                                {newBanner.image_url ? (
                                    <View className="relative w-full h-40 rounded-3xl overflow-hidden mb-3 border border-slate-100">
                                        <Image
                                            source={{
                                                uri: newBanner.image_url.startsWith('base64:')
                                                    ? `data:image/jpeg;base64,${newBanner.image_url.split('base64:')[1]}`
                                                    : newBanner.image_url
                                            }}
                                            className="w-full h-full"
                                            resizeMode="cover"
                                        />
                                        <TouchableOpacity
                                            onPress={() => setNewBanner(prev => ({ ...prev, image_url: '' }))}
                                            className="absolute top-2 right-2 bg-black/50 p-2 rounded-full"
                                        >
                                            <X size={16} color="white" />
                                        </TouchableOpacity>
                                    </View>
                                ) : (
                                    <TouchableOpacity
                                        onPress={pickBannerImage}
                                        className="w-full h-40 rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 items-center justify-center mb-3"
                                    >
                                        {pickingImage ? (
                                            <ActivityIndicator color="#8b5cf6" />
                                        ) : (
                                            <>
                                                <Camera size={32} color="#94A3B8" />
                                                <Text className="text-slate-400 font-bold mt-2">Seleccionar de Galería</Text>
                                            </>
                                        )}
                                    </TouchableOpacity>
                                )}

                                <Text className="text-slate-400 text-[10px] font-bold mb-2 ml-1">O PEGAR URL DIRECTA</Text>
                                <TextInput
                                    style={styles.input}
                                    value={newBanner.image_url}
                                    onChangeText={(text) => setNewBanner(prev => ({ ...prev, image_url: text }))}
                                    placeholder="https://images.unsplash.com/..."
                                    placeholderTextColor="#94A3B8"
                                />
                            </View>

                            <View className="mb-6">
                                <Text className="text-slate-500 font-bold text-xs mb-2 uppercase tracking-widest">Título (Opcional)</Text>
                                <TextInput
                                    style={styles.input}
                                    value={newBanner.title}
                                    onChangeText={(text) => setNewBanner(prev => ({ ...prev, title: text }))}
                                    placeholder="Ej: Ofertas de Navidad"
                                    placeholderTextColor="#94A3B8"
                                />
                            </View>

                            <View className="mb-6">
                                <Text className="text-slate-500 font-bold text-xs mb-2 uppercase tracking-widest">Ruta Interna (Opcional)</Text>
                                <TextInput
                                    style={styles.input}
                                    value={newBanner.link_route}
                                    onChangeText={(text) => setNewBanner(prev => ({ ...prev, link_route: text }))}
                                    placeholder="Ej: /(tabs)/post"
                                    placeholderTextColor="#94A3B8"
                                />
                            </View>

                            <TouchableOpacity
                                onPress={handleCreateBanner}
                                className="bg-brand-500 py-5 rounded-3xl items-center mt-4"
                                disabled={isActionLoading}
                            >
                                {isActionLoading ? (
                                    <ActivityIndicator color="white" />
                                ) : (
                                    <Text className="text-white font-black text-base">Crear Banner</Text>
                                )}
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FAF9FF',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
        backgroundColor: 'white',
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '900',
        color: '#0F172A',
        letterSpacing: -0.5,
    },
    statCard: {
        flex: 1,
        marginHorizontal: 4,
        padding: 16,
        borderRadius: 24,
        borderWidth: 1,
        alignItems: 'center',
    },
    statValue: {
        fontSize: 20,
        fontWeight: '900',
        color: '#0F172A',
        marginTop: 8,
    },
    statLabel: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#64748B',
        textTransform: 'uppercase',
        marginTop: 2,
    },
    formContainer: {
        backgroundColor: 'white',
        padding: 24,
        borderRadius: 40,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.05,
        shadowRadius: 15,
        elevation: 5,
    },
    input: {
        backgroundColor: '#F8FAFC',
        borderRadius: 20,
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        color: '#0F172A',
        fontWeight: '700',
        fontSize: 15,
    },
    broadcastButton: {
        backgroundColor: '#8b5cf6',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        borderRadius: 24,
        marginTop: 12,
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
    },
    broadcastButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '900',
        marginLeft: 10,
    },
    announcementCard: {
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 32,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.02,
        shadowRadius: 8,
        elevation: 2,
    },
    maintenanceCard: {
        padding: 24,
        borderRadius: 32,
        borderWidth: 1,
        marginBottom: 32,
    },
    maintenanceActive: {
        backgroundColor: '#FEF2F2',
        borderColor: '#FEE2E2',
    },
    maintenanceInactive: {
        backgroundColor: 'white',
        borderColor: '#F1F5F9',
    },
    tabBar: {
        flexDirection: 'row',
        backgroundColor: 'white',
        paddingHorizontal: 20,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    tabItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 16,
        marginRight: 8,
    },
    activeTabItem: {
        backgroundColor: '#F5F3FF',
    },
    tabText: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#94A3B8',
        marginLeft: 8,
    },
    activeTabText: {
        color: '#8b5cf6',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        paddingHorizontal: 20,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        marginBottom: 24,
        height: 56,
    },
    searchInput: {
        flex: 1,
        marginLeft: 12,
        fontSize: 15,
        fontWeight: '700',
        color: '#0F172A',
    },
    adminListCard: {
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 28,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.02,
        shadowRadius: 4,
        elevation: 1,
    },
    statCardSmall: {
        width: '48%',
        padding: 16,
        borderRadius: 24,
        borderWidth: 1,
    },
    statValueSmall: {
        fontSize: 20,
        fontWeight: '900',
        color: '#0F172A',
        marginTop: 4,
    },
    statLabelSmall: {
        fontSize: 10,
        fontWeight: '700',
        color: '#64748B',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.4)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: 'white',
        borderTopLeftRadius: 48,
        borderTopRightRadius: 48,
        padding: 32,
        height: '80%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
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
    },
    modalSubtitle: {
        fontSize: 10,
        fontWeight: '700',
        color: '#94A3B8',
        textTransform: 'uppercase',
        letterSpacing: 2,
    },
    closeBtn: {
        width: 48,
        height: 48,
        backgroundColor: '#F1F5F9',
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    detailSection: {
        paddingBottom: 40,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
    },
    rankingCard: {
        flex: 1,
        backgroundColor: 'white',
        padding: 16,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.02,
        shadowRadius: 8,
        elevation: 2,
    },
    rankingTitle: {
        fontSize: 12,
        fontWeight: '900',
        color: '#64748B',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 16,
    },
    rankingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    rankingNumber: {
        fontSize: 14,
        fontWeight: '900',
        color: '#8b5cf6',
        width: 24,
    },
    rankingName: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#0F172A',
    },
    rankingValue: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#94A3B8',
        textTransform: 'uppercase',
    },
    detailIcon: {
        width: 40,
        height: 40,
        backgroundColor: 'white',
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
    },
    detailLabel: {
        fontSize: 9,
        fontWeight: '800',
        color: '#94A3B8',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    detailValue: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1E293B',
        marginTop: 1,
    },
    detailValueSmall: {
        fontSize: 12,
        fontWeight: '600',
        color: '#64748B',
        marginTop: 1,
    },
    detailValueText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#475569',
        lineHeight: 20,
        marginTop: 2,
    },
    activityItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        padding: 16,
        borderRadius: 24,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    activityIcon: {
        width: 40,
        height: 40,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    galleryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        paddingTop: 10,
    },
    galleryItem: {
        width: '48%',
        backgroundColor: 'white',
        borderRadius: 24,
        padding: 8,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    galleryImageContainer: {
        width: '100%',
        aspectRatio: 1,
        borderRadius: 18,
        backgroundColor: '#F8FAFC',
        overflow: 'hidden',
    },
    galleryImagePlaceholder: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    galleryText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#1E293B',
        marginTop: 8,
        paddingHorizontal: 4,
        textAlign: 'center',
    },
    featuredBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        borderWidth: 1,
    },
    featuredBtnActive: {
        backgroundColor: '#F59E0B',
        borderColor: '#F59E0B',
    },
    featuredBtnInactive: {
        backgroundColor: 'white',
        borderColor: '#E2E8F0',
    },
    featuredBtnText: {
        marginLeft: 6,
    },
    galleryActions: {
        position: 'absolute',
        top: 8,
        right: 8,
        flexDirection: 'row',
        gap: 6,
    },
    galleryActionBtn: {
        width: 32,
        height: 32,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    galleryActionActive: {
        backgroundColor: '#F59E0B',
        borderColor: '#F59E0B',
    },
    galleryActionInactive: {
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderColor: '#E2E8F0',
    },
    galleryDeleteBtn: {
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderColor: '#FEE2E2',
    },
    featuredBadge: {
        position: 'absolute',
        bottom: 8,
        left: 8,
        backgroundColor: '#8b5cf6',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
    },
    featuredBadgeText: {
        color: 'white',
        fontSize: 8,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    ticketItem: {
        backgroundColor: 'white',
        borderRadius: 24,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        flexDirection: 'row',
        alignItems: 'center',
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        alignSelf: 'flex-start',
        marginTop: 4,
    },
    statusBadgeText: {
        fontSize: 9,
        fontWeight: '900',
        textTransform: 'uppercase',
    },
    ticketTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#0F172A',
    },
    ticketSender: {
        fontSize: 11,
        color: '#64748B',
        marginTop: 2,
    },
    ticketModalContent: {
        backgroundColor: 'white',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        padding: 24,
        maxHeight: '90%',
    },
    replyInput: {
        backgroundColor: '#F8FAFC',
        borderRadius: 20,
        padding: 16,
        minHeight: 120,
        textAlignVertical: 'top',
        marginTop: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    primaryButton: {
        height: 52,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
    },
});
