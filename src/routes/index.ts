import { Hono } from "hono";

const routeIndex = new Hono().get("/", (c) =>
  c.text("Hellow what are you doing"),
);

export default routeIndex;
