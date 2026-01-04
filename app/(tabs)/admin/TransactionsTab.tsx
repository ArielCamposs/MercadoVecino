
import { Info, Megaphone, ShoppingBag } from 'lucide-react-native';
import React from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Contact } from './types';

interface TransactionsTabProps {
    transactions: Contact[];
    handleIntervene: (tx: Contact) => void;
}

export const TransactionsTab: React.FC<TransactionsTabProps> = ({
    transactions,
    handleIntervene
}) => {
    return (
        <View>
            <View className="flex-row items-center mb-6">
                <View className="w-10 h-10 bg-indigo-500 rounded-2xl items-center justify-center mr-3">
                    <ShoppingBag size={20} color="white" />
                </View>
                <View>
                    <Text className="text-slate-900 font-black text-lg">Centro de Mediación</Text>
                    <Text className="text-slate-400 text-xs font-bold uppercase tracking-widest">Control de Pedidos Global</Text>
                </View>
            </View>

            {transactions.length > 0 ? (
                transactions.map(tx => (
                    <View key={tx.id} style={styles.adminListCard}>
                        <View className="flex-row justify-between items-start mb-3">
                            <View className="flex-1">
                                <Text className="text-slate-900 font-black text-sm">{tx.products?.title || 'Producto'}</Text>
                                <Text className="text-slate-400 text-[10px] uppercase font-bold">Ref: {tx.id.split('-')[0]}</Text>
                            </View>
                            <View className={`px-2 py-1 rounded-lg ${tx.status === 'confirmed' ? 'bg-green-50' : 'bg-slate-50'}`}>
                                <Text className={`font-black text-[8px] uppercase ${tx.status === 'confirmed' ? 'text-green-600' : 'text-slate-400'}`}>
                                    {tx.status || 'PENDIENTE'}
                                </Text>
                            </View>
                        </View>

                        <View className="flex-row items-center mb-4 bg-slate-50/50 p-3 rounded-2xl">
                            <View className="flex-1">
                                <Text className="text-slate-400 text-[8px] font-bold uppercase mb-1">Comprador</Text>
                                <Text className="text-slate-800 font-bold text-xs" numberOfLines={1}>{tx.buyer?.full_name || 'Vecino'}</Text>
                            </View>
                            <View className="w-px h-6 bg-slate-200 mx-3" />
                            <View className="flex-1">
                                <Text className="text-slate-400 text-[8px] font-bold uppercase mb-1">Vendedor</Text>
                                <Text className="text-slate-800 font-bold text-xs" numberOfLines={1}>{tx.merchant?.full_name || 'Comerciante'}</Text>
                            </View>
                        </View>

                        <View className="flex-row gap-x-2 mb-4">
                            <TouchableOpacity
                                onPress={() => Alert.alert('Comprador', `Nombre: ${tx.buyer?.full_name}\nFecha: ${new Date(tx.created_at).toLocaleString()}`)}
                                className="flex-1 bg-white border border-slate-100 py-3 rounded-xl items-center flex-row justify-center"
                            >
                                <Info size={12} color="#8b5cf6" />
                                <Text className="text-indigo-600 font-black text-[9px] uppercase ml-2">Detalles</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => handleIntervene(tx)}
                                className="flex-1 bg-indigo-50 py-3 rounded-xl items-center flex-row justify-center"
                            >
                                <Megaphone size={12} color="#8b5cf6" />
                                <Text className="text-indigo-600 font-black text-[9px] uppercase ml-2">Intervenir</Text>
                            </TouchableOpacity>
                        </View>

                        <View className="flex-row justify-between items-center">
                            <Text className="text-indigo-600 font-black text-sm">
                                {tx.products?.price ? `$${tx.products.price.toLocaleString('es-CL')}` : '---'}
                            </Text>
                            <Text className="text-slate-400 text-[10px]">
                                {new Date(tx.created_at).toLocaleDateString()}
                            </Text>
                        </View>
                    </View>
                ))
            ) : (
                <View className="items-center py-20">
                    <ShoppingBag size={48} color="#F1F5F9" />
                    <Text className="text-slate-400 font-bold mt-4">No hay transacciones registradas.</Text>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    adminListCard: {
        backgroundColor: 'white',
        borderRadius: 24,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
});
