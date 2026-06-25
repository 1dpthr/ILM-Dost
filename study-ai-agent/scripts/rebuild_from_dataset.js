const IntentClassifier = require('../agent/classifier');
const fs = require('fs');
const path = require('path');

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
  const extraPath = path.join(__dirname, '..', 'data', 'study_dataset_extra.json');

  if (fs.existsSync(extraPath)) {
    try {
      const extra = JSON.parse(fs.readFileSync(extraPath, 'utf8'));
      mergeDatasetSubjects(dataset, extra);
      console.log('Loaded supplemental dataset:', path.basename(extraPath));
    } catch (e) {
      console.warn('Could not load supplemental dataset:', e && e.message);
    }
  }

  return dataset;
}

async function run() {
  const clf = new IntentClassifier();

  const dataPath = path.join(__dirname, '..', 'data', 'study_dataset.json');
  let dataset = null;
  try { dataset = loadMergedDataset(dataPath); } catch (e) { console.error('Could not read dataset:', e && e.message); process.exit(1); }

  let added = 0;

  // Add seed training data
  clf._addTrainingData();

  if (dataset && Array.isArray(dataset.subjects)) {
    dataset.subjects.forEach(subject => {
      if (!subject || !Array.isArray(subject.topics)) return;
      subject.topics.forEach(topic => {
        const tname = topic.name || 'topic';
        // Add explain/summarize/example prompts
        try { clf.classifier.addDocument(`explain ${tname}`, 'explain'); added++; } catch (e) {}
        try { clf.classifier.addDocument(`explain ${tname} briefly`, 'explain'); added++; } catch (e) {}
        try { clf.classifier.addDocument(`summarize ${tname}`, 'summarize'); added++; } catch (e) {}
        try { clf.classifier.addDocument(`give an example of ${tname}`, 'example'); added++; } catch (e) {}

        // Key concepts -> define
        if (Array.isArray(topic.key_concepts)) {
          topic.key_concepts.forEach(kc => {
            if (kc && kc.term) {
              try { clf.classifier.addDocument(`what is ${kc.term}`, 'define'); added++; } catch (e) {}
              try { clf.classifier.addDocument(`define ${kc.term}`, 'define'); added++; } catch (e) {}
            }
          });
        }

        // Quiz items
        if (Array.isArray(topic.quiz)) {
          topic.quiz.forEach(q => {
            if (q && q.question) {
              try { clf.classifier.addDocument(q.question, 'quiz'); added++; } catch (e) {}
            }
          });
        }
      });
    });
  }

  // Also include pending feedback if present
  const pendingPath = path.join(__dirname, '..', 'data', 'pending_feedback.json');
  let pend = [];
  try { pend = JSON.parse(fs.readFileSync(pendingPath, 'utf8')) || []; } catch (e) {}
  pend.forEach(p => { if (p && p.text && p.label) { try { clf.classifier.addDocument(p.text, p.label); added++; } catch (e) {} } });

  console.log('Training classifier with documents added:', added);
  clf.classifier.train();

  const modelPath = path.join(__dirname, '..', 'data', 'intent_model.json');
  clf.classifier.save(modelPath, (err) => {
    if (err) {
      console.error('Error saving model:', err);
      process.exit(1);
    }
    console.log('Saved model to', modelPath);
    try {
      const m = JSON.parse(fs.readFileSync(modelPath, 'utf8'));
      console.log('Model totalExamples:', m && m.classifier && m.classifier.totalExamples ? m.classifier.totalExamples : 'unknown');
    } catch (e) { console.warn('Could not read saved model:', e && e.message); }

    // Run smoke tests
    const tests = ['explain photosynthesis', 'quiz me on algebra', 'what is inertia', 'hello', 'give an example of geometry'];
    tests.forEach(q => {
      try {
        const label = clf.classifier.classify(q);
        console.log(`"${q}" -> ${label}`);
      } catch (e) { console.log('classify error for', q); }
    });

    process.exit(0);
  });
}

run();
