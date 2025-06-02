import { MyContext } from "@/types";
import { arHistoryService } from "@/lib/services";

export default class ArHistoryController {
  static async getArHistory(c: MyContext) {
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

  static async deleteArHistory(c: MyContext) {
    try {
      const id = c.get("id");
      const arHistory = await arHistoryService.getArHistoryById(id);
      if (!arHistory) {
        return c.json({ success: false, message: "AR history not found" }, 404);
      }

      const user = c.get("user");
      if (user.role !== "ADMIN") {
        return c.json({ success: false, message: "Unauthorized" }, 403);
      }

      const result = await arHistoryService.deleteArHistory(id);

      return c.json({
        success: true,
        message: "AR history deleted successfully",
        data: result[0],
      });
    } catch (error) {
      return c.json(
        {
          success: false,
          message: "Failed to delete AR history",
          error: error instanceof Error ? error.message : "Unknown error",
        },
        500,
      );
    }
  }

  static async listArHistory(c: MyContext) {
    try {
      const { page, limit, ...filters } = c.get("listArHistory");
      const user = c.get("user");

      // If not admin, only show history related to the user
      const filterWithUser =
        user.role !== "ADMIN" ? { ...filters, fromUserId: user.id } : filters;

      const { data, total } = await arHistoryService.listArHistory({
        pagination: {
          page,
          limit,
        },
        filter: filterWithUser,
      });

      return c.json({
        success: true,
        message: "AR history retrieved successfully",
        data,
        meta: {
          page,
          limit,
          total,
          pages: Math.ceil(total / (limit || 30)),
        },
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
      const userId = c.get("id");
      const isFromUser = c.req.query("isFromUser") !== "false"; // Default to true
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
