-- ════════════════════════════════════════════════════════════════
-- RPC: get_notification_detail
-- ════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_notification_detail(p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT current_user_has_role('tech_support') THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED';
  END IF;

  SELECT jsonb_build_object(
    'notification', jsonb_build_object(
      'id', n.id,
      'title', n.title,
      'body', n.body,
      'priority', n.priority,
      'created_at', n.created_at,
      'sent_at', n.sent_at,
      'created_by', n.created_by,
      'created_by_name', u.full_name,
      'source', coalesce(n.data->>'source','automatic'),
      'category', coalesce(n.data->>'category', nt.category),
      'channel', coalesce(n.data->>'channel','internal'),
      'is_important', coalesce((n.data->>'is_important')::boolean, false),
      'intent', n.data->'intent',
      'snapshot', n.data->'snapshot',
      'idempotency_key', n.data->>'idempotency_key'
    ),
    'recipients', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'recipient_id', nr.id,
        'user_id', nr.user_id,
        'full_name', ru.full_name,
        'email', ru.email,
        'username', ru.username,
        'is_read', nr.is_read,
        'read_at', nr.read_at,
        'delivery_status', nr.delivery_status,
        'delivered_at', nr.delivered_at,
        'error_message', nr.error_message
      ) ORDER BY ru.full_name)
      FROM notification_recipients nr
      JOIN users ru ON ru.id = nr.user_id
      WHERE nr.notification_id = n.id
    ), '[]'::jsonb)
  )
  INTO v_result
  FROM notifications n
  LEFT JOIN notification_types nt ON nt.id = n.notification_type_id
  LEFT JOIN users u ON u.id = n.created_by
  WHERE n.id = p_id;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_notification_detail(uuid) TO authenticated;