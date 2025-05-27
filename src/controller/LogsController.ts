import db from "@/db";
import { logsTable } from "@/db/schema";
import { MyContext } from "@/types";
import { eq } from "drizzle-orm";
import { and } from "drizzle-orm";

export default class LogsController {
  /**
   * Get system logs (admin only)
   */
  static async getLogs(c: MyContext) {
    try {
      const limit = Number(c.req.query("limit")) || 100;
      const offset = Number(c.req.query("offset")) || 0;
      const level = c.req.query("level");
      const userId = Number(c.req.query("userId"));

      const conditions = [];
      if (level) conditions.push(eq(logsTable.level, level));
      if (userId) conditions.push(eq(logsTable.userId, userId));

      const logs = await db.query.logsTable.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        limit,
        offset,
        orderBy: (logs, { desc }) => [desc(logs.createdAt)],
      });

      return c.json({
        success: true,
        data: logs,
        pagination: {
          limit,
          offset,
          count: logs.length,
        },
      });
    } catch (error) {
      return c.json(
        {
          success: false,
          message: String(error),
        },
        500,
      );
    }
  }
}
