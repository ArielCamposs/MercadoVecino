
export interface Profile {
    id: string;
    full_name: string | null;
    role: string | null;
    is_verified: boolean;
    last_seen: string | null;
    created_at: string;
    banned_until?: string | null;
    ban_reason?: string | null;
    warning_count?: number;
    last_device_id?: string | null;
}

export interface Product {
    id: string;
    title: string;
    price: number;
    user_id?: string;
    category?: string | null;
    view_count?: number;
    created_at?: string;
    status?: string;
    image_url?: string | null;
    seller_name?: string;
    profiles?: { full_name: string | null };
    is_featured?: boolean;
    is_schema_error?: boolean;
    description?: string;
    location?: string;
    whatsapp_number?: string;
}

export interface Review {
    id: string;
    comment: string;
    rating: number;
    user_id: string;
    product_id: string;
    created_at: string;
    profiles?: { full_name: string | null };
    products?: { title: string };
}

export interface Banner {
    id: string;
    image_url: string;
    title: string | null;
    description: string | null;
    link_route: string | null;
    created_at: string;
    is_active?: boolean;
}

export interface Contact {
    id: string;
    user_id: string;
    merchant_id: string;
    product_id: string;
    status: string;
    created_at: string;
    products?: { title: string; price: number };
    buyer?: { full_name: string | null };
    merchant?: { full_name: string | null };
}

export interface AuditLog {
    id: string;
    admin_id: string;
    action: string;
    target_id: string | null;
    target_type: string | null;
    details: unknown;
    created_at: string;
    profiles?: { full_name: string | null };
}

export interface Report {
    id: string;
    product_id: string;
    reporter_id: string;
    reason: string;
    details?: string;
    status: string;
    created_at: string;
    products?: { title: string };
    profiles?: { full_name: string | null };
}

export interface AppConfig {
    key: string;
    value: any;
}

export interface ActivityLogItem {
    id: string;
    created_at: string;
    type: 'user' | 'product' | 'review';
    icon: string;
    full_name?: string;
    title?: string;
    comment?: string;
}

export interface MerchantPerformance {
    id: string;
    full_name: string | null;
    is_verified: boolean;
    totalContacts: number;
    confirmedSales: number;
    conversion: number;
    rating: number;
    reports: number;
}

export interface SpecialEvent {
    id: string;
    name: string;
    start_date: string;
    end_date: string;
    theme_color: string;
    is_active: boolean;
    highlighted_categories: string[];
    event_type?: string;
    created_at: string;
}
