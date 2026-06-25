const fs = require('fs');
const path = require('path');

const datasetPath = path.join(__dirname, '..', 'data', 'study_dataset.json');
const pendingPath = path.join(__dirname, '..', 'data', 'pending_feedback.json');

if (!fs.existsSync(datasetPath)) {
  console.error('Dataset not found:', datasetPath);
  process.exit(1);
}

const dataset = JSON.parse(fs.readFileSync(datasetPath, 'utf8'));

function extractQuestions(ds) {
  const questions = new Set();
  ds.subjects.forEach(s => {
    (s.topics || []).forEach(t => {
      (t.quiz || []).forEach(q => { if (q.question) questions.add(q.question.trim()); });
      if (t.content && t.content.includes('Q:')) {
        const lines = t.content.split(/\r?\n/);
        for (const line of lines) {
          const l = line.trim();
          if (l.startsWith('Q:')) {
            const txt = l.replace(/^Q:\s*/i, '').trim();
            if (txt) questions.add(txt);
          }
        }
      }
    });
  });
  return Array.from(questions);
}

function labelQuestion(q) {
  const qq = q.toLowerCase();
  if (/^(what is|define|definition of|what are|who is)/.test(qq)) return 'define';
  if (/\b(example|give an example|show an example|sample problem)\b/.test(qq)) return 'example';
  if (/\b(quiz|test|practice|question for)\b/.test(qq)) return 'quiz';
  if (/\b(summarize|summary|tldr|summarise)\b/.test(qq)) return 'summarize';
  if (/\b(explain|how does|how do|walk me through|help me understand|elaborate)\b/.test(qq)) return 'explain';
  if (/^(hi|hello|hey|good morning|goodbye|thanks|thank you)\b/.test(qq)) return 'general';
  if (qq.length < 80 && qq.endsWith('?')) return 'define';
  return 'general';
}

const qs = extractQuestions(dataset);
console.log('Found', qs.length, 'questions');

const pending = [];
for (const q of qs) {
  pending.push({ text: q, label: labelQuestion(q) });
}

fs.writeFileSync(pendingPath, JSON.stringify(pending, null, 2), 'utf8');
console.log('Wrote', pending.length, 'pending examples to', pendingPath);
