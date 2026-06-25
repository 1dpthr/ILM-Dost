const IntentClassifier = require('../agent/classifier');
const fs = require('fs');
const path = require('path');

async function run() {
  const clf = new IntentClassifier();
  // Use internal training seeds
  if (typeof clf._addTrainingData === 'function') clf._addTrainingData();

  // Load pending feedback
  const pendingPath = path.join(__dirname, '..', 'data', 'pending_feedback.json');
  let pend = [];
  try { pend = JSON.parse(fs.readFileSync(pendingPath, 'utf8')) || []; } catch (e) {}
  console.log('Pending examples to add:', pend.length);

  pend.forEach(p => {
    try { clf.classifier.addDocument(p.text.toLowerCase().trim(), p.label); } catch (e) {}
  });

  console.log('Training classifier with seeds + pending...');
  clf.classifier.train();

  const modelPath = path.join(__dirname, '..', 'data', 'intent_model.json');
  clf.classifier.save(modelPath, (err) => {
    if (err) {
      console.error('Error saving model:', err);
      process.exit(1);
    }
    console.log('Saved model to', modelPath);

    // read model and report totalExamples
    try {
      const m = JSON.parse(fs.readFileSync(modelPath, 'utf8'));
      const total = m && m.classifier && m.classifier.totalExamples ? m.classifier.totalExamples : 'unknown';
      console.log('Model totalExamples:', total);
    } catch (e) {
      console.error('Could not read model file after save:', e && e.message);
    }

    // simple classification checks
    const test = ['explain photosynthesis', 'quiz me on algebra', 'what is inertia', 'hello'];
    test.forEach(q => {
      try {
        const label = clf.classifier.classify(q);
        console.log(`"${q}" -> ${label}`);
      } catch (e) {}
    });

    process.exit(0);
  });
}

run();
