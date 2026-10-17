
const express = require("express");
const http = require("http");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { Server } = require("socket.io");
require("dotenv").config();

const authRoutes = require("./authRoutes");
app.use("/api/auth", authRoutes);


const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";
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

function authenticateToken(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Please log in." });
  }

  try {
    const decoded = jwt.verify(
      header.slice(7),
      process.env.JWT_SECRET
    );

    req.userId = decoded.userId;
    next();
  } catch {
    return res.status(401).json({
      message: "Invalid or expired login token.",
    });
  }
}

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
    console.error("Database health check:", error.message);
    res.status(500).json({ message: "Database connection failed." });
  }
});

// Load history only for authenticated users
app.get(
  "/api/rooms/:roomName/messages",
  authenticateToken,
  async (req, res) => {
    try {
      const { roomName } = req.params;

      if (!allowedRooms.includes(roomName)) {
        return res.status(400).json({ message: "Invalid room." });
      }

      const room = await prisma.room.findFirst({
        where: { name: roomName },
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
        messages: messages.map((item) => ({
          id: item.id,
          room: roomName,
          content: item.content,
          sender: item.sender.username,
          createdAt: item.createdAt,
        })),
      });
    } catch (error) {
      console.error("Message history error:", error.message);
      res.status(500).json({
        message: "Could not load message history.",
      });
    }
  }
);

// Authenticate every Socket.IO connection
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;

    if (!token || !process.env.JWT_SECRET) {
      return next(new Error("Authentication required."));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, username: true, email: true },
    });

    if (!user) {
      return next(new Error("User account not found."));
    }

    socket.data.user = user;
    next();
  } catch {
    next(new Error("Invalid or expired login token."));
  }
});

io.on("connection", (socket) => {
  const user = socket.data.user;

  console.log(`${user.username} connected: ${socket.id}`);

  socket.emit("connection:ready", {
    message: `Welcome, ${user.username}!`,
  });

  socket.on("room:join", async (roomName, callback) => {
    try {
      if (!allowedRooms.includes(roomName)) {
        return callback?.({
          success: false,
          message: "Invalid room.",
        });
      }

      let room = await prisma.room.findFirst({
        where: { name: roomName },
      });

      if (!room) {
        room = await prisma.room.create({
          data: {
            name: roomName,
            creatorId: user.id,
          },
        });
      }

      await prisma.roomMember.upsert({
        where: {
          userId_roomId: {
            userId: user.id,
            roomId: room.id,
          },
        },
        update: {},
        create: {
          userId: user.id,
          roomId: room.id,
        },
      });

      for (const name of allowedRooms) {
        socket.leave(name);
      }

      socket.join(roomName);

      callback?.({
        success: true,
        room: roomName,
        message: `Joined ${roomName}`,
      });
    } catch (error) {
      console.error("Room join error:", error.message);
      callback?.({
        success: false,
        message: "Could not join room.",
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
          message: "Join the room first.",
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
          message: "Message is too long.",
        });
      }

      const room = await prisma.room.findFirst({
        where: { name: roomName },
      });

      if (!room) {
        return callback?.({
          success: false,
          message: "Room not found.",
        });
      }

      const membership = await prisma.roomMember.findUnique({
        where: {
          userId_roomId: {
            userId: user.id,
            roomId: room.id,
          },
        },
      });

      if (!membership) {
        return callback?.({
          success: false,
          message: "Join the room before sending messages.",
        });
      }

      const saved = await prisma.message.create({
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

      io.to(roomName).emit("message:new", {
        id: saved.id,
        room: roomName,
        content: saved.content,
        sender: saved.sender.username,
        createdAt: saved.createdAt,
      });

      callback?.({ success: true });
    } catch (error) {
      console.error("Message send error:", error.message);
      callback?.({
        success: false,
        message: "Could not save the message.",
      });
    }
  });

  socket.on("disconnect", () => {
    console.log(`${user.username} disconnected.`);
  });
});

server.listen(PORT, () => {
  console.log(`F5 server running on port ${PORT}`);
});
