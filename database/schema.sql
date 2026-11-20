CREATE TABLE IF NOT EXISTS vehicles (
    id TEXT PRIMARY KEY,
    make TEXT NOT NULL,
    model TEXT NOT NULL,
    year SMALLINT NOT NULL CHECK (year BETWEEN 1950 AND 2100),
    price NUMERIC(14, 2) NOT NULL CHECK (price > 0),
    mileage INTEGER NOT NULL DEFAULT 0 CHECK (mileage >= 0),
    engine TEXT NOT NULL DEFAULT '',
    fuel TEXT NOT NULL DEFAULT '',
    transmission TEXT NOT NULL DEFAULT '',
    condition TEXT NOT NULL DEFAULT '',
    location TEXT NOT NULL DEFAULT 'Kenya',
    description TEXT NOT NULL DEFAULT '',
    images JSONB NOT NULL DEFAULT '[]'::jsonb
        CHECK (jsonb_typeof(images) = 'array'),
    tiktok_url TEXT,
    phone TEXT,
    dealer_id TEXT,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'available', 'rejected', 'sold')),
    featured BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS vehicles_public_created_idx
    ON vehicles (status, created_at DESC);

CREATE INDEX IF NOT EXISTS vehicles_make_model_idx
    ON vehicles (LOWER(make), LOWER(model));

CREATE TABLE IF NOT EXISTS drivehub_admins (
    user_id TEXT PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivehub_admins ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_drivehub_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.drivehub_admins
        WHERE user_id = auth.user_id()
    );
$$;

REVOKE ALL ON TABLE drivehub_admins FROM PUBLIC, anonymous, authenticated;
REVOKE ALL ON FUNCTION public.is_drivehub_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_drivehub_admin() TO authenticated;

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE vehicles TO authenticated;

DROP POLICY IF EXISTS vehicles_admin_select ON vehicles;
DROP POLICY IF EXISTS vehicles_admin_insert ON vehicles;
DROP POLICY IF EXISTS vehicles_admin_update ON vehicles;
DROP POLICY IF EXISTS vehicles_admin_delete ON vehicles;

CREATE POLICY vehicles_admin_select ON vehicles
    FOR SELECT TO authenticated
    USING (public.is_drivehub_admin());

CREATE POLICY vehicles_admin_insert ON vehicles
    FOR INSERT TO authenticated
    WITH CHECK (public.is_drivehub_admin());

CREATE POLICY vehicles_admin_update ON vehicles
    FOR UPDATE TO authenticated
    USING (public.is_drivehub_admin())
    WITH CHECK (public.is_drivehub_admin());

CREATE POLICY vehicles_admin_delete ON vehicles
    FOR DELETE TO authenticated
    USING (public.is_drivehub_admin());
