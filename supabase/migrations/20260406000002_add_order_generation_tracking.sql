ALTER TABLE checklists
ADD COLUMN IF NOT EXISTS order_generation_status TEXT NOT NULL DEFAULT 'idle'
  CHECK (order_generation_status IN ('idle', 'pending', 'running', 'completed', 'failed')),
ADD COLUMN IF NOT EXISTS order_generation_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS order_generation_finished_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS order_generation_orders_created INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS order_generation_error TEXT;
