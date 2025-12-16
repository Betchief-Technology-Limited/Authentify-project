import dotenv from "dotenv";
import http from 'http';
import app from "./src/app.js";
import { userDB, orgDB, serviceDB } from "./src/config/db.js";
import { initSocket } from "./src/config/socket.js";

dotenv.config();

const PORT = process.env.PORT || 3006;

async function start() {
    // Wait for all connections to be ready before starting the server
    const allConnections = [userDB, orgDB, serviceDB].map(
        (db) =>
            new Promise((resolve, reject) => {
                db.once("connected", resolve);
                db.on("error", reject);
            })
    );

    await Promise.all(allConnections);

    app.locals = { userDB, orgDB, serviceDB };

    // ✅ Attach socket.io to HTTP server
    const server = http.createServer(app);
    initSocket(server);

    server.listen(PORT, () => console.log(`🚀 Server listening on port ${PORT}`));
}

start();
