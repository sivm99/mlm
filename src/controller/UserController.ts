import TreeService from "@/lib/TreeService";
import UserService from "@/lib/UserService";
import { MyContext } from "@/types";
import { RegisterUser } from "@/validation/auth.validations";

const userService = new UserService();
const treeService = new TreeService();
export default class UserController {
  static async getUser(c: MyContext) {
    return c.json({
      success: true,
      message: "User was reterieved successfully",
      data: c.get("user"),
    });
  }

  static async updateUser(c: MyContext) {
    const user = c.get("user");
    const updatedUser = c.get("updatedUser");
    try {
      await userService.updateUser(user.id, updatedUser);
    } catch (err) {
      return c.json({
        success: false,
        message: String(err),
      });
    }
  }

  static async bulkAdd(c: MyContext) {
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

  static async getUserTree(c: MyContext) {
    const user = c.get("user");
    const side = c.get("side");
    const userId = user.id;
    try {
      let data;
      switch (side) {
        case "FULL":
          data = await treeService.getUserDownline(userId);
          break;
        case "LEFT":
          data = await treeService.getLeftBranchUsers(userId);
          break;
        default: // Assumes "RIGHT" if not FULL or LEFT
          data = await treeService.getRightBranchUsers(userId);
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

  static async getDirectPartners(c: MyContext) {
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
}
