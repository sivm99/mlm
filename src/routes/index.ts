import { Hono } from "hono";
import authRouter from "./auth.routes";
import userRouter from "./user.routes";
import referralRoutes from "./referral.routes";
const routeIndex = new Hono().get("/", (c) =>
  c.text("Hellow what are you doing"),
);

routeIndex.basePath("/auth").route("/", authRouter);
routeIndex.basePath("/user").route("/", userRouter);
routeIndex.basePath("/ref").route("/", referralRoutes);

export default routeIndex;
