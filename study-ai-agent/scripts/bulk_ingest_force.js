const fs = require('fs');
const path = require('path');

const argv = require('process').argv.slice(2);
const countArg = argv.find(a => a.startsWith('--count='));
const count = countArg ? parseInt(countArg.split('=')[1], 10) : 1000;

const datasetPath = path.join(__dirname, '..', 'data', 'study_dataset.json');
if (!fs.existsSync(datasetPath)) {
  console.error('Dataset not found at', datasetPath);
  process.exit(1);
}

const raw = fs.readFileSync(datasetPath, 'utf8');
const data = JSON.parse(raw);

const subjectName = 'Synthetic Imports';
const topicName = 'BulkGenerated';

let subject = data.subjects.find(s => s.name === subjectName);
if (!subject) {
  subject = { name: subjectName, topics: [] };
  data.subjects.push(subject);
}

let topic = subject.topics.find(t => t.name === topicName);
if (!topic) {
  topic = { name: topicName, content: 'Auto-generated bulk dataset for training.', key_concepts: [], examples: [], quiz: [] };
  subject.topics.push(topic);
}

const start = topic.quiz ? topic.quiz.length : 0;
topic.quiz = topic.quiz || [];
for (let i = 0; i < count; i++) {
  const qnum = start + i + 1;
  topic.quiz.push({ question: `Auto-generated question ${qnum}: What is BulkGenerated example ${qnum}?`, answer: `Auto-generated answer for example ${qnum}. This is synthetic training data.` });
}

fs.writeFileSync(datasetPath, JSON.stringify(data, null, 2), 'utf8');
console.log(`Appended ${count} synthetic quiz items to ${subjectName} -> ${topicName}.`);
console.log('Run `npm run train` to retrain the models.');
