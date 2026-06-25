// ============================================================
//  agent/classifier.js
//  Intent Classifier — trained with natural.BayesClassifier
//  No external API. Runs 100% locally.
// ============================================================

const natural = require('natural');
const path    = require('path');
const fs      = require('fs');

class IntentClassifier {
  constructor() {
    this.classifier = new natural.BayesClassifier();
    this.modelPath  = path.join(__dirname, '../data/intent_model.json');
    this.isTrained  = false;
    this.pendingPath = path.join(__dirname, '../data/pending_feedback.json');
    this.pending = [];
    // Load pending feedback if present
    try {
      if (fs.existsSync(this.pendingPath)) {
        const data = JSON.parse(fs.readFileSync(this.pendingPath, 'utf8')) || [];
        this.pending = Array.isArray(data) ? data : [];
      }
    } catch (e) {
      this.pending = [];
    }
  }

  // ── Training data ─────────────────────────────────────────
  _addTrainingData() {
    // EXPLAIN — student wants a detailed explanation
    [
      'explain how does this work',
      'tell me about photosynthesis',
      'how does gravity work',
      'teach me about algebra',
      'describe the water cycle',
      'i want to learn about history',
      'can you explain newton laws',
      'how do computers work',
      'elaborate on the topic',
      'walk me through this concept',
      'help me understand this subject',
      'how does the heart work',
      'explain the process of',
    ].forEach(p => this.classifier.addDocument(p, 'explain'));

    // QUIZ — student wants to be tested
    [
      'quiz me on math',
      'test my knowledge of history',
      'give me a question about biology',
      'practice problems for algebra',
      'ask me something about science',
      'test me on this topic',
      'give me a test question',
      'i want to be tested on',
      'quiz on photosynthesis',
      'practice quiz for me',
      'question about this subject',
    ].forEach(p => this.classifier.addDocument(p, 'quiz'));

    // SUMMARIZE — student wants a short overview
    [
      'summarize photosynthesis',
      'give me a brief overview',
      'short summary of world war',
      'give me a summary of this topic',
      'overview of algebra',
      'brief explanation of',
      'in short what is this',
      'tldr photosynthesis',
      'quick summary of newton',
      'key points about history',
      'main points about this subject',
    ].forEach(p => this.classifier.addDocument(p, 'summarize'));

    // EXAMPLE — student wants worked examples
    [
      'give me an example of photosynthesis',
      'show me an example problem',
      'example of algebra equation',
      'show an example for this topic',
      'example problem for geometry',
      'give example for this',
      'sample problem in math',
      'real life example of this',
      'practical example please',
      'can you show an example',
    ].forEach(p => this.classifier.addDocument(p, 'example'));

    // DEFINE — student wants a definition
    [
      'what is osmosis',
      'define mitosis',
      'definition of velocity',
      'what does photon mean',
      'meaning of chlorophyll',
      'what are variables in math',
      'what do you mean by coefficient',
      'what exactly is inertia',
      'define the term hypotenuse',
      'what is a noun in english',
    ].forEach(p => this.classifier.addDocument(p, 'define'));

    // GENERAL — greetings / off-topic
    [
      'hello',
      'hi there',
      'hey',
      'help me study',
      'i need help',
      'good morning',
      'thanks',
      'thank you',
      'bye',
      'goodbye',
      'what can you do',
      'how do i use this',
    ].forEach(p => this.classifier.addDocument(p, 'general'));
  }

  // ── Train and save ────────────────────────────────────────
  train() {
    console.log('🧠 Training intent classifier...');
    this._addTrainingData();
    // include any pending feedback examples before training
    try {
      if (fs.existsSync(this.pendingPath)) {
        const pend = JSON.parse(fs.readFileSync(this.pendingPath, 'utf8')) || [];
        if (Array.isArray(pend) && pend.length) {
          pend.forEach(p => {
            if (p && p.text && p.label) this.classifier.addDocument(p.text.toLowerCase().trim(), p.label);
          });
        }
      }
    } catch (e) {
      console.warn('⚠️  Could not include pending feedback before training:', e && e.message);
    }
    console.log('ℹ️  Classifier docs before train:', this.classifier.docs ? this.classifier.docs.length : 'unknown');
    this.classifier.train();
    this.isTrained = true;

    console.log('ℹ️  Classifier training complete. totalExamples (in-memory):', this.classifier.totalExamples || 'unknown');
    this.classifier.save(this.modelPath, (err) => {
      if (err) {
        console.error('⚠️  Error saving classifier:', err);
      } else {
        console.log('✅ Intent classifier saved →', this.modelPath);
        try {
          const st = fs.statSync(this.modelPath);
          console.log('ℹ️  Model file size:', st.size, 'bytes');
          const m = JSON.parse(fs.readFileSync(this.modelPath, 'utf8'));
          console.log('ℹ️  Model file totalExamples:', m && m.classifier && m.classifier.totalExamples ? m.classifier.totalExamples : 'unknown');
        } catch (e) {
          console.warn('⚠️  Could not inspect saved model file:', e && e.message);
        }
      }
    });

    return this;
  }

  // ── Load saved model (falls back to training if not found) ─
  load(callback) {
    if (fs.existsSync(this.modelPath)) {
      try {
        const raw = fs.readFileSync(this.modelPath, 'utf8');
        try {
          const parsed = JSON.parse(raw);
          // Use the library restore to rebuild the classifier instance
          const restored = natural.BayesClassifier.restore(parsed, null);
          this.classifier = restored;
          this.isTrained = true;
          console.log('✅ Intent classifier loaded from disk (safe load)');
          if (callback) callback(this);
        } catch (e) {
          console.warn('⚠️  Could not parse saved model file — retraining. Error:', e && e.message);
          this.train();
          if (callback) callback(this);
        }
      } catch (e) {
        console.warn('⚠️  Could not read model file — training instead:', e && e.message);
        this.train();
        if (callback) callback(this);
      }
    } else {
      console.log('ℹ️  No saved model found — training now...');
      this.train();
      if (callback) callback(this);
    }
  }

  // ── Classify a user query ─────────────────────────────────
  classify(text) {
    if (!this.isTrained) this.train();
    return this.classifier.classify(text.toLowerCase().trim());
  }

  // ── Get all intent scores (useful for debugging) ──────────
  getClassifications(text) {
    if (!this.isTrained) this.train();
    return this.classifier.getClassifications(text.toLowerCase().trim());
  }

  // ── Best guess + confidence ───────────────────────────────
  getBestClassification(text) {
    const scores = this.getClassifications(text) || [];
    if (!scores.length) return { label: 'general', confidence: 0 };

    const sorted = [...scores].sort((a, b) => b.value - a.value);
    return {
      label: sorted[0].label,
      confidence: Math.round(sorted[0].value * 1000) / 1000,
      scores: sorted,
    };
  }

  // ── Add a single training example and retrain/save immediately ─
  addTrainingExample(text, label) {
    // Queue the training example to avoid synchronous retraining on every feedback
    try {
      const item = { text: text.toLowerCase().trim(), label };
      this.pending = this.pending || [];
      this.pending.push(item);
      fs.writeFileSync(this.pendingPath, JSON.stringify(this.pending, null, 2), 'utf8');
      console.log('📝 Queued training example for later retrain');
    } catch (e) {
      console.error('⚠️  Failed to queue training example:', e && e.message);
    }
  }

  // Process any pending training examples now: add to classifier, train and save.
  processPending(cb) {
    try {
      const pend = (fs.existsSync(this.pendingPath) ? (JSON.parse(fs.readFileSync(this.pendingPath, 'utf8')) || []) : []) || [];
      if (!Array.isArray(pend) || pend.length === 0) {
        console.log('ℹ️  No pending training examples to process.');
        return { success: true, processed: 0 };
      }

      console.log(`🧰 Processing ${pend.length} pending training examples...`);
      if (pend.length) {
        console.log('ℹ️  Sample pending[0]:', JSON.stringify(pend[0]));
        console.log('ℹ️  Sample pending[1]:', pend[1] ? JSON.stringify(pend[1]) : 'n/a');
      }
      pend.forEach(p => {
        if (p && p.text && p.label) this.classifier.addDocument(p.text.toLowerCase().trim(), p.label);
      });

      this.classifier.train();
      this.isTrained = true;

      this.classifier.save(this.modelPath, (err) => {
        if (err) {
          console.error('⚠️  Error saving classifier after processing pending:', err);
        } else {
          console.log('✅ Intent classifier updated and saved →', this.modelPath);
          try {
            const st = fs.statSync(this.modelPath);
            console.log('ℹ️  Model file size after pending save:', st.size, 'bytes');
            const m = JSON.parse(fs.readFileSync(this.modelPath, 'utf8'));
            console.log('ℹ️  Model file totalExamples after pending save:', m && m.classifier && m.classifier.totalExamples ? m.classifier.totalExamples : 'unknown');
          } catch (e) {
            console.warn('⚠️  Could not inspect saved model file after pending save:', e && e.message);
          }
        }
        if (typeof cb === 'function') cb(err, { success: !err, processed: pend.length });
      });

      // Clear pending file and in-memory list
      try {
        fs.writeFileSync(this.pendingPath, JSON.stringify([], null, 2), 'utf8');
      } catch (e) {}
      this.pending = [];
      return { success: true, processed: pend.length };
    } catch (e) {
      console.error('⚠️  Error processing pending training examples:', e && e.message);
      return { success: false, error: e && e.message };
    }
  }
}

module.exports = IntentClassifier;
