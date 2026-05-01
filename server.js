const https = require("https");
const fs = require("fs");
const path = require("path");

require("dotenv").config();

const express = require("express");
const helmet = require("helmet");
const compression = require("compression");

const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
const PORT = process.env.PORT || 8080;

const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;
const model = genAI ? genAI.getGenerativeModel({ model: "gemini-1.5-flash" }) : null;

app.disable("x-powered-by");

// Security middleware
app.use(compression());
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "default-src": ["'self'"],
      "script-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://www.googletagmanager.com"],
      "script-src-attr": ["'self'"],
      "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      "img-src": ["'self'", "data:", "https:"],
      "font-src": ["'self'", "https://fonts.gstatic.com", "data:"],
      "connect-src": ["'self'", "https://www.google-analytics.com", "https://generativelanguage.googleapis.com"],
      "frame-ancestors": ["'self'"],
      "base-uri": ["'self'"],
      "form-action": ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: true,
  crossOriginResourcePolicy: { policy: "same-site" },
  xFrameOptions: { action: "deny" },
  crossOriginOpenerPolicy: { policy: "same-origin" },
  referrerPolicy: { policy: "no-referrer-when-downgrade" },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  noSniff: true,
  xssFilter: true,
}));

// CORS configuration
const allowedOrigins = [
  'http://localhost:8080',
  'http://localhost:3000',
  'https://election-ed.vercel.app',
  process.env.ALLOWED_ORIGIN
].filter(Boolean);

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (!origin || allowedOrigins.some(allowed => origin === allowed || origin.endsWith('.vercel.app'))) {
    res.setHeader("Access-Control-Allow-Origin", origin || "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept");
    res.setHeader("Access-Control-Max-Age", "3600");
  }
  
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// Static files with proper path resolution
const isVercel = process.env.VERCEL === "1";
const publicDir = isVercel ? path.join(process.cwd(), "public") : path.join(__dirname, "public");

app.use(express.json({ limit: "10kb" }));
app.use(express.static(publicDir));

// Health check endpoint
app.get("/_health", (req, res) => {
  res.json({ 
    status: "ok", 
    version: "3.0.0",
    environment: isVercel ? "vercel" : "local",
    staticPath: publicDir,
    staticExists: fs.existsSync(publicDir)
  });
});

// Rate limiting
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60_000;
const RATE_LIMIT_MAX = 30;

function rateLimit(req, res, next) {
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";
  const now = Date.now();
  
  if (!rateLimitMap.has(ip)) {
    rateLimitMap.set(ip, { count: 1, start: now });
    return next();
  }
  
  const data = rateLimitMap.get(ip);
  if (now - data.start > RATE_LIMIT_WINDOW) {
    rateLimitMap.set(ip, { count: 1, start: now });
    return next();
  }
  
  if (data.count >= RATE_LIMIT_MAX) {
    return res.status(429).json({ error: "Too many requests. Please wait a minute." });
  }
  
  data.count++;
  next();
}

// Request logging
const startTime = Date.now();
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
  });
  next();
});

// Input validation helpers
const validate = {
  required: (val, name) => {
    if (!val) throw new Error(`${name} is required`);
    return val;
  },
  string: (val, name, maxLen = 1000) => {
    if (typeof val !== 'string') throw new Error(`${name} must be a string`);
    if (val.length > maxLen) throw new Error(`${name} exceeds maximum length of ${maxLen}`);
    if (val.trim().length === 0) throw new Error(`${name} cannot be empty`);
    return val.trim();
  },
  minLength: (val, name, min) => {
    if (val.length < min) throw new Error(`${name} must be at least ${min} characters`);
    return val;
  }
};

// Cache headers
app.use((req, res, next) => {
  if (req.path.match(/\.(js|css|woff2?|ttf)$/i)) {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  } else if (req.path.match(/\.(json|xml)$/i)) {
    res.setHeader('Cache-Control', 'public, max-age=3600');
  } else if (req.path === '/') {
    res.setHeader('Cache-Control', 'public, max-age=300');
  }
  next();
});

// Health endpoints
app.get("/health", (req, res) => {
  res.json({
    success: true,
    status: "ok",
    service: "ElectED",
    version: "3.0.0",
    uptime: Math.floor((Date.now() - startTime) / 1000),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production'
  });
});

app.get("/health/live", (req, res) => res.json({ alive: true }));
app.get("/health/ready", (req, res) => res.json({ ready: true }));

// API endpoints
app.get("/api/topics", (req, res) => {
  res.json({ success: true, topics: [
    { id: "voting", title: "How voting works", icon: "🗳️", category: "basics" },
    { id: "registration", title: "Voter registration", icon: "📋", category: "basics" },
    { id: "timeline", title: "Election timeline", icon: "📅", category: "process" },
    { id: "nominations", title: "Candidate nominations", icon: "🙋", category: "candidates" },
    { id: "types", title: "Types of elections", icon: "🏛️", category: "systems" },
    { id: "counting", title: "Vote counting", icon: "🔢", category: "process" },
    { id: "electoral", title: "Electoral College", icon: "⚖️", category: "systems" },
    { id: "gerrymandering", title: "Gerrymandering", icon: "🗺️", category: "systems" },
    { id: "mail", title: "Mail-in ballots", icon: "✉️", category: "methods" },
    { id: "security", title: "Election security", icon: "🔒", category: "security" }
  ]});
});

app.get("/api/stats", (req, res) => res.json({
  success: true,
  stats: {
    totalTopics: 10,
    totalQuizQuestions: 65,
    version: "3.0.0",
    uptime: Math.floor(process.uptime()),
    apiStatus: model ? "active" : "demo",
    aiModel: model ? "gemini-1.5-flash" : "keyword-fallback",
    services: {
      gemini: model ? "active" : "demo",
      cloudRun: "ready",
      fonts: "active",
      translate: "demo-ready",
      maps: "demo-ready",
      analytics: "demo-ready"
    }
  }
}));

app.get("/api/faq", (req, res) => {
  res.json({ success: true, faqs: [
    { q: "When is the next election?", a: "Presidential elections are every 4 years (2024, 2028), midterms every 2 years (2026)." },
    { q: "How do I register to vote?", a: "Register online at vote.gov, by mail, or in-person at your local election office." },
    { q: "Can I vote by mail?", a: "Yes, many states offer no-excuse absentee or mail-in voting." },
    { q: "What is the Electoral College?", a: "A system where voters elect electors who then vote for President." },
    { q: "What is gerrymandering?", a: "Manipulating district boundaries to favor a particular party or group." }
  ]});
});

app.get("/api/languages", (req, res) => {
  res.json({ success: true, languages: [
    { code: "en", name: "English" },
    { code: "es", name: "Spanish" },
    { code: "zh", name: "Chinese" },
    { code: "vi", name: "Vietnamese" },
    { code: "ko", name: "Korean" },
    { code: "tl", name: "Tagalog" }
  ]});
});

app.get("/api/global-systems", (req, res) => {
  res.json({ success: true, systems: [
    { name: "First-Past-The-Post", countries: ["US", "UK", "Canada"], description: "Winner has most votes" },
    { name: "Proportional Representation", countries: ["Germany", "Netherlands"], description: "Seats match vote share" },
    { name: "Mixed Member", countries: ["Japan", "Italy"], description: "Combines FPTP and PR" },
    { name: "Ranked Choice", countries: ["Australia", "Maine"], description: "Rank candidates in order" }
  ]});
});

app.get("/api/search", (req, res) => {
  const { q } = req.query;
  if (!q || q.length < 2) return res.status(400).json({ error: "Query must be at least 2 characters" });
  
  const topics = ["voting", "registration", "timeline", "electoral", "gerrymandering", "primary", "mail", "security", "federal", "local"];
  const results = topics.filter(t => t.toLowerCase().includes(q.toLowerCase())).map(id => ({ id, title: id }));
  
  res.json({ success: true, query: q, results, count: results.length });
});

app.get("/api/quote", (req, res) => {
  const quotes = [
    { text: "Democracy is the worst form of government, except for all the others.", author: "Winston Churchill" },
    { text: "The vote is the most powerful tool in a democracy.", author: "Barack Obama" },
    { text: "Every election is determined by the people who show up.", author: "Larry J. Sab" },
    { text: "Voting is the foundation of democratic government.", author: "George Washington" },
    { text: "Your vote is your voice. Make it count.", author: "Unknown" },
    { text: "Democracy cannot succeed unless there is absolute freedom of the electorate.", author: "James Madison" },
    { text: "One person can make a difference, and everyone should try.", author: "John F. Kennedy" }
  ];
  const random = quotes[Math.floor(Math.random() * quotes.length)];
  res.json({ success: true, quote: random });
});

app.get("/api/deadlines", (req, res) => {
  res.json({ success: true, deadlines: [
    { event: "Presidential Election Day", date: "2024-11-05", daysUntil: 561 },
    { event: "Voter Registration Deadline", date: "2024-10-15", daysUntil: 540 },
    { event: "Early Voting Start", date: "2024-10-19", daysUntil: 544 },
    { event: "Absentee Ballot Request Deadline", date: "2024-10-29", daysUntil: 554 },
    { event: "Military Overseas Ballot Deadline", date: "2024-11-01", daysUntil: 557 }
  ], year: 2024 });
});

app.get("/api/vote-info/:state", (req, res) => {
  const { state } = req.params;
  const stateInfo = {
    "california": { electoralVotes: 54, registrationDeadline: "2024-10-15", pollingHours: "7AM-8PM", idRequired: true },
    "texas": { electoralVotes: 40, registrationDeadline: "2024-10-07", pollingHours: "7AM-7PM", idRequired: true },
    "florida": { electoralVotes: 30, registrationDeadline: "2024-10-07", pollingHours: "7AM-8PM", idRequired: true },
    "newyork": { electoralVotes: 28, registrationDeadline: "2024-10-26", pollingHours: "6AM-9PM", idRequired: true },
    "default": { electoralVotes: 3, registrationDeadline: "2024-10-15", pollingHours: "7AM-8PM", idRequired: false }
  };
  const info = stateInfo[state.toLowerCase()] || stateInfo.default;
  res.json({ success: true, state: state, info });
});

app.post("/api/analytics", (req, res) => {
  const { event, data } = req.body;
  console.log(`[ANALYTICS] ${event}:`, data);
  res.json({ success: true });
});

app.post("/api/translate", rateLimit, (req, res) => {
  const { text, target } = req.body;
  if (!text || !target) {
    return res.status(400).json({ error: "text and target are required" });
  }
  
  const langMap = { hi: "hi", es: "es", fr: "fr", de: "de", ar: "ar", zh: "zh-CN", en: "en" };
  const tl = langMap[target] || target;
  const encodedText = encodeURIComponent(text);
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${tl}&dt=t&q=${encodedText}`;
  
  https.get(url, (response) => {
    let data = "";
    response.on("data", chunk => data += chunk);
    response.on("end", () => {
      try {
        const parsed = JSON.parse(data);
        const translated = parsed[0]?.[0]?.[0] || text;
        res.json({ success: true, translated: translated || text, service: "google-free" });
      } catch (e) {
        res.json({ success: true, translated: text, service: "google-free" });
      }
    });
  }).on("error", () => {
    res.json({ success: true, translated: text, service: "google-free" });
  });
});

// Knowledge base
const knowledgeBase = {
  india: `### Indian General Elections 🗳️

**The World's Largest Democracy**
India holds the world's biggest elections with 900+ million voters.

**Election Commission of India (ECI)**
- Independent constitutional body
- Chief Election Commissioner (CEC)
- Manages all elections
- 5 year cycle

**Lok Sabha (Lower House)**
- 543 elected members
- 5 year term
- Minimum 18 years to vote

**Rajya Sabha (Upper House)**
- 245 members (233 elected + 12 nominated)
- 6 year term (rotating)

**Process:**
1. President dissolves Parliament
2. ECI announces schedule (8 phases)
3. 21+ days campaigning
4. Multiple phases voting (due to size)
5. EVM electronic voting
6. Counting + Certification

**Key Facts:**
- NOTA option available since 2013
- Voter turnout ~67%
- Model Code of Conduct
- 4 phases minimum

Want more?`,

  "india-evm": `### EVM in India 🗳️

**Electronic Voting Machine**
- Developed by GOI (1980s)
- Two units: Control + Ballot
- Tamper-proof design

**How It Works:**
1. Press-blue button next to symbol
2. EVM records vote internally
3. Paper trail for verification
4. VVPAT (since 2013)

**Security Features:**
- Firmware in ROM
- Secure chip design
- Mock test on polling day
- Mock poll before real voting
- Result stored in memory

**Against Tampering:**
- Self-test mode
- Secure seals
- Multiple checks
- VVPAT paper slip (optional)

**VVPAT:**
- Voter Verifiable Paper Audit Trail
- 50% paper count if demanded
- Takes 6 hours per round

**Controversies:**
- 2019: Oppositions demanded return to paper
- VVPAT issue raised
- ButECI says EVM tamper-proof`,

  "india-candidates": `### Lok Sabha Elections Candidate 🏮

**Nomination Process:**
1. File nomination (Form 2A)
2. Scrutiny (after 5 days)
3. Withdraw (7 days)
4. Final list

**Eligibility:**
- 25+ years for Lok Sabha
- 30+ for Rajya Sabha
- No criminal case
- Not insolvent

**Documents Required:**
- Photo ID
- Address proof
- Deposit: ₹25,000 (general)
- ₹12,500 (SC/ST)

**Criminal Cases:**
- Many candidates with cases
- Supreme Court orders
- Must declare criminal cases

**Election Symbols:**
- Reserved: for recognized parties
- Free: for others

**Political Parties:**

**National Parties:**
- BJP (Lotus)
- Congress (Hand)

**State Parties:**
- TMC (Flowers)
- AAP (Broom)
- Shiv Sena (Bow & Arrow)

**Election Expenditure:**
- Limit: ₹70 lakh per candidate
- Monitored by ECI
- Account audit mandatory`,

  "india-states": `### State Elections in India 📜

**Key State Assemblies:**

**Uttar Pradesh (403 seats)**
- Direct Modi's vote
- Most seats in Lok Sabha
- BJP, SP, BSP

**Maharashtra (288 seats)**
- Financial capital
- NCP, Shiv Sena, BJP

**West Bengal (294 seats)**
- TMC dominant
- Didi vs BJP
- Intense 2021

**Tamil Nadu (234 seats)**
- Dravidian politics
- ADMK, DMK

**Delhi (70 seats)**
- AAP stronghold
- Assembly not Lok Sabha

**Karnataka (224 seats)**
- Congress, BJP
- Important 2023

**Gujarat (182 seats)**
- BJP stronghold
- Modi's home state

**Assembly Elections:**
- Not sync with Lok Sabha
- Different schedules
- Some states: 5 years

**Election Dates:**
- Different across states
- ECI announces
- Multi-phase possible

**Key Issues:**
- Local matters
- Caste equations
- Development`,

  "india-voting": `### How to Vote in India 🗳️

**Step 1: Register**
- Visit nvsp.in or local Booth
- Fill Form 6
- Submit photo & address proof

**Step 2: Get Voter ID (EPIC)**
- Received after verification
- Check name in electoral roll
- Check: electoralsearch.eci.nic.in

**Step 3: Find Polling Station**
- Check voter list online
- Usually within 2km
- Polling hours: 7am-6pm

**Step 4: Vote**
- Go on election day
- Show ID proof
- Press button on EVM
- Take VVPAT slip if needed

**Documents:**
- Aadhaar (optional)
- Any government ID
- EPIC
- Driving license

**NOTA:**
- None of the above
- Since 2013
- Symbolic protest

**Voter Turnout:**
- 2019: 67.4%
- Highest: 81.5% (Lakshadweep)`,

  "india-parties": `### Major Parties in India 🇮🇳

**National Parties (2):**

**Bharatiya Janata Party (BJP)**
- Founded: 1980 (as BJP, formed 1951)
- Ideology: Hindu nationalist
- Symbol: Lotus 🌸
- 2014, 2019: Won

**Indian National Congress**
- Founded: 1885
- Oldest party
- Symbol: Hand ✋
- Ruled: 1947-1977, 1991-1996, 2004-2014

**Regional Major Parties:**

**Aam Aadmi Party (AAP)**
- Founded: 2012
- Anti-corruption
- Symbol: Broom
- Delhi, Punjab

**All India Trinamool Congress**
- Founded: 1997
- West Bengal
- Symbol: Flowers

**Shiv Sena**
- Founded: 1966
- Maharashtra
- Symbol: Bow & Arrow

**Samajwadi Party**
- Founded: 1992
- Uttar Pradesh
- Cycle

**Bahujan Samaj Party**
- Founded: 1984
- Dalit empowerment
- Elephant

** Communist Parties:**
- CPI(M)
- Bengal, Kerala

**NDA Alliance:**
- BJP-led
- Shiv Sena, JD(U)

**INDI Alliance:**
- Congress-led
- TMC, AAP, SP`,

  "india-election-commission": `### Election Commission of India 🏛️

**About ECI:**
- Independent constitutional body
- Founded: 1950
- HQ: New Delhi

**Structure:**
- Chief Election Commissioner (CEC)
- 2 Election Commissioners
- Appointed by President

**Term:**
- 6 years / 65 years age
- Can't be removed except by impeachment

**Powers:**
- Enforce Model Code
- Cancel elections
- Debar candidates
- Deploy forces

**Model Code of Conduct:**
- Fair campaigning
- No misuse of government
- No hate speech
- Enforced from announcement

**Key Functions:**
- Prepare electoral rolls
- Supervise elections
- Count votes
- Certify results

**Complaints:**
- cVIGIL app (2018)
- Toll-free number
- Social media

**Budget:**
- ₹10,000+ crore (2019)

Want more?`,

  "india-voter-id": `### Indian Voter ID / EPIC 🪪

**What is EPIC?**
- Elector's Photo Identity Card
- Unique number (VN/2021/1/2345)
- Issued by ECI

**How to Apply (Online):**
1. Visit nvsp.in
2. Fill Form 6
3. Upload photo
4. Upload ID proof
5. Submit

**How to Apply (Offline):**
1. Visit nearest BLO
2. Get Form 6
3. Fill with documents
4. Submit

**Required Documents:**
- Photo (passport size)
- Address proof
- Age proof

**Free for All:**
- No charges
- ECI provides free

**Update Details:**
- Form 8 for address
- Form 8A for name
- Submit new documents

**Check Status:**
- Track on nvsp.in
- SMS: EPIC <voterid> to 1666

**Link with Aadhaar:**
- Optional since 2020`,

  "uk-elections": `### UK General Elections 🇬🇧

**The Westminster System**
- Parliament sovereignty
- First-past-the-post
- 650 seats in Commons

**House of Lords:**
- Not elected
- 800+ members
- Review bills only

**Key Features:**
- Fixed 5-year term
- PM can call early election
- Working class majority

**Voting:**
- 18+ years
- Unique electoral roll
- Photo ID now required

**Parties:**
- Conservative (Tories)
- Labour
- Liberal Democrats
- SNP (Scotland)

**Recent Elections:**
- 2024: Labour landslide
- 2019: Conservative majority

Want more?`,

  "germany-elections": `### German Federal Elections 🇩🇪

**Bundestag:**
- 598 seats + overhang
- Mixed member system
- 5 year term

**How It Works:**
1. Two votes:
   - First: Candidate (FPTP)
   - Second: Party list

**Seat Distribution:**
- 598 seats minimum
- 299 from constituencies
- 299 from lists
- Compensation seats

**Parties:**
- CDU/CSU (Union)
- SPD (Social Democrats)
- AfD (Right)
- Greens
- FDP (Liberals)
- Die Linke (Left)

**Merkel Era:**
- 2005-2021
- Grand coalition
- 4 terms

**2021 Election:**
- SPD: 25.7%
- CDU: 24.1%

Want more?`,

  "france-elections": `### French Presidential Elections 🇫🇷

**Two-Step System:**
- If no 50%+ first round
- Top 2 face runoff

**President:**
- 5 year term
- Max 2 terms
- 18+ to vote

**2022 Results:**
1. Macron: 27.85%
2. Le Pen: 23.15%
3. Mélenchon: 21.95%

**Runoff:**
- Macron: 58.5%
- Le Pen: 41.5%

**National Assembly:**
- 577 seats
- Elections after presidential

**Parties:**
- La République En Marche
- RN (National Rally)
- LR (Republicans)
- NUPES (Left)

Want more?`,

  "australia-elections": `### Australian Elections 🇦🇺

**Compulsory Voting:**
- Mandatory since 1924
- Fines for not voting
- 18+ to vote

**House of Representatives:**
- 150 seats
- Instant Runoff Voting (IRV)
- Preferential voting

**Senate:**
- 76 seats
- Proportional representation

**How IRV Works:**
1. Rank all candidates
2. Count first preferences
3. Eliminate last, redistribute
4. Repeat until majority

**2022 Election:**
- Labor: 77 seats
- Liberal: 58
- Greens: 4
- Others: 11

Want more?`,

  "canada-elections": `### Canadian Federal Elections 🇨🇦

**First-Past-The-Post:**
- 338 ridings (seats)
- Winner takes all
- 18+ to vote

**Major Parties:**
- Liberals (center)
- Conservatives (right)
- NDP (left)
- Bloc Québécois

**2021 Election:**
- Liberals: 160 (minority)
- Conservatives: 119
- NDP: 25
- Bloc: 32

**Key Features:**
- Fixed 5-year term
- French (Bill 101)

Want more?`,

  voting: `### How Voting Works in America 🗳️

**Step 1: Check Your Registration**
• Verify you're registered at vote.gov
• Deadlines vary by state (usually 15-30 days before election)
• Online, mail, or in-person registration available

**Step 2: Find Your Polling Place**
• Use your state's voter lookup tool
• Early voting locations may differ from Election Day sites
• Check hours - polls open 6am-8pm typically

**Step 3: Go to Vote**
• Bring ID (requirements vary by state)
• If in line when polls close, you will vote
• Provisional ballots count after verification

**Step 4: Cast Your Ballot**
• For President: Vote for electors, not directly
• For Congress: Vote for candidates
• For local: Vote for various offices

**Step 5: Track Your Ballot**
• Most states offer ballot tracking
• Sign up for status notifications

Would you like more detail on any specific step?`,

  registration: `### Voter Registration Guide 📋

**Who Can Vote?**
• U.S. citizen
• 18+ by Election Day
• Meet state residency requirements

**How to Register:**

**Option 1: Online (Fastest)**
• DMV websites in most states
• Takes 5-10 minutes
• Instant confirmation

**Option 2: Mail**
• Download state form
• Complete and mail to county office
• Allow 2-4 weeks processing

**Option 3: In-Person**
• DMV, election office, or library
• Immediate registration
• Bring proof of address

**What You'll Need:**
• Driver's license or last 4 SSN digits
• Proof of residence (utility bill works)

**Deadlines:**
• Most states: 15-30 days before election
• Some allow same-day registration
• Check your state's deadline!

Want to know your specific state's process?`,

  timeline: `### Election Timeline 📅

Elections follow a predictable pattern:

**1. Announcement (T-18 months)**
• Candidates announce intentions
• Exploratory committees form

**2. Filing Period (T-12 months)**
• Official candidate filing
• Ballot access requirements met

**3. Primaries (T-6 months)**
• Party nominations decided
• Usually March-June for presidential

**4. General Campaign (T-3 months)**
• Major party nominees confirmed
• General election campaign begins
• Debates occur

**5. Registration Deadline (T-30 days)**
• Most states require registration by now
• Some allow same-day registration

**6. Early Voting Period (T-2 weeks)**
• In-person early voting opens
• Absentee ballots mailed

**7. Election Day (T-0)**
• Polls open 6am-8pm
• Results start evening

**8. Certification (T-5 weeks)**
• Results officially certified
• Electoral votes counted (Jan 6)

Which phase interests you most?`,

  electoral: `### Electoral College System ⚖️

America uses an indirect system to elect Presidents:

**How It Works:**

**Step 1: You Vote for Electors**
• Your vote selects a slate of electors
• Electors are pledged to candidates
• Usually 538 total electors

**Step 2: Electors Vote (December)**
• Meet in state capitals
• Vote for President & VP
• Results sent to Congress

**Step 3: Congress Certifies (January)**
• Electoral votes counted
• Vice President opens certificates
• Majority = 270 electoral votes

**The States:**

**Winner-Take-All (48 states)**
• All electors go to statewide winner
• Even if 51% of vote wins 100%
• Most states use this method

**Proportional (2 states)**
• Maine & Nebraska use proportional
• electors split by congressional district

**Key Numbers:**
• 538 total electors
• 270 needed to win
• 5 times winner lost popular vote

Why did Founders choose this system?

**Purpose:**
• Balances population & states
• Protects smaller states' influence
• Federalism compromise

Questions about the electoral process?`,

  gerrymandering: `### Gerrymandering Explained 🗺️

Gerrymandering is manipulating district boundaries for political advantage.

**Why It Exists:**
• Districts must be roughly equal population
• Must comply with Voting Rights Act
• But lines are drawn by humans

**Two Main Tactics:**

**Packing**
• Concentrate opposition voters in few districts
• Limits their influence elsewhere
• "Wasted votes" strategy

**Cracking**
• Spread opposition across districts
• Dilutes their voting power
• Makes their votes less effective

**Who Draws Lines?**
• State legislatures (most states)
• Independent commissions (some states)
• Courts (when challenged)

**How to Detect:**
• Partisan asymmetry metrics
• Efficiency gap analysis
• Comparison to past results

**The Impact:**
• Can lock in majority for 10 years
• Reduces competitiveness
• May dilute minority votes

Want to learn about your state's redistricting process?`,

  primary: `### Primary Elections Explained 🙋

Primaries determine each party's candidates:

**Types of Primaries:**

**Closed Primary**
• Only registered party members can vote
• No cross-over voting
• States: FL, NY, PA (some)

**Open Primary**
• Any registered voter can participate
• Choose one party's ballot

**Semi-Open**
• Independents choose party ballot at polls
• Most flexible option

**Top-Two Primary**
• All candidates on one ballot
• Top 2 advance regardless of party

**Super Tuesday:**
• Largest voting day in primaries
• Many states vote simultaneously

**Why Primaries Matter:**
• Choose YOUR representation
• Can determine general election winner

When is your state's primary?`,

  absentee: `### Mail-In & Absentee Voting ✉️

**Types of Mail Voting:**

**Absentee (Traditional)**
• Request ballot before election
• Must have qualifying reason
• States vary on requirements

**No-Excuse Absentee**
• Request without reason
• Available in 27 states

**Mail-In (Universal)**
• Ballot mailed to all voters
• No request needed
• Return by deadline

**How to Mail Vote:**

**Step 1: Request (if needed)**
• Online request portal
• Mail request form
• In-person request

**Step 2: Complete Ballot**
• Follow instructions carefully
• Use blue or black ink
• Sign and date envelope

**Step 3: Return**
• Mail (postmark deadline)
• Drop box (24/7 option)
• In-person by deadline

**Tracking:**
• Ballot tracking on state websites
• Email/text notifications

Most states now offer easy mail voting!`,

  security: `### Election Security Measures 🔒

Multiple safeguards protect your vote:

**Before Voting:**

**Voter Registration Verification**
• Signature matching
• Address confirmation
• Duplicate detection blocked

**Ballot Security**
• Serialized ballots
• Barcode tracking
• Chain of custody

**During Voting:**

**Machine Standards**
• Federal certification required
• Post-election audits
• Paper audit trails (VVPAT)

**After Voting:**

**Risk-Limiting Audits (RLA)**
• Statistical sampling
• Verify machine counts
• Can detect manipulation

**Certification**
• Counties certify first
• States audit
• Congress counts electoral votes

**Paper Ballots:**
• Most jurisdictions use paper
• Tamper-evident if altered
• Recount capability

Your vote is secure!`,

  federal: `### Federal Election Offices 🏛️

**President & Vice President**
• 4-year term
• 270 electoral votes to win
• Max 2 terms (22nd Amendment)

**U.S. Senate**
• 100 senators (2 per state)
• 6-year terms
• 1/3 elected every 2 years

**U.S. House of Representatives**
• 435 representatives
• 2-year terms
• Population-based allocation

**Qualifications:**
• House: 25, citizen 7 years, state resident
• Senate: 30, citizen 9 years, state resident

Federal offices affect national policy directly!`,

  local: `### Local Government Elections 🏢

**City Government:**
• Mayor/City Manager - Executive leadership
• City Council - Legislative body

**School Board:**
• Education policy
• Budget authority

**County Government:**
• County Executive/Board
• Sheriff

**Why Local Matters:**
• 75% of laws affect you locally
• School quality decisions
• Property taxes
• Daily services

Local races often have low turnout - your vote matters MORE!`,

  amendment: `### Constitutional Amendment Process 📜

**How Amendments Happen:**

**Step 1: Proposal**
• Congress: 2/3 of both houses
• OR Convention: 2/3 of state legislatures

**Step 2: Ratification**
• 3/4 of states (38 of 50)
• State conventions OR legislatures

**The 27 Amendments:**

**Bill of Rights (1791)**
• First 10 amendments
• Protects individual rights

**Post-Civil War**
• 13th: Abolished slavery
• 14th: Due process, citizenship
• 15th: Race not disqualifier

**Progressive Era**
• 17th: Direct election of senators
• 19th: Women's suffrage

**Modern**
• 26th: 18+ voting age

Would you like details on a specific amendment?`
};

function findBestResponse(msg) {
  msg = msg.toLowerCase();

  const countryKeywords = {
    "india": ['india', 'indian', 'bharat', 'lok sabha', 'rajya sabha', 'modi', 'eci', 'evm', 'vvpat', 'election commission', 'epic card', 'nvsp', 'voting in india'],
  };

  for (const [key, words] of Object.entries(countryKeywords)) {
    if (words.some(w => msg.includes(w))) {
      const response = knowledgeBase[key];
      if (response) return response;
    }
  }

  const keywords = {
    voting: ['voting', 'vote', 'ballot', 'poll', 'cast'],
    registration: ['regist', 'register', 'enroll', 'sign up'],
    timeline: ['timeline', 'schedule', 'dates', 'process'],
    electoral: ['electoral', 'elector', 'college', 'electors'],
    gerrymandering: ['gerrymand', 'district', 'redistrict', 'maps', 'boundaries'],
    primary: ['primary', 'primaries', 'caucus', 'nominat'],
    absentee: ['mail', 'absentee', 'by mail', 'postal', 'drop box'],
    security: ['security', 'secure', 'fraud', 'hack', 'safe'],
    federal: ['president', 'congress', 'senate', 'house', 'representative'],
    local: ['local', 'city', 'county', 'mayor', 'sheriff'],
    amendment: ['amendment', 'constitution', 'constitutional', 'bill of right']
  };

  for (const [key, words] of Object.entries(keywords)) {
    if (words.some(w => msg.includes(w))) {
      const response = knowledgeBase[key];
      if (response) return response;
    }
  }

  return `### Welcome to ElectED! 🗳️

I'm your election education assistant. I can help you understand:

**Core Topics:**
• 🗳️ How voting works
• 📋 Voter registration
• 📅 Election timeline
• ⚖️ Electoral College
• 🗺️ Gerrymandering
• 🙋 Primary elections
• ✉️ Mail-in ballots
• 🔒 Election security

**Government Levels:**
• 🏛️ Federal offices
• 🏢 Local government

**More:**
• 📜 Constitutional amendments
• 🇮🇳 Indian elections

Ask me anything about elections! What would you like to learn about?`;
}

const SYSTEM_PROMPT = `You are ElectED, a friendly and authoritative AI civic education assistant. Your mission is to help people understand elections, voting, and democracy worldwide — clearly, accessibly, and in a strictly nonpartisan way.

Guidelines:
- Always respond in structured Markdown with ### headers, **bold** labels, and • bullet points
- Keep responses educational, factual, and nonpartisan
- Cover both US elections and global systems when relevant
- Use step-by-step formats where helpful ("**Step 1: Title** — Description")
- End responses with a follow-up question to encourage learning
- Never express political opinions or favor any party, candidate, or ideology
- If asked about controversial topics, present all perspectives factually
- Maximum response length: 400 words

Topics you excel at: voter registration, voting methods, electoral systems, gerrymandering, primaries, mail-in ballots, election security, Electoral College, global elections, constitutional amendments, campaign finance, redistricting.`;

app.post("/api/chat", rateLimit, async (req, res) => {
  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "messages array is required" });
    }

    if (messages.length >= 25) {
      return res.status(400).json({ error: "Too many messages (max 25)" });
    }

    for (const m of messages) {
      if (!m.role || !m.content || typeof m.content !== "string") {
        return res.status(400).json({ error: "Each message must have role and content" });
      }
      if (!["user", "assistant"].includes(m.role)) {
        return res.status(400).json({ error: "Message role must be user or assistant" });
      }
    }

    const lastUserMsg = messages[messages.length - 1]?.content || "";
    const sanitizedInput = validate.string(lastUserMsg, "User input", 600);

    if (model) {
      try {
        const history = messages.slice(0, -1).map(m => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }]
        }));
        const chat = model.startChat({
          history,
          systemInstruction: SYSTEM_PROMPT,
          generationConfig: { maxOutputTokens: 600, temperature: 0.7 }
        });
        const result = await chat.sendMessage(sanitizedInput);
        const reply = result.response.text();
        return res.json({ success: true, reply, demo: false, model: "gemini-1.5-flash" });
      } catch (aiErr) {
        console.error("[Gemini error, falling back]", aiErr.message);
      }
    }

    const reply = findBestResponse(lastUserMsg);
    res.json({ success: true, reply, demo: true, model: "keyword-fallback" });
  } catch (err) {
    console.error("[API Chat Error]", err.message);
    res.status(500).json({ error: "Chat service temporarily unavailable", details: err.message });
  }
});

// Quiz API
const quizBank = [
  // Registration (0-4)
  { id:0, topic:"registration", q:"What is the typical voter registration deadline before US election day?", opts:["Same day","7 days","15–30 days","60 days"], ans:2, exp:"Most US states require registration 15–30 days before Election Day, though some allow same-day registration." },
  { id:1, topic:"registration", q:"Which type of registration automatically enrolls citizens using government records?", opts:["Manual registration","Automatic registration","Online registration","In-person registration"], ans:1, exp:"Automatic voter registration (AVR) uses existing government data like DMV records to register eligible citizens." },
  { id:2, topic:"registration", q:"Which document is typically required for voter registration in the US?", opts:["Passport only","Government-issued ID","Birth certificate only","Social Security card only"], ans:1, exp:"A government-issued photo ID (like a driver's license) along with proof of residence is the standard requirement." },
  { id:3, topic:"registration", q:"How many US states currently allow same-day voter registration?", opts:["5","12","22","Over 20"], ans:3, exp:"More than 20 states plus Washington D.C. allow voters to register and vote on the same day." },
  { id:4, topic:"registration", q:"At what age can US citizens pre-register to vote in most states that allow it?", opts:["16","17","18","15"], ans:0, exp:"Many states allow 16-year-olds to pre-register so they are automatically registered when they turn 18." },
  // Electoral College (5-9)
  { id:5, topic:"electoral", q:"How many electoral votes are needed to win the US Presidential election?", opts:["269","270","300","538"], ans:1, exp:"A candidate needs a majority of 270 out of 538 total electoral votes to win the presidency." },
  { id:6, topic:"electoral", q:"How many total electoral votes exist in the Electoral College?", opts:["435","538","500","270"], ans:1, exp:"538 electoral votes = 435 (House seats) + 100 (Senate seats) + 3 (Washington D.C. via 23rd Amendment)." },
  { id:7, topic:"electoral", q:"Which two states use the congressional district method instead of winner-take-all?", opts:["Texas & California","Maine & Nebraska","Florida & Ohio","Virginia & Pennsylvania"], ans:1, exp:"Maine and Nebraska allocate electoral votes by congressional district, so candidates can split a state's electors." },
  { id:8, topic:"electoral", q:"How many times has a US President won without winning the popular vote?", opts:["2","3","5","7"], ans:2, exp:"Five presidents won the Electoral College while losing the popular vote: Adams (1824), Hayes (1876), Harrison (1888), Bush (2000), Trump (2016)." },
  { id:9, topic:"electoral", q:"When do Electoral College electors formally cast their votes?", opts:["Election Day in November","Inauguration Day","First Tuesday of December","Mid-December after the election"], ans:3, exp:"Electors meet in their state capitals in mid-December (the first Tuesday after the second Wednesday) to formally cast their votes." },
  // Vote Counting (10-14)
  { id:10, topic:"counting", q:"What device is used to count most paper ballots in modern US elections?", opts:["Hand counting only","Optical scanners","Electronic voting only","Mail sorting machines"], ans:1, exp:"Optical scan systems photograph ballots and use image recognition to count votes, while retaining a physical paper record." },
  { id:11, topic:"counting", q:"Who can legally observe the vote counting process?", opts:["Nobody","Only government officials","Representatives from all parties","Only election officials"], ans:2, exp:"Election law in all 50 states allows representatives from all qualified parties to observe ballot counting as poll watchers." },
  { id:12, topic:"counting", q:"What type of audit statistically samples ballots to verify machine counts?", opts:["Canvassing","Full recount","Risk-Limiting Audit (RLA)","Certification review"], ans:2, exp:"Risk-Limiting Audits (RLAs) use statistical sampling to provide strong evidence that the reported winner actually won." },
  { id:13, topic:"counting", q:"What triggers an automatic recount in most US states?", opts:["Any candidate requests it","Margin within 0.5% or less","Media calls a race wrong","Results delayed past midnight"], ans:1, exp:"Most states mandate automatic recounts when the margin of victory falls within a certain threshold, typically 0.5% or less." },
  { id:14, topic:"counting", q:"What does 'canvassing' mean in election administration?", opts:["Door-to-door campaigning","The official review and certification of election results","Counting mail-in ballots","Registering new voters"], ans:1, exp:"Canvassing is the official process of reviewing all ballots, resolving discrepancies, and certifying the final vote count." },
  // Global Systems (15-19)
  { id:15, topic:"global", q:"Which electoral system gives legislative seats proportional to each party's vote share?", opts:["First-Past-The-Post","Ranked Choice Voting","Proportional Representation","Two-Round System"], ans:2, exp:"In PR systems like Germany and Netherlands, if a party wins 30% of votes, it gets roughly 30% of seats." },
  { id:16, topic:"global", q:"Which country has compulsory (mandatory) voting for its citizens?", opts:["United States","United Kingdom","Australia","Canada"], ans:2, exp:"Australia has had compulsory voting since 1924. Eligible citizens who fail to vote without a valid reason can be fined." },
  { id:17, topic:"global", q:"What is India's Lok Sabha?", opts:["Upper house of Parliament","Lower house of Parliament (House of the People)","India's Supreme Court","India's Election Commission"], ans:1, exp:"Lok Sabha is the lower house of India's bicameral Parliament, with 543 directly elected seats filled using First-Past-The-Post." },
  { id:18, topic:"global", q:"Which system requires a candidate to win over 50% to avoid a runoff?", opts:["First-Past-The-Post","Two-Round System","Proportional Representation","Mixed Member"], ans:1, exp:"The Two-Round System (used in France and many others) requires a second 'runoff' election if no candidate wins a majority." },
  { id:19, topic:"global", q:"In which country do citizens vote for a party list, not individual candidates?", opts:["United States","United Kingdom","Israel","Australia"], ans:2, exp:"Israel uses a pure Proportional Representation system where voters choose a party, and seats are allocated based on vote share." },
  // India (30-39)
  { id:30, topic:"india", q:"How many total seats are in India's Lok Sabha?", opts:["435","543","600","525"], ans:1, exp:"543 elected members + 2 nominated Anglo-Indian (abolished in 2019) = 543 seats filled by FPTP." },
  { id:31, topic:"india", q:"What is the minimum voting age in India?", opts:["21","18","25","16"], ans:1, exp:"India lowered voting age from 21 to 18 in 1988." },
  { id:32, topic:"india", q:"Which body manages elections in India?", opts:["Parliament","Election Commission of India (ECI)","Supreme Court","State Governments"], ans:1, exp:"The Election Commission of India (ECI) is an independent constitutional body that manages all elections." },
  { id:33, topic:"india", q:"What is NOTA in Indian elections?", opts:["National Election","None of the Above","New Order to Attend","Notification"], ans:1, exp:"NOTA (None of the Above) was introduced in 2013 to allow voters to reject all candidates." },
  { id:34, topic:"india", q:"How many phases can Indian general elections have?", opts:["1-2","3-5","5-8","10+"], ans:2, exp:"Due to size, Indian elections happen in 5-8 phases to deploy security forces effectively." },
  { id:35, topic:"india", q:"What is the election symbol of BJP?", opts:["Hand","Lotus","Broom","Cycle"], ans:1, exp:"Bharatiya Janata Party's symbol is the Lotus flower." },
  { id:36, topic:"india", q:"What is EVM in Indian elections?", opts:["Election Voting Machine","Electronic Voting Machine","Extra Voter Mark","Eligible Voter Module"], ans:1, exp:"EVM (Electronic Voting Machine) is used in India since 1982 for voting." },
  { id:37, topic:"india", q:"How much is the nomination deposit for Lok Sabha?", opts:["₹10,000","₹25,000","₹50,000","₹1 lakh"], ans:1, exp:"Deposit is ₹25,000 (₹12,500 for SC/ST) - forfeited if candidate gets less than 1/6 of valid votes." },
  { id:38, topic:"india", q:"Which state has the most Lok Sabha seats?", opts:["Maharashtra","West Bengal","Uttar Pradesh","Bihar"], ans:2, exp:"Uttar Pradesh has 80 Lok Sabha seats - the most of any Indian state." },
  { id:39, topic:"india", q:"What is VVPAT?", opts:["Voter Video Proof Automatic Tracker","Voter Verified Paper Audit Trail","Verified Voting Paper After Tally","Verified Voter Preference Authentication"], ans:1, exp:"VVPAT provides a paper slip verification of vote cast electronically - introduced in 2013." },
  // UK (40-44)
  { id:40, topic:"uk", q:"How many seats are in UK's House of Commons?", opts:["435","548","650","725"], ans:2, exp:"650 seats in the House of Commons - first-past-the-post system." },
  { id:41, topic:"uk", q:"Which party won the 2024 UK general election?", opts:["Conservative","Labour","Liberal Democrats"," SNP"], ans:1, exp:"Labour won in 2024 with a landslide, ending 14 years of Conservative rule." },
  { id:42, topic:"uk", q:"What is the UK voting age?", opts:["16","18","21","25"], ans:1, exp:"UK voting age is 18 - lowered from 21 in 1969." },
  // Germany (45-49)
  { id:45, topic:"germany", q:"How many seats in German Bundestag?", opts:["299","598","650","700"], ans:1, exp:"598 seats + overhang compensation seats = ~700 total in Bundestag." },
  { id:46, topic:"germany", q:"Who was German Chancellor Angela Merkel?", opts:["2005-2021","2010-2016","2000-2010","2015-2019"], ans:0, exp:"Merkel served as Chancellor from 2005-2021, four terms." },
  // France (50-54)
  { id:50, topic:"france", q:"Who won the 2022 French presidential election?", opts:["Le Pen","Macron","Mélenchon","Zemmour"], ans:1, exp:"Macron won re-election in 2022 defeating Le Pen in the runoff." },
  { id:51, topic:"france", q:"What is France's election system?", opts:["First-Past-The-Post","Two-Round System","Proportional","Ranked Choice"], ans:1, exp:"France uses Two-Round System - if no candidate gets 50%+, top 2 face runoff." },
  // Australia (55-59)
  { id:55, topic:"australia", q:"What is Australia's voting system?", opts:["First-Past-The-Post","Optional Preferential","Instant Runoff Voting (IRV)","Proportional"], ans:2, exp:"Australia uses IRV (Instant Runoff Voting) where voters rank all candidates." },
  { id:56, topic:"australia", q:"Does Australia have compulsory voting?", opts:["Yes","No","Only Federal","Only State"], ans:0, exp:"Australia has compulsory voting since 1924 - citizens must vote or face fine." },
  { id:57, topic:"australia", q:"How many seats in Australian House of Representatives?", opts:["150","151","200","250"], ans:1, exp:"150 seats in the House of Representatives (lower house)." },
  // Canada (60-64)
  { id:60, topic:"canada", q:"How many seats in Canadian Parliament?", opts:["308","338","350","400"], ans:1, exp:"338 seats in the House of Commons after 2015 redistribution." },
  { id:61, topic:"canada", q:"What is Canada's voting system?", opts:["Proportional","Mixed Member","First-Past-The-Post","Ranked Choice"], ans:2, exp:"Canada uses FPTP - candidate with most votes wins the seat." },
  { id:62, topic:"canada", q:"Who won 2021 Canadian federal election?", opts:["Conservatives","Liberals","NDP","Bloc Québécois"], ans:1, exp:"Liberals won minority government in 2021 under Trudeau." },
  // Security & Process (20-24)
  { id:20, topic:"security", q:"What does VVPAT stand for in election security?", opts:["Verified Voter Paper Audit Trail","Voter Validated Paper Audit Trail","Voluntary Voting Paper Authentication Tracker","Verified Voting Paper Authorization Tag"], ans:1, exp:"Voter Verified Paper Audit Trail (VVPAT) is a printed record that voters can verify before submitting their ballot electronically." },
  { id:21, topic:"security", q:"Which federal agency certifies US voting systems?", opts:["FBI","DHS","Election Assistance Commission (EAC)","FEC"], ans:2, exp:"The U.S. Election Assistance Commission (EAC) certifies voting systems to voluntary federal standards under HAVA (2002)." },
  { id:22, topic:"security", q:"What is 'chain of custody' in elections?", opts:["The legal process for challenging results","A documented trail showing who handled ballots at every stage","The order in which candidates appear on the ballot","The sequence of election officials who certify results"], ans:1, exp:"Chain of custody is a documented record of everyone who handled ballots, ensuring no unauthorized access or tampering occurred." }
];

app.get("/api/quiz", (req, res) => {
  const { topic, limit = 5 } = req.query;
  let filtered = quizBank;
  
  if (topic) {
    filtered = quizBank.filter(q => q.topic === topic);
  }
  
  const shuffled = [...filtered].sort(() => Math.random() - 0.5).slice(0, parseInt(limit));
  res.json({ success: true, questions: shuffled, total: filtered.length });
});

app.get("/api/quiz/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const question = quizBank.find(q => q.id === id);
  
  if (!question) {
    return res.status(404).json({ error: "Quiz question not found" });
  }
  
  res.json({ success: true, question });
});

// Start server if not in test or Vercel environment
const isTest = process.env.NODE_ENV === 'test';
if (!isTest && !isVercel) {
  app.listen(PORT, () => {
    console.log(`ElectED server running on http://localhost:${PORT}`);
  });
}

// Export for Vercel
module.exports = app;
