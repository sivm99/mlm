import TreeService from "@/lib/TreeService";
import UserService from "@/lib/userService";
import { MyContext } from "@/types";
import { RegisterUser } from "@/validation/auth.validations";

const userService = new UserService();
const treeService = new TreeService();

export const getUser = async (c: MyContext) => {
  return c.json({
    success: true,
    message: "User was reterieved successfully",
    user: c.get("user"),
  });
};

export const updateUser = async (c: MyContext) => {
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
};

export const bulkAdd = async (c: MyContext) => {
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
};

export const getUserTree = async (c: MyContext) => {
  const user = c.get("user");
  const side = c.get("side");
  const userId = user.id;
  try {
    const data =
      side === "FULL"
        ? await treeService.getAllUsers(userId)
        : side === "LEFT"
          ? await treeService.getLeftBranchUsers(userId)
          : await treeService.getRightBranchUsers(userId);
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
};
