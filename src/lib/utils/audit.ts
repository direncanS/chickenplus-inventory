import { createAdminClient } from '@/lib/supabase/admin';
import { logger } from '@/lib/utils/logger';

type AuditAction =
  | 'checklist_created'
  | 'checklist_completed'
  | 'checklist_exported'
  | 'checklist_reopened'
  | 'admin_bootstrapped'
  | 'order_created'
  | 'order_auto_created'
  | 'order_status_changed'
  | 'order_delivered'
  | 'supplier_created'
  | 'supplier_deactivated'
  | 'data_cleanup';

interface AuditEntry {
  userId: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  details?: Record<string, unknown>;
}

export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from('audit_log').insert({
      user_id: entry.userId,
      action: entry.action,
      entity_type: entry.entityType,
      entity_id: entry.entityId,
      details: entry.details ?? {},
    });

    if (error) {
      logger.error('Audit log write failed', {
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        error: error.message,
      });
    }
  } catch (err) {
    logger.error('Audit log write exception', {
      action: entry.action,
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
}
