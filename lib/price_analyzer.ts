/**
 * Utilidad para detectar precios anómalos o sospechosos según la categoría del producto.
 * Ayuda a prevenir errores de digitación o intentos de estafa.
 */

interface PriceRule {
    maxPrice: number;
    reason: string;
}

const CATEGORY_RULES: Record<string, PriceRule> = {
    'Comida': { maxPrice: 100000, reason: 'Precio inusualmente alto para comida' },
    'Almacén': { maxPrice: 50000, reason: 'Precio superior al promedio de abarrotes' },
    'Servicios': { maxPrice: 500000, reason: 'Servicio con costo elevado - requiere revisión' },
    'Tecnología': { maxPrice: 5000000, reason: 'Producto de alta gama - verificar autenticidad' },
    'Otros': { maxPrice: 1000000, reason: 'Precio fuera de rango estándar' },
};

export interface PriceAnomaly {
    isAnomaly: boolean;
    reason?: string;
    severity: 'low' | 'medium' | 'high';
}

export function detectPriceAnomaly(price: number, category: string): PriceAnomaly {
    const rule = CATEGORY_RULES[category] || CATEGORY_RULES['Otros'];

    if (price <= 0) {
        return { isAnomaly: true, reason: 'Precio no puede ser cero o negativo', severity: 'high' };
    }

    if (price > rule.maxPrice) {
        // Si el precio supera por mucho el máximo (ej. 5 veces más), la severidad es alta
        const severity = price > (rule.maxPrice * 5) ? 'high' : 'medium';
        return { isAnomaly: true, reason: rule.reason, severity };
    }

    return { isAnomaly: false, severity: 'low' };
}
