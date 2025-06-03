import app from "@/app";

const PORT = Bun.env.PORT || 5000;
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  process.exit(1); // Exit and let process manager restart
});

Bun.serve({
  fetch: app.fetch,
  port: Number(PORT),
});
