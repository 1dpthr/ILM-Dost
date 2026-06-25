// ============================================================
//  train.js
//  Run this ONCE before starting the server:  node train.js
//  It trains the intent classifier and validates the dataset.
// ============================================================

const IntentClassifier = require('./agent/classifier');
const StudyRetriever   = require('./agent/retriever');
const path             = require('path');
const fs               = require('fs');

function mergeDatasetSubjects(baseDataset, extraDataset) {
  if (!baseDataset.subjects) baseDataset.subjects = [];
  if (!extraDataset || !Array.isArray(extraDataset.subjects)) return baseDataset;

  extraDataset.subjects.forEach(extraSubject => {
    if (!extraSubject || !extraSubject.name) return;
    const subjectName = extraSubject.name.trim();
    if (!subjectName) return;

    let subject = baseDataset.subjects.find(item => (item.name || '').toLowerCase() === subjectName.toLowerCase());
    if (!subject) {
      subject = { name: subjectName, topics: [] };
      baseDataset.subjects.push(subject);
    }

    if (!Array.isArray(subject.topics)) subject.topics = [];
    (extraSubject.topics || []).forEach(extraTopic => {
      if (!extraTopic) return;
      const topicName = (extraTopic.name || extraTopic.topic || '').trim();
      if (!topicName) return;

      const exists = subject.topics.some(item => (item.name || item.topic || '').toLowerCase() === topicName.toLowerCase());
      if (!exists) {
        subject.topics.push({
          name: topicName,
          content: extraTopic.content || '',
          key_concepts: extraTopic.key_concepts || [],
          examples: extraTopic.examples || [],
          quiz: extraTopic.quiz || [],
        });
      }
    });
  });

  return baseDataset;
}

function loadMergedDataset(datasetPath) {
  const dataset = JSON.parse(fs.readFileSync(datasetPath, 'utf8'));
  const extraPath = path.join(__dirname, 'data/study_dataset_extra.json');

  if (fs.existsSync(extraPath)) {
    try {
      const extra = JSON.parse(fs.readFileSync(extraPath, 'utf8'));
      mergeDatasetSubjects(dataset, extra);
      console.log(`   Loaded supplemental dataset: ${path.basename(extraPath)}`);
    } catch (e) {
      console.warn('   Could not load supplemental dataset:', e && e.message);
    }
  }

  return dataset;
}

console.log('\n🚀 ============================================');
console.log('   Study AI Agent — Training Script');
console.log('============================================\n');

// ── Step 1: Train the intent classifier ─────────────────────
console.log('📌 Step 1: Training Intent Classifier...');
const classifier = new IntentClassifier();
classifier.train();

// Quick smoke-test
const testIntents = [
  { input: 'explain photosynthesis',          expected: 'explain'   },
  { input: 'quiz me on algebra',              expected: 'quiz'      },
  { input: 'summarize world war 2',           expected: 'summarize' },
  { input: 'give me an example of geometry',  expected: 'example'   },
  { input: 'what is inertia',                 expected: 'define'    },
  { input: 'hello',                           expected: 'general'   },
];

console.log('\n   Intent classifier smoke tests:');
let passed = 0;
testIntents.forEach(({ input, expected }) => {
  const got = classifier.classify(input);
  const ok  = got === expected ? '✅' : '❌';
  if (got === expected) passed++;
  console.log(`   ${ok}  "${input}"  →  ${got}  (expected: ${expected})`);
});
console.log(`\n   Result: ${passed}/${testIntents.length} tests passed\n`);

// ── Step 2: Validate the study dataset ──────────────────────
console.log('📌 Step 2: Validating Study Dataset...');
const datasetPath = path.join(__dirname, 'data/study_dataset.json');

if (!fs.existsSync(datasetPath)) {
  console.error('❌ Dataset not found at:', datasetPath);
  console.error('   Create the file first, then re-run this script.\n');
  process.exit(1);
}

const dataset = loadMergedDataset(datasetPath);
console.log(`   Found ${dataset.subjects.length} subjects:\n`);

let totalTopics    = 0;
let totalConcepts  = 0;
let totalQuestions = 0;
let totalExamples  = 0;

dataset.subjects.forEach(s => {
  console.log(`   📚 ${s.name}  (${s.topics.length} topics)`);
  s.topics.forEach(t => {
    const concepts  = (t.key_concepts || []).length;
    const questions = (t.quiz || []).length;
    const examples  = (t.examples || []).length;
    console.log(
      `      • ${t.topic || t.name}  —  ${concepts} concepts, ` +
      `${questions} quiz Qs, ${examples} examples`
    );
    totalTopics++;
    totalConcepts  += concepts;
    totalQuestions += questions;
    totalExamples  += examples;
  });
});

console.log(`\n   Totals: ${totalTopics} topics · ${totalConcepts} concepts · ` +
  `${totalQuestions} quiz questions · ${totalExamples} examples`);

// ── Step 3: Load dataset into retriever and test search ──────
console.log('\n📌 Step 3: Testing Retrieval Engine...');
const retriever = new StudyRetriever();
retriever.loadDataset(dataset);

const searchTests = [
  'what is photosynthesis',
  'explain algebra',
  'newton third law',
  'world war two',
  'what is a noun',
];

console.log('\n   Retrieval smoke tests:');
searchTests.forEach(q => {
  const results = retriever.search(q, 1);
  const top     = results[0];
  if (top) {
    console.log(`   ✅  "${q}"  →  ${top.metadata.topic} (score: ${top.score})`);
  } else {
    console.log(`   ⚠️   "${q}"  →  No results`);
  }
});

// ── Done ─────────────────────────────────────────────────────
console.log('\n============================================');
console.log('✅  Training Complete!');
console.log('   Run  npm start  to launch the server.');
console.log('============================================\n');
