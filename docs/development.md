# AI Roundtable Discussion Platform - Development Guide

## Project Overview

This is a full-stack web application that simulates AI-powered online roundtable discussions for educational purposes. The platform is 100% free and open-source, using only free tools and services.

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Client  │    │  Node.js Server │    │   SQLite DB     │
│                 │    │                 │    │                 │
│  - Login Page   │◄──►│  - Socket.io    │◄──►│  - Sessions     │
│  - Lobby Page   │    │  - Express API  │    │  - Participants │
│  - Roundtable   │    │  - AI Topics    │    │  - Analytics    │
│                 │    │  - Room Manager │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │ Hugging Face AI │
                    │  (Topic Gen.)   │
                    └─────────────────┘
```

## Tech Stack

### Frontend (Client)
- **React 18** - Modern UI library
- **Vite** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **React Router** - Client-side routing
- **Socket.io Client** - Real-time communication
- **Lucide React** - Beautiful icons

### Backend (Server)
- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **Socket.io** - Real-time WebSocket communication
- **SQLite** - Lightweight database
- **Helmet** - Security middleware
- **CORS** - Cross-origin resource sharing

### AI & External Services
- **Hugging Face API** - Free AI text generation
- **WebRTC** - Browser audio communication
- **Free deployment** - Vercel (frontend) + Render (backend)

## Features

### 1. User Authentication
- Simple ID-based login
- Anonymous display names
- No complex user management needed

### 2. Lobby System
- Wait for minimum participants (2+)
- Audio permission setup
- Real-time participant updates

### 3. Roundtable Interface
- Visual circular table with participant chairs
- Dynamic chair placement based on participant count
- Active speaker highlighting
- Turn-based speaking system

### 4. AI Topic Generation
- Hugging Face API integration for dynamic topics
- Fallback to curated educational topics
- Topic categories and discussion questions

### 5. Speaking Management
- Timer-based turns (default 60 seconds)
- Automatic speaker rotation
- Audio level monitoring
- Mute/unmute controls

### 6. Real-time Communication
- Socket.io for instant updates
- WebRTC for voice communication
- Room-based session management

## Development Setup

### Prerequisites
- Node.js 18+ installed
- Git for version control
- Modern web browser with WebRTC support

### Quick Start

1. **Install dependencies**:
   ```bash
   npm run install:all
   ```

2. **Set up environment variables**:
   ```bash
   # Copy example files
   cp client/.env.example client/.env
   cp server/.env.example server/.env
   
   # Edit the .env files with your settings
   ```

3. **Start development servers**:
   ```bash
   npm run dev
   ```

4. **Access the application**:
   - Frontend: http://localhost:5173
   - Backend: http://localhost:3001

### Environment Variables

#### Client (.env)
```env
VITE_API_URL=http://localhost:3001
VITE_SOCKET_URL=http://localhost:3001
VITE_HUGGINGFACE_API_KEY=your_key_here (optional)
```

#### Server (.env)
```env
PORT=3001
HUGGINGFACE_API_KEY=your_key_here (optional)
DATABASE_URL=./data/roundtable.db
MIN_PARTICIPANTS=2
DEFAULT_SPEAKING_TIME=60
```

## Project Structure

```
ai-roundtable-discussion/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── contexts/       # React contexts (Auth, Socket, Audio)
│   │   ├── pages/          # Main application pages
│   │   └── App.jsx         # Main app component
│   ├── public/             # Static assets
│   └── package.json
├── server/                 # Node.js backend
│   ├── src/
│   │   ├── ai/             # AI topic generation
│   │   ├── database/       # SQLite database management
│   │   ├── routes/         # Express API routes
│   │   ├── socket/         # Socket.io handlers
│   │   └── server.js       # Main server file
│   └── package.json
├── docs/                   # Documentation
└── README.md
```

## Core Components

### Client Components

#### `LoginPage.jsx`
- User authentication form
- Anonymous name generation
- Input validation

#### `LobbyPage.jsx`
- Waiting area for participants
- Audio setup and permissions
- Real-time participant list

#### `RoundtablePage.jsx`
- Main discussion interface
- Integrates all discussion components

#### `RoundtableView.jsx`
- Visual representation of the roundtable
- Dynamic chair positioning
- Active speaker highlighting

#### Context Providers

#### `AuthContext.jsx`
- User authentication state
- Login/logout functionality
- Local storage persistence

#### `SocketContext.jsx`
- WebSocket connection management
- Real-time event handling
- Room management

#### `AudioContext.jsx`
- WebRTC audio management
- Microphone permissions
- Audio level monitoring

### Server Modules

#### `socketHandlers.js`
- Real-time event management
- Room joining/leaving
- Speaking turn management
- Timer coordination

#### `roomManager.js`
- In-memory room state management
- Participant tracking
- Discussion state coordination

#### `topicGenerator.js`
- AI topic generation (Hugging Face)
- Fallback topic system
- Topic categorization

#### `database.js`
- SQLite database operations
- Session analytics
- Participant tracking

## Real-time Communication Flow

### 1. User Login & Join Lobby
```
Client                    Server
  │                        │
  │── login(userData) ────►│
  │◄── authenticated ──────│
  │                        │
  │── connect socket ─────►│
  │── join-room('general')►│
  │◄── participants-update─│
```

### 2. Discussion Start
```
Client                    Server                   AI
  │                        │                       │
  │── user-ready ─────────►│                       │
  │                        │── generate topic ───►│
  │                        │◄── topic response ───│
  │◄── discussion-started ─│                       │
  │◄── speaker-changed ────│                       │
```

### 3. Speaking Turn Management
```
Client                    Server
  │                        │
  │◄── timer-update ───────│ (every second)
  │                        │
  │                        │ (time expires)
  │◄── speaker-changed ────│
  │                        │
  │── next-speaker ───────►│ (manual advance)
```

## AI Integration

### Hugging Face Setup

1. **Get API Key**:
   - Visit [Hugging Face](https://huggingface.co)
   - Create free account
   - Generate API token

2. **Configure Environment**:
   ```env
   HUGGINGFACE_API_KEY=hf_your_token_here
   ```

3. **Fallback System**:
   - If API fails, uses predefined topics
   - No interruption to user experience
   - Educational topics across multiple categories

### Topic Categories
- Education & Learning
- Technology & Innovation
- Health & Wellness
- Environment & Sustainability
- Culture & Society
- Career & Professional Development
- Personal Growth

## Database Schema

### Sessions Table
```sql
sessions (
  id TEXT PRIMARY KEY,
  room_id TEXT,
  topic_title TEXT,
  participant_count INTEGER,
  started_at DATETIME,
  ended_at DATETIME,
  duration_seconds INTEGER,
  rounds_completed INTEGER
)
```

### Participants Table
```sql
participants (
  id TEXT PRIMARY KEY,
  session_id TEXT,
  user_id TEXT,
  anonymous_name TEXT,
  campus TEXT,
  location TEXT,
  joined_at DATETIME,
  speaking_time_seconds INTEGER
)
```

## API Endpoints

### Public Endpoints
- `GET /health` - Health check
- `GET /api/topics` - Get all topics
- `GET /api/topics/generate` - Generate new topic
- `GET /api/config` - Public configuration

### Analytics Endpoints
- `GET /api/analytics/sessions` - Session analytics
- `GET /api/analytics/topics` - Topic usage stats
- `GET /api/analytics/stats` - Server statistics

## Security Considerations

### Client-side
- Input validation on all forms
- XSS prevention with React's built-in protection
- No sensitive data in localStorage

### Server-side
- Helmet.js for security headers
- CORS configuration
- Input sanitization
- Rate limiting (recommended for production)

### WebRTC
- Secure media streams
- No persistent audio recording
- User consent for microphone access

## Performance Optimizations

### Frontend
- Lazy loading of routes
- Memoized components where appropriate
- Efficient re-renders with proper dependency arrays

### Backend
- In-memory room management for speed
- SQLite for lightweight persistence
- Efficient Socket.io event handling

### Network
- WebSocket for real-time updates
- RESTful API for stateless operations
- Minimal data transfer

## Testing Strategy

### Manual Testing Checklist

#### Authentication Flow
- [ ] Valid login with all fields
- [ ] Input validation errors
- [ ] Anonymous name suggestions
- [ ] Login persistence

#### Lobby Functionality
- [ ] Participant join/leave
- [ ] Audio permission handling
- [ ] Ready state management
- [ ] Discussion start trigger

#### Roundtable Discussion
- [ ] Visual chair positioning
- [ ] Speaker highlighting
- [ ] Timer functionality
- [ ] Turn advancement
- [ ] Audio controls

#### Cross-browser Testing
- [ ] Chrome/Chromium
- [ ] Firefox
- [ ] Safari (macOS)
- [ ] Edge

### Automated Testing (Future Enhancement)
- Unit tests for utility functions
- Integration tests for Socket.io events
- E2E tests for user flows

## Deployment Guide

See [deployment.md](./deployment.md) for detailed deployment instructions for:
- Vercel (Frontend)
- Render (Backend)
- Environment configuration
- Domain setup

## Contributing

### Code Style
- Use ESLint configuration
- Follow React best practices
- Add comments for complex logic
- Keep functions small and focused

### Git Workflow
```bash
git checkout -b feature/your-feature
# Make changes
git commit -m "Add: your feature description"
git push origin feature/your-feature
# Create pull request
```

## Troubleshooting

### Common Issues

#### Socket Connection Failed
- Check if backend server is running
- Verify CORS configuration
- Check network connectivity

#### Audio Not Working
- Ensure HTTPS for WebRTC (in production)
- Check browser microphone permissions
- Test with different browsers

#### AI Topics Not Generating
- Verify Hugging Face API key
- Check API rate limits
- Fallback topics should still work

### Debug Mode
```bash
# Enable debug logging
DEBUG=socket.io* npm run dev
```

## Future Enhancements

### Phase 2 Features
- [ ] Breakout rooms
- [ ] Screen sharing
- [ ] Chat functionality
- [ ] Recording capabilities
- [ ] Mobile app

### Analytics & Insights
- [ ] Participation metrics
- [ ] Topic popularity
- [ ] User engagement
- [ ] Export capabilities

### AI Improvements
- [ ] Custom topic training
- [ ] Sentiment analysis
- [ ] Automatic moderation
- [ ] Personalized recommendations

## Support

For questions or issues:
1. Check this documentation
2. Review the code comments
3. Test with the example configurations
4. Create an issue with detailed information

This platform is designed for educational use and continuous improvement. Contributions and feedback are welcome!
