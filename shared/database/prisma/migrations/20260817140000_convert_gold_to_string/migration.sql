-- Convert PlayerStats.gold from a 32-bit integer to a string, so it can hold a serialized
-- BigNumber ("Layer;Exponent") of arbitrary size instead of being capped at ~2.1 billion.
-- Existing values are preserved as Layer-0 BigNumbers (their numeric value is unchanged).
ALTER TABLE "PlayerStats"
    ALTER COLUMN "gold" DROP DEFAULT,
    ALTER COLUMN "gold" TYPE TEXT USING ('0;' || "gold"::text),
    ALTER COLUMN "gold" SET DEFAULT '0;0';
