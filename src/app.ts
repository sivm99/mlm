import { Hono } from "hono";
import { poweredBy } from "hono/powered-by";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import { cors } from "hono/cors";
import routeIndex from "./routes";
const app = new Hono()
  .use(
    cors({
      origin: ["http://localhost:3000", process.env.FRONTEND_HOST || "*"],
      allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowHeaders: ["Content-Type", "Authorization"],
      credentials: true,
    }),
  )
  .use(
    poweredBy({
      serverName: "hono-by-sivam",
    }),
  )
  .use(secureHeaders())
  .use(logger())
  .get("/health", (c) => {
    return c.text("Hey I'm alive\n");
  });

app.basePath("/api/v1").route("/", routeIndex);

export default app;
