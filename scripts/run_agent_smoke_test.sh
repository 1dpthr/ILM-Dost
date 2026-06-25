#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
AGENT_DIR="$ROOT_DIR/study-ai-agent"
LOG=/tmp/study_agent_smoke_test.log
>"$LOG"

echo "Starting Study AI agent..." | tee -a "$LOG"
# start agent in background
nohup node "$AGENT_DIR/server.js" > /tmp/study_agent.log 2>&1 &
SA_PID=$!
sleep 2

# wait for HTTP port
for i in {1..15}; do
  if curl -sS http://localhost:3001/api/topics >/dev/null 2>&1; then
    echo "Agent is responding (attempt $i)" | tee -a "$LOG"
    break
  fi
  echo "Waiting for agent... ($i)" | tee -a "$LOG"
  sleep 1
done

# upload a sample file if it exists
SAMPLE_FILE="$ROOT_DIR/data/uploads/cf0d4005324c_good.md"
if [ -f "$SAMPLE_FILE" ]; then
  echo "Uploading sample file: $SAMPLE_FILE" | tee -a "$LOG"
  curl -sS -X POST http://localhost:3001/api/upload \
    -F "file=@$SAMPLE_FILE" -F "subject=Imported" -F "topic=SmokeTest" \
    | tee -a "$LOG"
else
  echo "Sample file not found: $SAMPLE_FILE" | tee -a "$LOG"
fi

# Held-out questions to test generalization (not from dataset)
QUESTIONS=(
  "Explain the concept of active recall and why it's effective for studying."
  "How should I schedule study sessions for learning a new language over three months?"
  "What's the difference between formative and summative assessment?"
)

OUT=/tmp/study_agent_responses.jsonl
>"$OUT"
for q in "${QUESTIONS[@]}"; do
  echo "Asking: $q" | tee -a "$LOG"
  resp=$(curl -sS -X POST http://localhost:3001/api/ask -H "Content-Type: application/json" -d "{\"question\": \"${q//"/\"}\"}") || resp='{"error":"request failed"}'
  echo "$resp" | jq -c '.' >> "$OUT" || echo "$resp" >> "$OUT"
  echo "Response logged." | tee -a "$LOG"
  sleep 1
done

echo "Smoke test complete. Agent PID=$SA_PID" | tee -a "$LOG"
echo "Responses saved to $OUT" | tee -a "$LOG"
echo "Agent log: /tmp/study_agent.log" | tee -a "$LOG"

# Note: this script doesn't attempt automatic retraining. Use /api/ingest-chat or /api/feedback to teach the agent.
