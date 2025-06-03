import { integer, pgTable, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const userStatsTable = pgTable("user_stats", {
  id: integer("id")
    .references(() => usersTable.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    })
    .notNull()
    .primaryKey(),

  redeemedCount: integer("redeemed_count").notNull().default(0),
  directUsersCount: integer("direct_users_count").notNull().default(0),
  activeDirectUsersCount: integer("active_direct_users_count")
    .notNull()
    .default(0),

  leftCount: integer("left_count").notNull().default(0),
  rightCount: integer("right_count").notNull().default(0),
  leftActiveCount: integer("left_active_count").notNull().default(0),
  rightActiveCount: integer("right_active_count").notNull().default(0),
  leftBv: integer("left_bv").notNull().default(0),
  rightBv: integer("right_bv").notNull().default(0),

  todayLeftCount: integer("today_left_count").notNull().default(0),
  todayRightCount: integer("today_right_count").notNull().default(0),
  todayLeftActiveCount: integer("today_left_active_count").notNull().default(0),
  todayRightActiveCount: integer("today_right_active_count")
    .notNull()
    .default(0),
  todayLeftBv: integer("today_left_bv").notNull().default(0),
  todayRightBv: integer("today_right_bv").notNull().default(0),

  cfLeftBv: integer("cf_left_bv").notNull().default(0),
  cfRightBv: integer("cf_right_bv").notNull().default(0),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date", precision: 3 })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export type InsertUserStats = typeof userStatsTable.$inferInsert;
export type SelectUserStats = typeof userStatsTable.$inferSelect;
