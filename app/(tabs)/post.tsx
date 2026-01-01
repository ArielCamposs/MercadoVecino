import { supabase } from '@/lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CheckCircle2, Image as ImageIcon, User, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
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

// Helper para convertir base64 a ArrayBuffer (necesario para estabilidad en React Native + Supabase)
function decodeBase64(base64: string) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    const lookup = new Uint8Array(256);
    for (let i = 0; i < chars.length; i++) {
        lookup[chars.charCodeAt(i)] = i;
    }

    let bufferLength = base64.length * 0.75;
    let len = base64.length;
    let i, p = 0;
    let encoded1, encoded2, encoded3, encoded4;

    if (base64[base64.length - 1] === '=') {
        bufferLength--;
        if (base64[base64.length - 2] === '=') bufferLength--;
    }

    const arraybuffer = new ArrayBuffer(bufferLength);
    const bytes = new Uint8Array(arraybuffer);

    for (i = 0; i < len; i += 4) {
        encoded1 = lookup[base64.charCodeAt(i)];
        encoded2 = lookup[base64.charCodeAt(i + 1)];
        encoded3 = lookup[base64.charCodeAt(i + 2)];
        encoded4 = lookup[base64.charCodeAt(i + 3)];

        bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);
        bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
        bytes[p++] = ((encoded3 & 3) << 6) | (encoded4 & 63);
    }

    return arraybuffer;
}

const CATEGORIES = [
    {
        id: 'food',
        name: 'Comida',
        image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=500&auto=format&fit=crop'
    },
    {
        id: 'grocery',
        name: 'Almacén',
        image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=500&auto=format&fit=crop'
    },
    {
        id: 'services',
        name: 'Servicios',
        image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6958?q=80&w=500&auto=format&fit=crop'
    },
    {
        id: 'tech',
        name: 'Tecnología',
        image: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=500&auto=format&fit=crop'
    },
    {
        id: 'other',
        name: 'Otros',
        image: 'https://images.unsplash.com/photo-1549931319-a545dcf3bc73?q=80&w=500&auto=format&fit=crop'
    },
];

export default function PostScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const isEditing = !!id;

    const [title, setTitle] = useState('');
    const [price, setPrice] = useState('');
    const [category, setCategory] = useState('food');
    const [description, setDescription] = useState('');
    const [location, setLocation] = useState('');
    const [whatsapp, setWhatsapp] = useState('');
    const [images, setImages] = useState<{ uri: string, base64?: string | null }[]>([]);
    const [extraServices, setExtraServices] = useState<{ name: string, price: string }[]>([]);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [checkingRole, setCheckingRole] = useState(true);

    useEffect(() => {
        async function initializeData() {
            try {
                setCheckingRole(true);
                // First check session
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) {
                    setUserRole(null);
                    setCheckingRole(false);
                    return;
                }

                const { data: { user }, error: authError } = await supabase.auth.getUser();
                if (authError) {
                    if (authError.message?.includes('session missing')) {
                        setUserRole(null);
                        setCheckingRole(false);
                        return;
                    }
                    throw authError;
                }

                if (user) {
                    // Fetch Role
                    const { data: profileData } = await supabase
                        .from('profiles')
                        .select('role')
                        .eq('id', user.id)
                        .single();
                    setUserRole(profileData?.role || 'client');

                    // Fetch Product if editing
                    if (isEditing && id) {
                        const { data: productData } = await supabase
                            .from('products')
                            .select('*')
                            .eq('id', id)
                            .single();

                        if (productData) {
                            setTitle(productData.title);
                            setPrice(productData.price.toString());

                            // Buscamos el ID de la categoría que coincide con el NOMBRE guardado en la BD
                            const catId = CATEGORIES.find(c => c.name === productData.category)?.id || 'food';
                            setCategory(catId);

                            setDescription(productData.description || '');

                            // Handle legacy single image or new array
                            if (productData.image_urls && productData.image_urls.length > 0) {
                                setImages(productData.image_urls.map((url: string) => ({ uri: url })));
                            } else if (productData.image_url) {
                                setImages([{ uri: productData.image_url }]);
                            }

                            setLocation(productData.location || '');
                            setWhatsapp(productData.whatsapp_number || '');
                            setExtraServices(productData.extra_services || []);
                        }
                    } else {
                        // Crucial: Reset form when NOT editing to avoid state persistence from previous edit
                        resetForm();
                    }
                }
            } catch (err: any) {
                console.log('[PostScreen] Init hint:', err.message);
            } finally {
                setCheckingRole(false);
            }
        }
        initializeData();
    }, [id]);

    const addService = () => {
        setExtraServices([...extraServices, { name: '', price: '' }]);
    };

    const updateService = (index: number, field: 'name' | 'price', value: string) => {
        const newServices = [...extraServices];
        newServices[index][field] = value;
        setExtraServices(newServices);
    };

    const removeService = (index: number) => {
        setExtraServices(extraServices.filter((_, i: number) => i !== index));
    };

    const pickImage = async () => {
        if (images.length >= 5) {
            Alert.alert('Límite Alcanzado', 'Puedes subir hasta 5 fotos por producto.');
            return;
        }

        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permiso Denegado', 'Necesitamos acceso a tu galería para subir fotos.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsMultipleSelection: true,
            selectionLimit: 5 - images.length,
            quality: 0.7,
            base64: true,
        });

        if (!result.canceled) {
            const newImages = result.assets.map(asset => ({
                uri: asset.uri,
                base64: asset.base64
            }));
            setImages([...images, ...newImages].slice(0, 5));
        }
    };

    const removeImage = (index: number) => {
        setImages(images.filter((_, i) => i !== index));
    };

    const uploadSingleImage = async (img: { uri: string, base64?: string | null }) => {
        try {
            // If it's already a web URL, don't upload again
            if (img.uri.startsWith('http')) return img.uri;
            if (!img.base64) throw new Error('No hay datos de imagen.');

            const fileExt = img.uri.split('.').pop()?.toLowerCase() || 'jpg';
            const path = `${Date.now()}_${Math.floor(Math.random() * 1000)}.${fileExt}`;
            const arrayBuffer = decodeBase64(img.base64);

            const { error } = await supabase.storage
                .from('product-images')
                .upload(path, arrayBuffer, {
                    contentType: `image/${fileExt === 'png' ? 'png' : 'jpeg'}`,
                    upsert: true
                });

            if (error) throw error;

            const { data: { publicUrl } } = supabase.storage
                .from('product-images')
                .getPublicUrl(path);

            return publicUrl;
        } catch (error) {
            console.error('[Upload Error detail]', error);
            throw new Error('Error al subir una de las imágenes.');
        }
    };

    const handleSubmit = async () => {
        if (!title || !price || !description) {
            Alert.alert('Datos Incompletos', 'Por favor rellena todos los campos para publicar.');
            return;
        }

        setLoading(true);
        // console.log('--- SUBMITTING POST ---', { isEditing, id, title });

        try {
            const { data, error: userError } = await supabase.auth.getUser();
            const user = data?.user;

            if (userError || !user) {
                Alert.alert('Sesión Expirada', 'Debes iniciar sesión para publicar un producto.');
                return;
            }

            const selectedCategory = CATEGORIES.find(c => c.id === category);

            // 1. Manejo de Imágenes: Subida múltiple
            let finalImageUrls: string[] = [];

            if (images.length > 0) {
                console.log('--- UPLOADING IMAGES TO STORAGE ---');
                try {
                    const uploadPromises = images.map(img => uploadSingleImage(img));
                    finalImageUrls = await Promise.all(uploadPromises);
                } catch (err: any) {
                    Alert.alert('Error de Imagen', err.message);
                    setLoading(false);
                    return;
                }
            } else {
                finalImageUrls = [selectedCategory?.image || 'https://images.unsplash.com/photo-1549931319-a545dcf3bc73?q=80&w=500&auto=format&fit=crop'];
            }

            const productData = {
                title: title.trim(),
                price: parseInt(price, 10) || 0,
                category: selectedCategory?.name || 'Otros',
                description: description.trim(),
                location: location.trim(),
                whatsapp_number: whatsapp.trim(),
                extra_services: extraServices.filter((s: any) => s.name && s.price),
                user_id: user.id,
                image_url: finalImageUrls[0], // Keep for backward compatibility
                image_urls: finalImageUrls, // New multi-image field
            };

            if (isEditing && id) {
                const { error: updateError } = await supabase
                    .from('products')
                    .update(productData)
                    .eq('id', id);

                if (updateError) {
                    console.error('[Update Error]', updateError);
                    throw updateError;
                }
                console.log('--- UPDATE SUCCESSFUL ---');

                Alert.alert(
                    '¡Actualización Exitosa!',
                    'Tu anuncio ha sido actualizado correctamente.',
                    [{ text: 'Volver', onPress: () => router.back() }]
                );
            } else {
                const { error: insertError } = await supabase
                    .from('products')
                    .insert([productData]);

                if (insertError) throw insertError;

                Alert.alert(
                    '¡Publicación Exitosa!',
                    'Tu producto ya está visible para todos tus vecinos en la sección de Inicio.',
                    [{
                        text: 'Genial, ver Inicio',
                        onPress: () => {
                            resetForm();
                            router.replace('/(tabs)');
                        }
                    }]
                );
            }
        } catch (error: any) {
            console.error('[PostScreen] Submission error:', error);
            const errorMessage = error.message || 'No pudimos guardar tu producto. Por favor intenta de nuevo.';
            Alert.alert('Error al Publicar', errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setTitle('');
        setPrice('');
        setCategory('food');
        setDescription('');
        setImages([]);
        setLocation('');
        setWhatsapp('');
        setExtraServices([]);
    };

    const insets = useSafeAreaInsets();

    if (checkingRole) {
        return (
            <View className="flex-1 bg-surface-50 items-center justify-center">
                <ActivityIndicator size="large" color="#8b5cf6" />
            </View>
        );
    }

    if (userRole !== 'vendor') {
        return (
            <View style={{ flex: 1, backgroundColor: '#FAF9FF', padding: 24, justifyContent: 'center', alignItems: 'center' }}>
                <View style={styles.restrictedCard}>
                    <View className="w-24 h-24 bg-brand-50 rounded-full items-center justify-center mb-6 border border-brand-100">
                        <User size={48} color="#8b5cf6" />
                    </View>
                    <Text className="text-3xl font-black text-slate-900 text-center mb-4">Solo para Comerciantes</Text>
                    <Text className="text-slate-500 text-center mb-10 leading-6 text-base px-2">
                        Esta sección es exclusiva para vecinos que desean ofrecer sus productos o servicios con un servicio de calidad.
                    </Text>
                    <TouchableOpacity
                        onPress={() => router.replace('/')}
                        style={styles.primaryButton}
                    >
                        <Text className="text-white font-black text-lg">Volver al Inicio</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }
    return (
        <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#FAF9FF' }}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    className="flex-1 px-6"
                    contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 20) + 20 }}
                >
                    <View className="py-8 bg-transparent">
                        <Text className="text-brand-500 font-bold text-xs uppercase tracking-[3px] mb-2 px-1">Nueva Venta</Text>
                        <Text className="text-slate-900 font-black text-4xl leading-tight tracking-tight">Crea tu Anuncio</Text>
                    </View>

                    {/* Multi-Image Selector */}
                    <View className="mb-8">
                        <View className="flex-row justify-between items-center mb-4">
                            <Text className="text-brand-700 font-extrabold ml-2 text-base">Fotos del producto ({images.length}/5)</Text>
                            {images.length < 5 && (
                                <TouchableOpacity onPress={pickImage} className="bg-brand-50 px-3 py-1.5 rounded-xl border border-brand-100">
                                    <Text className="text-brand-600 font-black text-[10px] uppercase">+ Agregar</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        {images.length > 0 ? (
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                                {images.map((img, index) => (
                                    <View key={index} className="mr-3 relative">
                                        <Image source={{ uri: img.uri }} className="w-40 h-40 rounded-[32px] border border-slate-100" />
                                        <TouchableOpacity
                                            onPress={() => removeImage(index)}
                                            className="absolute -top-2 -right-2 bg-red-500 w-8 h-8 rounded-full items-center justify-center border-2 border-white shadow-sm"
                                        >
                                            <X size={16} color="white" />
                                        </TouchableOpacity>
                                        {index === 0 && (
                                            <View className="absolute bottom-3 left-3 bg-brand-600 px-2 py-1 rounded-lg">
                                                <Text className="text-white text-[8px] font-black uppercase">Portada</Text>
                                            </View>
                                        )}
                                    </View>
                                ))}
                                {images.length < 5 && (
                                    <TouchableOpacity
                                        onPress={pickImage}
                                        className="w-40 h-40 bg-white rounded-[32px] border-2 border-dashed border-brand-100 items-center justify-center"
                                    >
                                        <ImageIcon size={32} color="#8b5cf6" opacity={0.3} />
                                        <Text className="text-slate-400 font-bold text-[10px] mt-2">Añadir más</Text>
                                    </TouchableOpacity>
                                )}
                            </ScrollView>
                        ) : (
                            <TouchableOpacity
                                activeOpacity={0.8}
                                onPress={pickImage}
                                style={styles.imageSelector}
                            >
                                <View className="w-24 h-24 bg-brand-50 rounded-3xl items-center justify-center mb-4 border border-brand-100/50">
                                    <ImageIcon size={36} color="#8b5cf6" />
                                </View>
                                <Text className="text-slate-800 font-extrabold text-lg">Fotos de calidad</Text>
                                <Text className="text-slate-400 text-sm mt-1 px-10 text-center">Una buena foto vende hasta 3 veces más rápido. Sube hasta 5.</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Form Fields */}
                    <View className="space-y-6 bg-transparent">
                        <View className="bg-transparent">
                            <Text className="text-brand-700 font-extrabold mb-3 ml-2 text-base">Título del anuncio</Text>
                            <TextInput
                                value={title}
                                onChangeText={setTitle}
                                placeholder="Ej: Pan Amasado Recién Salido"
                                className="bg-white p-5 rounded-3xl border border-brand-50 shadow-sm text-slate-900 text-base"
                                placeholderTextColor="#94A3B8"
                            />
                        </View>

                        <View className="bg-transparent mt-6">
                            <Text className="text-brand-700 font-extrabold mb-3 ml-2 text-base">Precio</Text>
                            <View className="relative">
                                <Text className="absolute left-5 top-5 text-brand-400 font-black z-10 text-base">$</Text>
                                <TextInput
                                    value={price}
                                    onChangeText={(val) => setPrice(val.replace(/[^0-9]/g, ''))}
                                    placeholder="Precio en pesos"
                                    keyboardType="numeric"
                                    className="bg-white p-5 pl-10 rounded-3xl border border-brand-50 shadow-sm text-slate-900 text-base"
                                    placeholderTextColor="#94A3B8"
                                />
                            </View>
                        </View>

                        <View className="bg-transparent mt-6">
                            <Text className="text-brand-700 font-extrabold mb-3 ml-2 text-base">Categoría de impacto</Text>
                            <View className="bg-white rounded-[40px] border border-brand-50 shadow-sm overflow-hidden">
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="p-3">
                                    {CATEGORIES.map((cat) => {
                                        const isActive = category === cat.id;
                                        return (
                                            <TouchableOpacity
                                                key={cat.id}
                                                onPress={() => setCategory(cat.id)}
                                                style={[
                                                    styles.categoryBtn,
                                                    isActive && styles.categoryBtnActive
                                                ]}
                                            >
                                                <Text style={[
                                                    styles.categoryBtnText,
                                                    isActive && styles.categoryBtnTextActive
                                                ]}>
                                                    {cat.name}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </ScrollView>
                            </View>
                        </View>

                        <View className="bg-transparent mt-6">
                            <Text className="text-brand-700 font-extrabold mb-3 ml-2 text-base">Ubicación / Sector</Text>
                            <TextInput
                                value={location}
                                onChangeText={setLocation}
                                placeholder="Ej: Calle Prat, Frente a la Plaza"
                                className="bg-white p-5 rounded-3xl border border-brand-50 shadow-sm text-slate-900 text-base"
                                placeholderTextColor="#94A3B8"
                            />
                        </View>

                        <View className="bg-transparent mt-6">
                            <Text className="text-brand-700 font-extrabold mb-3 ml-2 text-base">WhatsApp (Ventas)</Text>
                            <TextInput
                                value={whatsapp}
                                onChangeText={(val) => setWhatsapp(val.replace(/[^0-9+]/g, ''))}
                                placeholder="Ej: +56912345678"
                                keyboardType="phone-pad"
                                className="bg-white p-5 rounded-3xl border border-brand-50 shadow-sm text-slate-900 text-base"
                                placeholderTextColor="#94A3B8"
                            />
                        </View>

                        <View className="bg-transparent mt-5">
                            <View className="flex-row justify-between items-center mb-2">
                                <Text className="text-slate-700 font-bold ml-1">Servicios / Precios Adicionales</Text>
                                <TouchableOpacity onPress={addService}>
                                    <Text className="text-blue-600 font-black text-xs">+ AGREGAR</Text>
                                </TouchableOpacity>
                            </View>

                            {extraServices.map((service, index) => (
                                <View key={index} className="flex-row space-x-2 mb-3 items-center">
                                    <View className="flex-1">
                                        <TextInput
                                            value={service.name}
                                            onChangeText={(val) => updateService(index, 'name', val)}
                                            placeholder="Servicio"
                                            className="bg-white p-4 rounded-2xl border border-brand-50 text-slate-900 text-sm shadow-sm"
                                            placeholderTextColor="#94A3B8"
                                        />
                                    </View>
                                    <View style={{ width: 100 }}>
                                        <TextInput
                                            value={service.price}
                                            onChangeText={(val) => updateService(index, 'price', val.replace(/[^0-9]/g, ''))}
                                            placeholder="Precio"
                                            keyboardType="numeric"
                                            className="bg-white p-4 rounded-2xl border border-brand-50 text-slate-900 text-sm shadow-sm"
                                            placeholderTextColor="#94A3B8"
                                        />
                                    </View>
                                    <TouchableOpacity onPress={() => removeService(index)} className="p-2">
                                        <X size={20} color="#EF4444" />
                                    </TouchableOpacity>
                                </View>
                            ))}
                            {extraServices.length === 0 && (
                                <Text className="text-slate-400 text-[10px] ml-1 italic">Agrega opciones extras como "Corte + Barba", "Delivery", etc.</Text>
                            )}
                        </View>

                        <View className="bg-transparent mt-6 mb-10">
                            <Text className="text-brand-700 font-extrabold mb-3 ml-2 text-base">Descripción General</Text>
                            <TextInput
                                value={description}
                                onChangeText={setDescription}
                                placeholder="Cuéntanos más sobre lo que vendes..."
                                multiline
                                numberOfLines={4}
                                textAlignVertical="top"
                                className="bg-white p-5 rounded-3xl border border-brand-50 shadow-sm text-slate-900 h-40 text-base"
                                placeholderTextColor="#94A3B8"
                            />
                        </View>
                    </View>

                    {/* Submit Button */}
                    <TouchableOpacity
                        onPress={handleSubmit}
                        disabled={loading}
                        activeOpacity={0.8}
                        style={[
                            styles.submitBtn,
                            loading && { backgroundColor: '#93c5fd' }
                        ]}
                    >
                        {loading ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <>
                                <CheckCircle2 size={24} color="white" />
                                <Text className="text-white font-black text-lg ml-2">
                                    {isEditing ? 'Guardar Cambios' : 'Publicar Ahora'}
                                </Text>
                            </>
                        )}
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    restrictedCard: {
        backgroundColor: 'white',
        padding: 40,
        borderRadius: 48,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#ede9fe',
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 5,
    },
    primaryButton: {
        backgroundColor: '#7c3aed',
        paddingHorizontal: 40,
        paddingVertical: 20,
        borderRadius: 24,
        shadowColor: '#7c3aed',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 15,
        elevation: 6,
    },
    imageDeleteBtn: {
        position: 'absolute',
        top: 16,
        right: 16,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    categoryBtn: {
        marginRight: 12,
        paddingHorizontal: 32,
        paddingVertical: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#f4f4f5',
        backgroundColor: '#fafafa',
    },
    categoryBtnActive: {
        backgroundColor: '#7c3aed',
        borderColor: '#7c3aed',
        shadowColor: '#7c3aed',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 3,
    },
    categoryBtnText: {
        fontWeight: '900',
        fontSize: 12,
        color: '#64748B',
    },
    categoryBtnTextActive: {
        color: 'white',
    },
    submitBtn: {
        width: '100%',
        padding: 20,
        borderRadius: 24,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 40,
        backgroundColor: '#2563eb',
        shadowColor: '#2563eb',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
        elevation: 8,
    },
    imageSelector: {
        width: '100%',
        aspectRatio: 16 / 9,
        backgroundColor: 'white',
        borderRadius: 40,
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: '#ede9fe',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 40,
        overflow: 'hidden',
    }
});
