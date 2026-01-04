
import { Image as ImageIcon, Send, Trash2 } from 'lucide-react-native';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Banner } from './types';

interface BannersTabProps {
    banners: Banner[];
    setShowBannerModal: (show: boolean) => void;
    handleToggleBanner: (bannerId: string, currentState: boolean) => void;
    handleDeleteBanner: (bannerId: string) => void;
}

export const BannersTab: React.FC<BannersTabProps> = ({
    banners,
    setShowBannerModal,
    handleToggleBanner,
    handleDeleteBanner
}) => {
    return (
        <View>
            <View className="flex-row justify-between items-center mb-6">
                <Text className="text-slate-900 font-extrabold text-xl">Gestión de Banners</Text>
                <TouchableOpacity
                    onPress={() => setShowBannerModal(true)}
                    className="bg-brand-500 py-3 px-6 rounded-2xl flex-row items-center"
                >
                    <Send size={16} color="white" className="mr-2" />
                    <Text className="text-white font-bold">Nuevo Banner</Text>
                </TouchableOpacity>
            </View>

            {banners.length > 0 ? (
                banners.map((banner: Banner) => (
                    <View key={banner.id} style={styles.adminListCard}>
                        <View className="flex-row">
                            <View className="w-24 h-16 bg-slate-100 rounded-xl overflow-hidden mr-4">
                                {banner.image_url ? (
                                    <Image source={{ uri: banner.image_url }} className="w-full h-full" resizeMode="cover" />
                                ) : (
                                    <View className="items-center justify-center flex-1">
                                        <ImageIcon size={20} color="#94A3B8" />
                                    </View>
                                )}
                            </View>
                            <View className="flex-1">
                                <Text className="text-slate-900 font-bold text-sm" numberOfLines={1}>
                                    {banner.title || 'Sin Título'}
                                </Text>
                                <Text className="text-slate-400 text-xs mt-1" numberOfLines={1}>
                                    {banner.image_url}
                                </Text>
                            </View>
                        </View>
                        <View className="flex-row justify-end mt-4 pt-4 border-t border-slate-50">
                            <TouchableOpacity
                                onPress={() => handleToggleBanner(banner.id, !!banner.is_active)}
                                className={`py-2 px-4 rounded-xl mr-2 ${banner.is_active ? 'bg-green-50' : 'bg-slate-50'}`}
                            >
                                <Text className={`font-bold text-[10px] ${banner.is_active ? 'text-green-600' : 'text-slate-400'}`}>
                                    {banner.is_active ? 'ACTIVO' : 'PAUSADO'}
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => handleDeleteBanner(banner.id)}
                                className="bg-red-50 py-2 px-4 rounded-xl"
                            >
                                <Trash2 size={14} color="#EF4444" />
                            </TouchableOpacity>
                        </View>
                    </View>
                ))
            ) : (
                <View className="items-center justify-center py-20 bg-white rounded-[40px] border border-slate-100">
                    <ImageIcon size={48} color="#E2E8F0" />
                    <Text className="text-slate-400 font-bold mt-4">No hay banners configurados</Text>
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
