import { pgTable, integer, real, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const userPosition = pgEnum("userPosition", ["LEFT", "RIGHT"]);

export const treeTable = pgTable(
  "user_trees",
  {
    id: integer("id")
      .references(() => usersTable.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      })
      .primaryKey(),

    leftUser: integer("left_user").references(() => usersTable.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),
    rightUser: integer("right_user").references(() => usersTable.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),
    position: userPosition("position").notNull().default("LEFT"),

    parentUser: integer("parent_user")
      .references(() => usersTable.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      })
      .notNull(),
    sponsor: integer("sponsor")
      .references(() => usersTable.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      })
      .notNull(),

    leftCount: integer("left_count").notNull().default(0),
    rightCount: integer("right_count").notNull().default(0),
    leftActiveCount: integer("left_active_count").notNull().default(0),
    rightActiveCount: integer("right_active_count").notNull().default(0),
    leftBv: real("left_bv").notNull().default(0),
    rightBv: real("right_bv").notNull().default(0),

    // leftActiveBv: real("left_active_bv").notNull().default(0),
    // rightActiveBv: real("right_active_bv").notNull().default(0),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date", precision: 3 })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => {
    return [
      index("idx_user_trees_user").on(table.id),
      index("idx_user_trees_parent").on(table.parentUser),
    ];
  },
);

export type InsertTree = typeof treeTable.$inferInsert;
export type SelectTree = typeof treeTable.$inferSelect;

export const treeRelations = relations(treeTable, ({ one }) => ({
  userRelation: one(usersTable, {
    fields: [treeTable.id],
    references: [usersTable.id],
    relationName: "userTree",
  }),
  parentUserRelation: one(usersTable, {
    fields: [treeTable.parentUser],
    references: [usersTable.id],
    relationName: "parentUserTree",
  }),
  leftUserRelation: one(usersTable, {
    fields: [treeTable.leftUser],
    references: [usersTable.id],
    relationName: "leftUserTree",
  }),
  rightUserRelation: one(usersTable, {
    fields: [treeTable.rightUser],
    references: [usersTable.id],
    relationName: "rightUserTree",
  }),
}));
