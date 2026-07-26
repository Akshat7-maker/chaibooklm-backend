import app from "./app.js";
import { config } from "./config/index.js";
import { initSocketServer } from "./sockets/server.js";
import { db_connect } from "./utils/db.js";
import http from "http";
import "./worker.js";
db_connect()
  .then(() => {
    const httpServer = http.createServer(app);
    initSocketServer(httpServer);
    httpServer.listen(config.port, () => {
      console.log(`[server] listening on port ${config.port} in ${config.nodeEnv} mode`);
    });
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
