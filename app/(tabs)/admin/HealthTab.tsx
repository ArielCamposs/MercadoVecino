
import { Activity, AlertCircle, Globe, HardDrive, HeartPulse, ShieldCheck, Sparkles } from 'lucide-react-native';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface HealthTabProps {
    onlineCount: number;
    healthLogs: { type: string; message: string; detail?: string; status?: string }[];
    isHealthCheckRunning: boolean;
    runHealthCheck: () => Promise<void>;
}

export const HealthTab: React.FC<HealthTabProps> = ({
    onlineCount,
    healthLogs,
    isHealthCheckRunning,
    runHealthCheck
}) => {
    const healthMetrics = [
        { label: 'API Supabase', status: 'Optimal', color: '#10b981', icon: Globe },
        { label: 'Storage Service', status: 'Optimal', color: '#10b981', icon: HardDrive },
        { label: 'Realtime Engine', status: onlineCount > 0 ? 'Active' : 'Standby', color: onlineCount > 0 ? '#10b981' : '#f59e0b', icon: Activity },
        { label: 'Security Firewall', status: 'Locked', color: '#8b5cf6', icon: ShieldCheck },
    ];

    return (
        <View>
            <View className="flex-row items-center mb-8">
                <View className="w-12 h-12 bg-green-500 rounded-2xl items-center justify-center mr-4 shadow-lg shadow-green-200">
                    <HeartPulse size={24} color="white" />
                </View>
                <View>
                    <Text className="text-slate-900 font-black text-2xl">Diagnóstico Vital</Text>
                    <Text className="text-slate-400 text-xs font-bold uppercase tracking-widest">Health & Performance Audit</Text>
                </View>
            </View>

            {/* Health Metrics Grid */}
            <View className="flex-row flex-wrap justify-between gap-y-4 mb-8">
                {healthMetrics.map((m, i) => (
                    <View key={i} className="w-[48%] bg-white p-5 rounded-[32px] border border-slate-100 shadow-sm">
                        <View className="flex-row justify-between items-start mb-4">
                            <View className="w-10 h-10 bg-slate-50 rounded-xl items-center justify-center">
                                <m.icon size={20} color={m.color} />
                            </View>
                            <View style={{ backgroundColor: m.color }} className="w-2 h-2 rounded-full" />
                        </View>
                        <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-tighter mb-1">{m.label}</Text>
                        <Text style={{ color: m.color }} className="font-black text-sm uppercase">{m.status}</Text>
                    </View>
                ))}
            </View>

            {/* Run Health Check Button */}
            <TouchableOpacity
                onPress={runHealthCheck}
                disabled={isHealthCheckRunning}
                className={`p-6 rounded-[32px] mb-8 items-center flex-row justify-center ${isHealthCheckRunning ? 'bg-slate-100' : 'bg-green-500'}`}
            >
                {isHealthCheckRunning ? (
                    <ActivityIndicator color="#94A3B8" />
                ) : (
                    <>
                        <ShieldCheck size={20} color="white" />
                        <Text className="text-white font-black ml-3 uppercase tracking-widest">Iniciar Escaneo de Salud</Text>
                    </>
                )}
            </TouchableOpacity>

            {/* Health Logs */}
            {healthLogs.length > 0 ? (
                healthLogs.map((log, idx) => (
                    <View key={idx} style={[styles.adminListCard, { borderLeftWidth: 4, borderLeftColor: log.type === 'error' ? '#EF4444' : log.type === 'warning' ? '#F59E0B' : '#10B981' }]}>
                        <View className="flex-row items-center mb-1">
                            <AlertCircle size={14} color={log.type === 'error' ? '#EF4444' : log.type === 'warning' ? '#F59E0B' : '#10B981'} />
                            <Text className={`font-black text-xs ml-2 uppercase ${log.type === 'error' ? 'text-red-600' : log.type === 'warning' ? 'text-amber-600' : 'text-green-600'}`}>
                                {log.type}
                            </Text>
                        </View>
                        <Text className="text-slate-800 font-bold text-sm">{log.message}</Text>
                        {log.detail && <Text className="text-slate-400 text-[10px] mt-1 italic">{log.detail}</Text>}
                    </View>
                ))
            ) : (
                <View className="items-center py-20 bg-white rounded-[40px] border border-slate-100">
                    <Sparkles size={48} color="#F0FDF4" />
                    <Text className="text-slate-400 font-bold mt-4 text-center">Todo parece estar saludable.</Text>
                    <Text className="text-slate-300 text-[10px] uppercase font-black tracking-widest mt-1">Sistema Nominal</Text>
                </View>
            )}

            {/* Uptime Stat */}
            <View className="mt-8 bg-slate-900 p-8 rounded-[40px] items-center mb-8">
                <Text className="text-white font-black text-3xl mb-1">99.9%</Text>
                <Text className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-6">Uptime Histórico</Text>
                <View className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                    <View className="w-[99.9%] h-full bg-emerald-500 rounded-full" />
                </View>
            </View>
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
