
import { AlertCircle, AlertTriangle, CheckCircle, Eye, Package, ShieldCheck, UserPlus, XCircle } from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { analyzeImageIA, ModerationResult } from '../../../lib/moderation_ai';
import { detectPriceAnomaly } from '../../../lib/price_analyzer';
import { Product } from './types';

interface ApprovalsTabProps {
    pendingProducts: Product[];
    handleApproveProduct: (productId: string) => void;
    handleRejectProduct: (productId: string) => void;
}

export const ApprovalsTab: React.FC<ApprovalsTabProps> = ({
    pendingProducts,
    handleApproveProduct,
    handleRejectProduct
}) => {
    const [iaResults, setIaResults] = useState<Record<string, ModerationResult>>({});
    const [analyzingIa, setAnalyzingIa] = useState<Record<string, boolean>>({});

    const runIaScan = async (productId: string, imageUrl: string | null | undefined) => {
        if (!imageUrl) return;
        setAnalyzingIa(prev => ({ ...prev, [productId]: true }));
        const result = await analyzeImageIA(imageUrl);
        setIaResults(prev => ({ ...prev, [productId]: result }));
        setAnalyzingIa(prev => ({ ...prev, [productId]: false }));
    };

    return (
        <View>
            <View className="flex-row items-center mb-6">
                <View className="w-10 h-10 bg-amber-500 rounded-2xl items-center justify-center mr-3">
                    <CheckCircle size={20} color="white" />
                </View>
                <View>
                    <Text className="text-slate-900 font-black text-lg">Cola de Aprobación</Text>
                    <Text className="text-slate-400 text-xs font-bold uppercase tracking-widest">Moderación Preventiva</Text>
                </View>
            </View>

            {pendingProducts.length > 0 ? (
                pendingProducts.map(p => p.is_schema_error ? (
                    <View key="error" className="bg-amber-50 p-8 rounded-[40px] items-center border border-amber-100">
                        <AlertTriangle size={48} color="#D97706" />
                        <Text className="text-amber-900 font-black text-center mt-4">Actualización Necesaria</Text>
                        <Text className="text-amber-700 text-center text-xs mt-2 leading-relaxed">
                            El sistema de aprobación requiere una columna 'status' en la tabla de productos.
                        </Text>
                        <View className="bg-amber-100/50 p-4 rounded-2xl mt-4 w-full">
                            <Text className="text-amber-800 text-[10px] font-mono">
                                ALTER TABLE products ADD COLUMN status TEXT DEFAULT 'approved';
                            </Text>
                        </View>
                    </View>
                ) : (
                    <View key={p.id} style={styles.adminListCard}>
                        <View className="flex-row mb-4">
                            <View className="w-20 h-20 bg-slate-100 rounded-2xl overflow-hidden mr-4 border border-slate-50">
                                {p.image_url ? (
                                    <Image source={{ uri: p.image_url }} className="w-full h-full" resizeMode="cover" />
                                ) : (
                                    <View className="items-center justify-center flex-1">
                                        <Package size={24} color="#CBD5E1" />
                                    </View>
                                )}
                            </View>
                            <View className="flex-1">
                                <Text className="text-slate-900 font-black text-sm mb-1">{p.title}</Text>
                                <Text className="text-indigo-600 font-bold text-xs mb-2">${p.price?.toLocaleString('es-CL')}</Text>
                                <View className="flex-row items-center">
                                    <View className="w-4 h-4 bg-slate-100 rounded-full items-center justify-center mr-1">
                                        <UserPlus size={10} color="#94A3B8" />
                                    </View>
                                    <Text className="text-slate-400 text-[10px] font-medium">De: {p.profiles?.full_name || 'Vendedor'}</Text>
                                </View>

                                {/* Alertas de Inteligencia */}
                                <View className="flex-row flex-wrap gap-1.5 mt-2">
                                    {/* Alerta de Precio */}
                                    {(() => {
                                        const anomaly = detectPriceAnomaly(p.price || 0, p.category || 'Otros');
                                        if (anomaly.isAnomaly) {
                                            return (
                                                <View className={`px-2 py-0.5 rounded-full border flex-row items-center ${anomaly.severity === 'high' ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
                                                    <AlertCircle size={8} color={anomaly.severity === 'high' ? '#EF4444' : '#D97706'} />
                                                    <Text className={`text-[7px] font-black ml-1 uppercase ${anomaly.severity === 'high' ? 'text-red-700' : 'text-amber-700'}`}>
                                                        {anomaly.severity === 'high' ? 'PRECIO CRÍTICO' : 'PRECIO SOSPECHOSO'}
                                                    </Text>
                                                </View>
                                            );
                                        }
                                        return null;
                                    })()}

                                    {/* Resultado de IA */}
                                    {iaResults[p.id] ? (
                                        <View className={`px-2 py-0.5 rounded-full border flex-row items-center ${iaResults[p.id].suggestion === 'approve' ? 'bg-emerald-50 border-emerald-200' : iaResults[p.id].suggestion === 'reject' ? 'bg-red-50 border-red-200' : 'bg-brand-50 border-brand-200'}`}>
                                            {iaResults[p.id].suggestion === 'approve' ? <ShieldCheck size={8} color="#059669" /> : <AlertTriangle size={8} color={iaResults[p.id].suggestion === 'reject' ? '#EF4444' : '#8b5cf6'} />}
                                            <Text className={`text-[7px] font-black ml-1 uppercase ${iaResults[p.id].suggestion === 'approve' ? 'text-emerald-700' : iaResults[p.id].suggestion === 'reject' ? 'text-red-700' : 'text-brand-700'}`}>
                                                IA: {iaResults[p.id].suggestion === 'approve' ? 'SEGURO' : iaResults[p.id].suggestion === 'reject' ? 'RIESGO ALTO' : 'REVISAR'}
                                            </Text>
                                        </View>
                                    ) : (
                                        <TouchableOpacity
                                            onPress={() => runIaScan(p.id, p.image_url)}
                                            disabled={analyzingIa[p.id]}
                                            className="bg-slate-50 px-2 py-0.5 rounded-full border border-slate-200 flex-row items-center"
                                        >
                                            {analyzingIa[p.id] ? <ActivityIndicator size={6} color="#64748B" /> : <Eye size={8} color="#64748B" />}
                                            <Text className="text-slate-500 text-[7px] font-black ml-1 uppercase">Analizar con IA</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>
                        </View>

                        <View className="flex-row gap-x-2">
                            <TouchableOpacity
                                onPress={() => handleRejectProduct(p.id)}
                                style={{ flex: 1 }}
                                className="bg-red-50 py-3 rounded-xl items-center flex-row justify-center"
                            >
                                <XCircle size={14} color="#EF4444" />
                                <Text className="text-red-500 font-black text-[10px] uppercase ml-2">Rechazar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => handleApproveProduct(p.id)}
                                style={{ flex: 1.5 }}
                                className="bg-green-500 py-3 rounded-xl items-center flex-row justify-center shadow-sm"
                            >
                                <CheckCircle size={14} color="white" />
                                <Text className="text-white font-black text-[10px] uppercase ml-2">Aprobar Producto</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ))
            ) : (
                <View className="bg-white rounded-[40px] border border-slate-100 p-10 items-center">
                    <CheckCircle size={48} color="#F0FDF4" />
                    <Text className="text-slate-500 font-bold mt-4 text-center">¡Buen trabajo!</Text>
                    <Text className="text-slate-300 text-[10px] uppercase font-black text-center mt-1">NO HAY PRODUCTOS POR REVISAR</Text>
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
