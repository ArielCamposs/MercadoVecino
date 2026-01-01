import { supabase } from '@/lib/supabase';
import { useFocusEffect, useRouter } from 'expo-router';
import {
    ArrowLeft,
    Edit2,
    LayoutGrid,
    Plus,
    Trash2
} from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    RefreshControl,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Product {
    id: string;
    title: string;
    price: number;
    category: string;
    image_url: string;
    created_at: string;
}

export default function ManagePostsScreen() {
    const router = useRouter();
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchMyProducts = useCallback(async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('products')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setProducts(data || []);
        } catch (error: any) {
            Alert.alert('Error', 'No pudimos cargar tus publicaciones');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [supabase, products.length]);

    useFocusEffect(
        useCallback(() => {
            fetchMyProducts();
        }, [fetchMyProducts])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchMyProducts();
    };

    const handleDelete = (id: string) => {
        Alert.alert(
            'Eliminar Publicación',
            '¿Estás seguro de que quieres eliminar este anuncio? Esta acción no se puede deshacer.',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Eliminar',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const { error } = await supabase
                                .from('products')
                                .delete()
                                .eq('id', id);

                            if (error) throw error;

                            setProducts(products.filter(p => p.id !== id));
                        } catch (error: any) {
                            Alert.alert('Error', 'No se pudo eliminar la publicación');
                        }
                    }
                }
            ]
        );
    };

    const renderItem = ({ item }: { item: Product }) => (
        <View className="bg-white mx-4 mb-4 rounded-3xl overflow-hidden border border-slate-100 shadow-sm flex-row p-4">
            <Image
                source={{ uri: item.image_url || 'https://images.unsplash.com/photo-1549931319-a545dcf3bc73?q=80&w=500&auto=format&fit=crop' }}
                className="w-24 h-24 rounded-2xl bg-slate-100"
                resizeMode="cover"
            />

            <View className="flex-1 ml-4 justify-between py-1">
                <View>
                    <Text className="text-lg font-bold text-slate-800" numberOfLines={1}>{item.title}</Text>
                    <Text className="text-blue-600 font-extrabold">${item.price.toLocaleString()}</Text>
                    <View className="bg-slate-100 self-start px-2 py-0.5 rounded-md mt-1">
                        <Text className="text-slate-500 text-[10px] font-bold uppercase">{item.category}</Text>
                    </View>
                </View>

                <View className="flex-row gap-2 mt-2">
                    <TouchableOpacity
                        onPress={() => router.push({ pathname: '/post', params: { id: item.id } })}
                        className="bg-slate-50 p-2 rounded-xl flex-1 flex-row items-center justify-center border border-slate-100"
                    >
                        <Edit2 size={14} color="#475569" />
                        <Text className="text-slate-600 font-bold text-xs ml-2">Editar</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => handleDelete(item.id)}
                        className="bg-red-50 p-2 rounded-xl flex-row items-center justify-center border border-red-100"
                    >
                        <Trash2 size={14} color="#ef4444" />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );

    return (
        <SafeAreaView className="flex-1 bg-slate-50">
            {/* Header */}
            <View className="px-6 py-4 flex-row items-center justify-between">
                <TouchableOpacity
                    onPress={() => router.back()}
                    className="w-10 h-10 bg-white rounded-2xl items-center justify-center border border-slate-100 shadow-sm"
                >
                    <ArrowLeft size={20} color="#1e293b" />
                </TouchableOpacity>
                <Text className="text-xl font-black text-slate-900">Mis Publicaciones</Text>
                <TouchableOpacity
                    onPress={() => router.push('/post')}
                    className="w-10 h-10 bg-blue-600 rounded-2xl items-center justify-center shadow-md shadow-blue-200"
                >
                    <Plus size={20} color="white" />
                </TouchableOpacity>
            </View>

            {loading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#2563eb" />
                </View>
            ) : products.length === 0 ? (
                <View className="flex-1 items-center justify-center px-10">
                    <View className="w-20 h-20 bg-slate-100 rounded-full items-center justify-center mb-6">
                        <LayoutGrid size={40} color="#94a3b8" />
                    </View>
                    <Text className="text-xl font-bold text-slate-900 text-center mb-2">No tienes publicaciones aún</Text>
                    <Text className="text-slate-500 text-center mb-8">
                        Empieza a ofrecer tus productos o servicios a la comunidad ahora mismo.
                    </Text>
                    <TouchableOpacity
                        onPress={() => router.push('/post')}
                        className="bg-blue-600 px-8 py-4 rounded-2xl shadow-lg shadow-blue-200"
                    >
                        <Text className="text-white font-bold">Crear mi primer anuncio</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={products}
                    renderItem={renderItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={{ paddingTop: 10, paddingBottom: 40 }}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563eb']} />
                    }
                />
            )}
        </SafeAreaView>
    );
}
