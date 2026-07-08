-- AlterTable
ALTER TABLE "members" ADD COLUMN     "username" TEXT,
ADD COLUMN     "avatar_color" INTEGER,
ADD COLUMN     "bio" TEXT,
ADD COLUMN     "notify_email" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "members_username_key" ON "members"("username");
