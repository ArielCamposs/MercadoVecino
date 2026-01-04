
import { Flag, ShieldCheck } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Report } from './types';

interface ReportsTabProps {
    reports: Report[];
    handleResolveReport: (reportId: string) => void;
}

export const ReportsTab: React.FC<ReportsTabProps> = ({
    reports,
    handleResolveReport
}) => {
    return (
        <View>
            {reports.length > 0 ? (
                reports.map((rep: any) => (
                    <View key={rep.id} style={styles.adminListCard}>
                        <View className="flex-row items-center mb-3">
                            <View className="w-8 h-8 bg-red-100 rounded-full items-center justify-center mr-3">
                                <Flag size={14} color="#EF4444" />
                            </View>
                            <View>
                                <Text className="text-slate-900 font-black text-sm">Reporte de Producto</Text>
                                <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-tighter">
                                    En: {rep.products?.title || 'Desconocido'}
                                </Text>
                            </View>
                        </View>
                        <Text className="text-slate-600 text-sm mb-4 leading-relaxed">
                            "{rep.reason}"
                        </Text>
                        <View className="flex-row justify-between items-center border-t border-slate-50 pt-4">
                            <Text className="text-slate-400 text-[10px] font-bold uppercase">
                                De: {rep.profiles?.full_name || 'Veedor'}
                            </Text>
                            <TouchableOpacity
                                onPress={() => handleResolveReport(rep.id)}
                                className="bg-red-50 px-4 py-2 rounded-xl"
                            >
                                <Text className="text-red-500 font-black text-[10px] uppercase">Marcar Resuelto</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ))
            ) : (
                <View className="items-center py-20">
                    <ShieldCheck size={48} color="#F0FDF4" />
                    <Text className="text-slate-400 font-bold mt-4">Todo en orden. No hay reportes pendientes.</Text>
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
