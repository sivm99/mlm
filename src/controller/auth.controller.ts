import UserService from "@/lib/userService";
import { MyContext } from "@/types";
const us = new UserService();

export async function registerUser(c: MyContext) {
  try {
    const validUser = c.get("registerUsers");
    const { success, users } = await us.registerUsers(validUser);
    const newUser = users[0];
    await us.setTokenCookie(c, newUser.username);
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
    const { success, user } = await us.loginUser(validated);
    await us.setTokenCookie(c, user.username);
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
