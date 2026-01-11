import { Stack, useRouter } from 'expo-router';
import { ArrowRight, Lock, Mail, Store, User } from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { getDeviceId } from '../../lib/device_id';
import { supabase } from '../../lib/supabase';
import { translateError } from '../../lib/translations';

export default function LoginScreen() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [loading, setLoading] = useState(false);
    const [isRegistering, setIsRegistering] = useState(false);
    const [role, setRole] = useState<'client' | 'vendor'>('client');

    async function signInWithEmail() {
        if (!email || !password) {
            Alert.alert('Error', 'Por favor completa todos los campos');
            return;
        }
        setLoading(true);
        const { error } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password: password.trim(),
        });

        if (error) {
            // Check if the error is due to invalid credentials
            if (error.message.toLowerCase().includes('invalid login credentials')) {
                try {
                    // Check if the email exists in our profiles table
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('id')
                        .eq('email', email.trim())
                        .maybeSingle();

                    if (!profile) {
                        Alert.alert('Correo no registrado', 'No encontramos una cuenta con este correo electrónico.');
                    } else {
                        Alert.alert('Contraseña incorrecta', 'La contraseña ingresada no es válida para este correo.');
                    }
                } catch (checkErr) {
                    console.error('[Login] Error verificando existencia de correo:', checkErr);
                    Alert.alert('Error de acceso', translateError(error.message));
                }
            } else {
                Alert.alert('Error de acceso', translateError(error.message));
            }
            setLoading(false);
            return;
        }

        // --- Registro de Auditoría de Dispositivo ---
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const deviceId = await getDeviceId();
                await supabase
                    .from('profiles')
                    .update({
                        last_device_id: deviceId,
                        email: user.email // Sync email on successful login
                    })
                    .eq('id', user.id);
            }
        } catch (deviceError) {
            console.error('[Login] Error registrando dispositivo:', deviceError);
        }

        setLoading(false);
    }

    async function signUpWithEmail() {
        if (!email.trim() || !password.trim() || !fullName.trim()) {
            Alert.alert('Campos incompletos', 'Por favor completa tu nombre, correo y contraseña.');
            return;
        }
        if (password.length < 6) {
            Alert.alert('Contraseña corta', 'La contraseña debe tener al menos 6 caracteres.');
            return;
        }

        // console.log('--- SIGNUP ATTEMPT ---', { email: email.trim(), role, fullName: fullName.trim() });
        setLoading(true);

        try {
            const { data, error } = await supabase.auth.signUp({
                email: email.trim(),
                password: password.trim(),
                options: {
                    data: {
                        full_name: fullName.trim(),
                        role: role,
                    }
                }
            });

            if (error) throw error;

            if (!data.session) {
                Alert.alert('Verifica tu correo', 'Te hemos enviado un enlace de confirmación. Por favor revísalo para activar tu cuenta.');
            } else if (data.user) {
                // Si el registro fue automático (sin verificación de email pendiente)
                // registramos el dispositivo de inmediato y guardamos el email
                const deviceId = await getDeviceId();
                await supabase
                    .from('profiles')
                    .update({
                        last_device_id: deviceId,
                        email: data.user.email
                    })
                    .eq('id', data.user.id);
            }
        } catch (err: any) {
            console.error('[SignUp Error Detail]', err);
            Alert.alert('Error de registro', translateError(err.message));
        } finally {
            setLoading(false);
        }
    }

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1 bg-surface-50"
        >
            <Stack.Screen options={{ headerShown: false }} />

            <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
                <View className="flex-1 justify-center px-8 py-12">
                    {/* Header Section */}
                    <View className="items-center mb-12">
                        <View className="w-24 h-24 items-center justify-center mb-8 -rotate-6">
                            <Image
                                source={require('../../assets/images/logo.png')}
                                className="w-full h-full"
                                resizeMode="contain"
                            />
                        </View>
                        <Text className="text-5xl font-black text-slate-900 tracking-tighter">
                            Mercado<Text className="text-brand-600">Vecino</Text>
                        </Text>
                        <View className="bg-brand-50 px-4 py-1.5 rounded-full mt-4 border border-brand-100">
                            <Text className="text-brand-600 font-black text-[10px] uppercase tracking-[3px]">
                                TU BARRIO, TU COMERCIO EN LA LIGUA
                            </Text>
                        </View>
                    </View>
                    {/* Card Section */}
                    <View className="bg-white rounded-[48px] p-10 shadow-xl border border-brand-50">
                        <Text className="text-3xl font-black text-slate-900 mb-10 text-center tracking-tight">
                            {isRegistering ? 'Crear cuenta' : 'Bienvenido'}
                        </Text>

                        {/* Inputs */}
                        <View className="space-y-5 mb-10">
                            <View className="relative">
                                <View className="absolute left-5 top-5 z-10">
                                    <Mail size={22} color="#8b5cf6" />
                                </View>
                                <TextInput
                                    className="bg-surface-50 border border-brand-50 rounded-[24px] p-5 pl-14 text-slate-900 font-bold text-base"
                                    placeholder="Correo electrónico"
                                    placeholderTextColor="#94a3b8"
                                    value={email}
                                    onChangeText={setEmail}
                                    autoCapitalize="none"
                                    keyboardType="email-address"
                                />
                            </View>

                            {isRegistering && (
                                <View className="relative mt-5">
                                    <View className="absolute left-5 top-5 z-10">
                                        <User size={22} color="#8b5cf6" />
                                    </View>
                                    <TextInput
                                        className="bg-surface-50 border border-brand-50 rounded-[24px] p-5 pl-14 text-slate-900 font-bold text-base"
                                        placeholder="Nombre completo"
                                        placeholderTextColor="#94a3b8"
                                        value={fullName}
                                        onChangeText={setFullName}
                                    />
                                </View>
                            )}

                            <View className="relative mt-5">
                                <View className="absolute left-5 top-5 z-10">
                                    <Lock size={22} color="#8b5cf6" />
                                </View>
                                <TextInput
                                    className="bg-surface-50 border border-brand-50 rounded-[24px] p-5 pl-14 text-slate-900 font-bold text-base"
                                    placeholder="Contraseña"
                                    placeholderTextColor="#94a3b8"
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry
                                />
                            </View>
                        </View>
                        {/* Role Selection (Only for Registration) */}
                        {isRegistering && (
                            <View className="mb-10">
                                <Text className="text-brand-400 font-black mb-4 text-center uppercase tracking-[3px] text-[10px]">¿Cuál es tu rol hoy?</Text>
                                <View className="flex-row gap-4">
                                    <TouchableOpacity
                                        onPress={() => setRole('client')}
                                        activeOpacity={0.8}
                                        className={`flex-1 p-5 rounded-[28px] border-2 items-center ${role === 'client' ? 'border-brand-600 bg-brand-50' : 'border-slate-100 bg-slate-50'}`}
                                    >
                                        <User size={28} color={role === 'client' ? '#8b5cf6' : '#94a3b8'} />
                                        <Text className={`mt-2 font-black text-xs ${role === 'client' ? 'text-brand-600' : 'text-slate-500'}`}>Soy Vecino</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        onPress={() => setRole('vendor')}
                                        activeOpacity={0.8}
                                        className={`flex-1 p-5 rounded-[28px] border-2 items-center ${role === 'vendor' ? 'border-brand-600 bg-brand-50' : 'border-slate-100 bg-slate-50'}`}
                                    >
                                        <Store size={28} color={role === 'vendor' ? '#8b5cf6' : '#94a3b8'} />
                                        <Text className={`mt-2 font-black text-xs ${role === 'vendor' ? 'text-brand-600' : 'text-slate-500'}`}>Comerciante</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}

                        {/* Action Button */}
                        <TouchableOpacity
                            onPress={isRegistering ? signUpWithEmail : signInWithEmail}
                            disabled={loading}
                            activeOpacity={0.8}
                            style={[
                                styles.actionBtn,
                                loading ? { backgroundColor: '#cbd5e1' } : { backgroundColor: '#2563eb' }
                            ]}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <>
                                    <Text className="text-white text-center font-bold text-lg mr-2">
                                        {isRegistering ? 'Registrarme' : 'Entrar ahora'}
                                    </Text>
                                    <ArrowRight size={20} color="white" />
                                </>
                            )}
                        </TouchableOpacity>

                        {/* Toggle Link */}
                        <TouchableOpacity
                            onPress={() => setIsRegistering(!isRegistering)}
                            className="mt-10"
                            activeOpacity={0.6}
                        >
                            <View className="flex-row items-center justify-center">
                                <Text className="text-slate-500 font-bold text-base">
                                    {isRegistering ? '¿Ya tienes cuenta?' : '¿Eres nuevo?'}
                                </Text>
                                <Text className="text-brand-600 font-black ml-2 text-base">
                                    {isRegistering ? 'Inicia sesión' : 'Regístrate'}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    </View>

                    {/* Footer */}
                    <Text className="text-slate-400 text-center mt-12 text-sm font-medium">
                        Hecho por Ariel para la comunidad
                    </Text>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 16,
        padding: 20,
        shadowColor: '#2563eb',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 15,
        elevation: 6,
    }
});
