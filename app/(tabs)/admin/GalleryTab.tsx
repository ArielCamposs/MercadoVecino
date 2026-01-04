
import { Image as ImageIcon, Sparkles, Star, Trash2 } from 'lucide-react-native';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Product } from './types';

interface GalleryTabProps {
    galleryProducts: Product[];
    setSelectedProduct: (prod: Product) => void;
    setShowProductModal: (show: boolean) => void;
    handleToggleFeatured: (productId: string, currentState: boolean) => void;
    handleDeleteProduct: (productId: string) => void;
}

export const GalleryTab: React.FC<GalleryTabProps> = ({
    galleryProducts,
    setSelectedProduct,
    setShowProductModal,
    handleToggleFeatured,
    handleDeleteProduct
}) => {
    return (
        <View style={styles.galleryGrid}>
            {galleryProducts.length > 0 ? (
                galleryProducts.map((prod: any) => (
                    <View key={prod.id} style={styles.galleryItem}>
                        <TouchableOpacity
                            activeOpacity={0.9}
                            onPress={() => {
                                setSelectedProduct(prod);
                                setShowProductModal(true);
                            }}
                        >
                            <View style={styles.galleryImageContainer}>
                                <View style={styles.galleryImagePlaceholder}>
                                    <ImageIcon size={24} color="#CBD5E1" />
                                </View>
                                {prod.image_url ? (
                                    <Image
                                        source={{ uri: prod.image_url }}
                                        style={StyleSheet.absoluteFill}
                                        resizeMode="cover"
                                    />
                                ) : null}

                                {/* Action Overlays */}
                                <View style={styles.galleryActions}>
                                    <TouchableOpacity
                                        onPress={() => handleToggleFeatured(prod.id, !!prod.is_featured)}
                                        style={[styles.galleryActionBtn, prod.is_featured ? styles.galleryActionActive : styles.galleryActionInactive]}
                                    >
                                        <Star size={14} color={prod.is_featured ? 'white' : '#94A3B8'} fill={prod.is_featured ? 'white' : 'transparent'} />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={() => handleDeleteProduct(prod.id)}
                                        style={[styles.galleryActionBtn, styles.galleryDeleteBtn]}
                                    >
                                        <Trash2 size={14} color="#EF4444" />
                                    </TouchableOpacity>
                                </View>

                                {prod.is_featured && (
                                    <View style={styles.featuredBadge}>
                                        <Sparkles size={8} color="white" />
                                        <Text style={styles.featuredBadgeText}>TOP</Text>
                                    </View>
                                )}
                            </View>
                            <Text numberOfLines={1} style={styles.galleryText}>{prod.title}</Text>
                        </TouchableOpacity>
                    </View>
                ))
            ) : (
                <View className="items-center py-20 w-full">
                    <ImageIcon size={48} color="#CBD5E1" />
                    <Text className="text-slate-400 font-bold mt-4">No hay productos en galería</Text>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    galleryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        paddingTop: 10,
    },
    galleryItem: {
        width: '48%',
        backgroundColor: 'white',
        borderRadius: 24,
        padding: 8,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    galleryImageContainer: {
        width: '100%',
        aspectRatio: 1,
        borderRadius: 18,
        backgroundColor: '#F8FAFC',
        overflow: 'hidden',
    },
    galleryImagePlaceholder: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    galleryText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#1E293B',
        marginTop: 8,
        paddingHorizontal: 4,
        textAlign: 'center',
    },
    galleryActions: {
        position: 'absolute',
        top: 8,
        right: 8,
        flexDirection: 'row',
        gap: 6,
    },
    galleryActionBtn: {
        width: 32,
        height: 32,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    galleryActionActive: {
        backgroundColor: '#F59E0B',
        borderColor: '#F59E0B',
    },
    galleryActionInactive: {
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderColor: '#E2E8F0',
    },
    galleryDeleteBtn: {
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderColor: '#FEE2E2',
    },
    featuredBadge: {
        position: 'absolute',
        bottom: 8,
        left: 8,
        backgroundColor: '#8b5cf6',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
    },
    featuredBadgeText: {
        color: 'white',
        fontSize: 8,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
});
