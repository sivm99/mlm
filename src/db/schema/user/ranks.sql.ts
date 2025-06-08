import { pgTable, serial, text, integer } from "drizzle-orm/pg-core";
/**
 * Represents the ranks table in the database.
 * Contains information about different ranks in the system.
 * used for the earings and lifetimerewards
 */
export const ranksTable = pgTable("ranks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  matchingBv: integer("matching_bv").notNull(),
  reward: integer("reward").notNull(),
});

export type SelectRank = typeof ranksTable.$inferSelect;
export type InsertRank = typeof ranksTable.$inferInsert;

export const ranksData = [
  { id: 0, title: "na", matchingBv: 0, reward: 0 },
  { id: 1, title: "executive", matchingBv: 2_000, reward: 100 },
  { id: 2, title: "team_leader", matchingBv: 5_000, reward: 150 },
  { id: 3, title: "supervisor", matchingBv: 10_000, reward: 250 },
  { id: 4, title: "manager", matchingBv: 25_000, reward: 750 },
  { id: 5, title: "senior_manager", matchingBv: 50_000, reward: 1_250 },
  { id: 6, title: "silver", matchingBv: 1_00_000, reward: 2_500 },
  { id: 7, title: "ruby", matchingBv: 2_50_000, reward: 7_500 },
  { id: 8, title: "gold", matchingBv: 5_00_000, reward: 12_500 },
  { id: 9, title: "platinum", matchingBv: 10_00_000, reward: 25_000 },
  { id: 10, title: "diamond", matchingBv: 25_00_000, reward: 75_000 },
  { id: 11, title: "double_diamond", matchingBv: 50_00_000, reward: 1_25_000 },
  { id: 12, title: "blue_diamond", matchingBv: 1_00_00_000, reward: 2_50_000 },
  { id: 13, title: "black_diamond", matchingBv: 2_50_00_000, reward: 7_50_000 },
  { id: 14, title: "ambassador", matchingBv: 5_00_00_000, reward: 12_50_000 },
  {
    id: 15,
    title: "crown_ambassodar",
    matchingBv: 10_00_00_000,
    reward: 25_00_000,
  },
];
