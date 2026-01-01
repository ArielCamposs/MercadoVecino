import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, View } from 'react-native';

const { width } = Dimensions.get('window');

export default function SkeletonProductCard() {
    const pulseAnim = useRef(new Animated.Value(0)).current;
    const floatAnim = useRef(new Animated.Value(0)).current;
    const scanAnim = useRef(new Animated.Value(-1)).current;

    useEffect(() => {
        // Pulse: Alternates between very light Indigo and very light Rose
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1, duration: 2500, useNativeDriver: false }),
                Animated.timing(pulseAnim, { toValue: 0, duration: 2500, useNativeDriver: false }),
            ])
        ).start();

        // Floating: Subtle vertical movement
        Animated.loop(
            Animated.sequence([
                Animated.timing(floatAnim, { toValue: -8, duration: 2000, useNativeDriver: true }),
                Animated.timing(floatAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
            ])
        ).start();

        // Scanning Beam: Light beam crossing the cards
        Animated.loop(
            Animated.timing(scanAnim, { toValue: 2, duration: 2000, useNativeDriver: true })
        ).start();
    }, []);

    const bgColor = pulseAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['#F5F7FF', '#FFF5F6'], // Ultra light Indigo to Rose
    });

    const scanTranslate = scanAnim.interpolate({
        inputRange: [-1, 2],
        outputRange: [-width * 0.5, width * 0.5],
    });

    return (
        <Animated.View
            className="bg-white rounded-[40px] overflow-hidden mb-6 border border-slate-50 shadow-sm"
            style={{
                width: '47%',
                marginHorizontal: '1.5%',
                transform: [{ translateY: floatAnim }]
            }}
        >
            {/* Container for the scanning beam */}
            <View className="relative w-full aspect-[4/5] overflow-hidden">
                <Animated.View style={{ backgroundColor: bgColor }} className="w-full h-full" />

                {/* The Scanning Beam (Glass effect) */}
                <Animated.View
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: '25%',
                        width: '20%',
                        height: '100%',
                        backgroundColor: 'rgba(255,255,255,0.6)',
                        transform: [
                            { translateX: scanTranslate },
                            { skewX: '-25deg' }
                        ],
                    }}
                />
            </View>

            <View className="p-5">
                {/* Skeleton items with interpolated background */}
                <Animated.View style={{ backgroundColor: bgColor }} className="w-16 h-2 rounded-full mb-3" />
                <Animated.View style={{ backgroundColor: bgColor }} className="w-full h-4 rounded-full mb-4" />

                <View className="flex-row items-center justify-between mb-4">
                    <Animated.View style={{ backgroundColor: bgColor }} className="w-20 h-7 rounded-full" />
                    <Animated.View style={{ backgroundColor: bgColor }} className="w-10 h-10 rounded-2xl" />
                </View>

                <View className="flex-row items-center pt-4 border-t border-slate-50">
                    <Animated.View style={{ backgroundColor: bgColor }} className="w-7 h-7 rounded-xl mr-2" />
                    <Animated.View style={{ backgroundColor: bgColor }} className="flex-1 h-3 rounded-full" />
                </View>
            </View>
        </Animated.View>
    );
}
