
import { Trash2 } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

interface CategoriesTabProps {
    categories: string[];
    handleDeleteCategory: (category: string) => void;
    handleAddCategory: () => void;
}

export const CategoriesTab: React.FC<CategoriesTabProps> = ({
    categories,
    handleDeleteCategory,
    handleAddCategory
}) => {
    return (
        <View>
            <View className="bg-amber-50 rounded-2xl p-4 border border-amber-100 mb-6">
                <Text className="text-amber-800 font-bold text-xs uppercase tracking-widest mb-1">Nota del Sistema</Text>
                <Text className="text-amber-700 text-sm">
                    Las categorías configuradas aquí se reflejan automáticamente en el feed principal de la aplicación.
                </Text>
            </View>
            <View>
                {categories.length > 0 ? (
                    categories.map((cat: string, idx: number) => (
                        <View key={idx} className="bg-white p-4 rounded-2xl border border-slate-100 flex-row justify-between items-center mb-3">
                            <Text className="text-slate-900 font-bold">{cat}</Text>
                            <TouchableOpacity
                                onPress={() => handleDeleteCategory(cat)}
                                className="p-2"
                            >
                                <Trash2 size={16} color="#EF4444" />
                            </TouchableOpacity>
                        </View>
                    ))
                ) : null}
                <TouchableOpacity
                    onPress={handleAddCategory}
                    className="bg-slate-50 border border-dashed border-slate-300 p-4 rounded-2xl items-center mt-4"
                >
                    <Text className="text-slate-400 font-bold">+ Agregar Nueva Categoría</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};
