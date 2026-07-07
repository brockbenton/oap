-- Store the closeSession tx hash separately so it no longer overwrites the
-- createSession tx hash in the shared `tx_hash` column.
ALTER TABLE "sessions" ADD COLUMN "close_tx_hash" TEXT;
