
const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
require("dotenv").config();

const authRoutes = require("./authRoutes");
const prisma = require("./prisma");

const app = express();
const server = http.createServer(app);

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";
const PORT = process.env.PORT || 5000;

const allowedRooms = ["general", "technology", "study-room"];

// Middleware
app.use(
  cors({
    origin: CLIENT_URL,
  }),
);

app.use(express.json());

// Authentication routes
app.use("/api/auth", authRoutes);

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: CLIENT_URL,
    methods: ["GET", "POST"],
  },
});

// API home
app.get("/", (req, res) => {
  res.json({
    message: "F5 Chat API is running!",
  });
});

// Database health check
app.get("/api/health/db", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    res.json({
      status: "success",
      message: "Database connection is working!",
    });
  } catch (error) {
    console.error("Database health check failed:", error.message);

    res.status(500).json({
      status: "error",
      message: "Database connection failed.",
    });
  }
});

// Socket.IO connections
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.emit("connection:ready", {
    message: "Connected to F5 Chat!",
  });

  // Join a chat room
  socket.on("room:join", (roomName, callback) => {
    if (!allowedRooms.includes(roomName)) {
      return callback?.({
        success: false,
        message: "Invalid room.",
      });
    }

    // Leave other F5 chat rooms
    for (const room of allowedRooms) {
      socket.leave(room);
    }

    socket.join(roomName);

    console.log(`${socket.id} joined ${roomName}`);

    callback?.({
      success: true,
      room: roomName,
      message: `Joined ${roomName}`,
    });
  });

  // Send a message to everyone in the selected room
  socket.on("message:send", (data, callback) => {
    const roomName = data?.room;
    const content = data?.content;

    if (!allowedRooms.includes(roomName)) {
      return callback?.({
        success: false,
        message: "Invalid room.",
      });
    }

    if (typeof content !== "string" || !content.trim()) {
      return callback?.({
        success: false,
        message: "Message cannot be empty.",
      });
    }

    if (content.trim().length > 2000) {
      return callback?.({
        success: false,
        message: "Message must be 2000 characters or fewer.",
      });
    }

    if (!socket.rooms.has(roomName)) {
      return callback?.({
        success: false,
        message: "Join the room before sending messages.",
      });
    }

    const message = {
      id: `${Date.now()}-${socket.id}`,
      room: roomName,
      content: content.trim(),
      sender: "Guest",
      createdAt: new Date().toISOString(),
    };

    io.to(roomName).emit("message:new", message);

    callback?.({
      success: true,
    });
  });

  // Disconnect
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`F5 server running on port ${PORT}`);
});
