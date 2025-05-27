import {
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { userPosition, usersTable } from "./users";
import { relations } from "drizzle-orm";

export const referralsTable = pgTable("referrals", {
  slug: text("slug").notNull().primaryKey(),
  userId: integer("userId")
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

  isDeleted: boolean("isDeleted").notNull().default(false),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export const referralsRelations = relations(referralsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [referralsTable.userId],
    references: [usersTable.id],
    relationName: "userReferral",
  }),
  sponsorUser: one(usersTable, {
    fields: [referralsTable.sponsor],
    references: [usersTable.id],
    relationName: "sponsorReferral",
  }),
}));

export type ReferralSelect = typeof referralsTable.$inferSelect;
