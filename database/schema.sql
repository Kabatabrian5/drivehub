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
