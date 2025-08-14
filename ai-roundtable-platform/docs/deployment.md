# Deployment Guide - AI Roundtable Discussion Platform

This guide covers deploying the AI Roundtable Discussion Platform using free hosting services.

## Deployment Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     Vercel      │    │     Render      │    │  Hugging Face   │
│   (Frontend)    │    │   (Backend)     │    │   (AI API)      │
│                 │    │                 │    │                 │
│  - React App    │───►│  - Node.js API  │───►│  - Topic Gen    │
│  - Static Files │    │  - Socket.io    │    │  - Free Tier    │
│  - CDN          │    │  - SQLite DB    │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Prerequisites

- GitHub account (for code hosting)
- Vercel account (free tier)
- Render account (free tier)
- Hugging Face account (optional, for AI features)

## Backend Deployment (Render)

### Step 1: Prepare Backend for Deployment

1. **Create production environment file**:
   ```bash
   # In server/.env.production
   NODE_ENV=production
   PORT=10000
   DATABASE_URL=./data/roundtable.db
   HUGGINGFACE_API_KEY=your_huggingface_key
   MIN_PARTICIPANTS=2
   DEFAULT_SPEAKING_TIME=60
   ALLOWED_ORIGINS=https://your-app.vercel.app
   ```

2. **Update package.json scripts**:
   ```json
   {
     "scripts": {
       "start": "node src/server.js",
       "build": "echo 'No build step required for Node.js'",
       "postinstall": "mkdir -p data"
     }
   }
   ```

### Step 2: Deploy to Render

1. **Connect GitHub Repository**:
   - Go to [Render Dashboard](https://dashboard.render.com)
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Select the repository

2. **Configure Service Settings**:
   ```
   Name: ai-roundtable-server
   Environment: Node
   Build Command: npm install
   Start Command: npm start
   Plan: Free
   ```

3. **Set Environment Variables**:
   - Add each variable from your `.env.production`
   - Ensure `ALLOWED_ORIGINS` includes your Vercel domain

4. **Advanced Settings**:
   ```
   Root Directory: server
   Auto-Deploy: Yes
   ```

5. **Deploy**: Click "Create Web Service"

### Step 3: Verify Backend Deployment

- Visit your Render service URL (e.g., `https://ai-roundtable-server.onrender.com`)
- Check `/health` endpoint
- Verify `/api/topics` returns data

## Frontend Deployment (Vercel)

### Step 1: Prepare Frontend for Deployment

1. **Create production environment file**:
   ```bash
   # In client/.env.production
   VITE_API_URL=https://your-render-service.onrender.com
   VITE_SOCKET_URL=https://your-render-service.onrender.com
   VITE_HUGGINGFACE_API_KEY=your_key (optional)
   ```

2. **Update build configuration**:
   ```javascript
   // vite.config.js
   import { defineConfig } from 'vite'
   import react from '@vitejs/plugin-react'

   export default defineConfig({
     plugins: [react()],
     build: {
       outDir: 'dist',
       sourcemap: false,
       rollupOptions: {
         output: {
           manualChunks: {
             vendor: ['react', 'react-dom'],
             router: ['react-router-dom'],
             socket: ['socket.io-client']
           }
         }
       }
     }
   })
   ```

### Step 2: Deploy to Vercel

1. **Install Vercel CLI** (optional):
   ```bash
   npm install -g vercel
   ```

2. **Deploy via GitHub Integration**:
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "New Project"
   - Import your GitHub repository
   - Configure settings:
     ```
     Framework Preset: Vite
     Root Directory: client
     Build Command: npm run build
     Output Directory: dist
     Install Command: npm install
     ```

3. **Set Environment Variables**:
   - Add all variables from `.env.production`
   - Ensure API URLs point to your Render backend

4. **Deploy**: Vercel will automatically build and deploy

### Step 3: Configure Custom Domain (Optional)

1. **In Vercel Dashboard**:
   - Go to your project → Settings → Domains
   - Add your custom domain
   - Follow DNS configuration instructions

2. **Update CORS on Backend**:
   - Update `ALLOWED_ORIGINS` environment variable on Render
   - Include your custom domain

## Hugging Face API Setup

### Step 1: Get API Key

1. **Create Account**:
   - Visit [Hugging Face](https://huggingface.co)
   - Sign up for free account

2. **Generate Token**:
   - Go to Settings → Access Tokens
   - Create new token with "Read" permissions
   - Copy the token (starts with `hf_`)

### Step 2: Configure API Key

1. **On Render (Backend)**:
   ```
   HUGGINGFACE_API_KEY=hf_your_token_here
   ```

2. **On Vercel (Frontend)** (optional):
   ```
   VITE_HUGGINGFACE_API_KEY=hf_your_token_here
   ```

## Database Considerations

### SQLite on Render

**Important**: Render's free tier has ephemeral storage, meaning data is lost on service restarts.

**For Production**:
1. **Use Render PostgreSQL** (paid):
   - Add PostgreSQL add-on
   - Update database configuration
   - Modify database.js for PostgreSQL

2. **Use External Database**:
   - Supabase (free tier)
   - PlanetScale (free tier)
   - Railway (free tier)

**For Development/Demo**:
- SQLite works fine for testing
- Data will reset on each deployment

## SSL/HTTPS Configuration

Both Vercel and Render provide SSL certificates automatically:

- **Vercel**: Automatic SSL for all domains
- **Render**: Free SSL certificates
- **WebRTC**: Requires HTTPS in production

## Environment Variables Summary

### Frontend (Vercel)
```env
VITE_API_URL=https://your-backend.onrender.com
VITE_SOCKET_URL=https://your-backend.onrender.com
VITE_ENABLE_AI_TOPICS=true
VITE_ENABLE_AUDIO=true
```

### Backend (Render)
```env
NODE_ENV=production
PORT=10000
DATABASE_URL=./data/roundtable.db
HUGGINGFACE_API_KEY=hf_your_token
MIN_PARTICIPANTS=2
MAX_PARTICIPANTS=8
DEFAULT_SPEAKING_TIME=60
ALLOWED_ORIGINS=https://your-frontend.vercel.app
SESSION_TIMEOUT=3600000
```

## Performance Optimization

### Frontend Optimizations

1. **Bundle Splitting**:
   ```javascript
   // Already configured in vite.config.js
   manualChunks: {
     vendor: ['react', 'react-dom'],
     router: ['react-router-dom'],
     socket: ['socket.io-client']
   }
   ```

2. **Image Optimization**:
   - Use WebP format for images
   - Implement lazy loading
   - Optimize SVG icons

3. **Caching Strategy**:
   ```javascript
   // In vite.config.js
   build: {
     rollupOptions: {
       output: {
         assetFileNames: 'assets/[name].[hash][extname]'
       }
     }
   }
   ```

### Backend Optimizations

1. **Compression**:
   ```javascript
   // Add to server.js
   import compression from 'compression'
   app.use(compression())
   ```

2. **Caching Headers**:
   ```javascript
   // For static assets
   app.use('/static', express.static('public', {
     maxAge: '1y',
     etag: true
   }))
   ```

## Monitoring and Analytics

### Basic Monitoring

1. **Render Monitoring**:
   - Built-in metrics dashboard
   - Log viewing
   - Performance insights

2. **Vercel Analytics**:
   - Web Vitals monitoring
   - Function execution logs
   - Edge network metrics

### Custom Analytics

1. **Server Logging**:
   ```javascript
   // Add to server.js
   import winston from 'winston'
   
   const logger = winston.createLogger({
     level: 'info',
     format: winston.format.json(),
     transports: [
       new winston.transports.Console()
     ]
   })
   ```

2. **Error Tracking**:
   - Consider Sentry (free tier)
   - Or custom error logging

## Scaling Considerations

### Free Tier Limitations

**Vercel Free Tier**:
- 100GB bandwidth/month
- 100 deployments/day
- 12 functions/deployment

**Render Free Tier**:
- 750 hours/month
- Services sleep after 15 minutes of inactivity
- 500MB RAM limit

### Scaling Strategies

1. **Horizontal Scaling**:
   - Multiple Render services
   - Load balancing
   - Database clustering

2. **Caching**:
   - Redis for session data
   - CDN for static assets
   - Application-level caching

## Troubleshooting Deployment

### Common Issues

1. **Build Failures**:
   ```bash
   # Check build logs
   # Ensure all dependencies are in package.json
   # Verify Node.js version compatibility
   ```

2. **Socket.io Connection Issues**:
   ```javascript
   // Check CORS configuration
   // Verify WebSocket support
   // Test with polling fallback
   ```

3. **Environment Variable Issues**:
   ```bash
   # Verify all required variables are set
   # Check for typos in variable names
   # Ensure proper encoding of special characters
   ```

### Debug Steps

1. **Backend Debugging**:
   ```bash
   # Check Render logs
   # Test API endpoints directly
   # Verify database connectivity
   ```

2. **Frontend Debugging**:
   ```bash
   # Check browser console
   # Test API calls in Network tab
   # Verify environment variables in build
   ```

## Security Checklist

### Backend Security
- [ ] CORS properly configured
- [ ] Helmet.js security headers
- [ ] Input validation on all endpoints
- [ ] Rate limiting implemented
- [ ] Sensitive data not logged

### Frontend Security
- [ ] No API keys in client-side code
- [ ] XSS protection enabled
- [ ] HTTPS enforced
- [ ] Content Security Policy set

## Maintenance

### Regular Tasks

1. **Updates**:
   - Monitor dependency vulnerabilities
   - Update packages regularly
   - Test after updates

2. **Monitoring**:
   - Check service health
   - Monitor error rates
   - Review performance metrics

3. **Backups**:
   - Database backups (if using persistent storage)
   - Configuration backups
   - Code repository maintenance

### Emergency Procedures

1. **Service Down**:
   - Check Render service status
   - Review recent deployments
   - Check error logs

2. **Performance Issues**:
   - Monitor resource usage
   - Check for memory leaks
   - Review database queries

## Cost Optimization

### Free Tier Management

1. **Render**:
   - Monitor usage hours
   - Optimize cold start times
   - Consider service scheduling

2. **Vercel**:
   - Monitor bandwidth usage
   - Optimize bundle sizes
   - Use efficient caching

### Upgrade Paths

When free tiers are insufficient:

1. **Render Pro** ($7/month):
   - No sleeping
   - More resources
   - Custom domains

2. **Vercel Pro** ($20/month):
   - Increased limits
   - Advanced analytics
   - Team collaboration

## Support and Resources

### Documentation
- [Render Docs](https://render.com/docs)
- [Vercel Docs](https://vercel.com/docs)
- [Hugging Face Docs](https://huggingface.co/docs)

### Community
- Stack Overflow for technical questions
- GitHub Discussions for project-specific help
- Discord/Slack communities for real-time support

This deployment guide provides a complete setup for hosting your AI Roundtable Discussion Platform using free services. The platform will be production-ready with proper monitoring and scaling paths.
