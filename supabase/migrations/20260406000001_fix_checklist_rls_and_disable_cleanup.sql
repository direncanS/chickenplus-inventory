-- Fix checklist completion for staff and disable destructive monthly cleanup.

DROP POLICY IF EXISTS checklists_update ON checklists;

CREATE POLICY checklists_update ON checklists
  FOR UPDATE TO authenticated
  USING (
    status != 'completed'
    OR get_user_role() = 'admin'
  )
  WITH CHECK (
    get_user_role() = 'admin'
    OR (
      status IN ('draft', 'in_progress')
      AND completed_by IS NULL
    )
    OR (
      status = 'completed'
      AND completed_by = auth.uid()
    )
  );

DROP FUNCTION IF EXISTS rpc_cleanup_previous_months(DATE);
