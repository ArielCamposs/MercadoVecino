import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

const DEVICE_ID_KEY = 'mercadovecino_device_id';

/**
 * Obtiene o genera un identificador único para el dispositivo persistente.
 * Se guarda en AsyncStorage para que sobreviva a cierres de sesión.
 */
export async function getDeviceId(): Promise<string> {
    try {
        // 1. Intentar recuperar ID previo de almacenamiento persistente
        let deviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);

        if (deviceId) {
            return deviceId;
        }

        // 2. Si no existe, generar uno nuevo basado en hardware o UUID
        // En móviles intentamos usar alguna propiedad del dispositivo
        const deviceName = Device.deviceName || 'unknown';
        const modelName = Device.modelName || 'unknown';
        const randomStr = Math.random().toString(36).substring(2, 10);
        const timestamp = Date.now().toString(36);

        // Creamos una huella digital (fingerprint) básica pero efectiva
        // Nota: En iOS/Android modernos el hardware ID real es difícil de obtener sin permisos intrusivos,
        // por lo que este UUID persistente es el estándar de la industria.
        deviceId = `dv-${Platform.OS}-${deviceName.replace(/\s/g, '_')}-${timestamp}-${randomStr}`.toLowerCase();

        // 3. Guardar en almacenamiento persistente
        await AsyncStorage.setItem(DEVICE_ID_KEY, deviceId);

        return deviceId;
    } catch (error) {
        console.error('[DeviceID] Error al obtener ID:', error);
        return `anon-${Date.now()}`;
    }
}
