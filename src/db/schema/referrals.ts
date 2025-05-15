import { pgTable, serial, text } from "drizzle-orm/pg-core";
import { userPosition, usersTable } from "./users";

export const referralsTable = pgTable("referrals", {
  id: serial().primaryKey(),
  slug: text().notNull(),
  userId: text().references(() => usersTable.id, {
    onDelete: "set null",
    onUpdate: "cascade",
  }),
  position: userPosition("position").notNull(),
  sponsor: text()
    .notNull()
    .references(() => usersTable.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),
});
