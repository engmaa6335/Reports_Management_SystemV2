-- ════════════════════════════════════════════════════════════════
-- RPC: send_manual_notification (نسخة مُصحَّحة)
-- تعمل مع compute_notification_recipients ذي الأعمدة out_*
-- ════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS send_manual_notification(
  varchar, text, varchar, varchar, boolean, jsonb, varchar, varchar
);

CREATE OR REPLACE FUNCTION send_manual_notification(
  p_title varchar,
  p_body text,
  p_channel varchar,
  p_priority varchar,
  p_is_important boolean,
  p_intent jsonb,
  p_idempotency_key varchar,
  p_category varchar DEFAULT 'custom'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := get_current_user_id();
  v_notification_id uuid;
  v_type_id uuid;
  v_rec record;
  v_snapshot jsonb := '[]'::jsonb;
  v_count int := 0;
  v_existing_id uuid;
  v_started_at timestamptz := clock_timestamp();
BEGIN
  -- 1) التحقق من الصلاحية
  IF NOT current_user_has_role('tech_support') THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED: فقط الدعم الفني يمكنه إرسال تنبيهات مخصصة';
  END IF;

  -- 2) التحقق من المدخلات
  IF p_title IS NULL OR trim(p_title) = '' THEN
    RAISE EXCEPTION 'INVALID_INPUT: العنوان مطلوب';
  END IF;
  IF length(p_title) > 100 THEN
    RAISE EXCEPTION 'INVALID_INPUT: العنوان يتجاوز 100 حرف';
  END IF;
  IF p_body IS NULL OR trim(p_body) = '' THEN
    RAISE EXCEPTION 'INVALID_INPUT: نص الرسالة مطلوب';
  END IF;
  IF p_channel NOT IN ('internal','email','both') THEN
    RAISE EXCEPTION 'INVALID_INPUT: قناة غير صحيحة';
  END IF;
  IF p_idempotency_key IS NULL OR trim(p_idempotency_key) = '' THEN
    RAISE EXCEPTION 'INVALID_INPUT: مفتاح منع التكرار مطلوب';
  END IF;

  -- 3) منع التكرار (idempotency)
  SELECT id INTO v_existing_id
  FROM notifications
  WHERE data->>'idempotency_key' = p_idempotency_key
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'status', 'duplicate',
      'notification_id', v_existing_id,
      'message', 'تم إرسال هذا التنبيه مسبقًا'
    );
  END IF;

  -- 4) تحديد نوع التنبيه
  SELECT id INTO v_type_id
  FROM notification_types
  WHERE coalesce(is_active, true) = true
  ORDER BY created_at
  LIMIT 1;

  IF v_type_id IS NULL THEN
    RAISE EXCEPTION 'CONFIG_ERROR: لا يوجد notification_type نشط';
  END IF;

  -- 5) إدراج التنبيه الرئيسي
  INSERT INTO notifications (
    notification_type_id,
    title,
    body,
    data,
    priority,
    created_by,
    sent_at,
    created_at
  ) VALUES (
    v_type_id,
    p_title,
    p_body,
    jsonb_build_object(
      'source', 'manual',
      'category', coalesce(p_category, 'custom'),
      'channel', p_channel,
      'is_important', p_is_important,
      'intent', p_intent,
      'idempotency_key', p_idempotency_key
    ),
    p_priority,
    v_user_id,
    now(),
    now()
  ) RETURNING id INTO v_notification_id;

  -- 6) إدراج المستلمين المحسوبين
  FOR v_rec IN
    SELECT * FROM compute_notification_recipients(p_intent, v_user_id)
  LOOP
    INSERT INTO notification_recipients (
      notification_id,
      user_id,
      channel,
      delivery_status,
      delivered_at,
      created_at
    ) VALUES (
      v_notification_id,
      v_rec.out_user_id,
      p_channel,
      'sent',
      now(),
      now()
    );

    v_snapshot := v_snapshot || jsonb_build_object(
      'user_id',  v_rec.out_user_id,
      'name',     v_rec.out_full_name,
      'email',    v_rec.out_email,
      'username', v_rec.out_username,
      'sources',  v_rec.out_sources
    );

    v_count := v_count + 1;
  END LOOP;

  -- 7) إذا لم يوجد مستلمون
  IF v_count = 0 THEN
    UPDATE notifications
    SET data = jsonb_set(data, '{snapshot}', '[]'::jsonb)
    WHERE id = v_notification_id;

    RAISE EXCEPTION 'NO_RECIPIENTS: لا يوجد مستلمون بعد تطبيق الاستثناءات';
  END IF;

  -- 8) تحديث data.snapshot
  UPDATE notifications
  SET data = jsonb_set(data, '{snapshot}', v_snapshot)
  WHERE id = v_notification_id;

  -- 9) سجل التدقيق
  INSERT INTO audit_log (
    user_id,
    action,
    resource_type,
    resource_id,
    changes,
    created_at
  ) VALUES (
    v_user_id,
    'send_manual_notification',
    'notifications',
    v_notification_id,
    jsonb_build_object(
      'title', p_title,
      'channel', p_channel,
      'recipient_count', v_count,
      'intent', p_intent,
      'duration_ms', extract(epoch from (clock_timestamp() - v_started_at)) * 1000
    ),
    now()
  );

  RETURN jsonb_build_object(
    'status', 'ok',
    'notification_id', v_notification_id,
    'recipient_count', v_count
  );
END;
$$;

GRANT EXECUTE ON FUNCTION send_manual_notification(
  varchar, text, varchar, varchar, boolean, jsonb, varchar, varchar
) TO authenticated;