import { MyContext } from "@/types";

export const getUser = (c: MyContext) => {
  return c.json({
    success: true,
    message: "User was reterieved successfully",
    user: c.get("user"),
  });
};
