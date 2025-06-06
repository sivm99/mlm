import { MyContext } from "@/types";
import { arHistoryService } from "@/lib/services";

export default class ArHistoryController {
  static async getArHistoryById(c: MyContext) {
    try {
      const id = c.get("id");
      const arHistory = await arHistoryService.getArHistoryById(id);
      if (!arHistory) {
        return c.json({ success: false, message: "AR history not found" }, 404);
      }

      return c.json({
        success: true,
        message: "AR history retrieved successfully",
        data: arHistory,
      });
    } catch (error) {
      return c.json(
        {
          success: false,
          message: "Failed to get AR history",
          error: error instanceof Error ? error.message : "Unknown error",
        },
        500,
      );
    }
  }

  static async listArHistory(c: MyContext) {
    try {
      const { sortDirection, offset, limit, fromDate, toDate, ...filters } =
        c.get("listArHistory");
      const user = c.get("user");

      const filterWithUser =
        user.role !== "admin" ? { ...filters, fromUserId: user.id } : filters;

      const data = await arHistoryService.listArHistory({
        pagination: {
          offset,
          limit,
          sortDirection,
          fromDate,
          toDate,
        },
        filter: filterWithUser,
      });

      return c.json({
        success: true,
        message: "AR history retrieved successfully",
        data,
      });
    } catch (error) {
      return c.json(
        {
          success: false,
          message: "Failed to retrieve AR history",
          error: error instanceof Error ? error.message : "Unknown error",
        },
        500,
      );
    }
  }

  static async getUserArHistory(c: MyContext) {
    try {
      const { id: userId } = c.get("user");
      const isFromUser = c.req.query("isFromUser") !== "false";
      const arHistory = await arHistoryService.getArHistoryByUserId(
        userId,
        isFromUser,
      );

      return c.json({
        success: true,
        message: "User AR history retrieved successfully",
        data: arHistory,
      });
    } catch (error) {
      return c.json(
        {
          success: false,
          message: "Failed to retrieve user AR history",
          error: error instanceof Error ? error.message : "Unknown error",
        },
        500,
      );
    }
  }
}
