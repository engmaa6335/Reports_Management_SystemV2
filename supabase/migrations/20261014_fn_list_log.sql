-- ════════════════════════════════════════════════════════════════
-- RPC: list_notifications_log
-- قراءة سجل التنبيهات مع الفلترة واللقطة
-- ════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION list_notifications_log(
  p_source varchar DEFAULT NULL,
  p_category varchar DEFAULT NULL,
  p_search text DEFAULT NULL,
  p_from timestamptz DEFAULT NULL,
  p_to timestamptz DEFAULT NULL,
  p_limit int DEFAULT 30,
  p_offset int DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  title varchar,
  body text,
  source varchar,
  category varchar,
  priority varchar,
  channel varchar,
  is_important boolean,
  created_at timestamptz,
  sent_at timestamptz,
  created_by uuid,
  created_by_name varchar,
  notification_type_name varchar,
  recipient_count bigint,
  read_count bigint,
  total_count bigint,
  snapshot jsonb,
  intent jsonb
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT current_user_has_role('tech_support') THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED';
  END IF;

  RETURN QUERY
  WITH filtered AS (
    SELECT n.*
    FROM notifications n
    LEFT JOIN notification_types nt ON nt.id = n.notification_type_id
    WHERE (p_source IS NULL OR coalesce(n.data->>'source','automatic') = p_source)
      AND (p_category IS NULL OR coalesce(n.data->>'category', nt.category) = p_category)
      AND (p_from IS NULL OR n.created_at >= p_from)
      AND (p_to IS NULL OR n.created_at <= p_to)
      AND (
        p_search IS NULL OR trim(p_search) = ''
        OR lower(n.title) LIKE '%' || lower(p_search) || '%'
        OR lower(coalesce(n.body,'')) LIKE '%' || lower(p_search) || '%'
      )
  ),
  totals AS (SELECT count(*)::bigint AS c FROM filtered)
  SELECT
    f.id,
    f.title,
    f.body,
    coalesce(f.data->>'source','automatic')::varchar,
    coalesce(f.data->>'category', nt.category)::varchar,
    f.priority::varchar,
    coalesce(f.data->>'channel','internal')::varchar,
    coalesce((f.data->>'is_important')::boolean, false),
    f.created_at,
    f.sent_at,
    f.created_by,
    u.full_name,
    nt.name_ar,
    (SELECT count(*) FROM notification_recipients nr WHERE nr.notification_id = f.id),
    (SELECT count(*) FROM notification_recipients nr WHERE nr.notification_id = f.id AND nr.is_read = true),
    (SELECT c FROM totals),
    f.data->'snapshot',
    f.data->'intent'
  FROM filtered f
  LEFT JOIN notification_types nt ON nt.id = f.notification_type_id
  LEFT JOIN users u ON u.id = f.created_by
  ORDER BY f.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION list_notifications_log(
  varchar, varchar, text, timestamptz, timestamptz, int, int
) TO authenticated;