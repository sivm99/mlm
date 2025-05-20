import { pgTable, real, timestamp, serial, text } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const walletsTable = pgTable("wallets", {
  id: serial("id").primaryKey(),
  alpoints: real("alpoints").notNull().default(0), // when they will add funds ,or admin can add at any time
  // or through trasfer from other users;
  bv: real("bv").notNull().default(0), // after the id activation this will become -> 0 + 50;
  incomeWallet: real("incomeWallet").notNull().default(0),
  // -> when we they will start earing from the cron jobs it will be added in this wallet
  userId: text("userId")
    .notNull()
    .references(() => usersTable.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});
