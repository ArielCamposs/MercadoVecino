/// <reference types="nativewind/types" />
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import {
    Activity,
    AlertTriangle,
    BadgeCheck,
    Calendar,
    Camera,
    ChevronLeft,
    Gift,
    Info,
    MapPin,
    Package,
    PartyPopper,
    Phone,
    Send,
    ShieldCheck,
    ShoppingBasket,
    Snowflake,
    Sparkles,
    Star,
    UserMinus,
    Users,
    X
} from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
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
import { logAdminAction } from '../../lib/admin_logger';
import { broadcastPushNotification } from '../../lib/notification_sender';
import { supabase } from '../../lib/supabase';
import { translateError } from '../../lib/translations';

import {
    ActivityLogItem,
    ActivityTab,
    AppConfig,
    ApprovalsTab,
    AuditLog,
    AuditTab,
    Banner,
    BannersTab,
    CategoriesTab,
    Contact,
    DashboardTab,
    EventsTab,
    GalleryTab,
    HealthTab,
    MerchantPerformance,
    PerformanceTab,
    Product,
    ProductsTab,
    Profile,
    Report,
    ReportsTab,
    Review,
    ReviewsTab,
    SettingsTab,
    SpecialEvent,
    TransactionsTab,
    UsersTab
} from './admin/index';

const EVENT_PRESETS = [
    { id: 'christmas', label: 'Navidad', icon: 'Snowflake', color: '#EF4444', defaultName: 'Venta de Navidad' },
    { id: 'cyber', label: 'Cyber', icon: 'PartyPopper', color: '#6366f1', defaultName: 'Cyber Day' },
    { id: 'summer', label: 'Verano', icon: 'Sparkles', color: '#10B981', defaultName: 'Especial de Verano' },
    { id: 'sale', label: 'Oferta', icon: 'ShoppingBasket', color: '#F59E0B', defaultName: 'Gran Oferta' },
    { id: 'general', label: 'General', icon: 'Gift', color: '#8b5cf6', defaultName: 'Evento Especial' },
];

export default function AdminDashboard() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const [title, setTitle] = useState<string>('');
    const [content, setContent] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);
    const [announcements, setAnnouncements] = useState<any[]>([]);
    const [stats, setStats] = useState<{ users: number, vendors: number, products: number }>({ users: 0, vendors: 0, products: 0 });
    const [refreshing, setRefreshing] = useState<boolean>(false);

    // New state for Tabs
    const [activeTab, setActiveTab] = useState<string>('dashboard');
    const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
    const [merchantPerformance, setMerchantPerformance] = useState<MerchantPerformance[]>([]);
    const [users, setUsers] = useState<Profile[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [reviews, setReviews] = useState<Review[]>([]);
    const [activityLogs, setActivityLogs] = useState<ActivityLogItem[]>([]);
    const [galleryProducts, setGalleryProducts] = useState<Product[]>([]);
    const [categoriesConfig, setCategoriesConfig] = useState<string[]>(['Comida', 'Almacén', 'Servicios', 'Tecnología', 'Otros']);
    const [reports, setReports] = useState<Report[]>([]);
    const [banners, setBanners] = useState<Banner[]>([]);
    const [specialEvents, setSpecialEvents] = useState<SpecialEvent[]>([]);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [isActionLoading, setIsActionLoading] = useState<boolean>(false);
    const [whatsappContactsCount, setWhatsappContactsCount] = useState<number>(0);

    // Advanced Metrics State
    const [confirmedContactsCount, setConfirmedContactsCount] = useState<number>(0);
    const [conversionRate, setConversionRate] = useState<number>(0);
    const [topProducts, setTopProducts] = useState<Product[]>([]);
    const [topSellers, setTopSellers] = useState<any[]>([]);
    const [openTicketsCount, setOpenTicketsCount] = useState<number>(0);

    // Real-time Intelligence State
    const [onlineCount, setOnlineCount] = useState<number>(0);
    const [economicVolume, setEconomicVolume] = useState<number>(0);
    const [maintenanceEnabled, setMaintenanceEnabled] = useState<boolean>(false);
    const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [showUserModal, setShowUserModal] = useState<boolean>(false);
    const [showProductModal, setShowProductModal] = useState<boolean>(false);
    const [targetedMessage, setTargetedMessage] = useState<string>('');
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 0.3, duration: 1500, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
            ])
        ).start();
    }, []);

    const handleTabPress = (tab: string) => {
        if (tab !== activeTab) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setActiveTab(tab);
        }
    };

    const handleCopyId = async (id: string, label: string = 'ID') => {
        await Clipboard.setStringAsync(id);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Copiado', `${label} copiado al portapapeles.`);
    };

    const [showAddCategoryModal, setShowAddCategoryModal] = useState<boolean>(false);
    const [newCategoryName, setNewCategoryName] = useState<string>('');
    const [showBannerModal, setShowBannerModal] = useState<boolean>(false);
    const [newBanner, setNewBanner] = useState<{ image_url: string, title: string, description: string, link_route: string }>({ image_url: '', title: '', description: '', link_route: '' });
    const [pickingImage, setPickingImage] = useState<boolean>(false);

    // Phase 3 Features State
    const [healthLogs, setHealthLogs] = useState<{ type: string, message: string, detail?: string, status?: string }[]>([]);
    const [appConfig, setAppConfig] = useState<AppConfig[]>([]);
    const [isHealthCheckRunning, setIsHealthCheckRunning] = useState<boolean>(false);
    const [warningReason, setWarningReason] = useState<string>('');

    // Phase 4 Features State
    const [transactions, setTransactions] = useState<Contact[]>([]);
    const [pendingProducts, setPendingProducts] = useState<Product[]>([]);
    const [requireApproval, setRequireApproval] = useState<boolean>(false);
    const [pendingCount, setPendingCount] = useState<number>(0);

    // Ban System State
    const [banDuration, setBanDuration] = useState<string>('');
    const [banReason, setBanReason] = useState<string>('');

    const [showConfigModal, setShowConfigModal] = useState<boolean>(false);
    const [configKey, setConfigKey] = useState<string>('');
    const [configValue, setConfigValue] = useState<string>('');
    const [isEditingConfig, setIsEditingConfig] = useState<boolean>(false);

    const [showAddEventModal, setShowAddEventModal] = useState<boolean>(false);
    const [newEventName, setNewEventName] = useState<string>('');
    const [newEventType, setNewEventType] = useState<string>('general');
    const [newEventColor, setNewEventColor] = useState<string>('#8b5cf6');

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
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

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
            Alert.alert('Error', translateError(err.message));
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
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
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            await logAdminAction('unban_user', selectedUser.id, 'user', { full_name: selectedUser.full_name });
            setShowUserModal(false);
            fetchData();
        } catch (err: any) {
            Alert.alert('Error', translateError(err.message));
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleBanUser = async () => {
        if (!selectedUser || !banDuration || !banReason) {
            Alert.alert('Error', 'Debes ingresar duración y motivo.');
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            return;
        }

        const days = parseInt(banDuration);
        if (isNaN(days) || days <= 0) {
            Alert.alert('Error', 'La duración debe ser un número válido de días.');
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
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
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
            Alert.alert('Error', translateError(err.message));
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleWarnUser = async () => {
        if (!selectedUser || !warningReason) {
            Alert.alert('Error', 'Debes ingresar un motivo para la advertencia.');
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            return;
        }

        try {
            setIsActionLoading(true);
            const currentWarnings = selectedUser.warning_count || 0;
            const newWarnings = currentWarnings + 1;

            const { error } = await supabase
                .from('profiles')
                .update({
                    warning_count: newWarnings,
                    last_warning_reason: warningReason
                })
                .eq('id', selectedUser.id);

            // If column doesn't exist, we'll get an error, but we'll try to handle it
            if (error) {
                console.log('[Admin] Note: warning_count column might be missing. Attempting workaround with announcement only.');
            }

            // Create a specific announcement for the user
            await supabase
                .from('system_announcements')
                .insert({
                    title: '⚠️ Advertencia Administrativa',
                    content: `Has recibido una advertencia. Motivo: ${warningReason}. Acumuladas: ${newWarnings}/3.`,
                    user_id: (await supabase.auth.getUser()).data.user?.id,
                    recipient_id: selectedUser.id,
                    type: 'alert',
                    is_active: true
                });

            Alert.alert('Advertencia Enviada', `Se ha notificado a ${selectedUser.full_name}. Warnings: ${newWarnings}`);
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            await logAdminAction('warn_user', selectedUser.id, 'user', { reason: warningReason, count: newWarnings });

            setWarningReason('');
            setShowUserModal(false);
            fetchData();
        } catch (err: any) {
            Alert.alert('Error', translateError(err.message));
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } finally {
            setIsActionLoading(false);
        }
    };

    const runHealthCheck = async () => {
        try {
            setIsHealthCheckRunning(true);
            const issues: { type: string, message: string, detail?: string, status?: string }[] = [];

            // 1. Check for products without images
            const { data: noImageProds } = await supabase.from('products').select('id, title').is('image_url', null);
            if (noImageProds && noImageProds.length > 0) {
                issues.push({ type: 'error', message: `${noImageProds.length} productos sin imagen principal.`, detail: noImageProds.map((p: { title: string }) => p.title).join(', ') });
            }

            // 2. Check for profiles without full_name
            const { data: noNameProfiles } = await supabase.from('profiles').select('id').is('full_name', null);
            if (noNameProfiles && noNameProfiles.length > 0) {
                issues.push({ type: 'warning', message: `${noNameProfiles.length} perfiles con nombre vacío.` });
            }

            // 3. Test latency
            const start = Date.now();
            await supabase.from('app_config').select('key').limit(1);
            const latency = Date.now() - start;
            issues.push({ type: 'info', message: `Latencia de DB: ${latency}ms`, status: latency > 500 ? 'slow' : 'ok' });

            setHealthLogs(issues);
            Alert.alert('Auditoría Completada', `Se encontraron ${issues.filter(i => i.type === 'error').length} errores críticos.`);
            await Haptics.notificationAsync(issues.filter(i => i.type === 'error').length > 0 ? Haptics.NotificationFeedbackType.Error : Haptics.NotificationFeedbackType.Success);
        } catch (err: any) {
            Alert.alert('Error en Salud', err.message);
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } finally {
            setIsHealthCheckRunning(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'settings') fetchAppConfig();
    }, [activeTab]);

    const fetchAppConfig = async () => {
        try {
            setIsActionLoading(true);
            const { data, error } = await supabase.from('app_config').select('*').order('key');
            if (error) throw error;
            setAppConfig(data || []);
        } catch (err: any) {
            Alert.alert('Error Config', err.message);
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleUpdateConfig = async (key: string, value: unknown) => {
        try {
            setIsActionLoading(true);
            const { error } = await supabase
                .from('app_config')
                .upsert({
                    key,
                    value,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'key' });

            if (error) throw error;
            Alert.alert('Guardado', `Configuración para "${key}" actualizada.`);
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            fetchAppConfig();
            await logAdminAction('update_config', undefined, 'system', { key, value });
        } catch (err: any) {
            Alert.alert('Error', translateError(err.message));
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleApproveProduct = async (productId: string) => {
        try {
            setIsActionLoading(true);
            const { error } = await supabase
                .from('products')
                .update({ status: 'approved' })
                .eq('id', productId);

            if (error) throw error;
            Alert.alert('Éxito', 'Producto aprobado y publicado.');
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            fetchData();
            await logAdminAction('approve_product', productId, 'product');
        } catch (err: any) {
            Alert.alert('Error', translateError(err.message));
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleRejectProduct = async (productId: string) => {
        try {
            setIsActionLoading(true);
            const { error } = await supabase
                .from('products')
                .update({ status: 'rejected' })
                .eq('id', productId);

            if (error) throw error;
            Alert.alert('Rechazado', 'El producto ha sido marcado como rechazado.');
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            fetchData();
            await logAdminAction('reject_product', productId, 'product');
        } catch (err: any) {
            Alert.alert('Error', translateError(err.message));
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleIntervene = async (tx: any) => {
        Alert.alert(
            'Mediación Proactiva',
            `¿Cómo deseas intervenir en la transacción de "${tx.products?.title}"?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Advertir Vendedor',
                    onPress: async () => {
                        Alert.alert('Acción Realizada', 'Se ha enviado un aviso al vendedor.');
                        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        await logAdminAction('intervene_transaction', tx.id, 'support', { action: 'warn_merchant', merchant_id: tx.merchant_id });
                    }
                },
                {
                    text: 'Marcar Revisión',
                    onPress: async () => {
                        Alert.alert('Éxito', 'Transacción marcada para seguimiento prioritario.');
                        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        await logAdminAction('intervene_transaction', tx.id, 'support', { action: 'mark_dispute' });
                    }
                }
            ]
        );
    };

    const handleLoadBaseDictionary = async () => {
        const baseWords = [
            'weon', 'weona', 'culiao', 'culia', 'conchetumare', 'puta', 'mierda', 'pico', 'zorra', 'maricon',
            'jala', 'droga', 'estafa', 'falso', 'clon', 'pichula', 'tetas', 'culo', 'perra', 'malparido',
            'hpta', 'chucha', 'webon', 'gil', 'ctm', 'wea', 'boludo', 'pelotudo', 'hijo de puta', 'maraca',
            'bastardo', 'estafador', 'ilegal', 'armas', 'asqueroso'
        ].join(', ');

        Alert.alert(
            'Cargar Diccionario Base',
            '¿Deseas cargar la lista base de palabras prohibidas (español/chileno)? Esto te permitirá editarlas manualmente después.',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Sí, Cargar',
                    onPress: async () => {
                        await handleUpdateConfig('forbidden_words', baseWords);
                    }
                }
            ]
        );
    };

    const fetchSpecialEvents = async () => {
        try {
            const { data, error } = await supabase
                .from('special_events')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setSpecialEvents(data || []);
        } catch (err) {
            console.error('[Admin] Error fetching events:', err);
        }
    };

    const handleAddEvent = async () => {
        setNewEventName('');
        setShowAddEventModal(true);
    };

    const confirmAddEvent = async () => {
        if (!newEventName.trim()) {
            Alert.alert('Error', 'Debes ingresar un nombre para el evento.');
            return;
        }

        try {
            setIsActionLoading(true);
            const { error } = await supabase
                .from('special_events')
                .insert([{
                    name: newEventName.trim(),
                    start_date: new Date().toISOString(),
                    end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                    is_active: false,
                    theme_color: newEventColor,
                    event_type: newEventType,
                    highlighted_categories: []
                }]);

            if (error) throw error;
            await logAdminAction('create_event', 'system', 'event', { name: newEventName.trim() });
            setShowAddEventModal(false);
            setNewEventName('');
            setNewEventType('general');
            setNewEventColor('#8b5cf6');
            fetchSpecialEvents();
            Alert.alert('Éxito', 'Evento creado correctamente.');
        } catch (err: any) {
            Alert.alert('Error', translateError(err.message));
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleDeleteEvent = async (id: string) => {
        Alert.alert(
            'Eliminar Evento',
            '¿Estás seguro de que deseas eliminar este evento?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Eliminar',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const { error } = await supabase
                                .from('special_events')
                                .delete()
                                .eq('id', id);

                            if (error) throw error;
                            await logAdminAction('delete_event', id, 'event', {});
                            fetchSpecialEvents();
                        } catch (err: any) {
                            Alert.alert('Error', translateError(err.message));
                        }
                    }
                }
            ]
        );
    };

    const handleToggleEvent = async (id: string, active: boolean) => {
        try {
            setIsActionLoading(true);
            const { error } = await supabase
                .from('special_events')
                .update({ is_active: active })
                .eq('id', id);

            if (error) throw error;
            await logAdminAction(active ? 'activate_event' : 'deactivate_event', id, 'event', {});
            fetchSpecialEvents();
        } catch (err: any) {
            Alert.alert('Error', translateError(err.message));
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleUpdateEventColor = async (id: string, theme_color: string) => {
        try {
            const { error } = await supabase
                .from('special_events')
                .update({ theme_color })
                .eq('id', id);

            if (error) throw error;
            fetchSpecialEvents();
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch (err: any) {
            Alert.alert('Error', translateError(err.message));
        }
    };

    const handleUpdateEventDuration = async (id: string, hoursToAdd: number) => {
        try {
            const event = specialEvents.find(e => e.id === id);
            if (!event) return;

            const currentEnd = new Date(event.end_date);
            const newEnd = new Date(currentEnd.getTime() + hoursToAdd * 60 * 60 * 1000);

            const { error } = await supabase
                .from('special_events')
                .update({ end_date: newEnd.toISOString() })
                .eq('id', id);

            if (error) throw error;
            fetchSpecialEvents();
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        } catch (err: any) {
            Alert.alert('Error', translateError(err.message));
        }
    };

    const handleToggleEventCategory = async (id: string, category: string) => {
        try {
            const event = specialEvents.find(e => e.id === id);
            if (!event) return;

            let newCategories = [...(event.highlighted_categories || [])];
            if (newCategories.includes(category)) {
                newCategories = newCategories.filter(c => c !== category);
            } else {
                newCategories.push(category);
            }

            const { error } = await supabase
                .from('special_events')
                .update({ highlighted_categories: newCategories })
                .eq('id', id);

            if (error) throw error;
            fetchSpecialEvents();
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch (err: any) {
            Alert.alert('Error', translateError(err.message));
        }
    };

    const handleUpdateEventType = async (id: string, event_type: string) => {
        try {
            const { error } = await supabase
                .from('special_events')
                .update({ event_type })
                .eq('id', id);

            if (error) throw error;
            fetchSpecialEvents();
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        } catch (err: any) {
            Alert.alert('Error', translateError(err.message));
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
            // Fetch performance metrics
            if (activeTab === 'performance') {
                // Logic implemented at the end of fetchData for more detail
            }
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
                const total = allProds?.reduce((acc: number, p: { price: number | null }) => acc + (p.price || 0), 0) || 0;
                setEconomicVolume(total);

                // Fetch Approval Queue Config
                try {
                    const { data: apprvCfg } = await supabase.from('app_config').select('value').eq('key', 'require_product_approval').single();
                    setRequireApproval(apprvCfg?.value === true);

                    // Fetch Pending Count for Badge
                    const { count: pndCount, error: pndErr } = await supabase.from('products').select('*', { count: 'exact', head: true }).eq('status', 'pending');
                    if (!pndErr) {
                        setPendingCount(pndCount || 0);
                    } else {
                        // Silent fallback for missing column
                        setPendingCount(0);
                    }
                } catch (e) {
                    setRequireApproval(false);
                    setPendingCount(0);
                }

                // Fetch Maintenance Status
                const { data: config } = await supabase.from('app_config').select('value').eq('key', 'maintenance_mode').single();
                setMaintenanceEnabled(config?.value?.enabled || false);

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
                setTopProducts((topProds || []).map(p => p as Product));

                // Fetch Top Sellers (by confirmed sales)
                const { data: confirmedSales } = await supabase
                    .from('product_contacts')
                    .select('merchant_id')
                    .eq('status', 'confirmed');

                if (confirmedSales && confirmedSales.length > 0) {
                    const sellerSalesMap: Record<string, number> = {};
                    confirmedSales.forEach((s: { merchant_id: string }) => {
                        sellerSalesMap[s.merchant_id] = (sellerSalesMap[s.merchant_id] || 0) + 1;
                    });

                    const sortedSellerIds = Object.keys(sellerSalesMap).sort((a: string, b: string) => sellerSalesMap[b] - sellerSalesMap[a]).slice(0, 5);
                    const { data: sellersInfo } = await supabase.from('profiles').select('id, full_name').in('id', sortedSellerIds);

                    const topSellersList = sortedSellerIds.map((id: string) => ({
                        id,
                        full_name: sellersInfo?.find((s: { id: string }) => s.id === id)?.full_name || 'Desconocido',
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

                const combined: ActivityLogItem[] = [
                    ...(usersLog || []).map((u: { id: string, full_name: string, created_at: string }) => ({ ...u, type: 'user' as const, icon: 'user' })),
                    ...(productsLog || []).map((p: { id: string, title: string, created_at: string }) => ({ ...p, type: 'product' as const, icon: 'package' })),
                    ...(reviewsLog || []).map((r: { id: string, comment: string, created_at: string }) => ({ ...r, type: 'review' as const, icon: 'message' }))
                ].sort((a: ActivityLogItem, b: ActivityLogItem) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

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
                // Fetch Categories Count (Metrics)
                const { data: catProds } = await supabase.from('products').select('category');
                const catMap: Record<string, number> = {};
                catProds?.forEach((p: { category: string | null }) => {
                    if (p.category) catMap[p.category] = (catMap[p.category] || 0) + 1;
                });
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
                    const sellerIds = [...new Set(prodData.map((p: Product) => p.user_id).filter((id): id is string => !!id))];
                    const { data: sellers } = await supabase.from('profiles').select('id, full_name').in('id', sellerIds);

                    const sellerMap: Record<string, string> = {};
                    sellers?.forEach((s: { id: string, full_name: string | null }) => { if (s.full_name) sellerMap[s.id] = s.full_name; });

                    const formatted = prodData.map((p: Product) => ({
                        ...p,
                        seller_name: (p.user_id ? sellerMap[p.user_id] : null) || 'Comerciante'
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
                    const reviewerIds = [...new Set(reviewData.map((r: Review) => r.user_id).filter((id): id is string => !!id))];
                    const productIds = [...new Set(reviewData.map((r: Review) => r.product_id).filter((id): id is string => !!id))];

                    const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', reviewerIds);
                    const { data: prods } = await supabase.from('products').select('id, title').in('id', productIds);

                    const profileMap: Record<string, string> = {};
                    profiles?.forEach((p: { id: string, full_name: string | null }) => { if (p.full_name) profileMap[p.id] = p.full_name; });

                    const productMap: Record<string, string> = {};
                    prods?.forEach((p: { id: string, title: string }) => { productMap[p.id] = p.title; });

                    const formatted = reviewData.map((r: Review) => ({
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

            // Fetch Special Events
            if (activeTab === 'events' || activeTab === 'dashboard') {
                fetchSpecialEvents();
            }

            // Fetch Transactions (Phase 4)
            if (activeTab === 'transactions') {
                const { data: contacts, error } = await supabase
                    .from('product_contacts')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (error) {
                    console.error('[Admin] Error fetching transactions:', error);
                    setTransactions([]);
                } else if (contacts && contacts.length > 0) {
                    const buyerIds = [...new Set(contacts.map((c: Contact) => c.user_id).filter((id): id is string => !!id))];
                    const merchantIds = [...new Set(contacts.map((c: Contact) => c.merchant_id).filter((id): id is string => !!id))];
                    const productIds = [...new Set(contacts.map((c: Contact) => c.product_id).filter((id): id is string => !!id))];
                    const allProfileIds = [...new Set([...buyerIds, ...merchantIds])];

                    const [
                        { data: profiles },
                        { data: products }
                    ] = await Promise.all([
                        supabase.from('profiles').select('id, full_name').in('id', allProfileIds),
                        supabase.from('products').select('id, title, price').in('id', productIds)
                    ]);

                    const profileMap: Record<string, string> = {};
                    profiles?.forEach((p: { id: string, full_name: string | null }) => { if (p.full_name) profileMap[p.id] = p.full_name; });

                    const productMap: Record<string, { title: string, price: number }> = {};
                    products?.forEach((p: { id: string, title: string, price: number }) => { productMap[p.id] = { title: p.title, price: p.price }; });

                    const formatted = contacts.map((c: Contact) => ({
                        ...c,
                        products: productMap[c.product_id] || { title: 'Producto Eliminado', price: 0 },
                        buyer: { full_name: (c.user_id ? profileMap[c.user_id] : null) || 'Vecino' },
                        merchant: { full_name: (c.merchant_id ? profileMap[c.merchant_id] : null) || 'Comerciante' }
                    }));
                    setTransactions(formatted);
                } else {
                    setTransactions([]);
                }
            }

            // Fetch Approvals (Phase 4)
            if (activeTab === 'approvals') {
                try {
                    const { data: prodData, error } = await supabase
                        .from('products')
                        .select('*')
                        .eq('status', 'pending')
                        .order('created_at', { ascending: false });

                    if (error) {
                        if (error.code === '42703') {
                            setPendingProducts([{ id: 'error', is_schema_error: true } as Product]);
                        } else {
                            console.error('[Admin] Error fetching approvals:', error);
                            setPendingProducts([]);
                        }
                    } else if (prodData && prodData.length > 0) {
                        const sellerIds = [...new Set(prodData.map((p: any) => p.user_id).filter((id: any) => !!id))];
                        const { data: sellers } = await supabase.from('profiles').select('id, full_name').in('id', sellerIds);

                        const sellerMap: Record<string, string> = {};
                        sellers?.forEach((s: any) => { sellerMap[s.id] = s.full_name; });

                        const formatted = prodData.map((p: any) => ({
                            ...p,
                            profiles: { full_name: sellerMap[p.user_id] || 'Desconocido' }
                        }));
                        setPendingProducts(formatted);
                    } else {
                        setPendingProducts([]);
                    }
                } catch (e) {
                    setPendingProducts([]);
                }
            }


            // Fetch Audit Logs
            if (activeTab === 'audit') {
                let query = supabase
                    .from('admin_audit_logs')
                    .select('*, profiles!admin_id(full_name)')
                    .order('created_at', { ascending: false });

                if (searchQuery) {
                    query = query.or(`action.ilike.%${searchQuery}%,target_type.ilike.%${searchQuery}%,profiles.full_name.ilike.%${searchQuery}%`);
                }

                const { data, error } = await query;

                if (!error) {
                    setAuditLogs(data || []);
                } else {
                    console.error('[Admin] Error al obtener logs de auditoría:', error);
                }
            }

            // Fetch Merchant Performance (Phase 5)
            if (activeTab === 'performance') {
                // Fetch all vendors
                const { data: vendors } = await supabase.from('profiles').select('id, full_name, is_verified').eq('role', 'vendor');

                if (vendors && vendors.length > 0) {
                    const vendorIds = vendors.map((v: { id: string }) => v.id);

                    // Fetch contacts to calculate conversion
                    const { data: contacts } = await supabase.from('product_contacts').select('merchant_id, status').in('merchant_id', vendorIds);

                    // Fetch reviews to calculate average rating
                    const { data: pData } = await supabase.from('products').select('id, user_id').in('user_id', vendorIds);
                    const prodIds = pData?.map((p: { id: string }) => p.id) || [];
                    const { data: reviews } = await supabase.from('product_reviews').select('product_id, rating').in('product_id', prodIds);

                    // Fetch reports
                    const { data: reports } = await supabase.from('product_reports').select('product_id').in('product_id', prodIds);

                    const perfData = vendors.map((v: { id: string, full_name: string | null, is_verified: boolean }) => {
                        const vContacts = contacts?.filter((c: { merchant_id: string, status: string }) => c.merchant_id === v.id) || [];
                        const confirmed = vContacts.filter((c: { status: string }) => c.status === 'confirmed').length;
                        const total = vContacts.length;

                        const vProds = pData?.filter((p: { id: string, user_id: string }) => p.user_id === v.id).map((p: { id: string }) => p.id) || [];
                        const vReviews = reviews?.filter((r: { product_id: string, rating: number }) => vProds.includes(r.product_id)) || [];
                        const avgRating = vReviews.length > 0 ? vReviews.reduce((acc: number, r: { rating: number }) => acc + r.rating, 0) / vReviews.length : 0;

                        const vReports = reports?.filter((r: { product_id: string }) => vProds.includes(r.product_id)).length || 0;

                        return {
                            ...v,
                            totalContacts: total,
                            confirmedSales: confirmed,
                            conversion: total > 0 ? (confirmed / total) * 100 : 0,
                            rating: avgRating,
                            reports: vReports,
                            id: v.id,
                            full_name: v.full_name,
                            is_verified: v.is_verified
                        } as MerchantPerformance;
                    });

                    setMerchantPerformance(perfData.sort((a: MerchantPerformance, b: MerchantPerformance) => b.conversion - a.conversion));
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
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
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
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
            Alert.alert('Error', translateError(err.message));
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
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
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            fetchData();
        } catch (err: any) {
            Alert.alert('Error', translateError(err.message));
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
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
                            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                            await logAdminAction('delete_user', userId, 'user');
                            fetchData();
                        } catch (err: any) {
                            Alert.alert('Error', translateError(err.message));
                            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
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
                            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                            await logAdminAction('delete_product', productId, 'product');
                            fetchData();
                        } catch (err: any) {
                            Alert.alert('Error', translateError(err.message));
                            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
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
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
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
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } finally {
            setPickingImage(false);
        }
    };

    const handleCreateBanner = async () => {
        if (!newBanner.image_url) {
            Alert.alert('Error', 'Debes seleccionar o ingresar una imagen.');
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
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
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (err: any) {
            console.error('[CrearBanner] Error:', err);
            Alert.alert('Error', translateError(err.message));
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleToggleBanner = async (bannerId: string, currentState: boolean) => {
        try {
            const { error } = await supabase.from('promotional_banners').update({ is_active: !currentState }).eq('id', bannerId);
            if (error) throw error;
            fetchData();
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (err: any) {
            Alert.alert('Error', translateError(err.message));
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
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
                        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    } catch (err: any) {
                        Alert.alert('Error', translateError(err.message));
                        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
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
                        if (!error) {
                            fetchData();
                            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        } else {
                            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                        }
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
                            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        } catch (err: any) {
                            console.error('[Admin] Error al cambiar Mantenimiento:', err);
                            Alert.alert('Error', translateError(err.message));
                            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                        }
                    }
                }
            ]
        );
    };

    const handleSendTargetedAlert = async () => {
        if (!targetedMessage.trim() || !selectedUser) {
            Alert.alert('Mensaje Vacío', 'Por favor escribe un mensaje para enviarlo.');
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
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
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setTargetedMessage('');
        } catch (err: any) {
            console.error('[Admin] Error al enviar alerta dirigida:', err);
            Alert.alert('Error', 'No se pudo enviar la notificación: ' + translateError(err.message));
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
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
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            } else {
                console.log('Actualización exitosa, nuevo estado:', data[0].is_featured);
                Alert.alert('Sistema de Admin', `El producto se ha ${!currentState ? 'DESTACADO' : 'QUITADO DE DESTACADOS'} correctamente.`);
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }

            // Re-fetch to update UI
            await fetchData();
        } catch (err: any) {
            console.error('Error al cambiar destacado:', err);
            Alert.alert(
                'Error al Destacar',
                'No se pudo actualizar el estado.\n\nIMPORTANTE: Es probable que necesites ejecutar el siguiente comando en el SQL Editor de Supabase:\n\nALTER TABLE products ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE;'
            );
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
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

                        if (!error) {
                            fetchData();
                            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        } else {
                            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                        }
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
                            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        } catch (err: any) {
                            Alert.alert('Error', translateError(err.message));
                            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
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
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (err: any) {
            Alert.alert('Error', translateError(err.message));
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
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
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (err: any) {
            Alert.alert('Error', translateError(err.message));
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
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
            Alert.alert('Error', 'No se pudo cargar el detalle del producto: ' + translateError(err.message));
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
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
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
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
            {activeTab !== 'dashboard' && (
                <View style={{ backgroundColor: 'white', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', flexDirection: 'row', alignItems: 'center' }}>
                    <TouchableOpacity
                        onPress={() => handleTabPress('dashboard')}
                        style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 }}
                    >
                        <ChevronLeft size={16} color="#64748B" />
                        <Text style={{ marginLeft: 4, fontWeight: '700', color: '#64748B', fontSize: 13 }}>Volver al Panel</Text>
                    </TouchableOpacity>
                    <View style={{ flex: 1 }} />
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={{ fontWeight: '900', color: '#0F172A', fontSize: 16, textTransform: 'capitalize' }}>
                            {activeTab === 'users' ? 'Usuarios' :
                                activeTab === 'products' ? 'Productos' :
                                    activeTab === 'activity' ? 'Actividad' :
                                        activeTab === 'reviews' ? 'Reseñas' :
                                            activeTab === 'audit' ? 'Auditoría' :
                                                activeTab === 'settings' ? 'Ajustes' :
                                                    activeTab === 'gallery' ? 'Galería' :
                                                        activeTab === 'banners' ? 'Publicidad' :
                                                            activeTab === 'health' ? 'Salud del Sistema' :
                                                                activeTab === 'events' ? 'Eventos Especiales' :
                                                                    activeTab}
                        </Text>
                    </View>
                </View>
            )}

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ padding: 20 }}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8b5cf6" />
                }
            >
                {activeTab === 'dashboard' && (
                    <DashboardTab
                        stats={stats}
                        onlineCount={onlineCount}
                        economicVolume={economicVolume}
                        confirmedContactsCount={confirmedContactsCount}
                        whatsappContactsCount={whatsappContactsCount}
                        conversionRate={conversionRate}
                        topProducts={topProducts}
                        topSellers={topSellers}
                        announcements={announcements}
                        openTicketsCount={pendingCount}
                        maintenanceEnabled={maintenanceEnabled}
                        isActionLoading={loading}
                        handleTabPress={handleTabPress}
                        handleToggleMaintenance={handleToggleMaintenance}
                        handleCopyId={handleCopyId}
                        pulseAnim={pulseAnim}
                        broadcastTitle={title}
                        setBroadcastTitle={setTitle}
                        broadcastMessage={content}
                        setBroadcastMessage={setContent}
                        handleBroadcast={handleBroadcast}
                        handleDeleteAnnouncement={handleDeleteAnnouncement}
                        handleRankProductClick={handleRankProductClick}
                        handleRankSellerClick={handleRankSellerClick}
                    />
                )}

                {activeTab === 'users' && (
                    <UsersTab
                        users={users}
                        searchQuery={searchQuery}
                        setSearchQuery={setSearchQuery}
                        setSelectedUser={setSelectedUser}
                        setShowUserModal={setShowUserModal}
                        handleUpdateUserRole={handleUpdateUserRole}
                        handleDeleteUser={handleDeleteUser}
                    />
                )}

                {activeTab === 'products' && (
                    <ProductsTab
                        products={products}
                        searchQuery={searchQuery}
                        setSearchQuery={setSearchQuery}
                        setSelectedProduct={setSelectedProduct}
                        setShowProductModal={setShowProductModal}
                        handleToggleFeatured={handleToggleFeatured}
                        handleDeleteProduct={handleDeleteProduct}
                    />
                )}

                {activeTab === 'reviews' && (
                    <ReviewsTab
                        reviews={reviews}
                        searchQuery={searchQuery}
                        setSearchQuery={setSearchQuery}
                        handleDeleteReview={handleDeleteReview}
                    />
                )}

                {activeTab === 'activity' && (
                    <ActivityTab activityLogs={activityLogs} />
                )}

                {activeTab === 'gallery' && (
                    <GalleryTab
                        galleryProducts={galleryProducts}
                        setSelectedProduct={setSelectedProduct}
                        setShowProductModal={setShowProductModal}
                        handleToggleFeatured={handleToggleFeatured}
                        handleDeleteProduct={handleDeleteProduct}
                    />
                )}

                {activeTab === 'categories' && (
                    <CategoriesTab
                        categories={categoriesConfig}
                        handleAddCategory={handleAddCategory}
                        handleDeleteCategory={handleDeleteCategory}
                    />
                )}

                {activeTab === 'banners' && (
                    <BannersTab
                        banners={banners}
                        handleToggleBanner={handleToggleBanner}
                        handleDeleteBanner={handleDeleteBanner}
                        setShowBannerModal={setShowBannerModal}
                    />
                )}

                {activeTab === 'reports' && (
                    <ReportsTab
                        reports={reports}
                        handleResolveReport={handleResolveReport}
                    />
                )}

                {activeTab === 'performance' && (
                    <PerformanceTab merchantPerformance={merchantPerformance} />
                )}

                {activeTab === 'audit' && (
                    <AuditTab
                        auditLogs={auditLogs}
                        searchQuery={searchQuery}
                        setSearchQuery={setSearchQuery}
                        handleCopyId={handleCopyId}
                    />
                )}

                {activeTab === 'settings' && (
                    <SettingsTab
                        maintenanceEnabled={maintenanceEnabled}
                        handleToggleMaintenance={handleToggleMaintenance}
                        isActionLoading={loading}
                        appConfig={appConfig}
                        requireApproval={requireApproval}
                        handleUpdateConfig={handleUpdateConfig}
                        handleLoadBaseDictionary={handleLoadBaseDictionary}
                        setConfigKey={setConfigKey}
                        setConfigValue={setConfigValue}
                        setIsEditingConfig={setIsEditingConfig}
                        setShowConfigModal={setShowConfigModal}
                    />
                )}

                {activeTab === 'health' && (
                    <HealthTab
                        onlineCount={onlineCount}
                        healthLogs={healthLogs}
                        isHealthCheckRunning={isHealthCheckRunning}
                        runHealthCheck={runHealthCheck}
                    />
                )}

                {activeTab === 'transactions' && (
                    <TransactionsTab
                        transactions={transactions}
                        handleIntervene={handleIntervene}
                    />
                )}

                {activeTab === 'approvals' && (
                    <ApprovalsTab
                        pendingProducts={pendingProducts}
                        handleApproveProduct={handleApproveProduct}
                        handleRejectProduct={handleRejectProduct}
                    />
                )}

                {activeTab === 'events' && (
                    <EventsTab
                        events={specialEvents}
                        availableCategories={categoriesConfig}
                        handleAddEvent={handleAddEvent}
                        handleDeleteEvent={handleDeleteEvent}
                        handleToggleEvent={handleToggleEvent}
                        handleUpdateEventColor={handleUpdateEventColor}
                        handleToggleEventCategory={handleToggleEventCategory}
                        handleUpdateEventDuration={handleUpdateEventDuration}
                        handleUpdateEventType={handleUpdateEventType}
                    />
                )}
            </ScrollView>

            {/* Modal para Nuevo Evento (Arreglo para Android) */}
            <Modal visible={showAddEventModal} animationType="slide" transparent={true}>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { height: 'auto', padding: 24 }]}>
                        <View className="flex-row justify-between items-center mb-6">
                            <Text className="text-xl font-bold text-slate-900">Configurar Nuevo Evento</Text>
                            <TouchableOpacity onPress={() => setShowAddEventModal(false)}>
                                <X size={24} color="#64748B" />
                            </TouchableOpacity>
                        </View>

                        <View className="mb-6">
                            <Text className="text-slate-500 text-xs font-bold uppercase mb-3">Plantillas Rápidas</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                                {EVENT_PRESETS.map(preset => {
                                    const icons: any = { Snowflake, PartyPopper, Sparkles, ShoppingBasket, Gift };
                                    const TypeIcon = icons[preset.icon];
                                    const isSelected = newEventType === preset.id;
                                    return (
                                        <TouchableOpacity
                                            key={preset.id}
                                            onPress={() => {
                                                setNewEventType(preset.id);
                                                setNewEventName(preset.defaultName);
                                                setNewEventColor(preset.color);
                                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            }}
                                            style={{
                                                backgroundColor: isSelected ? preset.color : '#F8FAFC',
                                                borderColor: isSelected ? preset.color : '#E2E8F0',
                                                borderWidth: 1,
                                            }}
                                            className="mr-3 p-4 rounded-2xl items-center min-w-[100px]"
                                        >
                                            <TypeIcon size={24} color={isSelected ? 'white' : '#64748B'} />
                                            <Text className={`mt-2 text-xs font-bold ${isSelected ? 'text-white' : 'text-slate-600'}`}>
                                                {preset.label}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                        </View>

                        <View className="mb-6">
                            <Text className="text-slate-500 text-xs font-bold uppercase mb-2">Nombre del Evento</Text>
                            <TextInput
                                className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-slate-900"
                                placeholder="Ej: Venta de Navidad, Cyber Day..."
                                value={newEventName}
                                onChangeText={setNewEventName}
                                autoFocus
                            />
                        </View>

                        <TouchableOpacity
                            onPress={confirmAddEvent}
                            disabled={isActionLoading}
                            className={`h-14 rounded-2xl items-center justify-center flex-row ${isActionLoading ? 'bg-slate-100' : 'bg-brand-600'}`}
                        >
                            {isActionLoading ? (
                                <ActivityIndicator color="#6366f1" />
                            ) : (
                                <>
                                    <Star size={20} color="white" className="mr-2" />
                                    <Text className="text-white font-bold">Crear Evento Especial</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

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

                                        {/* Warning System Section */}
                                        <View className="mt-6 pt-6 border-t border-slate-100">
                                            <Text className="text-slate-900 font-black text-base mb-4">Llamado de Atención (Warn)</Text>
                                            <View className="flex-row space-x-2">
                                                <View style={[styles.input, { flex: 1, justifyContent: 'center' }]}>
                                                    <TextInput
                                                        placeholder="Motivo de la advertencia..."
                                                        value={warningReason}
                                                        onChangeText={setWarningReason}
                                                        style={{ fontSize: 13 }}
                                                    />
                                                </View>
                                                <TouchableOpacity
                                                    onPress={handleWarnUser}
                                                    disabled={isActionLoading || !warningReason}
                                                    className={`px-6 rounded-2xl items-center justify-center ${!warningReason ? 'bg-slate-100' : 'bg-amber-500'}`}
                                                >
                                                    <AlertTriangle size={20} color={!warningReason ? '#CBD5E1' : 'white'} />
                                                </TouchableOpacity>
                                            </View>
                                            {selectedUser && (selectedUser.warning_count || 0) > 0 && (
                                                <View className="flex-row items-center mt-3 bg-amber-50 p-3 rounded-xl border border-amber-100">
                                                    <Info size={14} color="#D97706" />
                                                    <Text className="text-amber-800 text-[10px] font-bold ml-2">
                                                        ESTE USUARIO YA TIENE {selectedUser.warning_count || 0} ADVERTENCIAS.
                                                    </Text>
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
                                    onChangeText={(text: string) => setNewBanner((prev: any) => ({ ...prev, image_url: text }))}
                                    placeholder="https://images.unsplash.com/..."
                                    placeholderTextColor="#94A3B8"
                                />
                            </View>

                            <View className="mb-6">
                                <Text className="text-slate-500 font-bold text-xs mb-2 uppercase tracking-widest">Título (Opcional)</Text>
                                <TextInput
                                    style={styles.input}
                                    value={newBanner.title}
                                    onChangeText={(text: string) => setNewBanner((prev: any) => ({ ...prev, title: text }))}
                                    placeholder="Ej: Ofertas de Navidad"
                                    placeholderTextColor="#94A3B8"
                                />
                            </View>

                            <View className="mb-6">
                                <Text className="text-slate-500 font-bold text-xs mb-2 uppercase tracking-widest">Ruta Interna (Opcional)</Text>
                                <TextInput
                                    style={styles.input}
                                    value={newBanner.link_route}
                                    onChangeText={(text: string) => setNewBanner((prev: any) => ({ ...prev, link_route: text }))}
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

            <Modal visible={showConfigModal} animationType="fade" transparent={true}>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { height: 'auto', padding: 32 }]}>
                        <View className="flex-row justify-between items-center mb-6">
                            <Text style={styles.modalTitle}>{isEditingConfig ? 'Editar Variable' : 'Nueva Variable'}</Text>
                            <TouchableOpacity onPress={() => setShowConfigModal(false)}>
                                <X size={24} color="#94A3B8" />
                            </TouchableOpacity>
                        </View>
                        <View className="mb-4">
                            <Text className="text-slate-500 font-bold text-xs mb-2 uppercase tracking-widest">Clave (Key)</Text>
                            <TextInput
                                style={[styles.input, isEditingConfig && { opacity: 0.6 }]}
                                value={configKey}
                                onChangeText={setConfigKey}
                                placeholder="Ej: maintenance_mode"
                                placeholderTextColor="#94A3B8"
                                editable={!isEditingConfig}
                            />
                        </View>
                        <View className="mb-6">
                            <Text className="text-slate-500 font-bold text-xs mb-2 uppercase tracking-widest">Valor (Value)</Text>
                            <TextInput
                                style={[styles.input, { height: 100 }]}
                                value={configValue}
                                onChangeText={setConfigValue}
                                placeholder="Ingresa el valor..."
                                placeholderTextColor="#94A3B8"
                                multiline
                            />
                        </View>
                        <TouchableOpacity
                            onPress={() => {
                                handleUpdateConfig(configKey, configValue);
                                setShowConfigModal(false);
                            }}
                            disabled={isActionLoading || !configKey.trim()}
                            activeOpacity={0.8}
                            style={[styles.broadcastButton, (!configKey.trim() || isActionLoading) && { opacity: 0.5 }]}
                        >
                            {isActionLoading ? <ActivityIndicator color="white" /> : <Text style={styles.broadcastButtonText}>{isEditingConfig ? 'Actualizar Variable' : 'Crear Variable'}</Text>}
                        </TouchableOpacity>
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
    primaryButton: {
        height: 52,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
    },
});
