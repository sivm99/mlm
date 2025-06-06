import { pgTable, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const userPosition = pgEnum("userPosition", ["left", "right"]);

export const treeTable = pgTable(
  "user_trees",
  {
    id: integer("id")
      .references(() => usersTable.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      })
      .notNull()
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
