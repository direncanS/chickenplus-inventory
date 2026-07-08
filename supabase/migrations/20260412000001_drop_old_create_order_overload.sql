-- Drop the old 4-parameter overload of rpc_create_order_with_items.
-- The 5-parameter version (with p_initial_status DEFAULT 'draft') from
-- migration 20260406000004 covers all use cases.
DROP FUNCTION IF EXISTS rpc_create_order_with_items(UUID, UUID, UUID, JSONB);
