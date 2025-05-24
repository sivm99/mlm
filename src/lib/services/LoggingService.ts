import db from "@/db";
import { logsTable } from "@/db/schema/logs";

export type LogData = {
  level?: string;
  action: string;
  userId?: string;
  transactionId?: number;
  message: string;
  metadata?: Record<string, JSON>;
  ipAddress?: string;
  userAgent?: string;
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
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });
  }
}
