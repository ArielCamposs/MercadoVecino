import { Tabs } from 'expo-router';
import { Heart, Home, MessageCircle, PlusCircle, ShieldCheck, User } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNotifications } from '../../hooks/useNotifications';
import { supabase } from '../../lib/supabase';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  useNotifications();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  useEffect(() => {
    async function fetchUserRole(userId: string) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', userId)
          .single();

        if (data && data.role) {
          console.log('--- ROLE FETCHED ---', data.role);
          setUserRole(data.role.toLowerCase().trim());
        } else {
          console.log('--- NO PROFILE DATA ---');
          setUserRole('client');
        }
      } catch (err) {
        console.error('Error fetching role:', err);
        setUserRole(null);
      } finally {
        setLoading(false);
      }
    }

    async function fetchUnreadCount(userId: string) {
      const { count, error } = await supabase
        .from('chat_messages')
        .select('*', { count: 'exact', head: true })
        .eq('is_read', false)
        .neq('sender_id', userId);

      if (!error && count !== null) {
        setUnreadCount(count);
      }
    }

    // Subscribe to messages for unread badge
    let messageChannel: any;
    let presenceChannel: any;

    const subscribeToMessages = (userId: string) => {
      if (messageChannel) supabase.removeChannel(messageChannel);

      messageChannel = supabase
        .channel('global_unread_messages')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'chat_messages'
        }, () => {
          fetchUnreadCount(userId);
        })
        .subscribe();
    };

    const trackPresence = (userId: string) => {
      if (presenceChannel) supabase.removeChannel(presenceChannel);

      presenceChannel = supabase.channel('online-users', {
        config: {
          presence: {
            key: userId,
          },
        },
      });

      presenceChannel
        .subscribe(async (status: string) => {
          if (status === 'SUBSCRIBED') {
            await presenceChannel.track({
              online_at: new Date().toISOString(),
            });
          }
        });
    };

    // Initial check
    const checkInitialAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (session?.user) {
          fetchUserRole(session.user.id);
          fetchUnreadCount(session.user.id);
          subscribeToMessages(session.user.id);
          trackPresence(session.user.id);
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error('[TabLayout] Initial Auth Error:', err);
        setLoading(false);
      }
    };

    checkInitialAuth();

    // Listen for changes (Login/Logout/Register)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('--- AUTH STATE CHANGE ---', _event);
      if (session?.user) {
        fetchUserRole(session.user.id);
        fetchUnreadCount(session.user.id);
        subscribeToMessages(session.user.id);
        trackPresence(session.user.id);
      } else {
        setUserRole(null);
        setUnreadCount(0);
        setLoading(false);
        if (messageChannel) supabase.removeChannel(messageChannel);
        if (presenceChannel) supabase.removeChannel(presenceChannel);
      }
    });

    return () => {
      subscription.unsubscribe();
      if (messageChannel) supabase.removeChannel(messageChannel);
      if (presenceChannel) supabase.removeChannel(presenceChannel);
    };
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' }}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#2563EB',
        tabBarInactiveTintColor: '#94A3B8',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#F1F5F9',
          height: 75 + insets.bottom,
          paddingBottom: insets.bottom + 10,
          paddingTop: 10,
          elevation: 8,
          shadowOpacity: 0.1,
          shadowRadius: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
        },
        headerShown: false, // Ocultamos el header por defecto ya que lo manejamos dentro de cada pantalla
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color }) => <Home size={24} color={color} />,
        }}
      />

      <Tabs.Screen
        name="favorites"
        options={{
          title: 'Favoritos',
          href: userRole === 'admin' ? null : '/favorites',
          tabBarIcon: ({ color, focused }) => (
            <Heart size={24} color={focused ? '#FF0000' : color} fill={focused ? '#FF0000' : 'transparent'} />
          ),
        }}
      />

      <Tabs.Screen
        name="admin"
        options={{
          title: 'Admin',
          href: userRole === 'admin' ? '/admin' : null,
          tabBarIcon: ({ color }) => (
            <ShieldCheck size={24} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="post"
        options={{
          title: 'Vender',
          href: userRole === 'vendor' ? '/post' : null,
          tabBarIcon: ({ focused }) => (
            <View style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: '#2563EB',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 10,
              shadowColor: '#2563EB',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.4,
              shadowRadius: 8,
              elevation: 4,
            }}>
              <PlusCircle
                size={30}
                color="white"
                strokeWidth={2.5}
              />
            </View>
          ),
          tabBarLabel: () => null,
        }}
      />

      <Tabs.Screen
        name="messages"
        options={{
          title: 'Chats',
          tabBarIcon: ({ color }) => <MessageCircle size={24} color={color} />,
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          tabBarBadgeStyle: { backgroundColor: '#EF4444', fontSize: 10, fontWeight: 'bold' }
        }}
      />

      <Tabs.Screen
        name="two"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color }) => <User size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
