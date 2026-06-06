-- AIペルソナ: ユーザーにフラグを追加
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is_ai_persona" BOOLEAN NOT NULL DEFAULT false;

-- ペルソナプロファイルテーブルを作成
CREATE TABLE IF NOT EXISTS "persona_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "persona_key" TEXT NOT NULL,
    "circle_id" TEXT NOT NULL,
    "activated_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "persona_profiles_pkey" PRIMARY KEY ("id")
);

-- ユニーク制約
CREATE UNIQUE INDEX IF NOT EXISTS "persona_profiles_user_id_key" ON "persona_profiles"("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "persona_profiles_persona_key_key" ON "persona_profiles"("persona_key");

-- 外部キー
ALTER TABLE "persona_profiles"
    ADD CONSTRAINT "persona_profiles_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
