
import { Calendar, Clock, Gift, Hexagon, PartyPopper, Plus, ShoppingBasket, Snowflake, Sparkles, Star, Trash2 } from 'lucide-react-native';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SpecialEvent } from './types';

interface EventsTabProps {
    events: SpecialEvent[];
    handleAddEvent: () => void;
    handleDeleteEvent: (id: string) => void;
    handleToggleEvent: (id: string, active: boolean) => void;
    handleUpdateEventColor: (id: string, color: string) => void;
    handleToggleEventCategory: (id: string, category: string) => void;
    handleUpdateEventDuration: (id: string, hoursToAdd: number) => void;
    handleUpdateEventType: (id: string, event_type: string) => void;
    availableCategories: string[];
}

const EVENT_COLORS = [
    '#EF4444', // Red (Navidad)
    '#8b5cf6', // Violet (Standard)
    '#6366f1', // Indigo (Cyber)
    '#F59E0B', // Amber (Halloween)
    '#10B981', // Emerald (Summer)
    '#e11d48', // Rose (San Valentin)
];

const EVENT_TYPES = [
    { id: 'christmas', label: 'Navidad', icon: 'Snowflake' },
    { id: 'cyber', label: 'Cyber', icon: 'PartyPopper' },
    { id: 'summer', label: 'Verano', icon: 'Sparkles' },
    { id: 'sale', label: 'Oferta', icon: 'ShoppingBasket' },
    { id: 'general', label: 'General', icon: 'Gift' },
];

export const EventsTab: React.FC<EventsTabProps> = ({
    events,
    handleAddEvent,
    handleDeleteEvent,
    handleToggleEvent,
    handleUpdateEventColor,
    handleToggleEventCategory,
    handleUpdateEventDuration,
    handleUpdateEventType,
    availableCategories
}) => {
    return (
        <ScrollView showsVerticalScrollIndicator={false}>
            <View className="flex-row items-center justify-between mb-8">
                <View>
                    <Text className="text-slate-900 font-black text-2xl tracking-tighter">Eventos Especiales</Text>
                    <Text className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Días Especiales y Cyber</Text>
                </View>
                <TouchableOpacity
                    onPress={handleAddEvent}
                    className="bg-brand-600 w-12 h-12 rounded-2xl items-center justify-center shadow-lg shadow-brand-200"
                >
                    <Plus size={24} color="white" />
                </TouchableOpacity>
            </View>

            {events.length === 0 ? (
                <View className="bg-white rounded-[40px] border-2 border-dashed border-slate-100 p-12 items-center">
                    <View className="w-20 h-20 bg-slate-50 rounded-full items-center justify-center mb-4">
                        <Calendar size={40} color="#CBD5E1" />
                    </View>
                    <Text className="text-slate-400 font-bold text-center">No hay eventos programados</Text>
                    <Text className="text-slate-300 text-[10px] uppercase font-black tracking-widest mt-2">Personaliza la app por Navidad o Cyber</Text>
                </View>
            ) : (
                events.map(event => {
                    const isActiveDate = new Date() >= new Date(event.start_date) && new Date() <= new Date(event.end_date);

                    return (
                        <View key={event.id} style={styles.eventCard}>
                            <View className="flex-row justify-between items-start mb-4">
                                <View className="flex-1">
                                    <View className="flex-row items-center mb-1">
                                        <View
                                            style={{ backgroundColor: event.theme_color || '#8b5cf6' }}
                                            className="w-3 h-3 rounded-full mr-2"
                                        />
                                        <Text className="text-slate-900 font-black text-lg">{event.name}</Text>
                                    </View>
                                    <View className="flex-row items-center">
                                        <Calendar size={12} color="#94A3B8" />
                                        <Text className="text-slate-400 text-xs ml-1 font-medium">
                                            {new Date(event.start_date).toLocaleDateString()} - {new Date(event.end_date).toLocaleDateString()}
                                        </Text>
                                    </View>
                                </View>
                                <View className={`px-3 py-1.5 rounded-full ${isActiveDate ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                                    <Text className={`text-[8px] font-black uppercase tracking-widest ${isActiveDate ? 'text-emerald-700' : 'text-slate-400'}`}>
                                        {isActiveDate ? 'Activo Hoy' : 'Programado'}
                                    </Text>
                                </View>
                            </View>

                            <View className="bg-slate-50 p-4 rounded-2xl mb-4">
                                <View className="flex-row justify-around mb-4">
                                    <View className="items-center">
                                        <Hexagon size={16} color={event.theme_color} />
                                        <Text className="text-[10px] font-bold text-slate-500 mt-1 uppercase">Tema</Text>
                                    </View>
                                    <View className="items-center">
                                        <Star size={16} color="#FBBF24" />
                                        <Text className="text-[10px] font-bold text-slate-500 mt-1 uppercase">
                                            {event.highlighted_categories?.length || 0} Categorías
                                        </Text>
                                    </View>
                                </View>

                                <View className="border-t border-slate-100 pt-3">
                                    <Text className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 text-center">Color del Evento</Text>
                                    <View className="flex-row justify-center gap-2">
                                        {EVENT_COLORS.map(color => (
                                            <TouchableOpacity
                                                key={color}
                                                onPress={() => handleUpdateEventColor(event.id, color)}
                                                style={{
                                                    backgroundColor: color,
                                                    width: 32,
                                                    height: 32,
                                                    borderRadius: 10,
                                                    borderWidth: event.theme_color === color ? 3 : 0,
                                                    borderColor: 'rgba(0,0,0,0.1)'
                                                }}
                                                className="items-center justify-center"
                                            >
                                                {event.theme_color === color && (
                                                    <View className="w-1.5 h-1.5 bg-white rounded-full" />
                                                )}
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>

                                <View className="border-t border-slate-100 pt-3 mt-1">
                                    <View className="flex-row items-center justify-center mb-3">
                                        <Hexagon size={10} color="#64748B" />
                                        <Text className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1.5">Atmósfera y Adornos</Text>
                                    </View>
                                    <View className="flex-row justify-center gap-2">
                                        {EVENT_TYPES.map(type => {
                                            const isActive = event.event_type === type.id || (type.id === 'general' && !event.event_type);
                                            const typeIcons: any = { Snowflake, PartyPopper, Sparkles, ShoppingBasket, Gift };
                                            const TypeIcon = typeIcons[type.icon];

                                            return (
                                                <TouchableOpacity
                                                    key={type.id}
                                                    onPress={() => handleUpdateEventType(event.id, type.id)}
                                                    style={{
                                                        backgroundColor: isActive ? event.theme_color : 'white',
                                                        borderColor: isActive ? event.theme_color : '#E2E8F0',
                                                        borderWidth: 1,
                                                        borderRadius: 14,
                                                        paddingHorizontal: 12,
                                                        paddingVertical: 8,
                                                        alignItems: 'center',
                                                        minWidth: 50
                                                    }}
                                                >
                                                    <TypeIcon size={14} color={isActive ? 'white' : '#64748B'} />
                                                    <Text style={{
                                                        color: isActive ? 'white' : '#64748B',
                                                        fontSize: 8,
                                                        fontWeight: '900',
                                                        textTransform: 'uppercase',
                                                        marginTop: 4
                                                    }}>
                                                        {type.label}
                                                    </Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                </View>

                                <View className="border-t border-slate-100 pt-3 mt-1">
                                    <Text className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 text-center">Categorías a Destacar</Text>
                                    <View className="flex-row flex-wrap justify-center gap-2">
                                        {availableCategories.map(cat => {
                                            const isHighlighted = (event.highlighted_categories || []).includes(cat);
                                            return (
                                                <TouchableOpacity
                                                    key={cat}
                                                    onPress={() => handleToggleEventCategory(event.id, cat)}
                                                    style={{
                                                        backgroundColor: isHighlighted ? event.theme_color : 'white',
                                                        borderColor: isHighlighted ? event.theme_color : '#E2E8F0',
                                                        borderWidth: 1,
                                                        borderRadius: 12,
                                                        paddingHorizontal: 10,
                                                        paddingVertical: 6
                                                    }}
                                                >
                                                    <Text style={{
                                                        color: isHighlighted ? 'white' : '#64748B',
                                                        fontSize: 9,
                                                        fontWeight: '900',
                                                        textTransform: 'uppercase'
                                                    }}>
                                                        {cat}
                                                    </Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                </View>

                                <View className="border-t border-slate-100 pt-3 mt-1">
                                    <View className="flex-row items-center justify-center mb-3">
                                        <Clock size={10} color="#64748B" />
                                        <Text className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1.5">Duración del Evento</Text>
                                    </View>
                                    <View className="flex-row justify-center gap-2">
                                        {[
                                            { label: '+1h', val: 1 },
                                            { label: '+6h', val: 6 },
                                            { label: '+1d', val: 24 },
                                            { label: '+3d', val: 72 }
                                        ].map(opt => (
                                            <TouchableOpacity
                                                key={opt.label}
                                                onPress={() => handleUpdateEventDuration(event.id, opt.val)}
                                                className="bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl"
                                            >
                                                <Text className="text-slate-600 font-black text-[9px] uppercase">{opt.label}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                    <Text className="text-center text-slate-400 text-[8px] font-bold mt-2 uppercase">
                                        Termina: {new Date(event.end_date).toLocaleString()}
                                    </Text>
                                </View>
                            </View>

                            <View className="flex-row gap-3">
                                <TouchableOpacity
                                    onPress={() => handleToggleEvent(event.id, !event.is_active)}
                                    className={`flex-1 py-3 rounded-xl items-center justify-center border ${event.is_active ? 'bg-brand-50 border-brand-200' : 'bg-slate-50 border-slate-200'}`}
                                >
                                    <Text className={`text-[10px] font-black uppercase ${event.is_active ? 'text-brand-600' : 'text-slate-400'}`}>
                                        {event.is_active ? 'Desactivar' : 'Activar'}
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => handleDeleteEvent(event.id)}
                                    className="w-12 h-12 bg-red-50 rounded-xl items-center justify-center"
                                >
                                    <Trash2 size={18} color="#EF4444" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    );
                })
            )}

            <View className="mt-8 bg-indigo-50/50 p-6 rounded-[32px] border border-indigo-100">
                <Text className="text-indigo-900 font-black text-sm mb-2">💡 Tip de Administrador</Text>
                <Text className="text-indigo-700 text-xs leading-relaxed">
                    Cuando un evento está **Activo**, el color principal de la aplicación cambiará al color del tema seleccionado. Esto ayuda a destacar fechas importantes para tus vecinos.
                </Text>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    eventCard: {
        backgroundColor: 'white',
        borderRadius: 32,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    }
});
