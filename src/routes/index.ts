import { Hono } from "hono";
import authRouter from "./auth.routes";
import userRouter from "./user.routes";
import walletRouter from "./wallet.routes";
import addressRouter from "./address.routes";
import arHistoryRouter from "./ar.history.routes";
import rewardRouter from "./reward.routes";
const routeIndex = new Hono().get("/", (c) =>
  c.text("Hellow what are you doing"),
);

routeIndex.basePath("/auth").route("/", authRouter);
routeIndex.basePath("/user").route("/", userRouter);
routeIndex.basePath("/wallet").route("/", walletRouter);
routeIndex.basePath("/address").route("/", addressRouter);
routeIndex.basePath("/ar-history").route("/", arHistoryRouter);
routeIndex.basePath("/reward").route("/", rewardRouter);
export default routeIndex;
