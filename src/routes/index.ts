import { Hono } from "hono";
import authRouter from "./auth.routes";
import userRouter from "./user.routes";
const routeIndex = new Hono().get("/", (c) =>
  c.text("Hellow what are you doing"),
);

routeIndex.basePath("/auth").route("/", authRouter);
routeIndex.basePath("/user").route("/", userRouter);

export default routeIndex;
