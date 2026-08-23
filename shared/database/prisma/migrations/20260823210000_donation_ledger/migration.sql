-- Evolve DonationGift into a permanent Donation ledger: rename the table and
-- add a nullable claimedAt so claiming a gift stamps the row instead of
-- deleting it. robuxRaised/robuxDonated on DonationPlayerStats are untouched -
-- they remain the maintained counters, not something derived from this table.
ALTER TABLE "DonationGift" RENAME TO "Donation";
ALTER TABLE "Donation" RENAME CONSTRAINT "DonationGift_pkey" TO "Donation_pkey";
ALTER INDEX "DonationGift_toRobloxId_idx" RENAME TO "Donation_toRobloxId_idx";
ALTER INDEX "DonationGift_fromRobloxId_idx" RENAME TO "Donation_fromRobloxId_idx";

ALTER TABLE "Donation" ADD COLUMN "claimedAt" TIMESTAMP(3);