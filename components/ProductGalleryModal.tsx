import { X } from 'lucide-react-native';
import React, { useState } from 'react';
import { Dimensions, Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ProductGalleryModalProps {
    visible: boolean;
    images: string[];
    onClose: () => void;
    initialIndex?: number;
}

const { width, height } = Dimensions.get('window');

export default function ProductGalleryModal({ visible, images, onClose, initialIndex = 0 }: ProductGalleryModalProps) {
    const insets = useSafeAreaInsets();
    const [activeIndex, setActiveIndex] = useState(initialIndex);

    if (!images || images.length === 0) return null;

    return (
        <Modal visible={visible} transparent={true} animationType="fade">
            <View style={styles.container}>
                {/* Header */}
                <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                    <Text style={styles.countText}>{activeIndex + 1} / {images.length}</Text>
                    <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                        <X size={28} color="white" />
                    </TouchableOpacity>
                </View>

                {/* Main Content */}
                <ScrollView
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    onMomentumScrollEnd={(e) => {
                        const offset = e.nativeEvent.contentOffset.x;
                        const index = Math.round(offset / width);
                        setActiveIndex(index);
                    }}
                    contentOffset={{ x: initialIndex * width, y: 0 }}
                >
                    {images.map((img, index) => (
                        <View key={index} style={styles.slide}>
                            <Image
                                source={{ uri: img }}
                                style={styles.image}
                                resizeMode="contain"
                            />
                        </View>
                    ))}
                </ScrollView>

                {/* Footer / Thumbnails */}
                {images.length > 1 && (
                    <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbScroll}>
                            {images.map((img, index) => (
                                <TouchableOpacity
                                    key={index}
                                    onPress={() => setActiveIndex(index)}
                                    style={[
                                        styles.thumbContainer,
                                        activeIndex === index && styles.thumbActive
                                    ]}
                                >
                                    <Image source={{ uri: img }} style={styles.thumb} />
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                )}
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    header: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    countText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '900',
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 15,
        paddingVertical: 6,
        borderRadius: 20,
        overflow: 'hidden'
    },
    closeBtn: {
        width: 44,
        height: 44,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    slide: {
        width,
        height: height,
        alignItems: 'center',
        justifyContent: 'center',
    },
    image: {
        width: width,
        height: height * 0.7,
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 20,
    },
    thumbScroll: {
        alignItems: 'center',
        gap: 10,
    },
    thumbContainer: {
        width: 60,
        height: 60,
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    thumbActive: {
        borderColor: '#8b5cf6',
    },
    thumb: {
        width: '100%',
        height: '100%',
    }
});
