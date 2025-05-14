import { pgTable, real, serial, timestamp } from "drizzle-orm/pg-core";

export const adminWalletsTable = pgTable("adminWallets", {
  id: serial("id").primaryKey(),
  balance: real("balance").default(0),
  lastUpdated: timestamp("lastUpdated").defaultNow(),
});
