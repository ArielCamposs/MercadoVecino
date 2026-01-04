
import { MessageSquare, Search, Star, Trash2 } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Review } from './types';

interface ReviewsTabProps {
    reviews: Review[];
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    handleDeleteReview: (reviewId: string) => void;
}

export const ReviewsTab: React.FC<ReviewsTabProps> = ({
    reviews,
    searchQuery,
    setSearchQuery,
    handleDeleteReview
}) => {
    return (
        <View>
            <View style={styles.searchContainer}>
                <Search size={20} color="#94A3B8" />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Buscar en comentarios o productos..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholderTextColor="#94A3B8"
                />
            </View>

            {reviews.length > 0 ? (
                reviews.map(rev => (
                    <View key={rev.id} style={styles.adminListCard}>
                        <View className="flex-row justify-between items-start">
                            <View className="flex-1">
                                <View className="flex-row items-center mb-1">
                                    {[1, 2, 3, 4, 5].map(s => (
                                        <Star key={s} size={12} fill={s <= rev.rating ? "#F59E0B" : "transparent"} color={s <= rev.rating ? "#F59E0B" : "#CBD5E1"} />
                                    ))}
                                    <Text className="text-slate-400 text-[10px] font-bold uppercase ml-2">
                                        en {rev.products?.title || 'Producto Eliminado'}
                                    </Text>
                                </View>
                                <Text className="text-slate-900 font-bold text-sm mb-1">{rev.comment}</Text>
                                <Text className="text-slate-400 text-[10px] font-bold uppercase">
                                    Por: {rev.profiles?.full_name || 'Anónimo'}
                                </Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => handleDeleteReview(rev.id)}
                                className="w-10 h-10 bg-red-50 rounded-xl items-center justify-center"
                            >
                                <Trash2 size={18} color="#EF4444" />
                            </TouchableOpacity>
                        </View>
                    </View>
                ))
            ) : (
                <View className="items-center py-20">
                    <MessageSquare size={48} color="#CBD5E1" />
                    <Text className="text-slate-400 font-bold mt-4">No hay reseñas para moderar</Text>
                </View>
            )}
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
});
