import {
    BadgeCheck,
    Clock,
    Heart,
    Home,
    MapPin,
    MessageCircle,
    Star,
    Truck,
    User,
    X
} from 'lucide-react-native';
import React, { useState } from 'react';
import {
    Alert,
    Dimensions,
    Image,
    Linking,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { Product } from './ProductCard';
import ReviewSection from './ReviewSection';

const { width } = Dimensions.get('window');

interface ProductDetailModalProps {
    visible: boolean;
    product: Product | null;
    onClose: () => void;
    userRole?: string | null;
    onInternalChat?: (product: Product) => void;
    onToggleFavorite?: (product: Product) => void;
    isFavorite?: boolean;
}

export default function ProductDetailModal({
    visible,
    product,
    onClose,
    userRole,
    onInternalChat,
    onToggleFavorite,
    isFavorite = false
}: ProductDetailModalProps) {
    const [activeImageIndex, setActiveImageIndex] = useState(0);

    if (!product) return null;

    const handleWhatsApp = async () => {
        if (!product.whatsapp_number) {
            Alert.alert('Sin WhatsApp', 'Este vendedor no ha proporcionado un número de contacto.');
            return;
        }

        const cleanNumber = product.whatsapp_number.replace(/[^0-9]/g, '');
        const message = `Hola, vi tu producto "${product.title}" en MercadoVecino y me interesa.`;
        const url = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;

        try {
            const supported = await Linking.canOpenURL(url);
            if (supported) {
                await Linking.openURL(url);
            } else {
                await Linking.openURL(`whatsapp://send?phone=${cleanNumber}&text=${encodeURIComponent(message)}`);
            }
        } catch (err) {
            Alert.alert('Error', 'No pudimos abrir WhatsApp. Asegúrate de tener la app instalada.');
        }
    };

    const images = product.image_urls && product.image_urls.length > 0
        ? product.image_urls
        : [product.image];

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <ScrollView showsVerticalScrollIndicator={false}>
                        {/* Header / Images */}
                        <View style={styles.imageSection}>
                            <ScrollView
                                horizontal
                                pagingEnabled
                                showsHorizontalScrollIndicator={false}
                                onMomentumScrollEnd={(e) => {
                                    const index = Math.round(e.nativeEvent.contentOffset.x / width);
                                    setActiveImageIndex(index);
                                }}
                            >
                                {images.map((url, index) => (
                                    <Image
                                        key={index}
                                        source={{ uri: url }}
                                        style={styles.mainImage}
                                        resizeMode="cover"
                                    />
                                ))}
                            </ScrollView>

                            {/* Indicators */}
                            {images.length > 1 && (
                                <View style={styles.indicatorContainer}>
                                    {images.map((_, index) => (
                                        <View
                                            key={index}
                                            style={[
                                                styles.indicator,
                                                activeImageIndex === index && styles.indicatorActive
                                            ]}
                                        />
                                    ))}
                                </View>
                            )}

                            {/* Close Button */}
                            <TouchableOpacity
                                onPress={onClose}
                                style={styles.modalCloseBtn}
                                activeOpacity={0.8}
                            >
                                <X size={24} color="#0F172A" />
                            </TouchableOpacity>

                            {/* Favorite Button */}
                            {onToggleFavorite && (
                                <TouchableOpacity
                                    style={[styles.modalCloseBtn, { right: 84 }]}
                                    onPress={() => onToggleFavorite(product)}
                                    activeOpacity={0.8}
                                >
                                    <Heart size={24} color="#FF0000" fill={isFavorite ? "#FF0000" : "transparent"} />
                                </TouchableOpacity>
                            )}

                            {/* Rating Badge Overlay */}
                            <View style={styles.ratingBadgeOverlay}>
                                <Star size={14} fill="#FACC15" color="#FACC15" />
                                <Text style={styles.ratingText}>{(product.rating || 0).toFixed(1)}</Text>
                                <Text style={styles.reviewCountText}>({product.review_count || 0})</Text>
                            </View>
                        </View>

                        {/* Info Section */}
                        <View style={styles.infoContainer}>
                            <View style={styles.titleRow}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.categoryText}>{product.category}</Text>
                                    <Text style={styles.titleText}>{product.title}</Text>
                                </View>
                                <View style={styles.priceBadge}>
                                    <Text style={styles.priceText}>
                                        ${(Number(product.price) || 0).toLocaleString()}
                                    </Text>
                                </View>
                            </View>

                            {product.location && (
                                <View style={styles.locationContainer}>
                                    <MapPin size={18} color="#2563EB" />
                                    <Text style={styles.locationText}>{product.location}</Text>
                                </View>
                            )}

                            <View style={styles.section}>
                                <Text style={styles.sectionLabel}>Descripción</Text>
                                <Text style={styles.descriptionText}>
                                    {product.description || 'Sin descripción detallada.'}
                                </Text>
                            </View>

                            {/* Delivery Options */}
                            <View style={styles.deliveryContainer}>
                                {product.allows_pickup && (
                                    <View style={styles.deliveryBadge}>
                                        <Home size={16} color="#059669" />
                                        <View style={{ marginLeft: 12 }}>
                                            <Text style={[styles.deliveryLabel, { color: '#065F46' }]}>Retiro Presencial</Text>
                                            <Text style={[styles.deliveryStatus, { color: '#059669' }]}>Disponible</Text>
                                        </View>
                                    </View>
                                )}
                                {product.allows_delivery && (
                                    <View style={[styles.deliveryBadge, { backgroundColor: '#EEF2FF', borderColor: '#C7D2FE' }]}>
                                        <Truck size={16} color="#4F46E5" />
                                        <View style={{ marginLeft: 12 }}>
                                            <Text style={[styles.deliveryLabel, { color: '#3730A3' }]}>Delivery a Domicilio</Text>
                                            <Text style={[styles.deliveryStatus, { color: '#4F46E5' }]}>
                                                {product.delivery_fee && product.delivery_fee > 0
                                                    ? `Costo: $${product.delivery_fee.toLocaleString()}`
                                                    : 'Envío Gratis'}
                                            </Text>
                                        </View>
                                    </View>
                                )}
                                {!product.allows_pickup && !product.allows_delivery && (
                                    <View style={[styles.deliveryBadge, { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' }]}>
                                        <Clock size={16} color="#64748B" />
                                        <View style={{ marginLeft: 12 }}>
                                            <Text style={[styles.deliveryLabel, { color: '#1E293B' }]}>A convenir</Text>
                                            <Text style={[styles.deliveryStatus, { color: '#64748B' }]}>Contactar para coordinar</Text>
                                        </View>
                                    </View>
                                )}
                            </View>

                            {/* Extra Services/Prices if applicable */}
                            {product.extra_services && product.extra_services.length > 0 && (
                                <View style={styles.section}>
                                    <Text style={styles.sectionLabel}>Servicios y Precios</Text>
                                    <View style={styles.servicesCard}>
                                        {product.extra_services.map((service, idx) => (
                                            <View key={idx} style={[styles.serviceRow, idx === product.extra_services!.length - 1 && { borderBottomWidth: 0 }]}>
                                                <Text style={styles.serviceName}>{service.name}</Text>
                                                <Text style={styles.servicePrice}>{service.price}</Text>
                                            </View>
                                        ))}
                                    </View>
                                </View>
                            )}

                            {/* Seller Info */}
                            <View style={styles.sellerRow}>
                                <View style={styles.sellerAvatar}>
                                    <User size={18} color="#64748B" />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.sellerLabel}>Vendedor</Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Text style={styles.sellerName}>{product.seller}</Text>
                                        {product.is_verified && (
                                            <BadgeCheck size={16} color="#8b5cf6" fill="#f5f3ff" style={{ marginLeft: 6 }} />
                                        )}
                                    </View>
                                </View>
                            </View>

                            {/* Reviews */}
                            <ReviewSection productId={product.id} />

                            {/* Action Buttons */}
                            <View style={styles.actionsContainer}>
                                {onInternalChat && (
                                    <TouchableOpacity
                                        onPress={() => onInternalChat(product)}
                                        activeOpacity={0.8}
                                        disabled={userRole === 'vendor'}
                                        style={[
                                            styles.actionBtn,
                                            { backgroundColor: '#4F46E5', shadowColor: '#4F46E5' },
                                            userRole === 'vendor' && styles.btnDisabled
                                        ]}
                                    >
                                        <MessageCircle size={22} color={userRole === 'vendor' ? '#94A3B8' : 'white'} />
                                        <Text style={[styles.actionBtnText, userRole === 'vendor' && { color: '#94A3B8' }]}>
                                            {userRole === 'vendor' ? 'Solo para Vecinos' : 'Chat Vecinal (Privado)'}
                                        </Text>
                                    </TouchableOpacity>
                                )}

                                <TouchableOpacity
                                    onPress={handleWhatsApp}
                                    activeOpacity={0.8}
                                    disabled={userRole === 'vendor'}
                                    style={[
                                        styles.actionBtn,
                                        styles.whatsappBtn,
                                        userRole === 'vendor' && styles.btnDisabled
                                    ]}
                                >
                                    <MessageCircle size={22} color={userRole === 'vendor' ? '#94A3B8' : '#25D366'} />
                                    <Text style={[styles.actionBtnText, { color: userRole === 'vendor' ? '#94A3B8' : '#25D366' }]}>
                                        {userRole === 'vendor' ? 'Solo para Vecinos' : 'WhatsApp Directo'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.7)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: 'white',
        height: '92%',
        borderTopLeftRadius: 50,
        borderTopRightRadius: 50,
        overflow: 'hidden',
    },
    imageSection: {
        position: 'relative',
        height: width, // Square image section
    },
    mainImage: {
        width: width,
        height: width,
    },
    indicatorContainer: {
        position: 'absolute',
        bottom: 24,
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
    },
    indicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.5)',
    },
    indicatorActive: {
        backgroundColor: 'white',
        width: 20,
    },
    modalCloseBtn: {
        position: 'absolute',
        top: 24,
        right: 24,
        width: 48,
        height: 48,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
    },
    ratingBadgeOverlay: {
        position: 'absolute',
        bottom: 24,
        left: 24,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'white',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 3,
    },
    ratingText: {
        color: '#1E293B',
        fontWeight: '900',
        marginLeft: 8,
        fontSize: 14,
    },
    reviewCountText: {
        color: '#94A3B8',
        fontWeight: '700',
        marginLeft: 4,
        fontSize: 12,
    },
    infoContainer: {
        padding: 24,
    },
    titleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 20,
    },
    categoryText: {
        color: '#6366F1',
        fontWeight: '900',
        fontSize: 10,
        textTransform: 'uppercase',
        letterSpacing: 1.5,
        marginBottom: 6,
    },
    titleText: {
        fontSize: 28,
        fontWeight: '900',
        color: '#0F172A',
        lineHeight: 34,
    },
    priceBadge: {
        backgroundColor: '#EEF2FF',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
    },
    priceText: {
        color: '#4F46E5',
        fontWeight: '900',
        fontSize: 20,
    },
    locationContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
        backgroundColor: '#F8FAFC',
        padding: 16,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    locationText: {
        color: '#64748B',
        fontWeight: '700',
        marginLeft: 12,
        fontSize: 14,
    },
    section: {
        marginBottom: 24,
    },
    sectionLabel: {
        color: '#94A3B8',
        fontWeight: '900',
        fontSize: 10,
        textTransform: 'uppercase',
        letterSpacing: 1.5,
        marginBottom: 10,
        paddingLeft: 4,
    },
    descriptionText: {
        color: '#475569',
        fontSize: 16,
        lineHeight: 24,
        fontWeight: '500',
    },
    deliveryContainer: {
        gap: 12,
        marginBottom: 24,
    },
    deliveryBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ECFDF5',
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: '#D1FAE5',
    },
    deliveryLabel: {
        fontWeight: '900',
        fontSize: 10,
        textTransform: 'uppercase',
    },
    deliveryStatus: {
        fontSize: 10,
        fontWeight: '700',
        marginTop: 2,
    },
    servicesCard: {
        backgroundColor: '#F8FAFC',
        borderRadius: 24,
        padding: 16,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    serviceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    serviceName: {
        color: '#1E293B',
        fontWeight: '700',
        fontSize: 14,
    },
    servicePrice: {
        color: '#4F46E5',
        fontWeight: '900',
        fontSize: 14,
    },
    sellerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 32,
        paddingVertical: 16,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: '#F1F5F9',
    },
    sellerAvatar: {
        width: 48,
        height: 48,
        backgroundColor: '#F1F5F9',
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    sellerLabel: {
        color: '#94A3B8',
        fontWeight: '900',
        fontSize: 9,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    sellerName: {
        color: '#0F172A',
        fontWeight: '900',
        fontSize: 15,
    },
    actionsContainer: {
        gap: 12,
        marginTop: 10,
    },
    actionBtn: {
        width: '100%',
        paddingVertical: 20,
        borderRadius: 24,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 15,
        elevation: 5,
    },
    actionBtnText: {
        color: 'white',
        fontWeight: '900',
        fontSize: 16,
    },
    whatsappBtn: {
        backgroundColor: 'transparent',
        borderColor: '#25D366',
        borderWidth: 2,
        shadowOpacity: 0,
        elevation: 0,
    },
    btnDisabled: {
        backgroundColor: '#F1F5F9',
        borderColor: '#E2E8F0',
        shadowOpacity: 0,
    }
});
