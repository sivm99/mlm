import { userService, treeService, databaseService } from "@/lib/services";
import { MyContext } from "@/types";
import { RegisterUser } from "@/validation/auth.validations";

export default class UserController {
  static async getUser(c: MyContext) {
    const { id } = c.get("user");
    const data = await databaseService.fetchTreeUserData(id);
    return c.json({
      success: true,
      message: "User was reterieved successfully",
      data,
    });
  }

  static async updateUser(c: MyContext) {
    const user = c.get("user");
    const updatedUser = c.get("updatedUser");
    let id = user.role === "ADMIN" ? updatedUser.id : user.id;
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
    const side = c.get("side");
    const userId = c.get("id");
    try {
      let data;
      switch (side) {
        case "FULL":
          data = await treeService.getFullTeam(userId);
          break;
        case "LEFT":
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
