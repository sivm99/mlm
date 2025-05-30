import {
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { relations } from "drizzle-orm";
import { userPosition } from "./trees";

export const referralsTable = pgTable("referrals", {
  slug: text("slug").notNull().primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),

  position: userPosition("position").notNull(),
  sponsor: integer("sponsor")
    .notNull()
    .references(() => usersTable.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),
  impressions: integer("impressions").notNull().default(0), // number of users who clicked on the referral link
  registered: integer("registered").notNull().default(0), // number of  registered users who registerd using this link
  activated: integer("activated").notNull().default(0), // number of  activated users who activated using this link

  isDeleted: boolean("is_deleted").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date", precision: 3 })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const referralsRelations = relations(referralsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [referralsTable.userId],
    references: [usersTable.id],
    relationName: "user_referral",
  }),
  sponsorUser: one(usersTable, {
    fields: [referralsTable.sponsor],
    references: [usersTable.id],
    relationName: "sponsor_referral",
  }),
}));

export type ReferralSelect = typeof referralsTable.$inferSelect;
