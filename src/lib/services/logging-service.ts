import db from "@/db";
import { logsTable } from "@/db/schema";
import { User } from "@/types";

export type LogData = {
  level?: string;
  action: string;
  userId?: User["id"];
  transactionId?: number;
  message: string;
  metadata?: Record<string, JSON>;
};
export class LoggingService {
  static async log(params: LogData) {
    await db.insert(logsTable).values({
      level: params.level || "info",
      action: params.action,
      userId: params.userId,
      transactionId: params.transactionId,
      message: params.message,
      metadata: params.metadata ? JSON.stringify(params.metadata) : null,
    });
  }
}
