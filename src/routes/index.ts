import { Hono } from "hono";
import authRouter from "./auth.routes";

const routeIndex = new Hono().get("/", (c) =>
  c.text("Hellow what are you doing"),
);

routeIndex.basePath("/auth").route("/", authRouter);

export default routeIndex;
