import { index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const kvStore = pgTable(
  "kv_store",
  {
    key: text("key").primaryKey(),
    value: jsonb("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    keyPrefixIdx: index("kv_store_key_prefix_idx").on(table.key),
    expiresAtIdx: index("kv_store_expires_at_idx").on(table.expiresAt)
  })
);
