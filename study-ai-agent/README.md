# 🎓 Study AI Agent — Complete Guide

A locally-trained AI agent for educational platforms. **Zero external API.** Runs fully on your machine.

---

## 📐 Architecture

```
User Question
     │
     ▼
┌─────────────────────────────────────────┐
│              StudyAgent                 │
│                                         │
│  ┌────────────┐   ┌──────────────────┐  │
│  │  Classifier│   │    Retriever     │  │
│  │ (Brain.js/ │──▶│  (TF-IDF Search) │  │
│  │  Natural)  │   │  Knowledge Base  │  │
│  └────────────┘   └──────────────────┘  │
│         │                  │            │
│         └────────┬─────────┘            │
│                  ▼                      │
│           ┌─────────────┐               │
│           │  Responder  │               │
│           │ (Templates) │               │
│           └─────────────┘               │
└─────────────────────────────────────────┘
     │
     ▼
Formatted Answer
```

**Three core components:**

| Component | File | What it does |
|-----------|------|--------------|
| **IntentClassifier** | `agent/classifier.js` | Understands *what* the student wants (explain / quiz / define / example / summarize) |
| **StudyRetriever** | `agent/retriever.js` | Finds the most relevant study content using TF-IDF similarity |
| **StudyResponder** | `agent/responder.js` | Formats the final answer based on intent + retrieved content |

---

## 📁 Project Structure

```
study-ai-agent/
├── agent/
│   ├── agent.js          ← Main orchestrator (import this in your project)
│   ├── classifier.js     ← Intent classification (Bayes)
│   ├── retriever.js      ← TF-IDF document search
│   └── responder.js      ← Response generation
├── data/
│   ├── study_dataset.json  ← Your training/knowledge dataset
│   └── intent_model.json   ← Auto-generated after running train.js
├── public/               ← Your frontend goes here
├── server.js             ← Express REST API
├── train.js              ← Run once to train the agent
└── package.json
```

---

## 🚀 Setup & Installation

### 1. Install dependencies
```bash
npm install
```

### 2. Train the agent (run once)
```bash
npm run train
```
This will:
- Train the Bayesian intent classifier
- Validate your dataset
- Run smoke tests
- Save the model to `data/intent_model.json`

### 3. Start the server
```bash
npm start
```
Server runs at `http://localhost:3001`

---

## 🌐 API Reference

### Ask a question
```
POST /api/ask
Content-Type: application/json

{ "question": "explain photosynthesis" }
```

**Response:**
```json
{
  "success": true,
  "response": "## Photosynthesis\n*Subject: Science*\n\n...",
  "intent": "explain",
  "sources": [
    { "subject": "Science", "topic": "Photosynthesis", "type": "content", "relevance": 2.4 }
  ],
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### List available topics
```
GET /api/topics
```

### Get conversation history
```
GET /api/history?limit=20
```

### Clear history
```
DELETE /api/history
```

### Health check
```
GET /api/health
```

## 🔒 Security & Uploads

- To require an API key for sensitive endpoints (uploads, feedback, retrain), set the environment variable `STUDY_AGENT_API_KEY` to a secret value. Requests must include this value in the `x-api-key` header or `Authorization: Bearer <key>`.
- The server attempts to run `clamscan` (ClamAV) to scan uploaded files. If `clamscan` is not installed the scan is skipped and a warning is logged. To enforce scanning, install ClamAV on the host.
- Uploads are restricted to `.txt` and `.md` files, sanitized to remove HTML/script content, truncated to 200 KB, and persisted under `data/uploads/` for auditing.


---

## 💬 Example Questions

| Student asks | Agent does |
|---|---|
| `"explain photosynthesis"` | Full explanation + key concepts |
| `"what is a variable?"` | Precise definition |
| `"quiz me on algebra"` | Random quiz question + hidden answer |
| `"give me an example of Newton's laws"` | Worked examples |
| `"summarize World War II"` | 2-sentence summary + key terms |

---

## 📦 Integrate Into Your Existing Project

```javascript
// In your existing Node.js project:
const StudyAgent = require('./study-ai-agent/agent/agent');

const agent = new StudyAgent();
agent.initialize(() => {
  const result = agent.ask("explain photosynthesis");
  console.log(result.response);
});
```

Or call the REST API from your frontend:
```javascript
const res = await fetch('http://localhost:3001/api/ask', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ question: 'explain algebra' })
});
const data = await res.json();
console.log(data.response);
```

---

## 📝 Adding More Study Content

Edit `data/study_dataset.json` following this structure:

```json
{
  "subjects": [
    {
      "name": "Chemistry",
      "topics": [
        {
          "name": "Periodic Table",
          "content": "The periodic table is a tabular arrangement of chemical elements...",
          "key_concepts": [
            { "term": "element", "definition": "A pure substance that cannot be broken down further by chemical means." }
          ],
          "examples": [
            "Hydrogen (H) is the lightest element with atomic number 1."
          ],
          "quiz": [
            { "question": "What is an element?", "answer": "A pure substance that cannot be broken down by chemical means." }
          ]
        }
      ]
    }
  ]
}
```

After adding content, re-run `npm run train` to reload the knowledge base.

---

## 🧠 How the AI Works (No Black Box!)

### Intent Classification (Bayesian NLP)
The agent uses a **Naive Bayes classifier** from the `natural` library. It's trained on labelled sentence examples like:
- `"explain photosynthesis"` → label: `explain`
- `"quiz me on algebra"` → label: `quiz`

After training, it can classify any new sentence by finding the most probable label.

### Document Retrieval (TF-IDF)
TF-IDF (Term Frequency–Inverse Document Frequency) measures how relevant a word is to a document:
- **TF** = how often the word appears in a document
- **IDF** = how rare the word is across all documents

When a student asks a question, it's converted to a TF-IDF vector and compared against all documents to find the best match.

### Response Generation (Template Engine)
Once we know the intent and have the relevant document, the responder formats a tailored answer — a full explanation, a quiz question, a definition, etc.

---

## 🔧 Troubleshooting

| Problem | Solution |
|---|---|
| `Cannot find module 'natural'` | Run `npm install` |
| Agent returns "not ready" | Wait 2–3 seconds after starting for initialization |
| Poor search results | Add more content to `study_dataset.json` and retrain |
| Wrong intent detected | Add more training examples in `classifier.js` → `_addTrainingData()` |
