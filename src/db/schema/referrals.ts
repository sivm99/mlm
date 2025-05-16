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
// with referalls we will generate the link as well as we give the option
// to send the referal link to email and will give the user a chance to share
// this link , now the front end can fetch detail to show
// and in the backend i will match once again they didnt change during the
// register process again we will manage this in the validation layer
