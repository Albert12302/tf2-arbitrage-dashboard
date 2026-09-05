-- ============================================================================
-- TF2 Market Arbitrage Dashboard — Database Schema
-- Target: Supabase or Neon (Postgres 14+)
--
-- Design notes:
--   - The ingestion worker normalizes ALL prices to a "metal" (refined metal)
--     equivalent before writing here. Backpack.tf prices are natively a mix
--     of "keys" and "metal"; doing that conversion in the worker (where you
--     have the current key exchange rate in memory) keeps this table simple
--     and keeps SQL free of currency-conversion logic.
--   - item_sku is a single deterministic string that uniquely identifies a
--     specific TF2 item "flavor" (name + quality + killstreak tier +
--     australium + particle effect). The worker is responsible for building
--     this key consistently — see shared/types.ts for the shape it's built from.
--   - Only ONE row exists per item_sku. The worker UPSERTs into this row
--     ONLY when it detects highest_buy_metal > lowest_sell_metal for that
--     sku (per the write-throttling guardrail) — this table is a live
--     snapshot of *currently profitable* arbitrage windows, not a full
--     history of every listing event.
-- ============================================================================

CREATE TABLE IF NOT EXISTS deals (
    id                      BIGSERIAL PRIMARY KEY,

    -- Deterministic identity for this exact item variant
    item_sku                TEXT NOT NULL UNIQUE,
    item_name               TEXT NOT NULL,
    quality                 SMALLINT NOT NULL,           -- backpack.tf numeric quality id
    quality_name            TEXT NOT NULL,               -- e.g. "Unusual", "Strange"
    is_australium           BOOLEAN NOT NULL DEFAULT false,
    killstreak_tier         SMALLINT NOT NULL DEFAULT 0, -- 0=none, 1=basic, 2=specialized, 3=professional
    particle_effect         TEXT,                        -- unusual effect name, nullable

    -- The winning bid (buy order) side of the arbitrage
    highest_buy_metal        NUMERIC(12,2) NOT NULL,
    highest_buy_listing_id   TEXT NOT NULL,
    highest_buy_steamid      TEXT,

    -- The winning ask (sell order) side of the arbitrage
    lowest_sell_metal        NUMERIC(12,2) NOT NULL,
    lowest_sell_listing_id   TEXT NOT NULL,
    lowest_sell_steamid      TEXT,

    -- Derived profitability (generated, always in sync — never written directly)
    profit_margin_metal      NUMERIC(12,2) GENERATED ALWAYS AS
                                (highest_buy_metal - lowest_sell_metal) STORED,
    profit_margin_pct        NUMERIC(6,2) GENERATED ALWAYS AS
                                (CASE
                                    WHEN lowest_sell_metal > 0
                                    THEN ROUND(((highest_buy_metal - lowest_sell_metal)
                                                / lowest_sell_metal) * 100, 2)
                                    ELSE 0
                                 END) STORED,

    last_seen_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT chk_profitable CHECK (highest_buy_metal > lowest_sell_metal)
);

-- Fast "top opportunities" queries for the dashboard's main table view
CREATE INDEX IF NOT EXISTS idx_deals_profit_desc
    ON deals (profit_margin_metal DESC);

-- Fast "most recently detected" queries / freshness filtering
CREATE INDEX IF NOT EXISTS idx_deals_last_seen_desc
    ON deals (last_seen_at DESC);

-- ----------------------------------------------------------------------------
-- Auto-touch last_seen_at whenever the worker upserts an existing row
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION touch_last_seen_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_seen_at := now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_touch_last_seen_at ON deals;
CREATE TRIGGER trg_touch_last_seen_at
    BEFORE UPDATE ON deals
    FOR EACH ROW
    EXECUTE FUNCTION touch_last_seen_at();

-- ----------------------------------------------------------------------------
-- Example UPSERT the worker will run on each qualifying event
-- (bid > ask, per the write-throttling guardrail):
--
-- INSERT INTO deals (
--     item_sku, item_name, quality, quality_name, is_australium,
--     killstreak_tier, particle_effect,
--     highest_buy_metal, highest_buy_listing_id, highest_buy_steamid,
--     lowest_sell_metal, lowest_sell_listing_id, lowest_sell_steamid
-- ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
-- ON CONFLICT (item_sku) DO UPDATE SET
--     highest_buy_metal = EXCLUDED.highest_buy_metal,
--     highest_buy_listing_id = EXCLUDED.highest_buy_listing_id,
--     highest_buy_steamid = EXCLUDED.highest_buy_steamid,
--     lowest_sell_metal = EXCLUDED.lowest_sell_metal,
--     lowest_sell_listing_id = EXCLUDED.lowest_sell_listing_id,
--     lowest_sell_steamid = EXCLUDED.lowest_sell_steamid;
--
-- If a sku stops being profitable (bid <= ask), the worker should DELETE
-- the row rather than write it (see shared/types.ts ArbitrageOpportunity
-- comments) — this keeps the table an accurate live snapshot.
-- ----------------------------------------------------------------------------
