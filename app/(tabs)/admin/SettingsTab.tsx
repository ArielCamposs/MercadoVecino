
import { History as HistoryLogIcon, Info, PlusCircle, Settings, Sparkles, ToggleRight as ToggleIcon } from 'lucide-react-native';
import React from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AppConfig } from './types';

interface SettingsTabProps {
    maintenanceEnabled: boolean;
    handleToggleMaintenance: () => void;
    isActionLoading: boolean;
    appConfig: AppConfig[];
    requireApproval: boolean;
    handleUpdateConfig: (key: string, value: any) => Promise<void>;
    handleLoadBaseDictionary: () => Promise<void>;
    setConfigKey: (key: string) => void;
    setConfigValue: (value: string) => void;
    setIsEditingConfig: (isEditing: boolean) => void;
    setShowConfigModal: (show: boolean) => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
    maintenanceEnabled,
    handleToggleMaintenance,
    isActionLoading,
    appConfig,
    requireApproval,
    handleUpdateConfig,
    handleLoadBaseDictionary,
    setConfigKey,
    setConfigValue,
    setIsEditingConfig,
    setShowConfigModal
}) => {
    return (
        <View>
            <View className="flex-row items-center mb-6">
                <View className="w-10 h-10 bg-slate-900 rounded-2xl items-center justify-center mr-3">
                    <Settings size={20} color="white" />
                </View>
                <View>
                    <Text className="text-slate-900 font-black text-lg">Configuración de Sistema</Text>
                    <Text className="text-slate-400 text-xs font-bold uppercase tracking-widest">Global App Control</Text>
                </View>
            </View>

            {/* Maintenance Mode */}
            <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleToggleMaintenance}
                className={`p-6 rounded-[32px] border mb-6 ${maintenanceEnabled ? 'bg-red-50 border-red-100' : 'bg-white border-slate-100'}`}
            >
                <View className="flex-row justify-between items-center">
                    <View className="flex-row items-center flex-1">
                        <View className={`w-12 h-12 rounded-2xl items-center justify-center mr-4 ${maintenanceEnabled ? 'bg-red-100' : 'bg-slate-100'}`}>
                            <Info size={24} color={maintenanceEnabled ? '#EF4444' : '#64748B'} />
                        </View>
                        <View>
                            <Text className={`font-black text-base ${maintenanceEnabled ? 'text-red-900' : 'text-slate-900'}`}>
                                Modo Mantenimiento
                            </Text>
                            <Text className={`font-bold text-[10px] uppercase tracking-widest ${maintenanceEnabled ? 'text-red-500' : 'text-slate-400'}`}>
                                {maintenanceEnabled ? 'BLOQUEO ACTIVO' : 'SIN RESTRICCIONES'}
                            </Text>
                        </View>
                    </View>
                    {isActionLoading ? (
                        <ActivityIndicator color={maintenanceEnabled ? '#EF4444' : '#64748B'} />
                    ) : (
                        maintenanceEnabled ? <ToggleIcon size={32} color="#EF4444" /> : <ToggleIcon size={32} color="#CBD5E1" style={{ transform: [{ rotate: '180deg' }] }} />
                    )}
                </View>
            </TouchableOpacity>

            {/* Preventive Moderation */}
            <View style={styles.adminListCard}>
                <View className="flex-row justify-between items-center">
                    <View className="flex-1 mr-4">
                        <Text className="text-slate-900 font-black text-sm uppercase">Moderación Preventiva</Text>
                        <Text className="text-slate-400 text-[10px]">Los productos nuevos requerirán aprobación manual.</Text>
                    </View>
                    <TouchableOpacity
                        onPress={() => handleUpdateConfig('require_product_approval', !requireApproval)}
                        className={`w-12 h-6 rounded-full items-center flex-row px-1 ${requireApproval ? 'bg-indigo-500 justify-end' : 'bg-slate-200 justify-start'}`}
                    >
                        <View className="w-4 h-4 bg-white rounded-full shadow-sm" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Word Filter */}
            <View style={styles.adminListCard}>
                <View className="flex-row justify-between items-center">
                    <View className="flex-1 mr-4">
                        <Text className="text-slate-900 font-black text-sm uppercase">Filtro de Palabras</Text>
                        <Text className="text-slate-400 text-[10px]">Auto-moderación por palabras prohibidas.</Text>
                    </View>
                    <View className="flex-row items-center">
                        <TouchableOpacity
                            onPress={handleLoadBaseDictionary}
                            className="p-2 bg-indigo-50 rounded-xl mr-2"
                        >
                            <HistoryLogIcon size={16} color="#8b5cf6" />
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => {
                                const currentWords = appConfig.find(c => c.key === 'forbidden_words')?.value || [];
                                setConfigKey('forbidden_words');
                                setConfigValue(Array.isArray(currentWords) ? currentWords.join(', ') : String(currentWords));
                                setIsEditingConfig(true);
                                setShowConfigModal(true);
                            }}
                            className="p-2 bg-slate-50 rounded-xl"
                        >
                            <Sparkles size={16} color="#8b5cf6" />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            {/* Environment Variables Header */}
            <View className="flex-row items-center mb-6 mt-8">
                <View className="w-10 h-10 bg-slate-900 rounded-2xl items-center justify-center mr-3">
                    <HistoryLogIcon size={20} color="white" />
                </View>
                <View>
                    <Text className="text-slate-900 font-black text-lg">Variables de Entorno</Text>
                    <Text className="text-slate-400 text-xs font-bold uppercase tracking-widest">Configuración en Tiempo Real</Text>
                </View>
            </View>

            {/* App Config Variables */}
            {appConfig.map((cfg: any) => (
                <View key={cfg.key} style={styles.adminListCard}>
                    <View className="flex-row justify-between items-start mb-2">
                        <Text className="text-slate-900 font-black text-sm uppercase tracking-wider">{cfg.key}</Text>
                        <TouchableOpacity
                            onPress={() => {
                                if (typeof cfg.value === 'object') {
                                    Alert.alert('Configuración Compleja', 'Este valor es un objeto. Edición manual limitada.');
                                } else {
                                    setConfigKey(cfg.key);
                                    setConfigValue(String(cfg.value));
                                    setIsEditingConfig(true);
                                    setShowConfigModal(true);
                                }
                            }}
                            className="p-2 bg-slate-50 rounded-xl"
                        >
                            <Sparkles size={16} color="#8b5cf6" />
                        </TouchableOpacity>
                    </View>
                    <Text className="text-slate-500 text-xs font-medium leading-relaxed">
                        {typeof cfg.value === 'object' ? JSON.stringify(cfg.value, null, 2) : String(cfg.value)}
                    </Text>
                </View>
            ))}

            {/* Add New Variable */}
            <TouchableOpacity
                onPress={() => {
                    setConfigKey('');
                    setConfigValue('');
                    setIsEditingConfig(false);
                    setShowConfigModal(true);
                }}
                className="border-2 border-dashed border-slate-200 p-6 rounded-[32px] items-center mt-4"
            >
                <PlusCircle size={24} color="#94A3B8" />
                <Text className="text-slate-400 font-bold mt-2">Agregar Variable Global</Text>
            </TouchableOpacity>

            <View className="bg-slate-50 p-6 rounded-[32px] border border-slate-100 mt-8 mb-8">
                <Text className="text-slate-900 font-black text-sm mb-4">Información del Sistema</Text>
                <View className="space-y-3">
                    <View className="flex-row justify-between items-center">
                        <Text className="text-slate-400 text-[10px] font-bold uppercase">Versión App</Text>
                        <Text className="text-slate-600 font-bold text-xs">1.2.0-stable</Text>
                    </View>
                    <View className="flex-row justify-between items-center">
                        <Text className="text-slate-400 text-[10px] font-bold uppercase">Entorno</Text>
                        <Text className="text-emerald-600 font-black text-[10px] uppercase">Producción</Text>
                    </View>
                    <View className="flex-row justify-between items-center">
                        <Text className="text-slate-400 text-[10px] font-bold uppercase">Base de Datos</Text>
                        <Text className="text-slate-600 font-bold text-xs">Supabase Cloud</Text>
                    </View>
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
