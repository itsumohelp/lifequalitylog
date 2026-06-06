CREATE TABLE "user_trophies" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "trophy_key" TEXT NOT NULL,
  "earned_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id"),
  UNIQUE ("user_id", "trophy_key"),
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);
CREATE INDEX "user_trophies_user_id_idx" ON "user_trophies"("user_id");
