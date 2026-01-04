
import {
    Activity,
    AlertCircle,
    ChevronLeft,
    Clock,
    DollarSign,
    Megaphone,
    Package,
    Send,
    ShoppingBag,
    Star,
    ToggleRight as ToggleIcon,
    Trash2,
    TrendingUp,
    Users
} from 'lucide-react-native';
import React from 'react';
import { ActivityIndicator, Animated, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { AdminCharts } from './AdminCharts';
import { Product } from './types';

interface DashboardTabProps {
    stats: { users: number, vendors: number, products: number };
    onlineCount: number;
    economicVolume: number;
    confirmedContactsCount: number;
    whatsappContactsCount: number;
    conversionRate: number;
    topProducts: Product[];
    topSellers: any[];
    announcements: any[];
    openTicketsCount: number;
    maintenanceEnabled: boolean;
    isActionLoading: boolean;
    handleTabPress: (tab: string) => void;
    handleToggleMaintenance: () => void;
    handleCopyId: (id: string, label?: string) => void;
    pulseAnim: Animated.Value;
    // Broadcast Section
    broadcastTitle: string;
    setBroadcastTitle: (t: string) => void;
    broadcastMessage: string;
    setBroadcastMessage: (m: string) => void;
    handleBroadcast: () => void;
    handleDeleteAnnouncement: (id: string) => void;
    handleRankProductClick: (id: string) => void;
    handleRankSellerClick: (id: string) => void;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
    stats,
    onlineCount,
    economicVolume,
    confirmedContactsCount,
    whatsappContactsCount,
    conversionRate,
    topProducts,
    topSellers,
    announcements,
    openTicketsCount,
    maintenanceEnabled,
    isActionLoading,
    handleTabPress,
    handleToggleMaintenance,
    handleCopyId,
    pulseAnim,
    broadcastTitle,
    setBroadcastTitle,
    broadcastMessage,
    setBroadcastMessage,
    handleBroadcast,
    handleDeleteAnnouncement,
    handleRankProductClick,
    handleRankSellerClick
}) => {

    const chartData = [
        { label: 'Usuarios', value: stats.users, color: '#8b5cf6' },
        { label: 'Vendedores', value: stats.vendors, color: '#6366f1' },
        { label: 'Productos', value: stats.products, color: '#10b981' },
        { label: 'Ventas', value: confirmedContactsCount, color: '#f59e0b' },
    ];

    return (
        <View>
            <View className="mb-8">
                <Text className="text-slate-900 font-extrabold text-3xl mb-1 mt-4">Dashboard</Text>
                <Text className="text-slate-400 font-bold text-xs uppercase tracking-widest">Marketplace Intelligence</Text>
            </View>

            {/* Performance Charts Section */}
            <AdminCharts
                title="Rendimiento del Ecosistema"
                description="Distribución de Entidades Clave"
                data={chartData}
            />

            <View className="flex-row flex-wrap justify-between gap-y-4 mb-8">
                {/* Stats Cards */}
                <View style={[styles.statCardSmall, { backgroundColor: '#EEF2FF', borderColor: '#E0E7FF' }]}>
                    <View className="flex-row justify-between items-start">
                        <Users size={16} color="#4F46E5" />
                        <Animated.View style={{ opacity: pulseAnim }}>
                            <View className="w-2 h-2 bg-green-500 rounded-full" />
                        </Animated.View>
                    </View>
                    <Text style={styles.statValueSmall}>{onlineCount}</Text>
                    <Text style={styles.statLabelSmall}>En Línea</Text>
                </View>

                <View style={[styles.statCardSmall, { backgroundColor: '#F0FDF4', borderColor: '#DCFCE7' }]}>
                    <DollarSign size={16} color="#16A34A" />
                    <Text style={styles.statValueSmall}>
                        ${economicVolume > 1000000 ? `${(economicVolume / 1000000).toFixed(1)}M` : economicVolume.toLocaleString('es-CL')}
                    </Text>
                    <Text style={styles.statLabelSmall}>Vol. Económico</Text>
                </View>

                <View style={[styles.statCardSmall, { backgroundColor: '#FFF7ED', borderColor: '#FFEDD5' }]}>
                    <TrendingUp size={16} color="#EA580C" />
                    <Text style={styles.statValueSmall}>{conversionRate.toFixed(1)}%</Text>
                    <Text style={styles.statLabelSmall}>Conversión</Text>
                </View>

                <View style={[styles.statCardSmall, { backgroundColor: '#F5F3FF', borderColor: '#EDE9FE' }]}>
                    <ShoppingBag size={16} color="#7C3AED" />
                    <Text style={styles.statValueSmall}>{confirmedContactsCount}</Text>
                    <Text style={styles.statLabelSmall}>Ventas</Text>
                </View>
            </View>

            {/* Global Control Center */}
            <View className="mb-8">
                <Text className="text-slate-900 font-black text-lg mb-4">Centro de Control Proactivo</Text>
                <View className="flex-row gap-x-3">
                    <TouchableOpacity
                        onPress={handleToggleMaintenance}
                        className={`flex-1 p-5 rounded-[32px] border ${maintenanceEnabled ? 'bg-red-500 border-red-600' : 'bg-slate-900 border-slate-900'}`}
                    >
                        <View className="flex-row justify-between items-start mb-3">
                            <ToggleIcon size={20} color="white" />
                            {isActionLoading && <ActivityIndicator size="small" color="white" />}
                        </View>
                        <Text className="text-white font-black text-xs uppercase tracking-tighter">Modo Mantenimiento</Text>
                        <Text className="text-white/60 text-[9px] font-bold mt-1 uppercase">
                            {maintenanceEnabled ? 'Sistema Bloqueado' : 'Sistema Nominal'}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => handleTabPress('approvals')}
                        className="flex-1 p-5 rounded-[32px] bg-amber-500 border border-amber-600"
                    >
                        <View className="flex-row justify-between items-start mb-3">
                            <Activity size={20} color="white" />
                            {openTicketsCount > 0 && (
                                <View className="bg-white px-2 py-0.5 rounded-full">
                                    <Text className="text-amber-600 font-black text-[8px]">{openTicketsCount}</Text>
                                </View>
                            )}
                        </View>
                        <Text className="text-white font-black text-xs uppercase tracking-tighter">Cola de Moderación</Text>
                        <Text className="text-white/60 text-[9px] font-bold mt-1 uppercase">Tickets & Aprobaciones</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Real-time Insights */}
            <View className="mb-8 flex-row gap-x-4">
                <View style={styles.rankingCard}>
                    <Text style={styles.rankingTitle}>Productos Top</Text>
                    {topProducts.slice(0, 3).map((p, i) => (
                        <View key={p.id} style={styles.rankingItem}>
                            <Text style={styles.rankingNumber}>{i + 1}</Text>
                            <View className="flex-1">
                                <Text style={styles.rankingName} numberOfLines={1}>{p.title}</Text>
                                <Text style={styles.rankingValue}>{p.view_count || 0} vistas</Text>
                            </View>
                        </View>
                    ))}
                </View>

                <View style={styles.rankingCard}>
                    <Text style={styles.rankingTitle}>Vendedores</Text>
                    {topSellers.slice(0, 3).map((s, i) => (
                        <View key={s.id} style={styles.rankingItem}>
                            <Text style={styles.rankingNumber}>{i + 1}</Text>
                            <View className="flex-1">
                                <Text style={styles.rankingName} numberOfLines={1}>{s.full_name}</Text>
                                <Text style={styles.rankingValue}>{s.sales_count || 0} ventas</Text>
                            </View>
                        </View>
                    ))}
                </View>
            </View>

            {/* Quick Actions List */}
            <View className="mb-20">
                <Text className="text-slate-900 font-black text-lg mb-4">Acciones Críticas</Text>

                <TouchableOpacity
                    onPress={() => handleTabPress('users')}
                    className="bg-white p-4 rounded-2xl border border-slate-100 flex-row items-center mb-3"
                >
                    <View className="w-10 h-10 bg-indigo-50 rounded-xl items-center justify-center mr-4">
                        <Users size={20} color="#4F46E5" />
                    </View>
                    <View className="flex-1">
                        <Text className="text-slate-900 font-bold">Gestión de Usuarios</Text>
                        <Text className="text-slate-400 text-xs">{stats.users} registrados</Text>
                    </View>
                    <ChevronLeft size={20} color="#CBD5E1" style={{ transform: [{ rotate: '180deg' }] }} />
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => handleTabPress('gallery')}
                    className="bg-white p-4 rounded-2xl border border-slate-100 flex-row items-center mb-3"
                >
                    <View className="w-10 h-10 bg-green-50 rounded-xl items-center justify-center mr-4">
                        <Package size={20} color="#16A34A" />
                    </View>
                    <View className="flex-1">
                        <Text className="text-slate-900 font-bold">Catálogo de Productos</Text>
                        <Text className="text-slate-400 text-xs">{stats.products} artículos activos</Text>
                    </View>
                    <ChevronLeft size={20} color="#CBD5E1" style={{ transform: [{ rotate: '180deg' }] }} />
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => handleTabPress('transactions')}
                    className="bg-white p-4 rounded-2xl border border-slate-100 flex-row items-center mb-3"
                >
                    <View className="w-10 h-10 bg-amber-50 rounded-xl items-center justify-center mr-4">
                        <DollarSign size={20} color="#EA580C" />
                    </View>
                    <View className="flex-1">
                        <Text className="text-slate-900 font-bold">Historial de Confirmaciones</Text>
                        <Text className="text-slate-400 text-xs">{whatsappContactsCount} contactos totales</Text>
                    </View>
                    <ChevronLeft size={20} color="#CBD5E1" style={{ transform: [{ rotate: '180deg' }] }} />
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => handleTabPress('events')}
                    className="bg-white p-4 rounded-2xl border border-slate-100 flex-row items-center mb-3"
                >
                    <View className="w-10 h-10 bg-indigo-50 rounded-xl items-center justify-center mr-4">
                        <Star size={20} color="#6366f1" />
                    </View>
                    <View className="flex-1">
                        <Text className="text-slate-900 font-bold">Eventos Especiales</Text>
                        <Text className="text-slate-400 text-xs">Modo Navidad, CyberDay y más</Text>
                    </View>
                    <ChevronLeft size={20} color="#CBD5E1" style={{ transform: [{ rotate: '180deg' }] }} />
                </TouchableOpacity>

            </View>

            {/* Global Broadcast Form */}
            <View className="mb-8 p-6 bg-white border border-slate-100 rounded-[32px] shadow-sm">
                <View className="flex-row items-center mb-6">
                    <View className="w-10 h-10 bg-indigo-50 rounded-2xl items-center justify-center mr-3">
                        <Megaphone size={20} color="#6366f1" />
                    </View>
                    <View>
                        <Text className="text-slate-900 font-black text-lg">Difusión Global</Text>
                        <Text className="text-slate-400 text-xs font-bold uppercase tracking-widest">Broadcast App-Wide</Text>
                    </View>
                </View>

                <View className="space-y-4">
                    <View>
                        <Text className="text-slate-500 font-bold text-xs mb-2 ml-1">TÍTULO DEL ANUNCIO</Text>
                        <TextInput
                            className="bg-slate-50 border border-slate-100 p-4 rounded-2xl text-slate-900 font-bold"
                            value={broadcastTitle}
                            onChangeText={setBroadcastTitle}
                            placeholder="Ej: Mantenimiento programado"
                            placeholderTextColor="#94A3B8"
                        />
                    </View>

                    <View>
                        <Text className="text-slate-500 font-bold text-xs mb-2 ml-1">MENSAJE DETALLADO</Text>
                        <TextInput
                            className="bg-slate-50 border border-slate-100 p-4 rounded-2xl text-slate-900 font-bold"
                            style={{ height: 120, textAlignVertical: 'top' }}
                            value={broadcastMessage}
                            onChangeText={setBroadcastMessage}
                            placeholder="Escribe aquí el mensaje para todos los usuarios..."
                            placeholderTextColor="#94A3B8"
                            multiline
                        />
                    </View>

                    <TouchableOpacity
                        onPress={handleBroadcast}
                        disabled={isActionLoading}
                        activeOpacity={0.8}
                        className={`py-4 rounded-2xl flex-row items-center justify-center ${isActionLoading ? 'bg-slate-200' : 'bg-indigo-600'}`}
                    >
                        {isActionLoading ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <>
                                <Send size={20} color="white" />
                                <Text className="text-white font-black ml-2">Enviar a todos los Vecinos</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </View>

            {/* Recent Announcements List */}
            <View className="mb-20">
                <Text className="text-slate-400 font-black uppercase tracking-widest text-xs mb-6 px-1">Historial de Notificaciones</Text>

                {announcements.length > 0 ? (
                    announcements.map((ann) => (
                        <View key={ann.id} className="bg-white p-5 rounded-[32px] border border-slate-100 mb-4 shadow-sm">
                            <View className="flex-row justify-between items-start mb-2">
                                <View className="flex-1">
                                    <Text className="text-slate-900 font-black text-base">{ann.title}</Text>
                                    <View className="flex-row items-center mt-1">
                                        <Clock size={12} color="#94A3B8" />
                                        <Text className="text-slate-400 text-[10px] font-bold uppercase ml-1">
                                            {new Date(ann.created_at).toLocaleDateString()}
                                        </Text>
                                    </View>
                                </View>
                                <TouchableOpacity
                                    onPress={() => handleDeleteAnnouncement(ann.id)}
                                    className="p-2 bg-red-50 rounded-xl"
                                >
                                    <Trash2 size={16} color="#EF4444" />
                                </TouchableOpacity>
                            </View>
                            <Text className="text-slate-600 font-medium leading-5">{ann.content}</Text>
                        </View>
                    ))
                ) : (
                    <View className="items-center justify-center py-10 bg-slate-50 rounded-[32px] border border-dashed border-slate-200">
                        <AlertCircle size={32} color="#CBD5E1" />
                        <Text className="text-slate-400 font-bold mt-2">No has enviado anuncios globales</Text>
                    </View>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    statCardSmall: {
        width: '48%',
        padding: 16,
        borderRadius: 24,
        borderWidth: 1,
    },
    statValueSmall: {
        fontSize: 20,
        fontWeight: '900',
        color: '#0F172A',
        marginTop: 4,
    },
    statLabelSmall: {
        fontSize: 10,
        fontWeight: '700',
        color: '#64748B',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    rankingCard: {
        flex: 1,
        backgroundColor: 'white',
        padding: 16,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.02,
        shadowRadius: 8,
        elevation: 2,
    },
    rankingTitle: {
        fontSize: 12,
        fontWeight: '900',
        color: '#64748B',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 16,
    },
    rankingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    rankingNumber: {
        fontSize: 14,
        fontWeight: '900',
        color: '#8b5cf6',
        width: 24,
    },
    rankingName: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#0F172A',
    },
    rankingValue: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#94A3B8',
        textTransform: 'uppercase',
    },
});
