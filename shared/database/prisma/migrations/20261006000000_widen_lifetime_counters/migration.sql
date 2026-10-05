-- AlterTable
-- totalBlocksMined and lifetimeDamage are unbounded lifetime counters that can exceed the
-- 32-bit INTEGER range (observed: "2156378797" out of range). Rather than widening to a still-finite
-- BIGINT, encode them the same way as gold/gems/unobtanium: a BigNumber "Layer;Exponent" string.
-- Existing plain-integer values are Layer-0 BigNumbers, so they're re-encoded as '0;<value>'.
ALTER TABLE "MiningPlayerStats"
    ALTER COLUMN "totalBlocksMined" TYPE TEXT USING ('0;' || "totalBlocksMined"::text),
    ALTER COLUMN "totalBlocksMined" SET DEFAULT '0;0',
    ALTER COLUMN "lifetimeDamage" TYPE TEXT USING ('0;' || "lifetimeDamage"::text),
    ALTER COLUMN "lifetimeDamage" SET DEFAULT '0;0';
