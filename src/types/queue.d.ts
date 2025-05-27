import { User } from "./user";

export type QueueJob = {
  id: string;
  type: JobType;
  data: unknown;
  priority: number;
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
  processedAt?: Date;
  completedAt?: Date;
  failedAt?: Date;
  error?: string;
  status: "pending" | "processing" | "completed" | "failed" | "retrying";
};

export type JobType =
  | "INSERT_USER_TO_TREE"
  | "UPDATE_TREE_COUNTS"
  | "UPDATE_PARENT_CHAIN"
  | "ACTIVATE_USER"
  | "DEACTIVATE_USER";

export type InsertUserJobData = {
  userId: User["id"];
  sponsorId: User["id"];
  preferredSide: "LEFT" | "RIGHT";
};

export type UpdateCountsJobData = {
  userId: User["id"];
  isActive: User["isActive"];
  operation: "INCREMENT" | "DECREMENT";
};
export type ActivateUserData = Pick<InsertUserJobData, "userId">;
export type UpdateCountData = {
  leftCount?: number;
  rightCount?: number;
  leftActiveCount?: number;
  rightActiveCount?: number;
  leftBv?: number;
  rightBv?: number;
};
export type UpdateParentChainJobData = {
  userId: number;
  changes: UpdateCountData;
};
