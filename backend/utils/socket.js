import { Server } from "socket.io";

let io;
const adminSockets = new Map();

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:5173",
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    socket.on("register", (userId) => {
      socket.join(userId); // personal room
    });

    socket.on("registerAdmin", (adminId) => {
      adminSockets.set(adminId, socket.id);
      socket.join("admins");
    });

    socket.on("disconnect", () => {
      for (const [adminId, sockId] of adminSockets.entries()) {
        if (sockId === socket.id) adminSockets.delete(adminId);
      }
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) throw new Error("Socket.io not initialized!");
  return io;
};
