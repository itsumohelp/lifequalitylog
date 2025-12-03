-- CreateTable
CREATE TABLE "app_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "log_level" VARCHAR(10) NOT NULL,
    "message" TEXT NOT NULL,
    "context" JSONB,

    CONSTRAINT "app_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Todo" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "title" TEXT NOT NULL,
    "status" INTEGER NOT NULL,
    "userid" TEXT NOT NULL,

    CONSTRAINT "Todo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Record" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "todoid" TEXT NOT NULL,
    "status" INTEGER NOT NULL,
    "update_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "Record_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "app_logs_created_at_idx" ON "app_logs"("created_at");

-- CreateIndex
CREATE INDEX "app_logs_log_level_idx" ON "app_logs"("log_level");

-- CreateIndex
CREATE INDEX "Todo_created_at_idx" ON "Todo"("created_at");

-- CreateIndex
CREATE INDEX "Record_created_at_idx" ON "Record"("created_at");
