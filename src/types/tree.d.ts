import { TreeReturn } from "@/lib/services";
import { SafeUser, Side } from "./user";
import { SelectUserStats } from "@/db/schema";
import { SQL } from "drizzle-orm";

export type TreeUser = SafeUser & TreeReturn;
export type UserStats = SelectUserStats;

export type TreeStats = {
  leftCount?: SelectUserStats["leftCount"];
  rightCount?: SelectUserStats["rightCount"];
  leftActiveCount?: SelectUserStats["leftActiveCount"];
  rightActiveCount?: SelectUserStats["rightActiveCount"];
  leftBv?: SelectUserStats["leftBv"];
  rightBv?: SelectUserStats["rightBv"];
  todayLeftCount?: SelectUserStats["todayLeftCount"];
  todayRightCount?: SelectUserStats["todayRightCount"];
  todayLeftActiveCount?: SelectUserStats["todayLeftActiveCount"];
  todayRightActiveCount?: SelectUserStats["todayRightActiveCount"];
  todayLeftBv?: SelectUserStats["todayLeftBv"];
  todayRightBv?: SelectUserStats["todayRightBv"];
};

export type TreeStatsUpdate = {
  [K in keyof TreeStats]: SQL<unknown>;
};

export type TreePlacementResult = {
  parentId: TreeUser["id"];
  position: Side;
  depth: number;
};
