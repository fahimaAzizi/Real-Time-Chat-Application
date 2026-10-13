
const express = require("express");
const bcrypt = require("bcryptjs");
const prisma = require("./prisma");

const router = express.Router();

router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        message: "Username, email, and password are required.",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: "Password must be at least 8 characters.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedUsername = username.trim();

    if (!normalizedUsername || !normalizedEmail) {
      return res.status(400).json({
        message: "Username and email cannot be empty.",
      });
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: normalizedEmail },
          { username: normalizedUsername },
        ],
      },
    });

    if (existingUser) {
      return res.status(409).json({
        message: "Username or email is already registered.",
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        username: normalizedUsername,
        email: normalizedEmail,
        passwordHash,
      },
      select: {
        id: true,
        username: true,
        email: true,
        createdAt: true,
      },
    });

    return res.status(201).json({
      message: "Account created successfully!",
      user,
    });
  } catch (error) {
    console.error("Registration error:", error.message);

    return res.status(500).json({
      message: "Unable to create account. Please try again.",
    });
  }
});

module.exports = router;
