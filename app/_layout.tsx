import { Session } from '@supabase/supabase-js';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { AlertTriangle, UserMinus } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, DeviceEventEmitter, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-url-polyfill/auto';
import '../global.css';
import { supabase } from '../lib/supabase';

// Mantener el splash screen visible mientras cargamos recursos
SplashScreen.preventAutoHideAsync().catch(() => {
  /* Ignorar errores si ocurre en web o recargas rápidas */
});

function InitialLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  // Ban State
  const [isBanned, setIsBanned] = useState(false);
  const [banInfo, setBanInfo] = useState<{ until: string; reason: string } | null>(null);

  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // 1. Verificar sesión inicial
    const checkInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          // Si el error es por refresh token inválido, limpiamos la sesión local
          if (error.message?.includes('Refresh Token Not Found')) {
            console.log('[LayoutInicial] Sesión caducada detectada, limpiando...');
            await supabase.auth.signOut();
            setSession(null);
          } else {
            console.error('[LayoutInicial] Error de Sesión Auth:', error);
          }
        } else {
          setSession(session);
        }
      } catch (err: any) {
        console.error('[LayoutInicial] Error Fatal al capturar Sesión:', err);
      } finally {
        setInitialized(true);
      }
    };

    checkInitialSession();

    // 2. Escuchar cambios de estado de auth de Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log('--- EVENTO DE AUTH SUPABASE ---', _event, !!session);
      setSession(session);

      if (session?.user) {
        // Heartbeat immediate
        supabase.from('profiles').update({ last_seen: new Date().toISOString() }).eq('id', session.user.id).then();

        // Fetch user metadata (Role + Ban Status)
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, banned_until, ban_reason')
          .eq('id', session.user.id)
          .single();

        setUserRole(profile?.role || null);

        // Check Ban
        if (profile?.banned_until) {
          const bannedDate = new Date(profile.banned_until);
          if (bannedDate > new Date()) {
            setIsBanned(true);
            setBanInfo({ until: profile.banned_until, reason: profile.ban_reason });
          } else {
            setIsBanned(false);
            setBanInfo(null);
          }
        } else {
          setIsBanned(false);
          setBanInfo(null);
        }

      } else {
        setUserRole(null);
        setIsBanned(false);
        setBanInfo(null);
      }
    });

    // 3. Maintenance Logic (Initial fetch & Realtime)
    const initMaintenance = async () => {
      try {
        const { data, error } = await supabase.from('app_config').select('*').eq('key', 'maintenance_mode').single();
        console.log('[Mantenimiento] Resultado bruto:', { data, error });

        if (error) {
          console.log('[Mantenimiento] Error al obtener:', error.message, error.code);
          return;
        }

        const enabled = !!data?.value?.enabled;
        console.log('[Mantenimiento] Estado resuelto a:', enabled);
        setIsMaintenance(enabled);
      } catch (err) {
        console.error('[Mantenimiento] Excepción inicial:', err);
      }
    };
    initMaintenance();

    const configChannel = supabase.channel('config-changes')
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'app_config', filter: 'key=eq.maintenance_mode' },
        (payload) => {
          console.log('[Mantenimiento] Actualización en tiempo real:', payload.new.value);
          setIsMaintenance(!!payload.new.value.enabled);
        }
      )
      .subscribe((status) => {
        console.log('[Mantenimiento] Estado del canal:', status);
      });


    // 4. Listener de emergencia para forzar cierre de sesión y NAVEGACIÓN
    const logoutSub = DeviceEventEmitter.addListener('force-logout', () => {
      console.log('!!! CIERRE DE SESIÓN FORZADO RECIBIDO !!!');
      setSession(null);
      // Usamos replace con una pequeña demora o asegurándonos de que esté montado
      router.replace('/(auth)/login');
    });

    return () => {
      subscription.unsubscribe();
      logoutSub.remove();
      supabase.removeChannel(configChannel);
    };
  }, []); // Solo al montar y se maneja por auth state change

  // New: Listen for Profile Changes (Bans, Role updates) IMMEDIATE REFLECTION
  useEffect(() => {
    if (!session?.user?.id) return;

    const profileChannel = supabase.channel(`profile-${session.user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${session.user.id}`
        },
        (payload) => {
          console.log('[TiempoReal] Perfil actualizado:', payload.new);
          const newProfile = payload.new;

          // Update Role
          if (newProfile.role) setUserRole(newProfile.role);

          // Update Ban Status
          if (newProfile.banned_until) {
            const bannedDate = new Date(newProfile.banned_until);
            if (bannedDate > new Date()) {
              setIsBanned(true);
              setBanInfo({ until: newProfile.banned_until, reason: newProfile.ban_reason });
            } else {
              setIsBanned(false);
              setBanInfo(null);
            }
          } else {
            setIsBanned(false);
            setBanInfo(null);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(profileChannel);
    };
  }, [session?.user?.id]);

  // 5. Global Presence Tracking
  useEffect(() => {
    if (!session?.user?.id) return;

    const presenceChannel = supabase.channel('online-users', {
      config: {
        presence: { key: session.user.id },
      },
    });

    presenceChannel.subscribe(async (status: string) => {
      if (status === 'SUBSCRIBED') {
        await presenceChannel.track({
          online_at: new Date().toISOString(),
        });
      }
    });

    return () => {
      presenceChannel.unsubscribe();
    };
  }, [session?.user?.id]);

  // 6. Activity Heartbeat (last_seen)
  useEffect(() => {
    if (!session?.user?.id) return;

    // Update once on mount/auth
    supabase.from('profiles')
      .update({ last_seen: new Date().toISOString() })
      .eq('id', session.user.id)
      .then();

    const heartbeatInterval = setInterval(() => {
      supabase.from('profiles')
        .update({ last_seen: new Date().toISOString() })
        .eq('id', session.user.id)
        .then(({ error }) => {
          if (error) console.error('[Error de Latido]:', error.message);
        });
    }, 120000); // 2 minutes

    return () => clearInterval(heartbeatInterval);
  }, [session?.user?.id]);

  useEffect(() => {
    if (!initialized) return;

    const inAuthGroup = segments[0] === '(auth)';

    // Pequeño retardo para asegurar que el árbol de navegación está montado
    // antes de realizar redirecciones automáticas.
    const task = setTimeout(async () => {
      if (!session && !inAuthGroup) {
        console.log('Navegando al Login...');
        router.replace('/(auth)/login');
      } else if (session && inAuthGroup) {
        console.log('Navegando al Inicio...');
        router.replace('/(tabs)');
      }

      // Ocultar splash screen una vez que la navegación inicial se ha procesado
      await SplashScreen.hideAsync().catch(() => { });
    }, 1);

    return () => clearTimeout(task);
  }, [session, initialized, segments]);

  const isAdmin = userRole?.toLowerCase().trim() === 'admin';

  if (initialized) {
    console.log('[Layout] Estado:', { isMaintenance, isAdmin, initialized, userRole, isBanned });
  }

  return (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }} />

      {/* Overlay: Carga inicial */}
      {!initialized && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: '#ffffff', zIndex: 1000, justifyContent: 'center', alignItems: 'center' }]}>
          <View className="items-center">
            <View className="w-48 h-48 mb-8">
              <Image
                source={require('../assets/images/logo.png')}
                className="w-full h-full"
                resizeMode="contain"
              />
            </View>
            <ActivityIndicator size="large" color="#8b5cf6" />
            <Text className="mt-4 text-slate-400 font-black uppercase text-[10px] tracking-[3px]">Cargando MercadoVecino</Text>
          </View>
        </View>
      )}

      {/* Overlay: Mantenimiento (Solo si NO es admin y NO está baneado) */}
      {isMaintenance && !isAdmin && !isBanned && initialized && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: '#ffffff', zIndex: 1001, padding: 32, justifyContent: 'center', alignItems: 'center' }]}>
          <View className="w-24 h-24 bg-red-50 rounded-[40px] items-center justify-center mb-8 shadow-sm">
            <AlertTriangle size={48} color="#EF4444" />
          </View>
          <Text className="text-slate-900 font-black text-3xl text-center mb-4 leading-tight">
            Estamos mejorando la experiencia
          </Text>
          <Text className="text-slate-500 font-bold text-base text-center leading-relaxed">
            El MercadoVecino está temporalmente en mantenimiento técnico. Volveremos en unos minutos con novedades.
          </Text>
          <View className="mt-12 h-1 w-20 bg-slate-100 rounded-full" />
          <TouchableOpacity
            onPress={() => supabase.auth.signOut()}
            className="mt-8 py-3 px-8 bg-slate-50 rounded-2xl border border-slate-100"
          >
            <Text className="text-slate-400 font-black uppercase text-[10px] tracking-widest">Cerrar Sesión</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Overlay: BANNED */}
      {isBanned && initialized && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: '#ffffff', zIndex: 1002, padding: 32, justifyContent: 'center', alignItems: 'center' }]}>
          <View className="w-24 h-24 bg-slate-900 rounded-[40px] items-center justify-center mb-8 shadow-sm">
            <UserMinus size={48} color="#F8FAFC" />
          </View>
          <Text className="text-slate-900 font-black text-3xl text-center mb-2 leading-tight">
            Cuenta Suspendida
          </Text>
          <Text className="text-red-500 font-bold text-xs uppercase tracking-widest mb-6">Acceso Restringido</Text>

          <View className="bg-slate-50 p-6 rounded-3xl w-full border border-slate-100 mb-8">
            <Text className="text-slate-400 font-black text-[10px] uppercase tracking-widest mb-2">Motivo</Text>
            <Text className="text-slate-800 font-medium text-base mb-4">{banInfo?.reason || 'Sin motivo especificado'}</Text>

            <Text className="text-slate-400 font-black text-[10px] uppercase tracking-widest mb-2">Expira</Text>
            <Text className="text-slate-800 font-medium text-base">
              {banInfo?.until ? new Date(banInfo.until).toLocaleString('es-CL') : 'Indefinido'}
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => supabase.auth.signOut()}
            className="py-4 px-10 bg-slate-900 rounded-2xl shadow-lg shadow-slate-200"
          >
            <Text className="text-white font-black uppercase text-xs tracking-widest">Entendido, Cerrar Sesión</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <InitialLayout />
    </SafeAreaProvider>
  );
}