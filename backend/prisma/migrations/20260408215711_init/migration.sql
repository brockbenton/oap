-- CreateEnum
CREATE TYPE "TxStatus" AS ENUM ('PENDING', 'CONFIRMED', 'FAILED');

-- CreateTable
CREATE TABLE "members" (
    "id" TEXT NOT NULL,
    "wallet_address" TEXT NOT NULL,
    "privy_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "session_id_onchain" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "semester" TEXT NOT NULL,
    "created_by" TEXT NOT NULL,
    "tx_hash" TEXT,
    "onchain_status" "TxStatus" NOT NULL DEFAULT 'PENDING',
    "closed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "check_ins" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "nonce" TEXT NOT NULL,
    "tx_hash" TEXT,
    "mint_status" "TxStatus" NOT NULL DEFAULT 'PENDING',
    "checked_in_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "check_ins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "token_events" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "token_id" TEXT NOT NULL,
    "block_number" BIGINT NOT NULL,
    "tx_hash" TEXT NOT NULL,
    "indexed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "token_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_roles" (
    "id" TEXT NOT NULL,
    "wallet_address" TEXT NOT NULL,
    "granted_by" TEXT NOT NULL,
    "granted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),

    CONSTRAINT "admin_roles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "members_wallet_address_key" ON "members"("wallet_address");

-- CreateIndex
CREATE UNIQUE INDEX "members_privy_user_id_key" ON "members"("privy_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_session_id_onchain_key" ON "sessions"("session_id_onchain");

-- CreateIndex
CREATE UNIQUE INDEX "check_ins_member_id_session_id_key" ON "check_ins"("member_id", "session_id");

-- AddForeignKey
ALTER TABLE "check_ins" ADD CONSTRAINT "check_ins_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "check_ins" ADD CONSTRAINT "check_ins_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "token_events" ADD CONSTRAINT "token_events_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "token_events" ADD CONSTRAINT "token_events_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
