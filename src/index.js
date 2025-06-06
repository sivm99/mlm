"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var app_1 = require("@/app");
var app_2 = require("@/lib/jobs/app");
var PORT = Bun.env.PORT || 5000;
process.on("uncaughtException", function (error) {
    console.error("Uncaught Exception:", error);
    process.exit(1);
});
Bun.serve({
    fetch: app_1.default.fetch,
    port: Number(PORT),
});
(0, app_2.startCrons)();
process.on("SIGTERM", app_2.stopCrons);
process.on("SIGINT", app_2.stopCrons);
