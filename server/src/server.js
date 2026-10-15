
const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
require("dotenv").config();
const authRoutes = require("./authRoutes");
const prisma = require("./prisma");

const app = express();
const server = http.createServer(app);

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
  }),
);
app.use("/api/auth", authRoutes);

app.use(express.json());

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

app.get("/", (req, res) => {
  res.json({ message: "F5 Chat API is running!" });
});

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



const allowedRooms = ["general", "technology", "study-room"];

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.emit("connection:ready", {
    message: "Connected to F5 Chat!",
  });

  socket.on("room:join", (roomName, callback) => {
    if (!allowedRooms.includes(roomName)) {
      return callback?.({
        success: false,
        message: "Invalid room.",
      });
    }

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

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});



const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`F5 server running on port ${PORT}`);
});
