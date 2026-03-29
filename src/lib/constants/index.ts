export const STORAGE_LOCATION_CODES = [
  'D',
  'KH',
  'KH-DIYAR',
  'TK',
  'B',
  'M',
  'K',
] as const;

export const UNIT_TYPES = [
  'koli',
  'karton',
  'kiste',
  'pack',
  'stueck',
  'flasche',
  'kg',
  'kuebel',
] as const;

export type UnitType = (typeof UNIT_TYPES)[number];

export const CHECKLIST_STATUSES = ['draft', 'in_progress', 'completed'] as const;
export type ChecklistStatus = (typeof CHECKLIST_STATUSES)[number];

export const ORDER_STATUSES = [
  'draft',
  'ordered',
  'partially_delivered',
  'delivered',
  'cancelled',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const USER_ROLES = ['admin', 'staff'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const OPEN_ORDER_STATUSES: OrderStatus[] = [
  'draft',
  'ordered',
  'partially_delivered',
];

export const AUTOSAVE_DEBOUNCE_MS = 600;

export const MAX_CHECKLISTS_PER_MONTH = 5;

export const TIMEZONE = 'Europe/Vienna';
