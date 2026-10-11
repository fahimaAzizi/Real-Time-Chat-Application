
import "./App.css";

const rooms = [
  { id: 1, name: "general", icon: "#" },
  { id: 2, name: "technology", icon: "#" },
  { id: 3, name: "study-room", icon: "#" },
];

function App() {
  return (
    <main className="chat-app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">F</div>
          <div>
            <h1>F5 Chat</h1>
            <p>Stay connected</p>
          </div>
        </div>

        <div className="sidebar-section">
          <div className="section-heading">
            <span>YOUR ROOMS</span>
            <button className="add-room" aria-label="Add room">
              +
            </button>
          </div>

          <nav className="room-list" aria-label="Chat rooms">
            {rooms.map((room, index) => (
              <button
                className={`room-item ${index === 0 ? "active" : ""}`}
                key={room.id}
              >
                <span className="room-icon">{room.icon}</span>
                <span>{room.name}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="sidebar-bottom">
          <div className="avatar">G</div>
          <div className="user-details">
            <strong>Guest User</strong>
            <span>
              <i className="online-dot" /> Online
            </span>
          </div>
          <button className="profile-menu" aria-label="Profile menu">
            ⋯
          </button>
        </div>
      </aside>

      <section className="chat-panel">
        <header className="chat-header">
          <div>
            <span className="eyebrow">ROOM</span>
            <h2># general</h2>
          </div>
          <div className="header-status">
            <i className="online-dot" />
            Ready to connect
          </div>
        </header>

        <div className="messages">
          <div className="welcome">
            <div className="welcome-icon">#</div>
            <h2>Welcome to #general</h2>
            <p>
              This is the beginning of your conversation.
              Your messages will appear here.
            </p>
          </div>
        </div>

        <form className="message-form">
          <input
            type="text"
            placeholder="Your message will go here..."
            aria-label="Message"
            disabled
          />
          <button type="button" disabled>
            Send ↑
          </button>
        </form>
        <p className="composer-hint">
          Real-time messaging will be added in a later step.
        </p>
      </section>
    </main>
  );
}

export default App;
