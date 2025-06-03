import { integer, pgTable, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { relations } from "drizzle-orm";
import { rewardsTable } from "./rewards";

export const firstEligibleTable = pgTable("first_eligible", {
  id: integer("id")
    .notNull()
    .references(() => usersTable.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    })
    .primaryKey(),
  rewardId: integer("reward_id")
    .notNull()
    .references(() => rewardsTable.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const firstEligibleRelation = relations(
  firstEligibleTable,
  ({ one }) => ({
    user: one(usersTable, {
      fields: [firstEligibleTable.id],
      references: [usersTable.id],
    }),
  }),
);

export type InsertFirstEligible = typeof firstEligibleTable.$inferInsert;
export type SelectFirstEligible = typeof firstEligibleTable.$inferSelect;
