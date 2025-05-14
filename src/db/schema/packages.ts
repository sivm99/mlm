import { pgTable, real, serial, text, timestamp } from "drizzle-orm/pg-core";

export const packagesTable = pgTable("packages", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  price: real("price").notNull(),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
});
