import { InsertOrder } from "@/db/schema";
import {
  userService,
  treeService,
  databaseService,
  orderService,
} from "@/lib/services";

import { RegisterUser } from "@/validation";
import { Context } from "hono";

export default class UserController {
  async getUser(c: Context) {
    const { id } = c.get("user");
    const data = await databaseService.fetchTreeUserData(id);
    return c.json({
      success: true,
      message: "User was reterieved successfully",
      data,
    });
  }

  async updateUser(c: Context) {
    const user = c.get("user");
    const updatedUser = c.get("updatedUser");
    let id = user.role === "admin" ? updatedUser.id : user.id;
    if (!id) id = user.id;
    try {
      await userService.updateUser(id, updatedUser);
    } catch (err) {
      return c.json({
        success: false,
        message: String(err),
      });
    }
  }

  async bulkAdd(c: Context) {
    try {
      const { count, user } = c.get("bulkAdd");
      const usersToInserArray: RegisterUser[] = [];
      for (let i = 0; i < count; i++)
        usersToInserArray.push(user as RegisterUser);
      const { users } = await userService.registerUsers(usersToInserArray);
      return c.json({
        success: true,
        message: "users were added successfully",
        data: users,
      });
    } catch (error) {
      return c.json(
        {
          success: false,
          message: "Failed to add users",
          error: error instanceof Error ? error.message : "Unknown error",
        },
        400,
      );
    }
  }

  async getUserTree(c: Context) {
    const side = c.get("side");
    const userId = c.get("id");
    try {
      let data;
      let self;
      switch (side) {
        case "full":
          data = await treeService.getFullTeam(userId, 4);
          self = await databaseService.fetchTreeUserData(userId);
          if (!self) return;
          data.push(self);
          break;
        case "left":
          data = await treeService.getLeftTeam(userId);
          break;
        default: // Assumes "RIGHT" if not FULL or LEFT
          data = await treeService.getRightTeam(userId);
          break;
      }

      return c.json({
        success: true,
        message: "Tree was retrieved successfully",
        data,
      });
    } catch (err) {
      console.error(err);
      return c.json(
        {
          success: false,
          message: "Something went wrong",
        },
        400,
      );
    }
  }

  async getDirectPartners(c: Context) {
    const { id } = c.get("user");
    try {
      const data = await userService.getDirectPartners(id);
      return c.json({
        success: true,
        message: "Data was reterieved successfully",
        data,
      });
    } catch (error) {
      console.error(error);
      return c.json(
        {
          success: false,
          message: "Failed to retrieve direct partners",
          error: error instanceof Error ? error.message : "Unknown error",
        },
        400,
      );
    }
  }

  async activateUserId(c: Context) {
    try {
      const self = c.get("user");
      const { userId, address, deliveryMethod } = c.get(
        "activateUserIdPayload",
      );

      const [{ success, error }] = await userService.activateUserIds(self.id, [
        userId,
      ]);

      if (error) {
        return c.json(
          {
            success,
            message: error,
          },
          400,
        );
      }

      const newOrder: InsertOrder = {
        userId,
        totalAmount: 68,
        deliveryMethod,
        deliveryAddress: address,
      };

      const data = await orderService.placeActiveOrder(newOrder);

      return c.json({
        success: true,
        message: "Your ID has been activated successfully",
        data,
      });
    } catch (err) {
      console.error("Error in activateUserId:", err);
      return c.json(
        {
          success: false,
          message: "Something went wrong during activation or order placement.",
          error: err instanceof Error ? err.message : String(err),
        },
        500,
      );
    }
  }
  async bulkActivateIds(c: Context) {
    const self = c.get("user");
    const ids = c.get("ids");

    const result = await userService.activateUserIds(self.id, ids);
    const orders = ids.map((id) => ({
      userId: id,
      totalAmount: 68,
    }));
    const placedOrders = await orderService.placeOrder(orders);
    return c.json({
      success: true,
      message: "Ids were activated",
      data: {
        result,
        placedOrders,
      },
    });
  }
}

export const userController = new UserController();
