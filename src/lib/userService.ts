import db from "@/db";
import { generateRandomDigits } from "./cr";
import { usersTable } from "@/db/schema/users";
import { LoginUser, SafeUser, User } from "@/types";
import { password as bunPassword } from "bun";
import { eq } from "drizzle-orm";
import { sign } from "hono/jwt";
import { Context } from "hono";
import { setCookie } from "hono/cookie";
import { RegisterUser } from "@/validation/auth.validations";
import TreeService from "./TreeService";

const jwtSecret = process.env.JWT_SECRET!;
const treeService = new TreeService();

class UserService {
  #expireTimeInMinutes = Number(process.env.EXPIRE_TIME_IN_MINUTES) || 5;
  #isDev = process.env.NODE_ENV === "development" ? true : false;
  #host = process.env.HOST || "::1:5000";

  #returnUserObject = {
    id: usersTable.id,
    name: usersTable.name,
    mobile: usersTable.mobile,
    country: usersTable.country,
    dialCode: usersTable.dialCode,
    sponsor: usersTable.sponsor,
    leftUser: usersTable.leftUser,
    rightUser: usersTable.rightUser,
    position: usersTable.position,
    role: usersTable.role,
    permissions: usersTable.permissions,
    isActive: usersTable.isActive,
    isBlocked: usersTable.isBlocked,
    redeemedTimes: usersTable.redeemedTimes,
    associatedUsersCount: usersTable.associatedUsersCount,
    associatedActiveUsersCount: usersTable.associatedActiveUsersCount,
    wallet: usersTable.wallet,
  };

  async getNewId(retryCount = 0): Promise<string> {
    if (retryCount > 10) {
      throw new Error(
        "Failed to generate a unique id after multiple attempts.",
      );
    }
    const newId = `AL${generateRandomDigits(8)}`;

    const existingUser = await db
      .select({
        id: usersTable.id,
      })
      .from(usersTable)
      .where(eq(usersTable.id, newId))
      .limit(1);

    if (existingUser.length > 0) {
      console.warn(`id ${newId} already exists. Retrying...`);
      return this.getNewId(retryCount + 1);
    }

    return newId;
  }

  async registerUsers(users: RegisterUser[]) {
    if (!users || users.length === 0)
      throw new Error("There must be at least one user");
    if (!Array.isArray(users))
      throw new Error("You can not pass me an object do you understand ?");
    const processedUsers = await Promise.all(
      users.map(async (user) => {
        const id = await this.getNewId();
        if (!user.password)
          throw new Error("User password was not given so exiting");
        const passwordHash = await bunPassword.hash(user.password);
        const { password, ...userWithoutPassword } = user;
        if (this.#isDev) console.warn(password);
        // now set up the tree as well
        return {
          ...userWithoutPassword,
          id,
          passwordHash,
        } as unknown as User;
      }),
    );
    try {
      const insertedData = await db
        .insert(usersTable)
        .values(processedUsers)
        .returning(this.#returnUserObject);

      await Promise.all(
        insertedData.map((user) =>
          treeService.addUser(user.id, user.sponsor, user.position),
        ),
      );

      return { success: true, users: insertedData };
    } catch (error) {
      console.error("Failed to register users:", error);
      throw new Error(
        `Failed to register users: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async loginUser({ id, password }: LoginUser) {
    try {
      const loggedInUser = await db
        .select({
          ...this.#returnUserObject,
          passwordHash: usersTable.passwordHash,
        })
        .from(usersTable)
        .where(eq(usersTable.id, id))
        .limit(1);

      if (!loggedInUser.length) throw new Error("INVALID USERNAME OR PASSWORD");
      const user = loggedInUser[0];
      const hash = user.passwordHash;
      if (!hash) throw new Error("INVALID USERNAME OR PASSWORD");
      const isMatch = await bunPassword.verify(password, hash);
      if (!isMatch) throw new Error("INVALID USERNAME OR PASSWORD is match");
      if (user.isBlocked) throw new Error("YOU HAVE BEEN BLOCKED BY THE ADMIN");
      const { passwordHash, ...userWithoutPassword } = user;
      if (this.#isDev) console.warn(passwordHash); // just for the eslint
      return {
        success: true,
        user: userWithoutPassword,
      };
    } catch (error) {
      throw new Error(
        `Login failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async getJwtString(id: string) {
    const payload = {
      id,
      exp: Math.floor(Date.now() / 1000) + 60 * this.#expireTimeInMinutes,
    };
    return await sign(payload, jwtSecret);
  }

  async setTokenCookie(c: Context, id: string) {
    const jwt = await this.getJwtString(id);
    return setCookie(c, "token", jwt, {
      path: "/",
      secure: this.#isDev ? false : true,
      httpOnly: true,
      sameSite: "strict",
      domain: this.#host.includes(":") ? this.#host.split(":")[0] : this.#host,
      expires: new Date(Date.now() + 60 * 1000 * this.#expireTimeInMinutes),
      maxAge: 60 * this.#expireTimeInMinutes,
    });
  }

  async getUser(id: string): Promise<SafeUser> {
    const user = await db
      .select(this.#returnUserObject)
      .from(usersTable)
      .where(eq(usersTable.id, id))
      .limit(1);
    if (!user[0]) throw new Error("USER DOES NOT EXIST");
    const safeUser = user[0] as SafeUser;
    return safeUser;
  }
}
export default UserService;
