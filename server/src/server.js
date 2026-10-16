
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

app.use(cors({ origin: CLIENT_URL }));
app.use(express.json());
app.use("/api/auth", authRoutes);

const io = new Server(server, {
  cors: {
    origin: CLIENT_URL,
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

// Retrieve saved messages for a room
app.get("/api/rooms/:roomName/messages", async (req, res) => {
  try {
    const { roomName } = req.params;

    if (!allowedRooms.includes(roomName)) {
      return res.status(400).json({ message: "Invalid room." });
    }

    const room = await prisma.room.findFirst({
      where: { name: roomName },
      orderBy: { createdAt: "asc" },
    });

    if (!room) {
      return res.json({ messages: [] });
    }

    const messages = await prisma.message.findMany({
      where: { roomId: room.id },
      orderBy: { createdAt: "asc" },
      take: 100,
      include: {
        sender: {
          select: { id: true, username: true },
        },
      },
    });

    res.json({
      messages: messages.map((message) => ({
        id: message.id,
        room: roomName,
        content: message.content,
        sender: message.sender.username,
        createdAt: message.createdAt,
      })),
    });
  } catch (error) {
    console.error("Message history error:", error.message);
    res.status(500).json({ message: "Could not load message history." });
  }
});

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.emit("connection:ready", {
    message: "Connected to F5 Chat!",
  });

  socket.on("room:join", async (roomName, callback) => {
    try {
      if (!allowedRooms.includes(roomName)) {
        return callback?.({
          success: false,
          message: "Invalid room.",
        });
      }

      // Temporary room owner until authenticated room management is added.
      let room = await prisma.room.findFirst({
        where: { name: roomName },
        orderBy: { createdAt: "asc" },
      });

      if (!room) {
        const user = await prisma.user.findFirst({
          orderBy: { createdAt: "asc" },
        });

        if (!user) {
          return callback?.({
            success: false,
            message: "Register an account before joining chat rooms.",
          });
        }

        room = await prisma.room.create({
          data: {
            name: roomName,
            creatorId: user.id,
          },
        });
      }

      for (const name of allowedRooms) {
        socket.leave(name);
      }

      socket.join(roomName);

      console.log(`${socket.id} joined ${roomName}`);

      callback?.({
        success: true,
        room: roomName,
        message: `Joined ${roomName}`,
      });
    } catch (error) {
      console.error("Room join error:", error.message);
      callback?.({
        success: false,
        message: "Could not join the room. Check your database.",
      });
    }
  });

  socket.on("message:send", async (data, callback) => {
    try {
      const roomName = data?.room;
      const content = data?.content;

      if (!allowedRooms.includes(roomName)) {
        return callback?.({
          success: false,
          message: "Invalid room.",
        });
      }

      if (!socket.rooms.has(roomName)) {
        return callback?.({
          success: false,
          message: "Join the room before sending messages.",
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

      const room = await prisma.room.findFirst({
        where: { name: roomName },
      });

      const user = await prisma.user.findFirst({
        orderBy: { createdAt: "asc" },
      });

      if (!room || !user) {
        return callback?.({
          success: false,
          message: "Room or user not found.",
        });
      }

      const savedMessage = await prisma.message.create({
        data: {
          content: content.trim(),
          roomId: room.id,
          senderId: user.id,
        },
        include: {
          sender: {
            select: { username: true },
          },
        },
      });

      const message = {
        id: savedMessage.id,
        room: roomName,
        content: savedMessage.content,
        sender: savedMessage.sender.username,
        createdAt: savedMessage.createdAt,
      };

      io.to(roomName).emit("message:new", message);

      callback?.({ success: true });
    } catch (error) {
      console.error("Message save error:", error.message);
      callback?.({
        success: false,
        message: "Message could not be saved.",
      });
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`F5 server running on port ${PORT}`);
});
