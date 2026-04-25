/**
 * ============================================
 * ElectED - Election Process Education Assistant
 * ============================================
 * AI-powered election education using Anthropic Claude
 * Tech Stack: Express.js + Anthropic Claude API
 * ============================================
 */

const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 8080;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Topics for sidebar quick access
const TOPICS = [
  { id: "registration", title: "Voter Registration", icon: "📋" },
  { id: "timeline", title: "Election Timeline", icon: "📅" },
  { id: "ballot-types", title: "Ballot Types", icon: "🗳️" },
  { id: "vote-counting", title: "Vote Counting", icon: "🔢" },
  { id: "electoral-college", title: "Electoral College", icon: "⚖️" },
  { id: "gerrymandering", title: "Gerrymandering", icon: "🗺️" },
  { id: "mail-voting", title: "Mail-in Voting", icon: "✉️" },
  { id: "voting-rights", title: "Voting Rights", icon: "✋" },
  { id: "election-security", title: "Election Security", icon: "🔒" },
  { id: "primary-elections", title: "Primary Elections", icon: "🙋" }
];

// System prompt for Claude
const SYSTEM_PROMPT = `You are ElectED, an AI-powered Election Process Education Assistant. Your role is to educate users about election processes, voting procedures, voting rights, and civic participation.

Key responsibilities:
- Provide accurate, non-partisan information about elections
- Explain voting processes, registration, and requirements
- Discuss election history, systems, and reforms
- Promote civic engagement and informed participation
- Be accessible to all education levels
- Keep responses concise but comprehensive

Focus areas: voter registration, election timelines, ballot types, vote counting, Electoral College, gerrymandering, mail-in voting, voting rights, election security, and primary elections.

Always be educational, neutral, and encouraging about democratic participation.`;

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    success: true,
    status: "ok",
    service: "ElectED",
    timestamp: new Date().toISOString(),
    apiConfigured: !!ANTHROPIC_API_KEY
  });
});

// Get all topics
app.get("/api/topics", (req, res) => {
  res.json({ success: true, topics: TOPICS });
});

// Chat endpoint - proxies to Anthropic Claude API
app.post("/api/chat", async (req, res) => {
  try {
    const { messages } = req.body;

    // Validate request
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ success: false, error: "Messages array required" });
    }

    // Check API key
    if (!ANTHROPIC_API_KEY) {
      return res.status(503).json({
        success: false,
        error: "API key not configured",
        demo: true,
        reply: "Welcome to ElectED! I'm in demo mode without API access. Ask me about voter registration, election timelines, ballot types, vote counting, the Electoral College, gerrymandering, mail-in voting, voting rights, election security, or primary elections."
      });
    }

    // Prepare messages for Claude
    const claudeMessages = messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    // Call Anthropic Claude API
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: claudeMessages
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Anthropic API error:", errorData);
      return res.status(response.status).json({
        success: false,
        error: "API request failed",
        details: errorData.error?.message || "Unknown error"
      });
    }

    const data = await response.json();
    const reply = data.content[0]?.text || "No response generated";

    res.json({
      success: true,
      reply: reply,
      model: "claude-3-5-sonnet-20241022"
    });

  } catch (error) {
    console.error("Chat endpoint error:", error);
    res.status(500).json({
      success: false,
      error: "Server error processing request",
      details: error.message
    });
  }
});

// Fallback route - serve index.html for all other routes
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    success: false,
    error: "Internal server error"
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`\n🎓 ElectED Running`);
  console.log(`📍 Port: ${PORT}`);
  console.log(`🔗 http://localhost:${PORT}`);
  console.log(`🔑 API: ${ANTHROPIC_API_KEY ? "Configured" : "Not configured (demo mode)"}\n`);
});

process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully");
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});

module.exports = app;
