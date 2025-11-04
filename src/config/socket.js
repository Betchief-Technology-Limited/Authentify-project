import { Server } from "socket.io";
import { allowedOrigins } from "./corsConfig.js";

let io;

export const initSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: allowedOrigins,
            credentials: true
        }
    });

    io.on("connection", (socket) => {
        console.log("⚡ Client connected:", socket.id);
        socket.on("disconnect", () => console.log("❌ Client disconnected:", socket.id));
    });

    return io;
};

export const getIO = () => {
    if(!io) throw new Error("Socket.io not initialized!");
    return io;
}