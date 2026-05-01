# 🛠️ Setup & Deployment Guide

## Quick Setup (5 minutes)

### Prerequisites
- Node.js 18+ ([Download](https://nodejs.org/))
- npm 9+ (comes with Node.js)
- Git

### 1. Clone Repository
```bash
git clone https://github.com/va9627713-byte/electionED.git
cd electionED
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Get Gemini API Key
- Visit [Google AI Studio](https://ai.google.dev/)
- Click "Get API key"
- Create a new API key

### 4. Configure Environment
```bash
# Copy template to .env
cp .env.example .env

# Edit .env and add your API key
# GEMINI_API_KEY=your_actual_key_here
```

### 5. Start Development Server
```bash
npm start
```
- Open http://localhost:8080
- You should see ElectED interface

## Deployment

### Option A: Vercel (Recommended)
1. Push code to GitHub
2. Go to [Vercel](https://vercel.com)
3. Click "New Project"
4. Select your GitHub repo
5. Add environment variable:
   - Name: `GEMINI_API_KEY`
   - Value: Your API key
6. Click "Deploy"
7. Done! Your app is live

### Option B: Google Cloud Run
```bash
# Install Google Cloud SDK
# https://cloud.google.com/sdk/docs/install

# Authenticate
gcloud auth login

# Deploy
gcloud run deploy elected \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars GEMINI_API_KEY=your_key \
  --port 8080
```

### Option C: Docker
```bash
# Build image
docker build -t elected:latest .

# Run container
docker run -e GEMINI_API_KEY=your_key -p 8080:8080 elected

# Visit http://localhost:8080
```

## Testing

```bash
# Run all tests
npm test

# Watch mode (re-run on changes)
npm run test:watch

# Check coverage
npm test -- --coverage
```

Expected: 41+ tests passing ✅

## Troubleshooting

### Port Already in Use
```bash
# Find process using port 8080
lsof -i :8080

# Kill it (macOS/Linux)
kill -9 <PID>

# Windows: Use Task Manager
```

### API Key Error
- Confirm `.env` file exists in root directory
- Check key format is correct
- Verify key is not wrapped in quotes

### Blank Page
- Open DevTools (F12)
- Check Console for errors
- Verify `/api/topics` returns data
- Check Network tab for failed requests

## Project Structure
```
electionED/
├── public/              # Frontend files
│   ├── index.html      # Main page
│   ├── app.js          # Client logic
│   └── sw.js           # Service Worker
├── server.js           # Express server
├── package.json        # Dependencies
├── .env.example        # Template (copy to .env)
├── vercel.json         # Vercel config
└── __tests__/          # Test files
```

## Key Files

| File | Purpose |
|------|---------|
| `.env.example` | Template for environment variables |
| `server.js` | Express API server |
| `public/app.js` | Frontend chat logic |
| `public/index.html` | Main HTML page |
| `jest.config.js` | Test configuration |
| `vercel.json` | Deployment config |

## Environment Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `GEMINI_API_KEY` | Google AI API key | `AIza...` |
| `PORT` | Server port | `8080` |
| `NODE_ENV` | Environment | `production` |

## Common Issues

### Issue: "Cannot find module '@google/generative-ai'"
**Solution:** Run `npm install` again
```bash
npm install
```

### Issue: API returns 401
**Solution:** API key is missing or invalid
- Check `.env` file exists
- Verify key format
- Get a new key from Google AI Studio

### Issue: Deployment fails on Vercel
**Solution:** Add `GEMINI_API_KEY` to Vercel environment variables
1. Go to Vercel Project Settings
2. Click Environment Variables
3. Add `GEMINI_API_KEY`
4. Redeploy

## Next Steps

- [ ] Set up GitHub repository
- [ ] Configure Vercel deployment
- [ ] Add your API key
- [ ] Test all endpoints
- [ ] Deploy to production

## Support

- **Issues:** [GitHub Issues](https://github.com/va9627713-byte/electionED/issues)
- **Discussions:** [GitHub Discussions](https://github.com/va9627713-byte/electionED/discussions)
- **Documentation:** See [README.md](README.md)
