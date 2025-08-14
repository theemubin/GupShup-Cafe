# 🚀 AI Roundtable Platform - Deployment Guide

## 📋 Quick Deploy Checklist

### ✅ Prerequisites Completed
- [x] Code pushed to GitHub: https://github.com/theemubin/RoughH
- [x] Enhanced CSS with animations and responsive design
- [x] Environment files configured
- [x] Documentation ready

## 🔥 Deploy Backend to Render (FREE)

### Step 1: Create Render Account
1. Go to [render.com](https://render.com)
2. Sign up with GitHub account
3. Authorize Render to access your repositories

### Step 2: Deploy Backend Service
1. Click **"New +"** → **"Web Service"**
2. Connect your GitHub repository: `theemubin/RoughH`
3. Configure deployment settings:

```
Name: ai-roundtable-backend
Root Directory: server
Runtime: Node
Build Command: npm install
Start Command: npm start
```

### Step 3: Set Environment Variables
Add these in Render dashboard:
```
NODE_ENV=production
PORT=10000
HUGGINGFACE_API_KEY=your_api_key_here
```

### Step 4: Deploy
- Click **"Create Web Service"**
- Wait 3-5 minutes for deployment
- Copy your backend URL (e.g., `https://ai-roundtable-backend.onrender.com`)

## 🌐 Deploy Frontend to Vercel (FREE)

### Step 1: Create Vercel Account
1. Go to [vercel.com](https://vercel.com)
2. Sign up with GitHub account
3. Import your project

### Step 2: Deploy Frontend
1. Click **"New Project"**
2. Import `theemubin/RoughH`
3. Configure settings:

```
Framework Preset: Vite
Root Directory: client
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

### Step 3: Set Environment Variable
Add in Vercel dashboard:
```
VITE_API_URL=https://your-render-backend-url.onrender.com
```

### Step 4: Deploy
- Click **"Deploy"**
- Wait 2-3 minutes
- Your frontend will be live at `https://your-project.vercel.app`

## 🎯 Final Configuration

### Update Backend CORS
After frontend deployment, update your backend environment:
```
CORS_ORIGIN=https://your-vercel-app.vercel.app
```

### Test Your Deployment
1. Visit your Vercel URL
2. Create a roundtable session
3. Test real-time features
4. Verify voice controls work

## 🔧 Troubleshooting

### Common Issues:
- **CORS Errors**: Update CORS_ORIGIN in Render
- **API Connection**: Check VITE_API_URL in Vercel
- **Voice Not Working**: Ensure HTTPS is enabled (automatic)

### Health Check URLs:
- Backend: `https://your-backend.onrender.com/health`
- Frontend: `https://your-frontend.vercel.app`

## 📱 Your Live App Features
- ✅ Real-time roundtable discussions
- ✅ AI-powered topic generation
- ✅ Voice controls and audio feedback
- ✅ Mobile-responsive design
- ✅ Professional UI with animations
- ✅ 100% free hosting

## 🎉 Success!
Your AI Roundtable Platform is now live and accessible worldwide!

**Frontend**: https://your-project.vercel.app
**Backend**: https://your-backend.onrender.com
**GitHub**: https://github.com/theemubin/RoughH

Share your platform with educators and students around the world! 🌍
