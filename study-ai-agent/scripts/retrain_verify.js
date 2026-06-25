const IntentClassifier = require('../agent/classifier');
const fs = require('fs');
const path = require('path');

const clf = new IntentClassifier();

clf.load(() => {
  console.log('\nLoaded classifier. Now processing pending examples...');
  console.log('Processing pending and waiting for save...');
  clf.processPending((err, result) => {
    console.log('processPending callback result:', err ? { error: err.message || err } : result);

    const modelPath = path.join(__dirname, '..', 'data', 'intent_model.json');
    try {
      const m = JSON.parse(fs.readFileSync(modelPath, 'utf8'));
      const total = m && m.classifier && m.classifier.totalExamples ? m.classifier.totalExamples : 'unknown';
      console.log('Model totalExamples (after save):', total);
    } catch (e) {
      console.log('Could not read model file after save:', e && e.message);
    }

    // Smoke tests
    const tests = [
      'explain photosynthesis',
      'quiz me on algebra',
      'summarize world war 2',
      'give me an example of geometry',
      'what is inertia',
      'hello',
      'how does gravity work',
    ];

    console.log('\nSmoke classification tests:');
    tests.forEach(q => {
      const best = clf.getBestClassification(q);
      console.log(`  "${q}" -> ${best.label} (confidence: ${best.confidence})`);
    });

    // Pending length
    const pendingPath = path.join(__dirname, '..', 'data', 'pending_feedback.json');
    try {
      const pend = JSON.parse(fs.readFileSync(pendingPath, 'utf8')) || [];
      console.log('\nPending examples remaining:', pend.length);
    } catch (e) {
      console.log('Pending file not found or unreadable');
    }

    process.exit(0);
  });

  // Smoke tests
  const tests = [
    'explain photosynthesis',
    'quiz me on algebra',
    'summarize world war 2',
    'give me an example of geometry',
    'what is inertia',
    'hello',
    'how does gravity work',
  ];

  console.log('\nSmoke classification tests:');
  tests.forEach(q => {
    const best = clf.getBestClassification(q);
    console.log(`  "${q}" -> ${best.label} (confidence: ${best.confidence})`);
  });

  // Print a sample of pending_feedback length now
  const pendingPath = path.join(__dirname, '..', 'data', 'pending_feedback.json');
  try {
    const pend = JSON.parse(fs.readFileSync(pendingPath, 'utf8')) || [];
    console.log('\nPending examples remaining:', pend.length);
  } catch (e) {
    console.log('Pending file not found or unreadable');
  }

  process.exit(0);
});
