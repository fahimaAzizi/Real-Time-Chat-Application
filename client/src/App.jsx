
import { useState } from "react";
import api from "./api";
import "./App.css";
import { useEffect } from "react";
import { socket } from "./socket";

export default function App() {
  const [activeRoom, setActiveRoom] = useState("general");
const [roomStatus, setRoomStatus] = useState("");
const [socketStatus, setSocketStatus] = useState("Disconnected");


function joinRoom(roomName) {
  if (!socket.connected) {
    setRoomStatus("Connect to the server first.");
    return;
  }

  socket.emit("room:join", roomName, (response) => {
    if (response?.success) {
      setActiveRoom(roomName);
      setRoomStatus(`Joined ${roomName}`);
    } else {
      setRoomStatus(response?.message || "Could not join room.");
    }
  });
}

useEffect(() => {
  if (!token) {
    socket.disconnect();
    setSocketStatus("Disconnected");
    return;
  }

  function handleConnect() {
    setSocketStatus("Connected");
  }

  function handleDisconnect() {
    setSocketStatus("Disconnected");
  }

  socket.on("connect", handleConnect);
  socket.on("disconnect", handleDisconnect);
  socket.connect();

  return () => {
    socket.off("connect", handleConnect);
    socket.off("disconnect", handleDisconnect);
    socket.disconnect();
  };
}, [token]);

  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [token, setToken] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      if (mode === "register") {
        await api.post("/auth/register", {
          username,
          email,
          password,
        });

        setMessage("Account created! You can now log in.");
        setMode("login");
        setPassword("");
      } else {
        const response = await api.post("/auth/login", {
          email,
          password,
        });

        setToken(response.data.token);
        setUser(response.data.user);
        setMessage("Login successful!");
        setPassword("");
      }
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          "Something went wrong. Check your server."
      );
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    setUser(null);
    setToken("");
    setPassword("");
    setMessage("You have logged out.");
  }

  if (user) {
    return (
      <main className="app-shell">
        <section className="auth-card">
          <div className="logo">F5</div>
          <p className="eyebrow">WELCOME TO YOUR WORKSPACE</p>
          <h1>Hello, {user.username}!</h1>
          <p className="subtitle">{user.email}</p>
          <p className="status">● You are logged in</p>
          <p className="subtitle">
            Server connection: {socketStatus}
          </p>
          Your chat workspace is ready for the next step.
        
          <button className="primary-button" onClick={logout}>
            Log out
          </button>
          <p className="feedback">{message}</p>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <section className="auth-card">
        <div className="logo">F5</div>
        <p className="eyebrow">YOUR SPACE. YOUR CONVERSATIONS.</p>
        <h1>{mode === "login" ? "Welcome back" : "Create your account"}</h1>
        <p className="subtitle">
          {mode === "login"
            ? "Sign in to continue to your workspace."
            : "Join your team and start connecting."}
        </p>

        <div className="auth-tabs">
          <button
            className={mode === "login" ? "tab active" : "tab"}
            onClick={() => {
              setMode("login");
              setMessage("");
            }}
            type="button"
          >
            Login
          </button>
          <button
            className={mode === "register" ? "tab active" : "tab"}
            onClick={() => {
              setMode("register");
              setMessage("");
            }}
            type="button"
          >
            Register
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {mode === "register" && (
            <label>
              Username
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="Choose a username"
                autoComplete="username"
                required
              />
            </label>
          )}

          <label>
            Email address
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 8 characters"
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              minLength={8}
              required
            />
          </label>

          <button className="primary-button" disabled={loading}>
            {loading
              ? "Please wait..."
              : mode === "login"
                ? "Sign in"
                : "Create account"}
          </button>
        </form>

        <p className="feedback" role="status">{message}</p>
        <p className="footer-note">Secure conversations start here.</p>
      </section>
    </main>
  );
}
