import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { MessageCircle, User } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

interface ChatRoom {
    id: string;
    product_id: string;
    participants: string[];
    last_message: string;
    last_message_at: string;
    unread_count?: number;
    other_participant?: {
        id: string;
        full_name: string;
        avatar_url: string;
    };
    is_support_ticket?: boolean;
    ticket_status?: string;
}

export default function MessagesScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [rooms, setRooms] = useState<ChatRoom[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [onlineUsers, setOnlineUsers] = useState<Record<string, any>>({});

    useEffect(() => {
        fetchRooms();

        // Subscribe to changes in rooms (e.g., new last message)
        const roomChannel = supabase
            .channel('chat_rooms_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_rooms' }, () => {
                fetchRooms();
            })
            .subscribe();

        // Subscribe to changes in messages (e.g., mark as read sync)
        const msgChannel = supabase
            .channel('chat_messages_sync')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages' }, () => {
                fetchRooms();
            })
            .subscribe();

        // Subscribe to Presence
        const presenceChannel = supabase.channel('online-users');
        presenceChannel
            .on('presence', { event: 'sync' }, () => {
                setOnlineUsers(presenceChannel.presenceState());
            })
            .subscribe();

        return () => {
            supabase.removeChannel(roomChannel);
            supabase.removeChannel(msgChannel);
            supabase.removeChannel(presenceChannel);
        };
    }, []);

    const fetchRooms = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            setCurrentUserId(user.id);

            // Check if user is admin
            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single();

            const isAdmin = profile?.role === 'admin';

            if (isAdmin) {
                // Fetch support tickets for admin
                const { data: ticketsData, error } = await supabase
                    .from('support_tickets')
                    .select(`
                        id,
                        user_id,
                        subject,
                        message,
                        status,
                        created_at,
                        updated_at,
                        profiles:user_id (
                            id,
                            full_name,
                            avatar_url
                        )
                    `)
                    .order('created_at', { ascending: false });

                if (error) throw error;

                if (ticketsData) {
                    // Map tickets to room format
                    const formattedRooms = ticketsData.map(ticket => {
                        const profile = Array.isArray(ticket.profiles) ? ticket.profiles[0] : ticket.profiles;
                        return {
                            id: ticket.id,
                            product_id: '', // Not applicable for support tickets
                            participants: [user.id, ticket.user_id],
                            last_message: ticket.subject,
                            last_message_at: ticket.updated_at || ticket.created_at,
                            unread_count: ticket.status === 'open' ? 1 : 0,
                            other_participant: {
                                id: profile?.id || ticket.user_id,
                                full_name: profile?.full_name || 'Usuario',
                                avatar_url: profile?.avatar_url || ''
                            },
                            is_support_ticket: true, // Flag to identify support tickets
                            ticket_status: ticket.status
                        };
                    });

                    setRooms(formattedRooms as any);
                }
            } else {
                // Fetch regular chat rooms for normal users
                const { data: roomsData, error } = await supabase
                    .from('chat_rooms')
                    .select('*')
                    .contains('participants', [user.id])
                    .order('last_message_at', { ascending: false });

                if (error) throw error;

                if (roomsData) {
                    // Fetch unread counts for these rooms
                    const { data: unreadMessages } = await supabase
                        .from('chat_messages')
                        .select('room_id')
                        .in('room_id', roomsData.map(r => r.id))
                        .eq('is_read', false)
                        .neq('sender_id', user.id);

                    const countMap: Record<string, number> = {};
                    unreadMessages?.forEach(msg => {
                        countMap[msg.room_id] = (countMap[msg.room_id] || 0) + 1;
                    });

                    // Fetch profiles for other participants
                    const otherParticipantIds = roomsData.map(room =>
                        room.participants.find((p: string) => p !== user.id)
                    ).filter(id => !!id);

                    if (otherParticipantIds.length > 0) {
                        const { data: profiles } = await supabase
                            .from('profiles')
                            .select('id, full_name, avatar_url')
                            .in('id', otherParticipantIds);

                        const profileLookup: Record<string, any> = {};
                        profiles?.forEach(p => {
                            profileLookup[p.id] = p;
                        });

                        const formattedRooms = roomsData.map(room => ({
                            ...room,
                            unread_count: countMap[room.id] || 0,
                            other_participant: profileLookup[room.participants.find((p: string) => p !== user.id) || '']
                        }));

                        setRooms(formattedRooms);
                    } else {
                        setRooms(roomsData);
                    }
                }
            }
        } catch (err) {
            console.error('[Mensajes] Error al cargar:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const renderRoom = ({ item }: { item: ChatRoom }) => (
        <TouchableOpacity
            onPress={() => router.push({
                pathname: '/chat/[id]',
                params: {
                    id: item.id,
                    is_support: item.is_support_ticket ? 'true' : 'false'
                }
            })}
            style={styles.roomItem}
            activeOpacity={0.7}
        >
            <View style={styles.avatarContainer}>
                {item.other_participant?.avatar_url ? (
                    <Image source={{ uri: item.other_participant.avatar_url }} style={styles.avatar} />
                ) : (
                    <View style={[styles.avatar, styles.avatarPlaceholder]}>
                        <User size={24} color="#94A3B8" />
                    </View>
                )}
                {item.other_participant?.id && onlineUsers[item.other_participant.id] && (
                    <View style={styles.onlineDot} />
                )}
            </View>
            <View style={styles.roomContent}>
                <View style={styles.roomHeader}>
                    <Text style={styles.participantName} numberOfLines={1}>
                        {item.other_participant?.full_name || 'Vecino'}
                    </Text>
                    <Text style={styles.timeText}>
                        {item.last_message_at ? new Date(item.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </Text>
                </View>
                <View style={styles.roomFooter}>
                    <Text
                        style={[
                            styles.lastMessage,
                            item.unread_count && item.unread_count > 0 ? styles.lastMessageUnread : null
                        ]}
                        numberOfLines={1}
                    >
                        {item.last_message || 'Inicia una conversación...'}
                    </Text>
                    {item.unread_count && item.unread_count > 0 ? (
                        <View style={styles.unreadBadge}>
                            <Text style={styles.unreadBadgeText}>{item.unread_count}</Text>
                        </View>
                    ) : null}
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView edges={['top']} style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Mis Mensajes</Text>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#2563EB" />
                </View>
            ) : (
                <FlatList
                    data={rooms}
                    keyExtractor={(item) => item.id}
                    renderItem={renderRoom}
                    contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchRooms(); }} tintColor="#2563EB" />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <View style={styles.emptyIconCircle}>
                                <MessageCircle size={48} color="#94A3B8" />
                            </View>
                            <Text style={styles.emptyTitle}>Sin chats todavía</Text>
                            <Text style={styles.emptyText}>
                                Las conversaciones con tus vecinos aparecerán aquí.
                            </Text>
                            <TouchableOpacity
                                style={styles.exploreBtn}
                                onPress={() => router.push('/')}
                            >
                                <Text style={styles.exploreBtnText}>Explorar el Barrio</Text>
                            </TouchableOpacity>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    header: {
        paddingHorizontal: 24,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    title: {
        fontSize: 24,
        fontWeight: '900',
        color: '#0F172A',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    roomItem: {
        flexDirection: 'row',
        paddingHorizontal: 24,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F8FAFC',
        alignItems: 'center',
    },
    avatarContainer: {
        marginRight: 16,
    },
    avatar: {
        width: 60,
        height: 60,
        borderRadius: 24,
    },
    avatarPlaceholder: {
        backgroundColor: '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center',
    },
    onlineDot: {
        position: 'absolute',
        right: 0,
        bottom: 0,
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: '#22C55E',
        borderWidth: 3,
        borderColor: '#FFFFFF',
    },
    roomContent: {
        flex: 1,
    },
    roomHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    participantName: {
        fontSize: 16,
        fontWeight: '800',
        color: '#1E293B',
        flex: 1,
        marginRight: 8,
    },
    timeText: {
        fontSize: 12,
        color: '#94A3B8',
        fontWeight: '500',
    },
    lastMessage: {
        fontSize: 14,
        color: '#64748B',
        fontWeight: '500',
    },
    lastMessageUnread: {
        color: '#0F172A',
        fontWeight: '700',
    },
    roomFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    unreadBadge: {
        backgroundColor: '#EF4444',
        minWidth: 20,
        height: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 6,
        marginLeft: 8,
    },
    unreadBadgeText: {
        color: 'white',
        fontSize: 10,
        fontWeight: '900',
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 100,
        paddingHorizontal: 40,
    },
    emptyIconCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#F8FAFC',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '900',
        color: '#1E293B',
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 15,
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 32,
    },
    exploreBtn: {
        backgroundColor: '#2563EB',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 16,
    },
    exploreBtnText: {
        color: 'white',
        fontWeight: '800',
        fontSize: 16,
    }
});
