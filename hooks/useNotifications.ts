import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

async function registerForPushNotificationsAsync() {
    if (Platform.OS === 'web') return null;

    if (!Device.isDevice) {
        console.log('Debe usar un dispositivo físico para las Notificaciones Push');
        return null;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }
    if (finalStatus !== 'granted') {
        console.log('¡Error al obtener el token para la notificación push!');
        return null;
    }

    const projectId = Constants.expoConfig?.extra?.eas?.projectId || Constants.expoConfig?.extra?.projectId;

    if (!projectId) {
        console.error('Error de Notificaciones Push: No se encontró "projectId" en app.json.');
        console.log('Asegúrese de tener configurado extra.eas.projectId o extra.projectId en su app.json');
        return null;
    }

    try {
        const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
        console.log('Token de Expo Push:', token);
        return token;
    } catch (e: any) {
        console.error('Error al obtener el token push:', e.message || e);
        if (e.message?.includes('projectId')) {
            console.error('Falta el ID del proyecto (projectId). Por favor, configúrelo en app.json.');
        }
        return null;
    }
}

export function useNotifications() {
    const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
    const notificationListener = useRef<Notifications.EventSubscription>(undefined);
    const responseListener = useRef<Notifications.EventSubscription>(undefined);

    useEffect(() => {
        registerForPushNotificationsAsync().then(token => {
            if (token) {
                setExpoPushToken(token);
                saveTokenToSupabase(token);
            }
        });

        notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
            console.log('Notificación Recibida:', notification);
        });

        responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
            console.log('Respuesta de Notificación:', response);
        });

        return () => {
            notificationListener.current?.remove();
            responseListener.current?.remove();
        };
    }, []);

    const saveTokenToSupabase = async (token: string) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { error } = await supabase
                .from('expo_push_tokens')
                .upsert(
                    { user_id: user.id, token: token },
                    { onConflict: 'token' }
                );

            if (error) console.error('Error al guardar el token push en Supabase:', error);
        } catch (e) {
            console.error('Error en guardarTokenEnSupabase:', e);
        }
    };

    return { expoPushToken };
}
