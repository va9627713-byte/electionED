import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, HTMLResponse
from pydantic import BaseModel

app = FastAPI(title="ElectED API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatMessage(BaseModel):
    messages: list

class Feedback(BaseModel):
    rating: int
    question: str | None = None
    feedback: str | None = None

class QuizValidate(BaseModel):
    id: int
    answer: str

knowledge_base = {
    "india": "### Indian General Elections 🗳️\n\nThe World's Largest Democracy - 900+ million voters.\n\n**Election Commission of India (ECI)**\n- Independent constitutional body\n- Chief Election Commissioner (CEC)\n- Manages all elections",
    "voting": "### US Voting Process\n\n1. Register to vote at vote.gov\n2. Check your polling location\n3. Vote in-person or by mail\n4. Track your ballot",
    "electoral": "### Electoral College\n\nA system where voters elect electors who then vote for President. Each state gets electoral votes equal to its Senators + Representatives.",
    "gerrymandering": "### Gerrymandering\n\nManipulating district boundaries to favor a particular party or group. Courts have limited power to intervene.",
    "primary": "### Primary Elections\n\nFirst elections where voters choose party candidates. Can be closed (party members only) or open (all voters).",
}

facts = [
    {"text": "India holds the world's biggest elections with 900+ million voters", "country": "India"},
    {"text": "The US Electoral College has 538 electors", "country": "USA"},
    {"text": "Australia was the first country to implement mandatory voting", "country": "Australia"},
    {"text": "Germany uses Mixed Member Proportional system", "country": "Germany"},
    {"text": "New Zealand was first to adopt MMP in 1993", "country": "New Zealand"},
]

quiz_questions = [
    {"id": 1, "topic": "india", "q": "Who manages elections in India?", "opts": ["ECI", "CEC", "President", "PM"], "ans": "ECI"},
    {"id": 2, "topic": "voting", "q": "Where do you register to vote in the US?", "opts": ["vote.gov", "usa.gov", "whitehouse.gov", "congress.gov"], "ans": "vote.gov"},
    {"id": 3, "topic": "electoral", "q": "How many electors are there?", "opts": ["435", "538", "100", "535"], "ans": "538"},
    {"id": 4, "topic": "gerrymandering", "q": "What is gerrymandering?", "opts": ["Vote fraud", "District manipulation", "Campaign strategy", "Voter ID"], "ans": "District manipulation"},
    {"id": 5, "topic": "primary", "q": "What is a primary election?", "opts": ["General election", "Candidate selection", "Runoff election", "Local election"], "ans": "Candidate selection"},
]

topics = [
    {"id": "india", "title": "India Elections", "icon": "🇮🇳", "category": "global"},
    {"id": "usa", "title": "US Elections", "icon": "🇺🇸", "category": "global"},
    {"id": "voting", "title": "How to Vote", "icon": "🗳️", "category": "basics"},
    {"id": "registration", "title": "Voter Registration", "icon": "📋", "category": "basics"},
    {"id": "timeline", "title": "Election Timeline", "icon": "📅", "category": "basics"},
    {"id": "electoral", "title": "Electoral College", "icon": "🏛️", "category": "system"},
    {"id": "gerrymandering", "title": "Gerrymandering", "icon": "🗺️", "category": "system"},
    {"id": "primary", "title": "Primary Elections", "icon": "🎯", "category": "system"},
    {"id": "security", "title": "Election Security", "icon": "🔒", "category": "system"},
    {"id": "federal", "title": "Federal vs Local", "icon": "⚖️", "category": "basics"},
]

faqs = [
    {"q": "When is the next election?", "a": "Presidential elections are every 4 years (2024, 2028), midterms every 2 years."},
    {"q": "How do I register to vote?", "a": "Register online at vote.gov, by mail, or in-person at your local election office."},
    {"q": "Can I vote by mail?", "a": "Yes, many states offer no-excuse absentee or mail-in voting."},
    {"q": "What is the Electoral College?", "a": "A system where voters elect electors who then vote for President."},
    {"q": "What is gerrymandering?", "a": "Manipulating district boundaries to favor a particular party or group."},
]

languages = [
    {"code": "en", "name": "English"},
    {"code": "hi", "name": "Hindi"},
    {"code": "es", "name": "Spanish"},
    {"code": "fr", "name": "French"},
    {"code": "de", "name": "German"},
    {"code": "zh", "name": "Chinese"},
]

systems = [
    {"name": "First-Past-The-Post", "countries": ["US", "UK", "Canada"], "description": "Winner has most votes"},
    {"name": "Proportional Representation", "countries": ["Germany", "Netherlands"], "description": "Seats match vote share"},
    {"name": "Mixed Member", "countries": ["Japan", "Italy"], "description": "Combines FPTP and PR"},
    {"name": "Ranked Choice", "countries": ["Australia", "Maine"], "description": "Rank candidates in order"},
]

@app.get("/")
async def root():
    return HTMLResponse(open("public/index.html").read() if os.path.exists("public/index.html") else "<h1>ElectED API Running</h1>")

@app.get("/health")
async def health():
    return {"status": "ok", "service": "ElectED", "version": "2.3.1"}

@app.get("/api/topics")
async def get_topics():
    return {"success": True, "topics": topics}

@app.get("/api/faq")
async def get_faq():
    return {"success": True, "faqs": faqs}

@app.get("/api/facts")
async def get_facts():
    return {"success": True, "facts": facts}

@app.get("/api/languages")
async def get_languages():
    return {"success": True, "languages": languages}

@app.get("/api/global-systems")
async def get_systems():
    return {"success": True, "systems": systems}

@app.post("/api/chat")
async def chat(req: ChatMessage):
    return {"success": True, "reply": "Demo mode - Configure GEMINI_API_KEY for AI responses", "sources": []}

@app.post("/api/feedback")
async def feedback(req: Feedback):
    return {"success": True, "message": "Feedback received"}

@app.get("/api/quiz")
async def quiz(count: int = 5, topic: str = None):
    q = [x for x in quiz_questions if topic is None or x["topic"] == topic][:min(count, 10)]
    return {"success": True, "questions": [{"id": x["id"], "topic": x["topic"], "q": x["q"], "opts": x["opts"]} for x in q]}

@app.post("/api/quiz/validate")
async def validate_quiz(req: QuizValidate):
    q = next((x for x in quiz_questions if x["id"] == req.id), None)
    if not q:
        return JSONResponse({"correct": False, "error": "Question not found"}, status_code=404)
    return {"correct": req.answer.lower() == q["ans"].lower(), "correctAnswer": q["ans"]}

@app.post("/api/translate")
async def translate(req: Request):
    body = await req.json()
    text = body.get("text", "")
    target = body.get("target", "en")
    return {"success": True, "translated": text, "service": "demo"}

@app.get("/api/stats")
async def stats():
    return {
        "success": True,
        "version": "3.0.0",
        "topicsCount": len(topics),
        "quizCount": len(quiz_questions),
        "factsCount": len(facts),
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", 8080)))