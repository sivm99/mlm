import { pgTable, serial, text, timestamp, index } from "drizzle-orm/pg-core";
/**
 * Config Table
 * this table has all the config that we will be applying in our app
 */
export const configTable = pgTable(
  "config",
  {
    id: serial("id").primaryKey(),
    key: text("key").unique().notNull(),
    value: text("value").notNull(),
    description: text("description"),
    updatedAt: timestamp("updated_at", { mode: "date", precision: 3 })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => {
    return [index("idx_config_key").on(table.key)];
  },
);
