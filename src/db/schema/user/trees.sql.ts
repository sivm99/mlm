import { pgTable, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { usersTable } from "./users.sql";
import { index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const userPosition = pgEnum("user_position", ["left", "right"]);
/**
 * Tree Table
 *
 * It stores all the tree node in a doubly linked list fashion
 * so we can traverse in both the direction toward the root as well as towards the leaf
 * during insertion we have to traverse towards the leaf and during the income distribution
 * or to update the counts we traverse to above
 */
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

    position: userPosition("position").notNull().default("left"),

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
  sponsorUserRelation: one(usersTable, {
    fields: [treeTable.sponsor],
    references: [usersTable.id],
    relationName: "sponsorUserRelation",
  }),
}));

export type InsertTree = typeof treeTable.$inferInsert;
export type SelectTree = typeof treeTable.$inferSelect;
