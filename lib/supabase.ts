import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

console.log('--- DIAGNÓSTICO DE CONFIGURACIÓN SUPABASE ---');
console.log('Longitud URL:', supabaseUrl.length);
console.log('Longitud Key:', supabaseAnonKey.length);
console.log('URL comienza con:', supabaseUrl.substring(0, 10));

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
});
