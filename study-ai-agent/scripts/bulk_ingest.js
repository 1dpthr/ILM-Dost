const fs = require('fs');
const path = require('path');

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--file' && args[i+1]) { out.file = args[++i]; }
    else if (a === '--count' && args[i+1]) { out.count = parseInt(args[++i], 10); }
    else if (a === '--preview') { out.preview = true; }
  }
  return out;
}

function backupFile(filePath) {
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const dest = filePath + `.bak.${ts}`;
  fs.copyFileSync(filePath, dest);
  return dest;
}

function loadDataset(datasetPath) {
  const raw = fs.readFileSync(datasetPath, 'utf8');
  return JSON.parse(raw);
}

function saveDataset(datasetPath, data) {
  fs.writeFileSync(datasetPath, JSON.stringify(data, null, 2), 'utf8');
}

function generateExamples(dataset, count) {
  const subjects = dataset.subjects || [];
  const results = [];
  if (!subjects.length) return results;

  function randInt(max) { return Math.floor(Math.random() * max); }

  const templates = [
    q => `What is ${q}?`,
    q => `Explain ${q} briefly.`,
    q => `How does ${q} work?`,
    q => `Give an example of ${q}.`,
    q => `Why is ${q} important?`,
    q => `List key concepts of ${q}.`
  ];

  let i = 0;
  while (results.length < count && i < count * 5) {
    i++;
    const s = subjects[randInt(subjects.length)];
    if (!s.topics || !s.topics.length) continue;
    const t = s.topics[randInt(s.topics.length)];
    const topicName = t.name || 'Topic';
    const subjectName = s.name || 'Subject';

    const tpl = templates[randInt(templates.length)];
    const question = tpl(topicName) + (results.length % 7 === 0 ? ` (example ${results.length+1})` : '');

    let answer = '';
    if (t.quiz && t.quiz.length) {
      answer = t.quiz[randInt(t.quiz.length)].answer;
    } else if (t.examples && t.examples.length) {
      answer = t.examples[randInt(t.examples.length)];
    } else if (t.content) {
      answer = t.content.split('\n')[0];
    } else {
      answer = `${topicName} is a concept in ${subjectName}.`;
    }

    results.push({ subject: subjectName, topic: topicName, question, answer });
  }
  return results.slice(0, count);
}

function mergeIntoDataset(dataset, items) {
  const subjects = dataset.subjects || [];
  for (const it of items) {
    const s = subjects.find(x => x.name === it.subject) || subjects[0];
    if (!s) continue;
    const t = s.topics.find(x => x.name === it.topic) || s.topics[0];
    if (!t) continue;
    t.quiz = t.quiz || [];
    t.quiz.push({ question: it.question, answer: it.answer });
  }
}

async function main() {
  const args = parseArgs();
  const datasetPath = path.join(__dirname, '..', 'data', 'study_dataset.json');
  if (!fs.existsSync(datasetPath)) {
    console.error('Dataset not found at', datasetPath);
    process.exit(1);
  }

  const dataset = loadDataset(datasetPath);
  const backup = backupFile(datasetPath);
  console.log('Backed up dataset to', backup);

  let items = [];
  if (args.file) {
    const filePath = path.isAbsolute(args.file) ? args.file : path.join(process.cwd(), args.file);
    if (!fs.existsSync(filePath)) {
      console.error('Provided file not found:', filePath);
      process.exit(1);
    }
    const ext = path.extname(filePath).toLowerCase();
    const raw = fs.readFileSync(filePath, 'utf8');
    if (ext === '.json') {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) items = parsed;
      else if (parsed.items) items = parsed.items;
    } else {
      // naive CSV: subject,topic,question,answer
      const lines = raw.split(/\r?\n/).filter(Boolean);
      for (const line of lines) {
        const parts = line.split(',');
        if (parts.length >= 4) {
          items.push({ subject: parts[0].trim(), topic: parts[1].trim(), question: parts[2].trim(), answer: parts[3].trim() });
        }
      }
    }
  } else {
    const count = args.count || 1000;
    console.log('Generating', count, 'examples...');
    items = generateExamples(dataset, count);
  }

  console.log('Merging', items.length, 'items into dataset...');
  mergeIntoDataset(dataset, items);

  if (args.preview) {
    console.log('Preview first 5 merged items:', items.slice(0,5));
  }

  saveDataset(datasetPath, dataset);
  console.log('Saved dataset with', dataset.subjects.reduce((acc,s)=>acc+(s.topics||[]).reduce((a,t)=>a+(t.quiz? t.quiz.length:0),0),0), 'quiz items total.');
  console.log('Done. You can now run `npm run train` in the study-ai-agent folder to retrain the models.');
}

main().catch(err => { console.error(err); process.exit(1); });
