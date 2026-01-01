import { supabase } from './supabase';

/**
 * Envia una notificación push a un usuario específico
 */
export async function sendPushNotification(userId: string, title: string, body: string, data?: any) {
    try {
        const { data: tokens, error } = await supabase
            .from('expo_push_tokens')
            .select('token')
            .eq('user_id', userId);

        if (error) {
            console.error('[EnviadorNotificaciones] Error al obtener tokens:', error);
            return;
        }

        if (!tokens || tokens.length === 0) {
            console.log('[EnviadorNotificaciones] No hay tokens registrados para el usuario:', userId);
            return;
        }

        const messages = tokens.map(t => ({
            to: t.token,
            sound: 'default',
            title: title,
            body: body,
            data: data || {},
        }));

        const response = await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Accept-encoding': 'gzip, deflate',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(messages),
        });

        const result = await response.json();
        console.log('[EnviadorNotificaciones] Respuesta:', result);
    } catch (e) {
        console.error('[EnviadorNotificaciones] Error Fatal:', e);
    }
}

/**
 * Envia una notificación push a todos los usuarios registrados
 */
export async function broadcastPushNotification(title: string, body: string, data?: any) {
    try {
        const { data: tokens, error } = await supabase
            .from('expo_push_tokens')
            .select('token');

        if (error) {
            console.error('[EnviadorNotificaciones] Error al obtener todos los tokens:', error);
            return;
        }

        if (!tokens || tokens.length === 0) {
            console.log('[EnviadorNotificaciones] No hay tokens registrados en el sistema');
            return;
        }

        // Expo permite hasta 100 mensajes por petición
        const messages = tokens.map(t => ({
            to: t.token,
            sound: 'default',
            title: title,
            body: body,
            data: data || {},
        }));

        // Para broadcasting masivo, se recomienda dividir en chunks de 100
        for (let i = 0; i < messages.length; i += 100) {
            const chunk = messages.slice(i, i + 100);
            await fetch('https://exp.host/--/api/v2/push/send', {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Accept-encoding': 'gzip, deflate',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(chunk),
            });
        }

        console.log(`[EnviadorNotificaciones] Difusión completada para ${messages.length} tokens`);
    } catch (e) {
        console.error('[EnviadorNotificaciones] Error Fatal en difusión:', e);
    }
}
