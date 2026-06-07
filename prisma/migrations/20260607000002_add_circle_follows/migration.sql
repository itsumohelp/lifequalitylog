CREATE TABLE "circle_follows" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "circle_id" TEXT NOT NULL,
  "last_checked_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id"),
  UNIQUE ("user_id", "circle_id"),
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
  FOREIGN KEY ("circle_id") REFERENCES "Circle"("id") ON DELETE CASCADE
);
CREATE INDEX "circle_follows_user_id_idx" ON "circle_follows"("user_id");
CREATE INDEX "circle_follows_circle_id_idx" ON "circle_follows"("circle_id");
