# Google Services Integration Guide
# For PromptWars Challenge 2: Maximizing Score

## Current Integration: ✅ Gemini API
**Status:** Implemented
**Impact:** +2 points

---

## 🚀 Quick Wins (Easy to Add - 2 hours)

### 1. **Google Analytics 4** (Recommended First)
**Impact:** +1 point | Effort: 20 mins

```javascript
// Add to server.js
const analytics = require('@google-analytics/admin');

app.post("/api/events", (req, res) => {
  const { eventName, eventParams } = req.body;
  
  // Send to GA4
  // Track: question_asked, topics_explored, chat_session_started
  
  res.json({ success: true, tracked: true });
});
```

**Setup:**
```bash
npm install @google-analytics/admin
```

**Events to Track:**
- "session_start" - User opens app
- "question_asked" - User asks question
- "topic_selected" - User clicks topic
- "feedback_submitted" - User rates response

---

### 2. **Google Cloud Logging** (Production Ready)
**Impact:** +1 point | Effort: 30 mins

```javascript
const {Logging} = require('@google-cloud/logging');
const logging = new Logging({
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID
});

const log = logging.log('elected-log');

function logEvent(severity, message, data) {
  const entry = log.entry({severity}, {
    message,
    ...data,
    timestamp: new Date().toISOString()
  });
  log.write(entry);
}

// Use in endpoints
logEvent('INFO', 'Chat request', { userId: sessionId, questionLength });
```

---

### 3. **Google Cloud Storage** (User Exports)
**Impact:** +1 point | Effort: 45 mins

```javascript
const {Storage} = require('@google-cloud/storage');
const storage = new Storage();

app.post("/api/export-chat", async (req, res) => {
  const { messages, format } = req.body; // format: 'pdf' or 'json'
  
  const bucket = storage.bucket('elected-exports');
  const file = bucket.file(`chat-${Date.now()}.${format}`);
  
  await file.save(JSON.stringify(messages));
  
  res.json({ 
    success: true,
    downloadUrl: await file.getSignedUrl({...})
  });
});
```

---

## 🎯 Medium Effort (4-8 hours each)

### 4. **Google Translate API** (Multi-language Support)
**Impact:** +2 points | Effort: 4 hours

```javascript
const {Translate} = require('@google-cloud/translate').v2;
const translate = new Translate({
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID
});

app.post("/api/chat/translate", async (req, res) => {
  const { text, targetLanguage } = req.body;
  
  const [translation] = await translate.translate(text, targetLanguage);
  
  res.json({ 
    success: true,
    original: text,
    translated: translation,
    language: targetLanguage
  });
});
```

**Supported Languages:**
- Spanish (es)
- French (fr)
- German (de)
- Chinese (zh)
- Portuguese (pt)
- Russian (ru)
- Arabic (ar)
- Hindi (hi)

---

### 5. **Google Firestore** (Persistent Chat History)
**Impact:** +2 points | Effort: 6 hours

```javascript
const {Firestore} = require('@google-cloud/firestore');
const db = new Firestore({
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID
});

app.post("/api/chat/save", async (req, res) => {
  const { sessionId, messages, userId } = req.body;
  
  await db.collection('sessions').doc(sessionId).set({
    userId,
    messages,
    createdAt: new Date(),
    updatedAt: new Date()
  });
  
  res.json({ success: true, sessionId });
});

app.get("/api/chat/history/:sessionId", async (req, res) => {
  const doc = await db.collection('sessions').doc(req.params.sessionId).get();
  
  res.json({ 
    success: true,
    session: doc.data()
  });
});
```

---

### 6. **Google Maps API** (Election Info by Location)
**Impact:** +1 point | Effort: 4 hours

```javascript
const mapsClient = require("@google/maps");

app.post("/api/location/polling-places", async (req, res) => {
  const { lat, lng } = req.body;
  
  // Get nearby polling places
  // Fetch election info for location
  // Return voter registration deadlines by state
  
  res.json({
    success: true,
    pollingPlaces: [],
    registrationDeadline: "2026-10-20",
    votingInfo: {}
  });
});
```

---

## 🏆 Advanced (8+ hours)

### 7. **Google Sign-In (OAuth 2.0)**
**Impact:** +2 points | Effort: 8 hours

```javascript
const {OAuth2Client} = require('google-auth-library');

const oauth2Client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_CALLBACK_URL
);

// Save user preferences, chat history, progress
```

---

### 8. **Google Cloud Vision API** (Ballot Information)
**Impact:** +1 point | Effort: 6 hours

```javascript
const vision = require('@google-cloud/vision');
const client = new vision.ImageAnnotatorClient();

app.post("/api/analyze-ballot", async (req, res) => {
  // Analyze ballot image
  // Extract text and information
  // Provide guidance
});
```

---

## 📋 Implementation Roadmap

**Phase 1 (Essential - 3 hours):**
- [ ] Google Analytics 4
- [ ] Cloud Logging
- [ ] Error tracking (Sentry)

**Phase 2 (Enhanced - 5 hours):**
- [ ] Google Translate
- [ ] Cloud Storage (exports)
- [ ] Firestore (chat history)

**Phase 3 (Advanced - 8 hours):**
- [ ] Google Sign-In
- [ ] Google Maps
- [ ] Cloud Vision

---

## 🔧 Setup Instructions

### 1. Create Google Cloud Project
```bash
gcloud projects create elected-promptwars
gcloud config set project elected-promptwars
```

### 2. Enable APIs
```bash
gcloud services enable \
  analytics.googleapis.com \
  logging.googleapis.com \
  storage.googleapis.com \
  translate.googleapis.com \
  firestore.googleapis.com \
  maps.googleapis.com \
  vision.googleapis.com
```

### 3. Create Service Account
```bash
gcloud iam service-accounts create elected-service \
  --display-name="ElectED Service Account"

gcloud projects add-iam-policy-binding elected-promptwars \
  --member="serviceAccount:elected-service@elected-promptwars.iam.gserviceaccount.com" \
  --role="roles/editor"

gcloud iam service-accounts keys create key.json \
  --iam-account=elected-service@elected-promptwars.iam.gserviceaccount.com
```

### 4. Update .env
```bash
GOOGLE_CLOUD_PROJECT_ID=elected-promptwars
GOOGLE_APPLICATION_CREDENTIALS=./key.json
GOOGLE_ANALYTICS_MEASUREMENT_ID=G-XXXXXXXXXX
GOOGLE_TRANSLATE_API_KEY=your-key
```

### 5. Install SDK
```bash
npm install \
  @google-cloud/logging \
  @google-cloud/storage \
  @google-cloud/translate \
  @google-cloud/firestore \
  @google-cloud/vision \
  @google-analytics/admin \
  google-auth-library
```

---

## 📊 Scoring Impact Summary

| Service | Effort | Points | Priority |
|---------|--------|--------|----------|
| Google Analytics | 20 min | +1 | ⭐⭐⭐ |
| Cloud Logging | 30 min | +1 | ⭐⭐⭐ |
| Cloud Storage | 45 min | +1 | ⭐⭐ |
| Google Translate | 4 hrs | +2 | ⭐⭐⭐ |
| Firestore | 6 hrs | +2 | ⭐⭐ |
| Google Maps | 4 hrs | +1 | ⭐⭐ |
| Google Sign-In | 8 hrs | +2 | ⭐ |
| Cloud Vision | 6 hrs | +1 | ⭐ |

**Total Possible:** +11 points (→ 87/100)

---

## 🎯 Minimum Viable Google Services
To go from 6/10 to 9/10 on "Google Services" criteria:

1. ✅ Analytics (track user behavior)
2. ✅ Cloud Logging (production monitoring)
3. ✅ Cloud Storage (export feature)
4. ✅ Translate API (multi-language)
5. ✅ Firestore (persistent data)

**Estimated time: 10 hours**
**Score improvement: +8 points**

---

## 🚀 Deploy to Google Cloud Run

```bash
gcloud run deploy elected \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars GEMINI_API_KEY=$GEMINI_API_KEY
```

