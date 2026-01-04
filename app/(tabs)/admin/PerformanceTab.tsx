
import { BadgeCheck, Star, TrendingUp, Trophy } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MerchantPerformance } from './types';

interface PerformanceTabProps {
    merchantPerformance: MerchantPerformance[];
}

export const PerformanceTab: React.FC<PerformanceTabProps> = ({ merchantPerformance }) => {
    return (
        <View>
            <View className="flex-row items-center mb-6">
                <View className="w-10 h-10 bg-amber-500 rounded-2xl items-center justify-center mr-3">
                    <TrendingUp size={20} color="white" />
                </View>
                <View>
                    <Text className="text-slate-900 font-black text-lg">Rendimiento</Text>
                    <Text className="text-slate-400 text-xs font-bold uppercase tracking-widest">Scorecard de Comerciantes</Text>
                </View>
            </View>

            {merchantPerformance.length > 0 ? (
                merchantPerformance.map((perf: MerchantPerformance, idx: number) => (
                    <View key={perf.id} style={styles.adminListCard}>
                        <View className="flex-row justify-between items-center mb-4">
                            <View className="flex-row items-center">
                                <View className="w-8 h-8 bg-slate-100 rounded-full items-center justify-center mr-2">
                                    <Text className="text-slate-400 font-black text-[10px]">{idx + 1}</Text>
                                </View>
                                <View>
                                    <Text className="text-slate-900 font-black text-sm">{perf.full_name}</Text>
                                    {perf.is_verified && (
                                        <View className="flex-row items-center">
                                            <BadgeCheck size={10} color="#8b5cf6" />
                                            <Text className="text-indigo-600 font-bold text-[8px] uppercase ml-1">Verificado</Text>
                                        </View>
                                    )}
                                </View>
                            </View>
                            <View className="items-end">
                                <View className="flex-row items-center">
                                    <Star size={10} color="#F59E0B" fill="#F59E0B" />
                                    <Text className="text-slate-600 font-black text-xs ml-1">{perf.rating?.toFixed(1) || '0.0'}</Text>
                                </View>
                                <Text className="text-slate-400 text-[8px] font-bold uppercase">Reputación</Text>
                            </View>
                        </View>

                        <View className="flex-row bg-slate-50 rounded-2xl p-4 gap-x-4">
                            <View className="flex-1 items-center">
                                <Text className="text-indigo-600 font-black text-sm">{perf.conversion?.toFixed(0) || '0'}%</Text>
                                <Text className="text-slate-400 text-[8px] font-bold uppercase">Conversión</Text>
                            </View>
                            <View className="w-px h-full bg-slate-200" />
                            <View className="flex-1 items-center">
                                <Text className="text-slate-900 font-black text-sm">{perf.confirmedSales || 0}</Text>
                                <Text className="text-slate-400 text-[8px] font-bold uppercase">Confirmados</Text>
                            </View>
                            <View className="w-px h-full bg-slate-200" />
                            <View className="flex-1 items-center">
                                <Text className={`font-black text-sm ${perf.reports && perf.reports > 0 ? 'text-red-500' : 'text-slate-400'}`}>{perf.reports || 0}</Text>
                                <Text className="text-slate-400 text-[8px] font-bold uppercase">Reportes</Text>
                            </View>
                        </View>
                    </View>
                ))
            ) : (
                <View className="items-center py-20">
                    <Trophy size={48} color="#F1F5F9" />
                    <Text className="text-slate-400 font-bold mt-4">Esperando datos de rendimiento...</Text>
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
