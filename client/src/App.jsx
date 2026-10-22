
import { useEffect, useState } from "react";
import api from "./api";
import { socket } from "./socket";
import "./App.css";
const API_URL =
  import.meta.env.VITE_SERVER_URL || "http://localhost:5000";
const ROOMS = ["general", "technology", "study-room"];

export default function App() {
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const [user, setUser] = useState(null);
  const [token, setToken] = useState("");

  const [socketStatus, setSocketStatus] = useState("Disconnected");
  const [activeRoom, setActiveRoom] = useState("general");
  const [roomStatus, setRoomStatus] = useState("");

  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [historyLoading, setHistoryLoading] = useState(false);

  // Register or log in
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
        setPassword("");
        setMessage("Login successful!");
      }

        setToken(response.data.token);
        setUser(response.data.user);
        setPassword("");
        setMessage("Login successful!");
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

  // Connect Socket.IO after login
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
      socket.authToken = token;
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.disconnect();
    };
  }, [token]);

  // Listen for new messages
  useEffect(() => {
    function handleNewMessage(newMessage) {
      setMessages((current) => {
        if (current.some((item) => item.id === newMessage.id)) {
          return current;
        }

        return [...current, newMessage];
      });
    }

    socket.on("message:new", handleNewMessage);

    return () => {
      socket.off("message:new", handleNewMessage);
    };
  }, []);

  // Join room and load saved messages
  useEffect(() => {
    if (!token || socketStatus !== "Connected") {
      return;
    }

    let cancelled = false;

    async function loadRoom() {
      setHistoryLoading(true);
      setRoomStatus("");

      socket.emit("room:join", activeRoom, async (response) => {
        if (cancelled) return;

        if (!response?.success) {
          setRoomStatus(response?.message || "Could not join room.");
          setHistoryLoading(false);
          return;
        }

        try {
          const result = await api.get(
            `/rooms/${activeRoom}/messages`
          );

          if (cancelled) return;

          setMessages((current) => {
            const incoming = result.data.messages || [];
            const byId = new Map();

            for (const item of current) byId.set(item.id, item);
            for (const item of incoming) byId.set(item.id, item);

            return Array.from(byId.values()).sort(
              (a, b) =>
                new Date(a.createdAt).getTime() -
                new Date(b.createdAt).getTime()
            );
          });

          setRoomStatus(`Joined ${activeRoom}`);
        } catch (error) {
          if (!cancelled) {
            setRoomStatus(
              error.response?.data?.message ||
                "Could not load saved messages."
            );
          }
        } finally {
          if (!cancelled) setHistoryLoading(false);
        }
      });
    }

    loadRoom();

    return () => {
      cancelled = true;
    };
  }, [token, socketStatus, activeRoom]);

  function joinRoom(roomName) {
    if (roomName === activeRoom) return;
    setActiveRoom(roomName);
    setDraft("");
  }

  // Send a message
  function sendMessage(event) {
    event.preventDefault();

    const content = draft.trim();

    if (!content || !socket.connected) {
      setRoomStatus("Connect to the server before sending messages.");
      return;
    }

    socket.emit(
      "message:send",
      { room: activeRoom, content },
      (response) => {
        if (response?.success) {
          setDraft("");
          setRoomStatus("");
        } else {
          setRoomStatus(response?.message || "Message could not be sent.");
        }
      }
    );
  }

  function logout() {
    socket.disconnect();
    setUser(null);
    setToken("");
    setPassword("");
    setMessages([]);
    setDraft("");
    setMessage("You have logged out.");
    setSocketStatus("Disconnected");
  }

  // Login and registration screen
  if (!user) {
    return (
      <main className="app-shell">
        <section className="auth-card">
          <div className="logo">F5</div>
          <p className="eyebrow">YOUR SPACE. YOUR CONVERSATIONS.</p>

          <h1>
            {mode === "login" ? "Welcome back" : "Create your account"}
          </h1>

          <p className="subtitle">
            {mode === "login"
              ? "Sign in to continue to your workspace."
              : "Join your team and start connecting."}
          </p>

          <div className="auth-tabs">
            <button
              className={mode === "login" ? "tab active" : "tab"}
              type="button"
              onClick={() => {
                setMode("login");
                setMessage("");
              }}
            >
              Login
            </button>

            <button
              className={mode === "register" ? "tab active" : "tab"}
              type="button"
              onClick={() => {
                setMode("register");
                setMessage("");
              }}
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

  // Chat workspace
  return (
    <main className="workspace">
      <aside className="sidebar">
        <div className="brand">
          <div className="logo">F5</div>
          <div>
            <h2>F5 Chat</h2>
            <p className="subtitle">Your workspace</p>
          </div>
        </div>

        <h3 className="sidebar-heading">CHAT ROOMS</h3>

        <nav className="room-list" aria-label="Chat rooms">
          {ROOMS.map((room) => (
            <button
              key={room}
              className={
                activeRoom === room
                  ? "room-button active"
                  : "room-button"
              }
              onClick={() => joinRoom(room)}
            >
              <span>#</span> {room}
            </button>
          ))}
        </nav>

        <div className="profile">
          <div className="avatar">
            {user.username.charAt(0).toUpperCase()}
          </div>
          <div className="profile-info">
            <strong>{user.username}</strong>
            <span>{socketStatus}</span>
          </div>
          <button className="logout-button" onClick={logout}>
            Log out
          </button>
        </div>
      </aside>

      <section className="chat-area">
        <header className="chat-header">
          <div>
            <p className="eyebrow">CURRENT CHANNEL</p>
            <h1># {activeRoom}</h1>
          </div>
          <span className="connection-badge">
            <span className="online-dot" />
            {socketStatus}
          </span>
        </header>

        <div className="messages-area" aria-live="polite">
          {historyLoading && (
            <p className="empty-state">Loading messages...</p>
          )}

          {!historyLoading &&
            messages.filter((item) => item.room === activeRoom).length ===
              0 && (
              <div className="empty-state">
                <div className="empty-icon">#</div>
                <h2>Welcome to #{activeRoom}</h2>
                <p>Start the conversation. Your messages will appear here.</p>
              </div>
            )}

          {messages
            .filter((item) => item.room === activeRoom)
            .map((item) => (
              <article className="message" key={item.id}>
                <div className="message-avatar">
                  {(item.sender || "G").charAt(0).toUpperCase()}
                </div>
                <div className="message-content">
                  <div className="message-meta">
                    <strong>{item.sender || "Guest"}</strong>
                    <time>
                      {new Date(item.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </time>
                  </div>
                  <p>{item.content}</p>
                </div>
              </article>
            ))}
        </div>

        <footer className="composer-area">
          <p className="feedback" role="status">{roomStatus}</p>
          <form className="message-form" onSubmit={sendMessage}>
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={`Message #${activeRoom}`}
              aria-label="Write a message"
              maxLength={2000}
              disabled={socketStatus !== "Connected"}
            />
            <button
              className="primary-button"
              type="submit"
              disabled={!draft.trim() || socketStatus !== "Connected"}
            >
              Send
            </button>
          </form>
          <p className="composer-hint">
            Press Send to share your message with this room.
          </p>
        </footer>
      </section>
    </main>
  );
}
