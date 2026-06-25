const fs = require('fs');
const path = require('path');

const datasetPath = path.join(__dirname, '..', 'data', 'study_dataset.json');
const pendingPath = path.join(__dirname, '..', 'data', 'pending_feedback.json');
const IntentClassifier = require('../agent/classifier');

if (!fs.existsSync(datasetPath)) {
  console.error('Dataset not found:', datasetPath);
  process.exit(1);
}

const dataset = JSON.parse(fs.readFileSync(datasetPath, 'utf8'));

function extractQuestions(ds) {
  const questions = new Set();

  ds.subjects.forEach(s => {
    (s.topics || []).forEach(t => {
      // quiz array
      (t.quiz || []).forEach(q => {
        if (q.question) questions.add(q.question.trim());
      });
      // content Q: blocks
      if (t.content && t.content.includes('Q:')) {
        const lines = t.content.split(/\r?\n/);
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (line.startsWith('Q:')) {
            const qtext = line.replace(/^Q:\s*/i, '').trim();
            if (qtext) questions.add(qtext);
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
  if (/\b(summarize|summary|summarise|give a brief|tl;dr|tldr)\b/.test(qq)) return 'summarize';
  if (/\b(explain|how does|how do|walk me through|help me understand|elaborate)\b/.test(qq)) return 'explain';
  if (/^(hi|hello|hey|good morning|goodbye|thanks|thank you)\b/.test(qq)) return 'general';
  // fallback: if it's short and ends with '?', prefer define
  if (qq.length < 80 && qq.endsWith('?')) return 'define';
  return 'general';
}

function loadPending() {
  try {
    if (fs.existsSync(pendingPath)) {
      const p = JSON.parse(fs.readFileSync(pendingPath, 'utf8')) || [];
      return Array.isArray(p) ? p : [];
    }
  } catch (e) {}
  return [];
}

function savePending(arr) {
  fs.writeFileSync(pendingPath, JSON.stringify(arr, null, 2), 'utf8');
}

async function main() {
  const qs = extractQuestions(dataset);
  console.log('Found', qs.length, 'unique questions in dataset.');

  const pending = loadPending();
  const existingTexts = new Set(pending.map(p => p.text));

  const toAdd = [];
  for (const q of qs) {
    const text = q.trim();
    if (existingTexts.has(text)) continue;
    const label = labelQuestion(text);
    toAdd.push({ text, label });
    existingTexts.add(text);
  }

  console.log('Preparing to queue', toAdd.length, 'heuristic training examples.');
  const newPending = pending.concat(toAdd);
  savePending(newPending);

  // Trigger classifier to process pending examples and retrain
  const clf = new IntentClassifier();
  clf.load(() => {
    const res = clf.processPending();
    console.log('processPending result:', res);
    // show basic stats
    try {
      const model = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'intent_model.json'), 'utf8'));
      console.log('Intent model totalExamples:', model.classifier && model.classifier.totalExamples ? model.classifier.totalExamples : 'unknown');
    } catch (e) {}
    process.exit(0);
  });
}

main();
