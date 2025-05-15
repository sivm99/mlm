import TreeService from "@/lib/TreeService";
import UserService from "@/lib/UserService";
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

// export const getTree = (c:MyContext) =>{
//   const
// }

// export const updateUser = async (c: MyContext) => {};

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
  try {
    const data = await treeService.getUserDownline(user.id);

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
