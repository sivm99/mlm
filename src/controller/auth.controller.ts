import UserService from "@/lib/UserService";
import { MyContext } from "@/types";

const userService = new UserService();

export async function registerUser(c: MyContext) {
  try {
    const validUser = Array(c.get("registerUser"));
    const { success, users } = await userService.registerUsers(validUser);
    const newUser = users[0];
    await userService.setTokenCookie(c, newUser.id);
    return c.json({
      success,
      data: newUser,
      message: "User was registered",
    });
  } catch (error) {
    console.error("Error registering user:", error);
    return c.json(
      {
        success: false,
        message: "Failed to register user",
      },
      500,
    );
  }
}

export async function loginUser(c: MyContext) {
  const validated = c.get("loginUser");
  try {
    const { success, user } = await userService.loginUser(validated);
    await userService.setTokenCookie(c, user.id);
    return c.json({
      success,
      message: "User was logged in",
      data: user,
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Login failed";
    return c.json(
      {
        success: false,
        message: errorMessage,
      },
      400,
    );
  }
}
