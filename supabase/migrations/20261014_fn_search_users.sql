-- ════════════════════════════════════════════════════════════════
-- RPC: search_users_for_notification
-- بحث مقيّد بنطاق صلاحية المرسل — Outlook-like
-- ════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION search_users_for_notification(
  p_query text,
  p_limit int DEFAULT 20,
  p_offset int DEFAULT 0
)
RETURNS TABLE (
  user_id uuid,
  full_name varchar,
  email varchar,
  username varchar,
  entity_names text,
  is_active boolean,
  is_in_scope boolean,
  total_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := get_current_user_id();
  v_is_tech boolean := current_user_has_role('tech_support');
  v_q text := lower(trim(coalesce(p_query, '')));
BEGIN
  -- الحد الأدنى لحرفين
  IF length(v_q) < 2 THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH scoped AS (
    SELECT u.id, u.full_name, u.email, u.username, u.is_active
    FROM users u
    WHERE coalesce(u.is_active, false) = true
      AND (
        lower(u.full_name) LIKE '%' || v_q || '%'
        OR lower(u.email)    LIKE '%' || v_q || '%'
        OR lower(u.username) LIKE '%' || v_q || '%'
      )
      AND (
        v_is_tech
        OR EXISTS (
          SELECT 1
          FROM user_entity_roles uer_target
          WHERE uer_target.user_id = u.id
            AND uer_target.ended_at IS NULL
            AND uer_target.entity_id IN (
              SELECT uer_self.entity_id
              FROM user_entity_roles uer_self
              WHERE uer_self.user_id = v_user_id
                AND uer_self.ended_at IS NULL
            )
        )
      )
  ),
  total AS (SELECT count(*)::bigint AS c FROM scoped)
  SELECT
    s.id,
    s.full_name,
    s.email,
    s.username,
    (SELECT string_agg(DISTINCT e.name_ar, '، ')
     FROM user_entity_roles uer
     JOIN entities e ON e.id = uer.entity_id
     WHERE uer.user_id = s.id AND uer.ended_at IS NULL),
    coalesce(s.is_active, false),
    true,
    (SELECT c FROM total)
  FROM scoped s
  ORDER BY
    CASE
      WHEN lower(s.full_name) = v_q THEN 0
      WHEN lower(s.email) = v_q THEN 0
      WHEN lower(s.username) = v_q THEN 0
      WHEN lower(s.full_name) LIKE v_q || '%' THEN 1
      WHEN lower(s.email) LIKE v_q || '%' THEN 1
      ELSE 2
    END,
    s.full_name
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION search_users_for_notification(text, int, int) TO authenticated;