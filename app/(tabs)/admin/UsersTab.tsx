
import { BadgeCheck, Search, ShieldAlert, Trash2, UserMinus, UserPlus } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Profile } from './types';

interface UsersTabProps {
    users: Profile[];
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    setSelectedUser: (user: Profile) => void;
    setShowUserModal: (show: boolean) => void;
    handleUpdateUserRole: (userId: string, newRole: string) => void;
    handleDeleteUser: (userId: string) => void;
}

export const UsersTab: React.FC<UsersTabProps> = ({
    users,
    searchQuery,
    setSearchQuery,
    setSelectedUser,
    setShowUserModal,
    handleUpdateUserRole,
    handleDeleteUser
}) => {
    // Lógica para detectar multi-cuentas (dispositivos compartidos)
    const deviceCounts = users.reduce((acc, user) => {
        if (user.last_device_id) {
            acc[user.last_device_id] = (acc[user.last_device_id] || 0) + 1;
        }
        return acc;
    }, {} as Record<string, number>);

    return (
        <View>
            <View style={styles.searchContainer}>
                <Search size={20} color="#94A3B8" />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Buscar usuario por nombre..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholderTextColor="#94A3B8"
                />
            </View>

            {users.map(user => {
                const isBanned = user.banned_until && new Date(user.banned_until) > new Date();

                return (
                    <TouchableOpacity
                        key={user.id}
                        style={[
                            styles.adminListCard,
                            isBanned && { backgroundColor: '#FFEEF2', borderColor: '#FFC1CF', borderWidth: 2, borderStyle: 'solid' }
                        ]}
                        onPress={() => { setSelectedUser(user); setShowUserModal(true); }}
                    >
                        <View className="flex-row justify-between items-center">
                            <View className="flex-1">
                                <View className="flex-row items-center">
                                    <Text className={`font-black text-base ${isBanned ? 'text-red-900' : 'text-slate-900'}`}>{user.full_name}</Text>
                                    {user.is_verified && (
                                        <View className="ml-1.5">
                                            <BadgeCheck size={16} color="#8b5cf6" fill="#f5f3ff" />
                                        </View>
                                    )}
                                    {isBanned && (
                                        <View className="ml-2 bg-red-100 px-2 py-0.5 rounded-full border border-red-200">
                                            <Text className="text-red-700 text-[8px] font-bold uppercase">BANEADO</Text>
                                        </View>
                                    )}
                                    {user.last_device_id && deviceCounts[user.last_device_id] > 1 && (
                                        <View className="ml-2 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200 flex-row items-center">
                                            <ShieldAlert size={8} color="#D97706" />
                                            <Text className="text-amber-700 text-[8px] font-bold uppercase ml-1">MULTI-CUENTA ({deviceCounts[user.last_device_id]})</Text>
                                        </View>
                                    )}
                                </View>
                                <View className="flex-row items-center mt-1">
                                    <View className={`w-2 h-2 rounded-full mr-2 ${isBanned ? 'bg-red-500' : (user.last_seen && (new Date().getTime() - new Date(user.last_seen).getTime() < 300000) ? 'bg-emerald-500' : 'bg-slate-300')}`} />
                                    <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                                        {user.role === 'admin' ? 'Administrador' : user.role === 'vendor' ? 'Comerciante' : 'Vecino'}
                                    </Text>
                                </View>
                            </View>
                            <View className="flex-row gap-2">
                                <TouchableOpacity
                                    onPress={() => handleUpdateUserRole(user.id, user.role === 'vendor' ? 'client' : 'vendor')}
                                    className={`w-10 h-10 rounded-xl items-center justify-center ${user.role === 'vendor' ? 'bg-amber-50' : 'bg-emerald-50'}`}
                                >
                                    {user.role === 'vendor' ? <UserMinus size={18} color="#D97706" /> : <UserPlus size={18} color="#059669" />}
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => handleDeleteUser(user.id)}
                                    className="w-10 h-10 bg-red-50 rounded-xl items-center justify-center"
                                >
                                    <Trash2 size={18} color="#EF4444" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </TouchableOpacity>
                );
            })}
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
