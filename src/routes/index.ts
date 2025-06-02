import { Hono } from "hono";
import authRouter from "./auth.routes";
import userRouter from "./user.routes";
import referralRoutes from "./referral.routes";
import walletRoutes from "./wallet.routes";
import addressRouter from "./address.routes";
import arHistoryRouter from "./ar.history.routes";
const routeIndex = new Hono().get("/", (c) =>
  c.text("Hellow what are you doing"),
);

routeIndex.basePath("/auth").route("/", authRouter);
routeIndex.basePath("/user").route("/", userRouter);
routeIndex.basePath("/ref").route("/", referralRoutes);
routeIndex.basePath("/wallet").route("/", walletRoutes);
routeIndex.basePath("/address").route("/", addressRouter);
routeIndex.basePath("/ar-history").route("/", arHistoryRouter);

export default routeIndex;
