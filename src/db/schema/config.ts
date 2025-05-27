import { pgTable, serial, text, timestamp, index } from "drizzle-orm/pg-core";

export const configTable = pgTable(
  "config",
  {
    id: serial("id").primaryKey(),
    key: text("key").unique().notNull(),
    value: text("value").notNull(),
    description: text("description"),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => {
    return [index("idx_config_key").on(table.key)];
  },
);
