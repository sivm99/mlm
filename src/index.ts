import app from "@/app";
// import { startCrons, stopCrons } from "@/lib/jobs/app";

const PORT = Bun.env.PORT || 5000;
Bun.serve({
  fetch: app.fetch,
  port: Number(PORT),
});

// startCrons();
// process.on("SIGTERM", stopCrons);
// process.on("SIGINT", stopCrons);

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  process.exit(1);
});
