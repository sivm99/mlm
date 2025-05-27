import { MinimalTreeReturn, TreeReturn } from "@/lib/services";
import { SafeUser, Side } from "./user";

export type TreeUser = SafeUser & TreeReturn; // for now it is just safe user;
export type TreeNode = MinimalTreeReturn;

export type TreeStats = {
  leftCount: TreeUser["leftCount"];
  rightCount: TreeUser["rightCount"];
  leftActiveCount: TreeUser["leftActiveCount"];
  rightActiveCount: TreeUser["rightActiveCount"];
  leftBv: TreeUser["leftBv"];
  rightBv: TreeUser["rightBv"];
  leftActiveBv: TreeUser["leftActiveBv"];
  rightActiveBv: TreeUser["rightActiveBv"];
};

export type TreePlacementResult = {
  parentId: TreeUser["id"];
  position: Side;
  depth: number;
};
