
import { Copy, History as HistoryLogIcon, Search, ShieldCheck } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { AuditLog } from './types';

interface AuditTabProps {
    auditLogs: AuditLog[];
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    handleCopyId: (id: string, label?: string) => void;
}

export const AuditTab: React.FC<AuditTabProps> = ({
    auditLogs,
    searchQuery,
    setSearchQuery,
    handleCopyId
}) => {
    const filteredLogs = auditLogs.filter(log => {
        if (!searchQuery) return true;
        const s = searchQuery.toLowerCase();
        return log.action?.toLowerCase().includes(s) ||
            log.profiles?.full_name?.toLowerCase().includes(s) ||
            JSON.stringify(log.details || '').toLowerCase().includes(s);
    });

    return (
        <View>
            <View style={styles.searchContainer}>
                <Search size={20} color="#94A3B8" />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Buscar en logs..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholderTextColor="#94A3B8"
                />
            </View>

            <View className="flex-row items-center mb-6">
                <View className="w-10 h-10 bg-slate-900 rounded-2xl items-center justify-center mr-3">
                    <ShieldCheck size={20} color="white" />
                </View>
                <View>
                    <Text className="text-slate-900 font-black text-lg">Logs de Auditoría</Text>
                    <Text className="text-slate-400 text-xs font-bold uppercase tracking-widest">Registro de Acciones Admin</Text>
                </View>
            </View>

            {filteredLogs.length > 0 ? (
                filteredLogs.map((log: AuditLog) => (
                    <View key={log.id} style={[styles.adminListCard, { borderLeftWidth: 4, borderLeftColor: '#8b5cf6' }]}>
                        <View className="flex-row justify-between items-start mb-2">
                            <View>
                                <Text className="text-slate-900 font-black text-xs uppercase tracking-tight">{log.action?.replace(/_/g, ' ')}</Text>
                                <Text className="text-slate-400 text-[9px] font-bold">Por: {log.profiles?.full_name || 'Sistema'}</Text>
                                <TouchableOpacity onPress={() => handleCopyId(log.id, 'ID de Log')} className="flex-row items-center mt-1">
                                    <Text className="text-slate-300 text-[8px] font-mono mr-1">ID: {log.id.substring(0, 8)}...</Text>
                                    <Copy size={8} color="#94A3B8" />
                                </TouchableOpacity>
                            </View>
                            <Text className="text-slate-300 text-[9px] font-bold">
                                {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </Text>
                        </View>
                        {!!log.details && (
                            <View className="bg-slate-50/50 p-2 rounded-lg mt-2">
                                <Text className="text-slate-500 text-[10px]" numberOfLines={2}>
                                    {String(typeof log.details === 'string' ? log.details : JSON.stringify(log.details))}
                                </Text>
                            </View>
                        )}
                    </View>
                ))
            ) : (
                <View className="items-center py-20 border-2 border-dashed border-slate-100 rounded-[40px]">
                    <HistoryLogIcon size={48} color="#F1F5F9" />
                    <Text className="text-slate-400 font-bold mt-4">No hay logs registrados todavía.</Text>
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
