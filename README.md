# AI Roundtable Discussion Platform

A 100% free and open-source AI-powered online roundtable discussion platform for educational use.

## Features

- **Free Authentication**: User login with ID and anonymous display names
- **Real-time Roundtable**: Dynamic visual representation with chairs for participants
- **AI Topic Generation**: Free AI-generated discussion topics using Hugging Face
- **Turn-based Speaking**: Automatic timer-based turn rotation
- **WebRTC Audio**: Real-time voice communication
- **Responsive Design**: Works on desktop and mobile devices

## Tech Stack

- **Frontend**: React.js + Vite + Tailwind CSS
- **Backend**: Node.js + Express.js + Socket.io
- **Database**: SQLite (local) / Supabase (cloud)
- **Real-time**: Socket.io + WebRTC
- **AI**: Hugging Face Inference API (free tier)
- **Deployment**: Vercel (frontend) + Render (backend)

## Quick Start

### Development

1. **Install dependencies**:
   ```bash
   npm run install:all
   ```

2. **Start development servers**:
   ```bash
   npm run dev
   ```

3. **Access the application**:
   - Frontend: http://localhost:5173
   - Backend: http://localhost:3002

### Live Demo

🌐 **Live Website**: [Coming Soon - Deploy with instructions below!]

### One-Click Deployment

[![Deploy to Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/ai-roundtable-discussion)

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

## Project Structure

```
├── client/          # React frontend
├── server/          # Node.js backend
├── docs/            # Documentation
└── README.md        # This file
```

## Environment Setup

1. Copy `.env.example` files in both `client/` and `server/` directories
2. Update the environment variables for your setup
3. For AI features, get a free API key from Hugging Face

## Deployment

### Frontend (Vercel)
```bash
cd client
npm run build
# Deploy to Vercel
```

### Backend (Render)
```bash
cd server
# Deploy to Render
```

## Educational Use

This project is designed for educational purposes with:
- Clean, commented code
- Modular architecture
- Free and open-source dependencies
- Local development support

## License

MIT License - Free for educational and commercial use
