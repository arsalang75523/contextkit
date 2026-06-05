CREATE TABLE IF NOT EXISTS "kv_store" (
  "key" text PRIMARY KEY NOT NULL,
  "value" jsonb NOT NULL,
  "expires_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "kv_store_key_prefix_idx" ON "kv_store" ("key");
CREATE INDEX IF NOT EXISTS "kv_store_expires_at_idx" ON "kv_store" ("expires_at");
