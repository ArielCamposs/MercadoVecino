import { supabase } from './supabase';

export type AdminAction =
    | 'ban_user'
    | 'unban_user'
    | 'verify_vendor'
    | 'unverify_vendor'
    | 'delete_product'
    | 'delete_user'
    | 'toggle_maintenance'
    | 'broadcast_announcement'
    | 'add_category'
    | 'delete_category'
    | 'resolve_report'
    | 'toggle_featured'
    | 'delete_banner'
    | 'create_banner'
    | 'reply_ticket'
    | 'warn_user'
    | 'update_config'
    | 'approve_product'
    | 'reject_product'
    | 'intervene_transaction'
    | 'create_event'
    | 'delete_event'
    | 'activate_event'
    | 'deactivate_event';

export const logAdminAction = async (
    action: AdminAction,
    targetId?: string,
    targetType?: 'user' | 'product' | 'banner' | 'category' | 'report' | 'system' | 'support' | 'event',
    details?: any
) => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase
            .from('admin_audit_logs')
            .insert({
                admin_id: user.id,
                action,
                target_id: targetId,
                target_type: targetType,
                details,
            });

        if (error) {
            console.error('[AdminLogger] Error al registrar acción:', error);
        }
    } catch (err) {
        console.error('[AdminLogger] Error inesperado:', err);
    }
};
