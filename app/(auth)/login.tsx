import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../lib/supabase';
// Importamos Stack para ocultar el header si queremos
import { Stack } from 'expo-router';

export default function LoginScreen() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [isRegistering, setIsRegistering] = useState(false);

    // Función para iniciar sesión
    async function signInWithEmail() {
        setLoading(true);
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) Alert.alert('Error', error.message);
        else {
            // Si todo sale bien, ir al Home
            router.replace('/(tabs)');
        }
        setLoading(false);
    }

    // Función para registrarse
    async function signUpWithEmail() {
        setLoading(true);
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: 'Usuario Nuevo', // Podríamos pedir esto en un input extra
                    role: 'client', // Por defecto cliente
                }
            }
        });

        if (error) Alert.alert('Error', error.message);
        else if (!data.session) Alert.alert('Revisa tu correo', 'Te enviamos un link de confirmación.');
        else {
            router.replace('/(tabs)');
        }
        setLoading(false);
    }

    return (
        <View className="flex-1 justify-center items-center bg-gray-100 p-4">
            <Stack.Screen options={{ headerShown: false }} />

            <View className="bg-white p-6 rounded-2xl w-full max-w-sm shadow-sm">
                <Text className="text-2xl font-bold text-center mb-2 text-slate-800">
                    {isRegistering ? 'Crear Cuenta' : 'Bienvenido'}
                </Text>
                <Text className="text-gray-500 text-center mb-6">
                    Servicios Locales La Ligua
                </Text>

                <TextInput
                    className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4 text-gray-700"
                    placeholder="correo@ejemplo.com"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                />

                <TextInput
                    className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-6 text-gray-700"
                    placeholder="Contraseña"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                />

                <TouchableOpacity
                    className={`rounded-xl p-4 mb-4 ${loading ? 'bg-gray-400' : 'bg-blue-600'}`}
                    onPress={isRegistering ? signUpWithEmail : signInWithEmail}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text className="text-white text-center font-bold text-lg">
                            {isRegistering ? 'Registrarse' : 'Iniciar Sesión'}
                        </Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setIsRegistering(!isRegistering)}>
                    <Text className="text-blue-600 text-center mt-2 font-medium">
                        {isRegistering ? '¿Ya tienes cuenta? Ingresa aquí' : '¿No tienes cuenta? Regístrate'}
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}