
import { Activity, Search, Star, Trash2 } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Product } from './types';

interface ProductsTabProps {
    products: Product[];
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    setSelectedProduct: (prod: Product) => void;
    setShowProductModal: (show: boolean) => void;
    handleToggleFeatured: (productId: string, currentState: boolean) => void;
    handleDeleteProduct: (productId: string) => void;
}

export const ProductsTab: React.FC<ProductsTabProps> = ({
    products,
    searchQuery,
    setSearchQuery,
    setSelectedProduct,
    setShowProductModal,
    handleToggleFeatured,
    handleDeleteProduct
}) => {
    return (
        <View>
            <View style={styles.searchContainer}>
                <Search size={20} color="#94A3B8" />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Buscar producto por título..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholderTextColor="#94A3B8"
                />
            </View>

            {products.map(prod => (
                <View key={prod.id} style={styles.adminListCard}>
                    <View className="flex-row justify-between items-start">
                        <TouchableOpacity
                            className="flex-1 mr-4"
                            onPress={() => { setSelectedProduct(prod); setShowProductModal(true); }}
                        >
                            <Text className="text-slate-900 font-black text-base">{prod.title}</Text>
                            <Text className="text-slate-400 text-[10px] font-bold uppercase mt-0.5">
                                Vendedor: {prod.profiles?.full_name || 'Desconocido'}
                            </Text>
                            <View className="flex-row items-center mt-1">
                                <Text className="text-brand-600 font-black text-sm">
                                    ${prod.price.toLocaleString()}
                                </Text>
                                <View className="w-px h-3 bg-slate-200 mx-2" />
                                <View className="flex-row items-center">
                                    <Activity size={12} color="#94A3B8" />
                                    <Text className="text-slate-400 font-bold text-[10px] ml-1 uppercase">
                                        {prod.view_count || 0} Vistas
                                    </Text>
                                </View>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => handleToggleFeatured(prod.id, !!prod.is_featured)}
                            activeOpacity={0.7}
                            style={[
                                styles.featuredBtn,
                                prod.is_featured ? styles.featuredBtnActive : styles.featuredBtnInactive,
                            ]}
                        >
                            <Star size={14} color={prod.is_featured ? 'white' : '#94A3B8'} fill={prod.is_featured ? 'white' : 'transparent'} />
                            <Text style={[styles.featuredBtnText, prod.is_featured && { color: 'white' }]}>
                                {prod.is_featured ? 'QUITAR' : 'DESTACAR'}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => handleDeleteProduct(prod.id)}
                            className="w-10 h-10 bg-red-50 rounded-xl items-center justify-center ml-2"
                        >
                            <Trash2 size={18} color="#EF4444" />
                        </TouchableOpacity>
                    </View>
                </View>
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        borderRadius: 24,
        paddingHorizontal: 16,
        height: 56,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    searchInput: {
        flex: 1,
        marginLeft: 12,
        fontSize: 15,
        fontWeight: '600',
        color: '#1E293B',
    },
    adminListCard: {
        backgroundColor: 'white',
        borderRadius: 24,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    featuredBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        borderWidth: 1,
    },
    featuredBtnActive: {
        backgroundColor: '#F59E0B',
        borderColor: '#F59E0B',
    },
    featuredBtnInactive: {
        backgroundColor: 'white',
        borderColor: '#E2E8F0',
    },
    featuredBtnText: {
        marginLeft: 6,
        fontSize: 10,
        fontWeight: 'bold',
        color: '#94A3B8',
    },
});
