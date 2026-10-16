-- ════════════════════════════════════════════════════════════════
-- RPC: compute_notification_recipients (نسخة مُصحَّحة)
-- الدالة المرجعية لحساب المستلمين — لا تُخزّن أي شيء
-- ════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS compute_notification_recipients(jsonb, uuid);

CREATE OR REPLACE FUNCTION compute_notification_recipients(
  p_intent jsonb,
  p_scope_user_id uuid
)
RETURNS TABLE (
  out_user_id uuid,
  out_full_name varchar,
  out_email varchar,
  out_username varchar,
  out_sources jsonb,
  out_source_labels text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entity_ids uuid[];
  v_role_ids uuid[];
  v_manual_ids uuid[];
  v_excluded_ids uuid[];
BEGIN
  v_entity_ids := ARRAY(
    SELECT (jsonb_array_elements_text(coalesce(p_intent->'entity_ids','[]'::jsonb)))::uuid
  );
  v_role_ids := ARRAY(
    SELECT (jsonb_array_elements_text(coalesce(p_intent->'role_ids','[]'::jsonb)))::uuid
  );
  v_manual_ids := ARRAY(
    SELECT (jsonb_array_elements_text(coalesce(p_intent->'manual_user_ids','[]'::jsonb)))::uuid
  );
  v_excluded_ids := ARRAY(
    SELECT (jsonb_array_elements_text(coalesce(p_intent->'excluded_user_ids','[]'::jsonb)))::uuid
  );

  RETURN QUERY
  WITH scope_allowed AS (
    SELECT u.id AS allowed_id
    FROM users u
    WHERE coalesce(u.is_active, false) = true
      AND (
        p_scope_user_id IS NULL
        OR current_user_has_role('tech_support')
        OR EXISTS (
          SELECT 1
          FROM user_entity_roles uer_target
          WHERE uer_target.user_id = u.id
            AND uer_target.ended_at IS NULL
            AND uer_target.entity_id IN (
              SELECT uer_self.entity_id
              FROM user_entity_roles uer_self
              WHERE uer_self.user_id = p_scope_user_id
                AND uer_self.ended_at IS NULL
            )
        )
      )
  ),
  from_entities AS (
    SELECT
      uer.user_id AS src_user_id,
      jsonb_build_object(
        'type', 'entity',
        'id', e.id,
        'label', e.name_ar
      ) AS src_source
    FROM user_entity_roles uer
    JOIN entities e ON e.id = uer.entity_id
    WHERE uer.entity_id = ANY(v_entity_ids)
      AND uer.ended_at IS NULL
      AND uer.user_id IN (SELECT allowed_id FROM scope_allowed)
      AND NOT (
        (p_intent->'entity_exclusions') ? uer.entity_id::text
        AND (p_intent->'entity_exclusions'->uer.entity_id::text)
              ? uer.user_id::text
      )
  ),
  from_roles AS (
    SELECT
      uer.user_id AS src_user_id,
      jsonb_build_object(
        'type', 'role',
        'id', r.id,
        'label', r.name_ar
      ) AS src_source
    FROM user_entity_roles uer
    JOIN roles r ON r.id = uer.role_id
    WHERE uer.role_id = ANY(v_role_ids)
      AND uer.ended_at IS NULL
      AND uer.user_id IN (SELECT allowed_id FROM scope_allowed)
  ),
  from_manual AS (
    SELECT
      unnest(v_manual_ids) AS src_user_id,
      jsonb_build_object(
        'type', 'manual',
        'id', NULL,
        'label', 'إضافة يدوية'
      ) AS src_source
  ),
  combined AS (
    SELECT src_user_id, src_source FROM from_entities
    UNION ALL SELECT src_user_id, src_source FROM from_roles
    UNION ALL SELECT src_user_id, src_source FROM from_manual
  ),
  filtered AS (
    SELECT c.src_user_id, c.src_source
    FROM combined c
    WHERE NOT (c.src_user_id = ANY(coalesce(v_excluded_ids, ARRAY[]::uuid[])))
  ),
  aggregated AS (
    SELECT
      f.src_user_id AS agg_user_id,
      jsonb_agg(DISTINCT f.src_source) AS agg_sources
    FROM filtered f
    GROUP BY f.src_user_id
  )
  SELECT
    a.agg_user_id,
    u.full_name,
    u.email,
    u.username,
    a.agg_sources,
    (
      SELECT string_agg(DISTINCT (s->>'label'), ' + ')
      FROM jsonb_array_elements(a.agg_sources) s
    )
  FROM aggregated a
  JOIN users u ON u.id = a.agg_user_id
  ORDER BY u.full_name;
END;
$$;

GRANT EXECUTE ON FUNCTION compute_notification_recipients(jsonb, uuid) TO authenticated;