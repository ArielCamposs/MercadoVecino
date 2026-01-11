import ProductDetailModal from '@/components/ProductDetailModal';
import PromptReviewModal from '@/components/PromptReviewModal';
import { sendPushNotification } from '@/lib/notification_sender';
import { supabase } from '@/lib/supabase';
import { translateError } from '@/lib/translations';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AlertTriangle, CheckCircle2, ChevronLeft, Info, Send, ShoppingBag, User } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

interface Message {
    id: string;
    room_id: string;
    sender_id: string;
    content: string;
    created_at: string;
    is_read: boolean;
}

interface Participant {
    id: string;
    full_name: string;
    avatar_url: string;
    last_seen?: string;
}

interface ProductInfo {
    id: string;
    title: string;
    price: number;
    image: string;
    image_urls?: string[];
    category: string;
    user_id: string;
    seller?: string;
    is_verified?: boolean;
    description?: string;
    location?: string;
    allows_pickup?: boolean;
    allows_delivery?: boolean;
    delivery_fee?: number;
    extra_services?: { name: string, price: string }[];
}

export default function ChatScreen() {
    const { id, is_support } = useLocalSearchParams();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);
    const [inputText, setInputText] = useState('');
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [otherParticipant, setOtherParticipant] = useState<Participant | null>(null);
    const [productInfo, setProductInfo] = useState<ProductInfo | null>(null);
    const [showProductModal, setShowProductModal] = useState(false);
    const [sending, setSending] = useState(false);
    const [contactStatus, setContactStatus] = useState<string | null>(null);
    const [isOtherOnline, setIsOtherOnline] = useState(false);
    const [isOtherTyping, setIsOtherTyping] = useState(false);
    const [isMeTyping, setIsMeTyping] = useState(false);
    const [room, setRoom] = useState<any>(null);
    const [showReviewModal, setShowReviewModal] = useState(false);
    const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const roomPresenceRef = useRef<any>(null);
    const flatListRef = useRef<FlatList>(null);

    // Support ticket specific state
    const isSupportTicket = is_support === 'true';
    const [ticketData, setTicketData] = useState<any>(null);
    const [adminReply, setAdminReply] = useState('');

    const QUICK_ACTIONS = [
        "📍 Punto de Entrega",
        "¿Sigue disponible?",
        "¿Dónde entregas?",
        "¿Cuál es el precio final?",
        "¡Me interesa!",
        "Gracias."
    ];
    useEffect(() => {
        let msgChannel: any;
        let contactChannel: any;

        const setup = async () => {
            await setupChat();

            // 1. Subscribe to NEW messages in this room
            msgChannel = supabase
                .channel(`messages_${id}`)
                .on('postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'chat_messages',
                        filter: `room_id=eq.${id}`
                    },
                    async (payload) => {
                        const newMsg = payload.new as Message;
                        setMessages(prev => [...prev, newMsg]);

                        // If message is from other person, mark it as read
                        const { data: { user } } = await supabase.auth.getUser();
                        if (user && newMsg.sender_id !== user.id) {
                            markAsRead();
                        }
                    }
                )
                .subscribe();

            // 2. Subscribe to contact changes (Deals)
            if (productInfo?.id && room) {
                const buyerId = room.participants.find((p: string) => p !== productInfo.user_id);

                contactChannel = supabase
                    .channel(`contact_changes_${productInfo.id}`)
                    .on('postgres_changes', {
                        event: '*',
                        schema: 'public',
                        table: 'product_contacts',
                        filter: `product_id=eq.${productInfo.id}`
                    }, (payload) => {
                        // Only update if it's the contact for the current buyer
                        const newPayload = payload.new as any;
                        if (newPayload.user_id === buyerId) {
                            setContactStatus(newPayload.status);
                        }
                    })
                    .subscribe();
            }
        };

        setup();

    }, [id, productInfo?.id, productInfo?.user_id, room]);

    // Handle Global Presence (Online Status)
    useEffect(() => {
        if (!otherParticipant?.id) return;

        console.log('[Presencia] Suscribiéndose a presencia global para:', otherParticipant.id);
        const channel = supabase.channel('online-users');

        const syncStatus = () => {
            const state = channel.presenceState();
            setIsOtherOnline(!!(otherParticipant?.id && state[otherParticipant.id]));
        };

        channel
            .on('presence', { event: 'sync' }, syncStatus)
            .on('presence', { event: 'join' }, syncStatus)
            .on('presence', { event: 'leave' }, syncStatus)
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [otherParticipant?.id]);

    // Handle Room Presence (Typing Indicators)
    useEffect(() => {
        if (!otherParticipant?.id || !currentUserId) return;

        console.log('[Presencia] Suscribiéndose a presencia de sala:', id);
        const channel = supabase.channel(`presence_${id}`);
        roomPresenceRef.current = channel;

        channel
            .on('presence', { event: 'sync' }, () => {
                const state = channel.presenceState();
                if (otherParticipant?.id && state[otherParticipant.id]) {
                    const isTyping = (state[otherParticipant.id] as any).some((p: any) => p.isTyping);
                    setIsOtherTyping(isTyping);
                } else {
                    setIsOtherTyping(false);
                }
            })
            .subscribe(async (status: string) => {
                if (status === 'SUBSCRIBED') {
                    await channel.track({
                        user_id: currentUserId,
                        isTyping: false
                    });
                }
            });

        return () => {
            channel.untrack();
            supabase.removeChannel(channel);
            roomPresenceRef.current = null;
        };
    }, [id, otherParticipant?.id, currentUserId]);

    const setupChat = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            setCurrentUserId(user.id);

            if (isSupportTicket) {
                // Handle Support Ticket
                const { data: ticket, error: ticketError } = await supabase
                    .from('support_tickets')
                    .select(`
                        *,
                        profiles:user_id (
                            id,
                            full_name,
                            avatar_url
                        )
                    `)
                    .eq('id', id)
                    .single();

                if (ticketError) throw ticketError;
                setTicketData(ticket);

                const profile = Array.isArray(ticket.profiles) ? ticket.profiles[0] : ticket.profiles;
                setOtherParticipant({
                    id: profile?.id || ticket.user_id,
                    full_name: profile?.full_name || 'Usuario',
                    avatar_url: profile?.avatar_url || ''
                });

                if (ticket.admin_reply) {
                    setAdminReply(ticket.admin_reply);
                }
            } else {
                // Handle Regular Chat
                const { data: room, error: roomError } = await supabase
                    .from('chat_rooms')
                    .select('*')
                    .eq('id', id)
                    .single();

                if (roomError) throw roomError;
                setRoom(room);

                const otherId = room.participants.find((p: string) => p !== user.id);
                if (otherId) {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('id, full_name, avatar_url, last_seen')
                        .eq('id', otherId)
                        .single();
                    setOtherParticipant(profile);
                }

                if (room.product_id) {
                    // 1. Fetch Product
                    const { data: prod, error: prodError } = await supabase
                        .from('products')
                        .select('*')
                        .eq('id', room.product_id)
                        .maybeSingle();

                    if (prodError) {
                        console.error('[Chat] Error al cargar info del producto:', prodError);
                    }

                    if (prod) {
                        // 2. Fetch Seller Profile separately to avoid join errors
                        const { data: sellerInfo } = await supabase
                            .from('profiles')
                            .select('full_name, is_verified')
                            .eq('id', prod.user_id)
                            .maybeSingle();

                        const productData: ProductInfo = {
                            id: prod.id,
                            title: prod.title,
                            price: prod.price,
                            image: prod.image_url,
                            image_urls: prod.image_urls || [],
                            category: prod.category,
                            user_id: prod.user_id,
                            seller: sellerInfo?.full_name || 'Vecino',
                            is_verified: !!sellerInfo?.is_verified,
                            description: prod.description,
                            location: prod.location,
                            allows_pickup: prod.allows_pickup,
                            allows_delivery: prod.allows_delivery,
                            delivery_fee: prod.delivery_fee,
                            extra_services: prod.extra_services
                        };
                        console.log('[Chat] Info del producto cargada:', productData.title);
                        setProductInfo(productData);

                        // 4. Fetch Contact Status
                        const buyerId = room.participants.find((p: string) => p !== prod.user_id);
                        if (buyerId) {
                            const { data: contact } = await supabase
                                .from('product_contacts')
                                .select('status')
                                .eq('product_id', prod.id)
                                .eq('user_id', buyerId)
                                .maybeSingle();
                            setContactStatus(contact?.status || null);
                        }
                    }
                }

                // 5. Fetch Messages
                const { data: msgs, error: msgsError } = await supabase
                    .from('chat_messages')
                    .select('*')
                    .eq('room_id', id)
                    .order('created_at', { ascending: true });

                if (msgsError) throw msgsError;
                setMessages(msgs || []);
                markAsRead();
            }
        } catch (err: any) {
            console.error('[Chat] Error:', err);
            Alert.alert('Error', translateError(err.message));
        } finally {
            setLoading(false);
        }
    };

    const markAsRead = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            console.log('[Chat] Marcando mensajes como leídos para sala:', id);
            const { error, count } = await supabase
                .from('chat_messages')
                .update({ is_read: true })
                .eq('room_id', id)
                .neq('sender_id', user.id)
                .eq('is_read', false)
                .select();

            if (error) {
                console.error('[Chat] Error al marcar como leído:', error);
            } else {
                console.log('[Chat] Mensajes marcados como leídos:', count);
            }
        } catch (err) {
            console.error('[Chat] Error al marcar lectura:', err);
        }
    };

    const handleTyping = (text: string) => {
        setInputText(text);

        if (!isMeTyping) {
            setIsMeTyping(true);
            updatePresence(true);
        }

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            setIsMeTyping(false);
            updatePresence(false);
        }, 3000);
    };

    const updatePresence = async (typing: boolean) => {
        if (!roomPresenceRef.current) return;

        await roomPresenceRef.current.track({
            user_id: currentUserId,
            isTyping: typing
        });
    };

    const sendMessage = async (textOverride?: string) => {
        const textToSend = textOverride || inputText;
        if (!textToSend.trim() || !currentUserId || sending) return;

        // Optimistic Update
        const optimisticMsg: Message = {
            id: 'temp-' + Date.now(),
            room_id: id as string,
            sender_id: currentUserId,
            content: textToSend.trim(),
            created_at: new Date().toISOString(),
            is_read: false
        };
        setMessages(prev => [...prev, optimisticMsg]);

        try {
            setSending(true);
            const content = textToSend.trim();
            if (!textOverride) setInputText('');

            // Stop typing indicator immediately
            setIsMeTyping(false);
            updatePresence(false);
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

            const { error } = await supabase
                .from('chat_messages')
                .insert({
                    room_id: id,
                    sender_id: currentUserId,
                    content: content
                });

            if (error) {
                // Remove optimistic message on error
                setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
                throw error;
            }

            // Send push notification to the other participant
            if (otherParticipant?.id) {
                const { data: { user: me } } = await supabase.auth.getUser();
                sendPushNotification(
                    otherParticipant.id,
                    me?.user_metadata?.full_name || 'Nuevo Mensaje',
                    content,
                    { type: 'chat', roomId: id }
                );
            }

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (err) {
            console.error('[Chat] Error al enviar:', err);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } finally {
            setSending(false);
        }
    };

    const handleCloseDeal = async () => {
        if (!productInfo || !otherParticipant || sending) return;

        Alert.alert(
            "Finalizar Trato",
            "¿Confirmas que has vendido este producto al vecino? Esto le permitirá calificarte y ayudará a tu reputación.",
            [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "Sí, Vendido",
                    onPress: async () => {
                        try {
                            setSending(true);
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

                            // 1. Propose deal in product_contacts
                            const { error: contactError } = await supabase
                                .from('product_contacts')
                                .upsert({
                                    product_id: productInfo.id,
                                    user_id: otherParticipant.id, // The buyer
                                    status: 'deal_proposed'
                                }, { onConflict: 'product_id,user_id' });

                            if (contactError) throw contactError;
                            setContactStatus('deal_proposed');

                            // 2. Send system message
                            await sendMessage("🤝 He marcado el trato como CERRADO. Vecino, por favor confirma la compra en el botón que te aparecerá aquí mismo.");

                            // 3. Send push notification to the buyer
                            sendPushNotification(
                                otherParticipant.id,
                                '🤝 Propuesta de Trato',
                                `¡El vendedor ha propuesto cerrar el trato por "${productInfo.title}"!`,
                                { type: 'deal_proposed', roomId: id }
                            );

                            Alert.alert("Propuesta Enviada", "El vecino debe confirmar la compra para finalizar el proceso.");
                        } catch (err: any) {
                            console.error('[Chat] Error al cerrar trato:', err);
                            Alert.alert("Error", translateError(err.message));
                        } finally {
                            setSending(false);
                        }
                    }
                }
            ]
        );
    };

    const handleConfirmDeal = async () => {
        if (!productInfo || !currentUserId || sending) return;
        try {
            setSending(true);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

            const { error } = await supabase
                .from('product_contacts')
                .update({ status: 'confirmed' })
                .eq('product_id', productInfo.id)
                .eq('user_id', currentUserId);

            if (error) throw error;
            setContactStatus('confirmed');

            await sendMessage("✅ ¡Venta Confirmada! El vecino ha validado la compra satisfactoriamente. ✨");

            // Send push notification to the merchant
            sendPushNotification(
                productInfo.user_id,
                '✅ ¡Venta Confirmada!',
                `¡El vecino ha confirmado la compra de "${productInfo.title}"! ✨`,
                { type: 'deal_confirmed', roomId: id }
            );

            // Trigger review modal for the buyer
            setShowReviewModal(true);

            Alert.alert("¡Trato Hecho!", "Gracias por confirmar. Tu calificación ayuda mucho al vendedor.");
        } catch (err: any) {
            console.error('[Chat] Error al confirmar:', err);
            Alert.alert("Error", translateError(err.message));
        } finally {
            setSending(false);
        }
    };

    const handleRejectDeal = async () => {
        if (!productInfo || !currentUserId || sending) return;
        try {
            setSending(true);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

            const { error } = await supabase
                .from('product_contacts')
                .update({ status: 'pending' })
                .eq('product_id', productInfo.id)
                .eq('user_id', currentUserId);

            if (error) throw error;
            setContactStatus('pending');

            await sendMessage("❌ El vecino ha indicado que el trato aún no se concreta.");
        } catch (err: any) {
            console.error('[Chat] Error al rechazar:', err);
        } finally {
            setSending(false);
        }
    };

    const handleReport = () => {
        Alert.alert(
            "Reportar Usuario",
            "¿Deseas reportar a este usuario por mal comportamiento o actividad sospechosa? Un administrador revisará la conversación.",
            [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "Reportar",
                    style: "destructive",
                    onPress: async () => {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                        Alert.alert("Reporte Enviado", "Gracias por ayudarnos a mantener segura la comunidad. Revisaremos este caso a la brevedad.");
                    }
                }
            ]
        );
    };

    // Support Ticket Functions
    const handleSendAdminReply = async () => {
        if (!ticketData || !adminReply.trim() || sending) return;
        try {
            setSending(true);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

            const { error } = await supabase
                .from('support_tickets')
                .update({
                    admin_reply: adminReply.trim(),
                    status: 'in_progress',
                    updated_at: new Date().toISOString()
                })
                .eq('id', id);

            if (error) throw error;

            // Send push notification to user
            await sendPushNotification(
                ticketData.user_id,
                '📩 Respuesta de Soporte',
                `El equipo ha respondido tu consulta: "${ticketData.subject}"`,
                { type: 'support_reply', ticket_id: id }
            );

            Alert.alert('Respuesta Enviada', 'El usuario recibirá una notificación.');
            setTicketData({ ...ticketData, admin_reply: adminReply.trim(), status: 'in_progress' });
        } catch (err: any) {
            console.error('[Soporte] Error al enviar respuesta:', err);
            Alert.alert('Error', translateError(err.message));
        } finally {
            setSending(false);
        }
    };

    const handleResolveTicket = async () => {
        if (!ticketData || sending) return;
        Alert.alert(
            'Resolver Ticket',
            '¿Marcar este ticket como resuelto?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Resolver',
                    style: 'default',
                    onPress: async () => {
                        try {
                            setSending(true);
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

                            const { error } = await supabase
                                .from('support_tickets')
                                .update({
                                    status: 'resolved',
                                    updated_at: new Date().toISOString()
                                })
                                .eq('id', id);

                            if (error) throw error;

                            // Send notification to user
                            await sendPushNotification(
                                ticketData.user_id,
                                '✅ Ticket Resuelto',
                                `Tu consulta "${ticketData.subject}" ha sido resuelta.`,
                                { type: 'support_resolved', ticket_id: id }
                            );

                            Alert.alert('Ticket Resuelto', 'El usuario ha sido notificado.');
                            setTicketData({ ...ticketData, status: 'resolved' });
                        } catch (err: any) {
                            console.error('[Soporte] Error al resolver ticket:', err);
                            Alert.alert('Error', translateError(err.message));
                        } finally {
                            setSending(false);
                        }
                    }
                }
            ]
        );
    };

    const groupMessages = (msgs: Message[]) => {
        const groups: { title: string, data: Message[] }[] = [];
        msgs.forEach(msg => {
            const date = new Date(msg.created_at);
            const today = new Date();
            const yesterday = new Date();
            yesterday.setDate(today.getDate() - 1);

            let dateStr = date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
            if (date.toDateString() === today.toDateString()) dateStr = 'Hoy';
            else if (date.toDateString() === yesterday.toDateString()) dateStr = 'Ayer';

            const lastGroup = groups[groups.length - 1];
            if (lastGroup && lastGroup.title === dateStr) {
                lastGroup.data.push(msg);
            } else {
                groups.push({ title: dateStr, data: [msg] });
            }
        });
        return groups;
    };

    const renderMessage = ({ item }: { item: Message }) => {
        const isMine = item.sender_id === currentUserId;
        return (
            <View style={[styles.messageContainer, isMine ? styles.myMessageContainer : styles.otherMessageContainer]}>
                <View style={[styles.messageBubble, isMine ? styles.myBubble : styles.otherBubble]}>
                    <Text style={[styles.messageText, isMine ? styles.myMessageText : styles.otherMessageText]}>
                        {item.content}
                    </Text>
                    <View className="flex-row items-center justify-end mt-1">
                        <Text style={[styles.messageTime, isMine ? styles.myMessageTime : styles.otherMessageTime]}>
                            {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                        {isMine && (
                            <View className="ml-1 flex-row">
                                <View style={{ width: 14, height: 14, justifyContent: 'center', alignItems: 'center' }}>
                                    <View style={{ position: 'relative' }}>
                                        <Text style={{ color: item.is_read ? '#60A5FA' : 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: '900' }}>
                                            {item.is_read ? '✓✓' : '✓'}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        )}
                    </View>
                </View>
            </View>
        );
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#2563EB" />
            </View>
        );
    }

    const isActuallyOnline = () => {
        if (isOtherOnline) return true;
        if (!otherParticipant?.last_seen) return false;

        const lastSeen = new Date(otherParticipant.last_seen).getTime();
        const now = new Date().getTime();
        return (now - lastSeen) < (3 * 60 * 1000); // 3 minutes buffer
    };

    return (
        <SafeAreaView edges={['top', 'bottom']} style={styles.container}>
            {isSupportTicket && ticketData ? (
                // Support Ticket Interface
                <>
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                            <ChevronLeft size={28} color="#0F172A" />
                        </TouchableOpacity>
                        <View style={styles.headerInfo}>
                            <View style={styles.headerAvatarContainer}>
                                {otherParticipant?.avatar_url ? (
                                    <Image source={{ uri: otherParticipant.avatar_url }} style={styles.headerAvatar} />
                                ) : (
                                    <View style={[styles.headerAvatar, styles.avatarPlaceholder]}>
                                        <User size={16} color="#94A3B8" />
                                    </View>
                                )}
                            </View>
                            <View>
                                <Text style={styles.headerName} numberOfLines={1}>
                                    {otherParticipant?.full_name || 'Usuario'}
                                </Text>
                                <Text style={styles.headerStatus}>
                                    Ticket de Soporte
                                </Text>
                            </View>
                        </View>
                        <View style={{ width: 40 }} />
                    </View>

                    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
                        {/* Ticket Info Card */}
                        <View className="bg-white rounded-3xl p-6 mb-4 border border-slate-100">
                            <View className="flex-row items-center mb-4">
                                <View className={`px-3 py-1.5 rounded-full ${ticketData.status === 'open' ? 'bg-red-100' :
                                    ticketData.status === 'in_progress' ? 'bg-amber-100' :
                                        'bg-emerald-100'
                                    }`}>
                                    <Text className={`text-xs font-black uppercase ${ticketData.status === 'open' ? 'text-red-700' :
                                        ticketData.status === 'in_progress' ? 'text-amber-700' :
                                            'text-emerald-700'
                                        }`}>
                                        {ticketData.status === 'open' ? 'Abierto' :
                                            ticketData.status === 'in_progress' ? 'En Proceso' :
                                                'Resuelto'}
                                    </Text>
                                </View>
                                <Text className="text-slate-400 text-xs ml-auto">
                                    {new Date(ticketData.created_at).toLocaleDateString('es-ES', {
                                        day: 'numeric',
                                        month: 'long',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </Text>
                            </View>
                            <Text className="text-slate-900 font-black text-lg mb-2">
                                {ticketData.subject}
                            </Text>
                            <Text className="text-slate-600 leading-6">
                                {ticketData.message}
                            </Text>
                        </View>

                        {/* Admin Reply Section */}
                        <View className="bg-slate-50 rounded-3xl p-6 border border-slate-200">
                            <Text className="text-slate-900 font-black text-base mb-4">
                                Respuesta del Equipo
                            </Text>
                            {ticketData.status === 'resolved' ? (
                                <View className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 mb-4">
                                    <Text className="text-emerald-700 font-bold text-center">
                                        ✅ Este ticket ha sido marcado como resuelto
                                    </Text>
                                </View>
                            ) : null}
                            <TextInput
                                style={{
                                    backgroundColor: ticketData.status === 'resolved' ? '#F1F5F9' : 'white',
                                    borderRadius: 16,
                                    padding: 16,
                                    minHeight: 120,
                                    textAlignVertical: 'top',
                                    borderWidth: 1,
                                    borderColor: ticketData.status === 'resolved' ? '#CBD5E1' : '#E2E8F0',
                                    fontSize: 15,
                                    color: ticketData.status === 'resolved' ? '#94A3B8' : '#1E293B'
                                }}
                                placeholder={ticketData.status === 'resolved' ? 'Ticket resuelto - No se pueden enviar más respuestas' : 'Escribe tu respuesta al usuario...'}
                                placeholderTextColor="#94A3B8"
                                multiline
                                value={adminReply}
                                onChangeText={setAdminReply}
                                editable={ticketData.status !== 'resolved'}
                            />
                            <View className="flex-row gap-3 mt-4">
                                <TouchableOpacity
                                    onPress={handleSendAdminReply}
                                    disabled={!adminReply.trim() || sending || ticketData.status === 'resolved'}
                                    className={`flex-1 p-4 rounded-2xl items-center ${!adminReply.trim() || sending || ticketData.status === 'resolved' ? 'bg-slate-300' : 'bg-brand-600'
                                        }`}
                                >
                                    <Text className="text-white font-black">
                                        {sending ? 'Enviando...' : 'Enviar Respuesta'}
                                    </Text>
                                </TouchableOpacity>
                                {ticketData.status !== 'resolved' && (
                                    <TouchableOpacity
                                        onPress={handleResolveTicket}
                                        disabled={sending}
                                        className={`flex-1 p-4 rounded-2xl items-center ${sending ? 'bg-slate-300' : 'bg-emerald-600'
                                            }`}
                                    >
                                        <Text className="text-white font-black">
                                            Marcar Resuelto
                                        </Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                    </ScrollView>
                </>
            ) : (
                // Regular Chat Interface
                <>
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                            <ChevronLeft size={28} color="#0F172A" />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.headerInfo}
                            onPress={() => {
                                if (otherParticipant?.id) {
                                    router.push({
                                        pathname: '/merchant/[id]',
                                        params: { id: otherParticipant.id }
                                    });
                                }
                            }}
                        >
                            <View style={styles.headerAvatarContainer}>
                                {otherParticipant?.avatar_url ? (
                                    <Image source={{ uri: otherParticipant.avatar_url }} style={styles.headerAvatar} />
                                ) : (
                                    <View style={[styles.headerAvatar, styles.avatarPlaceholder]}>
                                        <User size={16} color="#94A3B8" />
                                    </View>
                                )}
                            </View>
                            <View>
                                <Text style={styles.headerName} numberOfLines={1}>
                                    {otherParticipant?.full_name || 'Vecino'}
                                </Text>
                                <Text style={[styles.headerStatus, !isActuallyOnline() && styles.headerStatusOffline]}>
                                    {isOtherTyping ? 'Escribiendo...' : (isActuallyOnline() ? 'En línea ahora' : 'Desconectado')}
                                </Text>
                            </View>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.infoBtn} onPress={handleReport}>
                            <AlertTriangle size={24} color="#EF4444" />
                        </TouchableOpacity>
                    </View>

                    {/* Product Context Card */}
                    {productInfo && (
                        <View style={styles.productContextCard}>
                            <View style={styles.productImageContainer}>
                                {productInfo.image || (productInfo.image_urls && productInfo.image_urls.length > 0) ? (
                                    <Image
                                        source={{ uri: productInfo.image || (productInfo.image_urls && productInfo.image_urls[0]) }}
                                        style={styles.productImage}
                                    />
                                ) : (
                                    <View style={[styles.productImage, { backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' }]}>
                                        <Info size={16} color="#CBD5E1" />
                                    </View>
                                )}
                            </View>
                            <View className="flex-1 ml-3">
                                <Text className="text-slate-400 font-black text-[9px] uppercase tracking-tighter" numberOfLines={1}>
                                    {productInfo.category}
                                </Text>
                                <Text className="text-slate-800 font-bold text-sm" numberOfLines={1}>
                                    {productInfo.title}
                                </Text>
                                <Text className="text-brand-600 font-black text-xs">
                                    ${Number(productInfo.price).toLocaleString()}
                                </Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    setShowProductModal(true);
                                }}
                                className="bg-slate-50 px-3 py-2 rounded-xl border border-slate-100"
                            >
                                <Text className="text-slate-500 font-black text-[10px] uppercase">Ver</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Buyer Confirmation Card */}
                    {contactStatus === 'deal_proposed' && productInfo?.user_id !== currentUserId && (
                        <View className="mx-4 mt-4 bg-white border border-amber-200 p-8 rounded-[40px] shadow-xl shadow-amber-100 overflow-hidden relative">
                            <View className="absolute -top-10 -right-10 bg-amber-50 w-32 h-32 rounded-full opacity-50" />

                            <View className="items-center mb-6">
                                <View className="w-16 h-16 bg-amber-100 rounded-2xl items-center justify-center mb-4">
                                    <ShoppingBag size={32} color="#D97706" />
                                </View>
                                <Text className="text-slate-900 font-black text-2xl mb-2 text-center">¡El Trato Está Cerca! 🤝</Text>
                                <Text className="text-slate-500 text-sm text-center px-4 leading-5">
                                    El vendedor marcó el producto como vendido. ¿Confirmas que concretaste la compra?
                                </Text>
                            </View>

                            <View className="flex-row gap-4">
                                <TouchableOpacity
                                    onPress={handleRejectDeal}
                                    disabled={sending}
                                    className="flex-1 bg-slate-50 border border-slate-100 py-5 rounded-3xl items-center"
                                >
                                    <Text className="text-slate-400 font-black uppercase text-[10px] tracking-widest">Aún no</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={handleConfirmDeal}
                                    disabled={sending}
                                    className="flex-[2] bg-brand-600 py-5 rounded-3xl items-center shadow-lg shadow-brand-200 flex-row justify-center"
                                >
                                    <CheckCircle2 size={18} color="white" />
                                    <Text className="text-white font-black ml-2">Sí, lo compré</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    <FlatList
                        ref={flatListRef}
                        data={groupMessages(messages)}
                        keyExtractor={(item, index) => index.toString()}
                        renderItem={({ item }) => (
                            <View>
                                <View className="items-center my-4">
                                    <View className="bg-slate-200 px-3 py-1 rounded-full">
                                        <Text className="text-slate-500 text-[10px] font-bold uppercase">{item.title}</Text>
                                    </View>
                                </View>
                                {item.data.map((msg: Message) => (
                                    <View key={msg.id}>
                                        {renderMessage({ item: msg })}
                                    </View>
                                ))}
                            </View>
                        )}
                        contentContainerStyle={styles.messagesList}
                        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                        onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
                        ListHeaderComponent={
                            <View className="bg-blue-50 p-4 rounded-3xl mb-6 border border-blue-100 flex-row items-center">
                                <Info size={20} color="#2563EB" />
                                <View className="ml-3 flex-1">
                                    <Text className="text-blue-900 font-bold text-xs">Consejo de Seguridad</Text>
                                    <Text className="text-blue-700 text-[11px]">No compartas tus datos bancarios ni realices pagos fuera de la app sin conocer al vecino.</Text>
                                </View>
                            </View>
                        }
                    />

                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
                    >
                        <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
                            {/* Quick Actions */}
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                style={styles.quickActionsContainer}
                                contentContainerStyle={styles.quickActionsContent}
                            >
                                {/* Special Seller Action: Close Deal */}
                                {productInfo?.user_id === currentUserId && contactStatus !== 'confirmed' && (
                                    <TouchableOpacity
                                        onPress={handleCloseDeal}
                                        disabled={sending || contactStatus === 'deal_proposed'}
                                        style={[
                                            styles.quickActionChip,
                                            { backgroundColor: contactStatus === 'deal_proposed' ? '#94A3B8' : '#059669', borderColor: contactStatus === 'deal_proposed' ? '#E2E8F0' : '#047857' }
                                        ]}
                                    >
                                        <Text style={[styles.quickActionText, { color: 'white' }]}>
                                            {contactStatus === 'deal_proposed' ? '⏳ Esperando Confirmación' : '🤝 Marcar como Vendido'}
                                        </Text>
                                    </TouchableOpacity>
                                )}

                                {QUICK_ACTIONS.map((action, idx) => (
                                    <TouchableOpacity
                                        key={idx}
                                        onPress={() => {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            if (action === "📍 Punto de Entrega") {
                                                setInputText("📍 Podemos juntarnos en: ");
                                            } else {
                                                sendMessage(action);
                                            }
                                        }}
                                        disabled={sending}
                                        style={[
                                            styles.quickActionChip,
                                            action === "📍 Punto de Entrega" && { backgroundColor: '#EEF2FF', borderColor: '#C7D2FE' }
                                        ]}
                                    >
                                        <Text style={[
                                            styles.quickActionText,
                                            action === "📍 Punto de Entrega" && { color: '#4F46E5' }
                                        ]}>{action}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>

                            <View style={styles.inputWrapper}>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Escribe un mensaje..."
                                    value={inputText}
                                    onChangeText={handleTyping}
                                    multiline
                                />
                                <TouchableOpacity
                                    onPress={() => sendMessage()}
                                    disabled={!inputText.trim() || sending}
                                    style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
                                >
                                    <Send size={20} color="white" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </KeyboardAvoidingView>

                    {productInfo && (
                        <>
                            <ProductDetailModal
                                visible={showProductModal}
                                product={productInfo as any}
                                onClose={() => setShowProductModal(false)}
                                userRole={null}
                            />
                            <PromptReviewModal
                                visible={showReviewModal}
                                productId={productInfo.id}
                                productTitle={productInfo.title}
                                onClose={() => setShowReviewModal(false)}
                                onSuccess={() => {
                                    setShowReviewModal(false);
                                }}
                            />
                        </>
                    )}
                </>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    backBtn: {
        padding: 4,
    },
    headerInfo: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 8,
    },
    headerAvatarContainer: {
        marginRight: 10,
    },
    headerAvatar: {
        width: 40,
        height: 40,
        borderRadius: 16,
    },
    avatarPlaceholder: {
        backgroundColor: '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerName: {
        fontSize: 16,
        fontWeight: '800',
        color: '#1E293B',
    },
    headerStatus: {
        fontSize: 12,
        color: '#22C55E',
        fontWeight: '600',
    },
    headerStatusOffline: {
        color: '#94A3B8',
    },
    infoBtn: {
        padding: 8,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
    },
    messagesList: {
        padding: 16,
        paddingBottom: 24,
    },
    messageContainer: {
        marginBottom: 12,
        flexDirection: 'row',
    },
    myMessageContainer: {
        justifyContent: 'flex-end',
    },
    otherMessageContainer: {
        justifyContent: 'flex-start',
    },
    messageBubble: {
        maxWidth: '80%',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
    },
    myBubble: {
        backgroundColor: '#2563EB',
        borderBottomRightRadius: 4,
    },
    otherBubble: {
        backgroundColor: '#FFFFFF',
        borderBottomLeftRadius: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    messageText: {
        fontSize: 15,
        lineHeight: 20,
    },
    myMessageText: {
        color: '#FFFFFF',
        fontWeight: '500',
    },
    otherMessageText: {
        color: '#1E293B',
        fontWeight: '500',
    },
    messageTime: {
        fontSize: 10,
        marginTop: 4,
        alignSelf: 'flex-end',
    },
    myMessageTime: {
        color: 'rgba(255, 255, 255, 0.7)',
    },
    otherMessageTime: {
        color: '#94A3B8',
    },
    inputContainer: {
        backgroundColor: '#FFFFFF',
        paddingTop: 12,
        paddingHorizontal: 16,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        backgroundColor: '#F8FAFC',
        borderRadius: 24,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    input: {
        flex: 1,
        fontSize: 15,
        color: '#1E293B',
        maxHeight: 100,
        paddingTop: 8,
        paddingBottom: 8,
        paddingHorizontal: 8,
    },
    sendBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#2563EB',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
    },
    sendBtnDisabled: {
        backgroundColor: '#94A3B8',
    },
    productContextCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 16,
        paddingVertical: 10,
        marginHorizontal: 16,
        marginTop: 12,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    productImageContainer: {
        width: 44,
        height: 44,
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    productImage: {
        width: '100%',
        height: '100%',
    },
    quickActionsContainer: {
        marginBottom: 12,
        maxHeight: 40,
    },
    quickActionsContent: {
        paddingHorizontal: 4,
        gap: 8,
    },
    quickActionChip: {
        backgroundColor: '#F1F5F9',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    quickActionText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#64748B',
    },
});
