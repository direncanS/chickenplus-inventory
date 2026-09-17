export interface AuditDisplayInput {
  action: string;
  entityType: string;
  details?: Record<string, unknown> | null;
}

export interface AuditDisplay {
  label: string;
  description: string;
  tone: 'default' | 'success' | 'warning' | 'danger';
}

function detailString(details: Record<string, unknown> | null | undefined, key: string) {
  const value = details?.[key];
  return typeof value === 'string' && value.trim() ? value : null;
}

export function getAuditDisplay(input: AuditDisplayInput): AuditDisplay {
  const details = input.details ?? {};
  const name = detailString(details, 'name');
  const orderNumber = detailString(details, 'orderNumber');

  switch (input.action) {
    case 'checklist_created':
      return {
        label: 'Kontrollliste erstellt',
        description: 'Eine neue Wochenkontrolle wurde angelegt.',
        tone: 'default',
      };
    case 'checklist_completed':
      return {
        label: 'Kontrollliste abgeschlossen',
        description: 'Die Wochenkontrolle wurde fertiggestellt.',
        tone: 'success',
      };
    case 'checklist_reopened':
      return {
        label: 'Kontrollliste erneut geöffnet',
        description: 'Eine abgeschlossene Kontrollliste wurde wieder geöffnet.',
        tone: 'warning',
      };
    case 'order_created':
    case 'order_auto_created':
      return {
        label: 'Bestellung erstellt',
        description: orderNumber ? `Bestellung ${orderNumber} wurde erstellt.` : 'Eine Bestellung wurde erstellt.',
        tone: 'success',
      };
    case 'order_status_changed':
      return {
        label: 'Bestellstatus geändert',
        description: 'Eine Bestellung wurde aktualisiert.',
        tone: 'default',
      };
    case 'order_delivered':
      return {
        label: 'Lieferung bestätigt',
        description: 'Eine Bestellung wurde als geliefert markiert.',
        tone: 'success',
      };
    case 'supplier_created':
      return {
        label: 'Lieferant erstellt',
        description: name ? `${name} wurde angelegt.` : 'Ein Lieferant wurde angelegt.',
        tone: 'default',
      };
    case 'supplier_deactivated':
      return {
        label: 'Lieferant deaktiviert',
        description: 'Ein Lieferant wurde deaktiviert.',
        tone: 'warning',
      };
    case 'product_created':
      return {
        label: 'Produkt erstellt',
        description: name ? `${name} wurde angelegt.` : 'Ein Produkt wurde angelegt.',
        tone: 'default',
      };
    case 'product_updated':
      return {
        label: 'Produkt aktualisiert',
        description: name ? `${name} wurde aktualisiert.` : 'Ein Produkt wurde aktualisiert.',
        tone: 'default',
      };
    case 'product_activated':
      return {
        label: 'Produkt aktiviert',
        description: 'Ein Produkt wurde wieder aktiviert.',
        tone: 'success',
      };
    case 'product_deactivated':
      return {
        label: 'Produkt deaktiviert',
        description: 'Ein Produkt wurde deaktiviert.',
        tone: 'warning',
      };
    case 'routine_instances_generated':
      return {
        label: 'Routine vorbereitet',
        description: 'Routine-Bestellungen wurden für die Woche vorbereitet.',
        tone: 'default',
      };
    case 'routine_instance_confirmed':
      return {
        label: 'Routine bestätigt',
        description: 'Eine Routine-Bestellung wurde bestätigt.',
        tone: 'success',
      };
    case 'routine_instance_skipped':
      return {
        label: 'Routine übersprungen',
        description: 'Eine Routine-Bestellung wurde übersprungen.',
        tone: 'warning',
      };
    default:
      return {
        label: input.action.replaceAll('_', ' '),
        description: `${input.entityType} wurde aktualisiert.`,
        tone: 'default',
      };
  }
}
