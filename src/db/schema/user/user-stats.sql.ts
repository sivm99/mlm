import { integer, pgTable, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users.sql";
import { relations } from "drizzle-orm";

/**
 * User Stats Table
 *
 * the below table has all the stats and is very importat in the calculation
 * for everyday income withdrawls and dashboard it has overall stats as well as
 * daily stats we will decide on separating daily and overall later
 * it gets updated when a new user signs up and we insert them inside the tree table
 * and when a new user activates themseleves or other it gets udpated
 * the daily couter reset after the daily matching income has been distributed
 */
export const userStatsTable = pgTable("user_stats", {
  id: integer("id")
    .references(() => usersTable.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    })
    .primaryKey(),

  leftDirectUsersCount: integer("left_direct_users_count").notNull().default(0),
  rightDirectUsersCount: integer("right_direct_users_count")
    .notNull()
    .default(0),
  leftActiveDirectUsersCount: integer("left_active_direct_users_count")
    .notNull()
    .default(0),
  rightActiveDirectUsersCount: integer("right_active_direct_users_count")
    .notNull()
    .default(0),

  leftCount: integer("left_count").notNull().default(0),
  rightCount: integer("right_count").notNull().default(0),
  leftActiveCount: integer("left_active_count").notNull().default(0),
  rightActiveCount: integer("right_active_count").notNull().default(0),

  leftBv: integer("left_bv").notNull().default(0),
  rightBv: integer("right_bv").notNull().default(0),
  cfLeftBv: integer("cf_left_bv").notNull().default(0),
  cfRightBv: integer("cf_right_bv").notNull().default(0),

  todayLeftCount: integer("today_left_count").notNull().default(0),
  todayRightCount: integer("today_right_count").notNull().default(0),
  todayLeftActiveCount: integer("today_left_active_count").notNull().default(0),
  todayRightActiveCount: integer("today_right_active_count")
    .notNull()
    .default(0),

  todayLeftBv: integer("today_left_bv").notNull().default(0),
  todayRightBv: integer("today_right_bv").notNull().default(0),

  updatedAt: timestamp("updated_at", { mode: "date", precision: 3 })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const userStatsRelation = relations(userStatsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [userStatsTable.id],
    references: [usersTable.id],
    relationName: "user_stats_user_relation",
  }),
}));

export type InsertUserStats = typeof userStatsTable.$inferInsert;
export type SelectUserStats = typeof userStatsTable.$inferSelect;
