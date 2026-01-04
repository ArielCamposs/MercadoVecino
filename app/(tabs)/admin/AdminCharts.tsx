
import React from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';

interface ChartData {
    label: string;
    value: number;
    color: string;
}

interface AdminChartsProps {
    data: ChartData[];
    title: string;
    description?: string;
}

const { width } = Dimensions.get('window');

export const AdminCharts: React.FC<AdminChartsProps> = ({ data, title, description }) => {
    const maxValue = Math.max(...data.map(d => d.value), 1);

    return (
        <View style={styles.container}>
            <View className="mb-4">
                <Text className="text-slate-900 font-black text-lg">{title}</Text>
                {description && <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">{description}</Text>}
            </View>

            <View style={styles.chartArea}>
                {data.map((item, index) => (
                    <View key={index} style={styles.barContainer}>
                        <View style={styles.barBackground}>
                            <View
                                style={[
                                    styles.barFill,
                                    {
                                        height: `${(item.value / maxValue) * 100}%`,
                                        backgroundColor: item.color
                                    }
                                ]}
                            />
                        </View>
                        <Text numberOfLines={1} style={styles.label}>{item.label}</Text>
                        <Text style={styles.value}>{item.value.toFixed(0)}</Text>
                    </View>
                ))}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'white',
        borderRadius: 32,
        padding: 24,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 2,
    },
    chartArea: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        height: 160,
        paddingTop: 20,
    },
    barContainer: {
        alignItems: 'center',
        flex: 1,
    },
    barBackground: {
        width: 12,
        height: '100%',
        backgroundColor: '#F8FAFC',
        borderRadius: 6,
        overflow: 'hidden',
        justifyContent: 'flex-end',
        marginBottom: 8,
    },
    barFill: {
        width: '100%',
        borderRadius: 6,
    },
    label: {
        fontSize: 8,
        fontWeight: 'bold',
        color: '#94A3B8',
        textTransform: 'uppercase',
        marginTop: 4,
    },
    value: {
        fontSize: 10,
        fontWeight: '900',
        color: '#1E293B',
        marginTop: 2,
    }
});
