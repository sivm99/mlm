import TreeService from "@/lib/TreeService";
import UserService from "@/lib/UserService";
import { MyContext } from "@/types";
import { RegisterUser } from "@/validation/auth.validations";

export default class UserController {
  private static userService = new UserService();
  private static treeService = new TreeService();

  static async getUser(c: MyContext) {
    return c.json({
      success: true,
      message: "User was reterieved successfully",
      user: c.get("user"),
    });
  }

  static async updateUser(c: MyContext) {
    const user = c.get("user");
    const updatedUser = c.get("updatedUser");
    try {
      await this.userService.updateUser(user.id, updatedUser);
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
      const { users } = await this.userService.registerUsers(usersToInserArray);
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
          data = await this.treeService.getUserDownline(userId);
          break;
        case "LEFT":
          data = await this.treeService.getLeftBranchUsers(userId);
          break;
        default: // Assumes "RIGHT" if not FULL or LEFT
          data = await this.treeService.getRightBranchUsers(userId);
          break;
      }

      return c.json({
        success: true,
        message: "Tree was retrieved successfully",
        data: data,
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
}
