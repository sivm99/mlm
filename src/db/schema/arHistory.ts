import {
  pgEnum,
  integer,
  pgTable,
  serial,
  timestamp,
  real,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { relations } from "drizzle-orm";

export const arEnumValues = ["activate", "reactivate"] as const;
export const arTypeEnum = pgEnum("ar_enum", arEnumValues);

export const arHistoryTable = pgTable("ar_history", {
  id: serial("id").primaryKey(),
  fromUserId: integer("from_user_id")
    .notNull()
    .references(() => usersTable.id),
  toUserId: integer("to_user_id")
    .notNull()
    .references(() => usersTable.id),
  activityType: arTypeEnum("activity_type").notNull().default("activate"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  investment: real("investment").notNull().default(68),
});

export const arHistoryRelations = relations(arHistoryTable, ({ one }) => ({
  fromUser: one(usersTable, {
    fields: [arHistoryTable.fromUserId],
    references: [usersTable.id],
    relationName: "ar_history_from_user_relation",
  }),
  toUser: one(usersTable, {
    fields: [arHistoryTable.toUserId],
    references: [usersTable.id],
    relationName: "ar_history_to_user_relation",
  }),
}));

export type SelectArHistory = typeof arHistoryTable.$inferSelect;
export type InsertArHistory = typeof arHistoryTable.$inferInsert;
