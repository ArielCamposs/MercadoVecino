
import { Clock, History as HistoryLogIcon, MessageSquare, Package, UserPlus } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ActivityLogItem } from './types';

interface ActivityTabProps {
    activityLogs: ActivityLogItem[];
}

export const ActivityTab: React.FC<ActivityTabProps> = ({ activityLogs }) => {
    return (
        <View>
            {activityLogs.length > 0 ? (
                activityLogs.map((log: any, idx: number) => (
                    <View key={idx} style={styles.activityItem}>
                        <View style={[styles.activityIcon, { backgroundColor: log.type === 'user' ? '#EEF2FF' : log.type === 'product' ? '#F0FDF4' : '#F5F3FF' }]}>
                            {log.type === 'user' ? <UserPlus size={16} color="#4F46E5" /> :
                                log.type === 'product' ? <Package size={16} color="#16A34A" /> :
                                    <MessageSquare size={16} color="#7C3AED" />}
                        </View>
                        <View className="flex-1 ml-3">
                            <Text className="text-slate-900 font-bold text-sm">
                                {log.type === 'user' ? `Nuevo usuario: ${log.full_name}` :
                                    log.type === 'product' ? `Nuevo producto: ${log.title}` :
                                        `Nueva reseña: "${log.comment?.substring(0, 30)}..."`}
                            </Text>
                            <View className="flex-row items-center mt-1">
                                <Clock size={10} color="#94A3B8" />
                                <Text className="text-slate-400 text-[10px] font-bold uppercase ml-1">
                                    {new Date(log.created_at).toLocaleTimeString()} · {new Date(log.created_at).toLocaleDateString()}
                                </Text>
                            </View>
                        </View>
                    </View>
                ))
            ) : (
                <View className="items-center py-20">
                    <HistoryLogIcon size={48} color="#CBD5E1" />
                    <Text className="text-slate-400 font-bold mt-4">No hay actividad reciente</Text>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    activityItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        padding: 16,
        borderRadius: 24,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    activityIcon: {
        width: 40,
        height: 40,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
