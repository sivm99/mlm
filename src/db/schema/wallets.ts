import { pgTable, real, timestamp, serial, text } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const walletsTable = pgTable("wallets", {
  id: serial().primaryKey(),
  alpoints: real().notNull().default(0),
  bv: real().notNull().default(0),
  incomeWallet: real().notNull().default(0),
  userId: text()
    .notNull()
    .references(() => usersTable.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
});
