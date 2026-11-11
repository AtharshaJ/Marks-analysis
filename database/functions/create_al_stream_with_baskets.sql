CREATE OR REPLACE FUNCTION public.create_al_stream_with_baskets(
    p_stream_name VARCHAR(100)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    new_stream_id BIGINT;
    al_group_id BIGINT;
BEGIN
    -- Validate stream name
    IF p_stream_name IS NULL OR TRIM(p_stream_name) = '' THEN
        RAISE EXCEPTION 'Stream name is required.';
    END IF;

    -- Find the A/L subject group
    SELECT id
    INTO al_group_id
    FROM public.subject_groups
    WHERE group_name = 'AL';

    IF al_group_id IS NULL THEN
        RAISE EXCEPTION 'A/L subject group not found.';
    END IF;

    -- Create the stream
    INSERT INTO public.al_streams (stream_name)
    VALUES (TRIM(p_stream_name))
    RETURNING id INTO new_stream_id;

    -- Automatically create exactly three baskets
    INSERT INTO public.subject_baskets (group_id, stream_id, basket_name)
    VALUES
        (al_group_id, new_stream_id, 'Basket 1'),
        (al_group_id, new_stream_id, 'Basket 2'),
        (al_group_id, new_stream_id, 'Basket 3');

    RETURN jsonb_build_object(
        'success', TRUE,
        'stream_id', new_stream_id,
        'stream_name', TRIM(p_stream_name),
        'baskets', jsonb_build_array(
            'Basket 1',
            'Basket 2',
            'Basket 3'
        )
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_al_stream_with_baskets(VARCHAR)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.create_al_stream_with_baskets(VARCHAR)
TO service_role;