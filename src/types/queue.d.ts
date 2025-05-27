import { TreeUser } from "./tree";
import { Side, User } from "./user";

export interface QueueJob {
  id: string;
  type: "USER_REGISTRATION" | "COUNT_UPDATE";
  data: unknown;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  createdAt: Date;
  error?: string;
}

export interface RegistrationJobData {
  userId: User["id"];
  sponsor: TreeUser["id"];
  position: Side;
  isActive: boolean;
}

export interface CountUpdateJobData {
  userId: User["id"];
  isActive: boolean;
}
