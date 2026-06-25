// ============================================================
//  agent/agent.js
//  StudyAgent — orchestrates Classifier + Retriever + Responder
// ============================================================

const IntentClassifier = require('./classifier');
const StudyRetriever   = require('./retriever');
const StudyResponder   = require('./responder');
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

function loadDatasetWithExtras(datasetPath) {
  const dataset = JSON.parse(fs.readFileSync(datasetPath, 'utf8'));

  const dataDir = path.join(__dirname, '../data');
  const supplementalFiles = fs.existsSync(dataDir)
    ? fs.readdirSync(dataDir).filter(file => /^study_dataset_(?!json$).*\.json$/i.test(file) || /^study_dataset_extra.*\.json$/i.test(file))
    : [];

  supplementalFiles.sort();

  supplementalFiles.forEach(fileName => {
    const filePath = path.join(dataDir, fileName);
    try {
      const extra = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      mergeDatasetSubjects(dataset, extra);
      console.log(`📚 Merged supplemental dataset from ${fileName}`);
    } catch (e) {
      console.warn(`⚠️  Could not load supplemental dataset ${fileName}:`, e && e.message);
    }
  });

  return dataset;
}

class StudyAgent {
  constructor() {
    this.classifier  = new IntentClassifier();
    this.retriever   = new StudyRetriever();
    this.responder   = new StudyResponder();
    this.isReady     = false;
    this.history     = [];   // conversation history (last 50 messages)
  }

  // ── Initialize: load dataset + load/train classifier ──────
  initialize(callback) {
    const datasetPath = path.join(__dirname, '../data/study_dataset.json');

    if (!fs.existsSync(datasetPath)) {
      console.error('❌ Dataset not found at', datasetPath);
      console.error('   Please create data/study_dataset.json first.');
      return;
    }

    // Load knowledge base
    const dataset = loadDatasetWithExtras(datasetPath);
    this.retriever.loadDataset(dataset);

    // Load (or train) the intent classifier
    this.classifier.load(() => {
      // Apply any queued feedback from prior sessions so the agent keeps learning.
      try {
        const pendingResult = this.classifier.processPending();
        if (pendingResult && pendingResult.success && pendingResult.processed > 0) {
          console.log(`🧠 Applied ${pendingResult.processed} pending learning examples on startup`);
        }
      } catch (e) {
        console.warn('⚠️  Could not process pending feedback on startup:', e && e.message);
      }

      this.isReady = true;
      console.log('🎓 Study Agent is ready!');
      if (callback) callback();
    });
  }

  // ── Main entry: process a student's question ──────────────
  ask(userInput) {
    if (!this.isReady) {
      return {
        success:  false,
        error:    'Agent is still initializing. Please try again in a moment.',
        response: null,
      };
    }

    const input = (userInput || '').trim();
    if (!input) {
      return {
        success:  false,
        error:    'Please provide a question.',
        response: null,
      };
    }

    // 1. Heuristic overrides for clear intent keywords (improves short queries)
    const qLower = input.toLowerCase();
    let intent = null;
    if (/^(define|what is|who is|meaning of|definition of)\b/.test(qLower)) {
      intent = 'define';
    } else if (/^(explain|how does|how do|why|describe|tell me about)\b/.test(qLower)) {
      intent = 'explain';
    } else if (/(summarize|summary|in short|briefly)\b/.test(qLower)) {
      intent = 'summarize';
    } else if (/(example|for instance|sample)\b/.test(qLower)) {
      intent = 'example';
    } else if (/(quiz|test me|practice question|practice quiz|mcq|multiple choice|exam)\b/.test(qLower)) {
      intent = 'quiz';
    } else {
      // Fallback to classifier
      intent = this.classifier.classify(input);
    }

    // 2. Retrieve relevant documents
    const results = this.retriever.search(input, 3);

    // 3. Generate response
    const response = this.responder.generateResponse(intent, results, input);

    // 4. Build source references
    const sources = results.map(r => ({
      subject:   r.metadata.subject,
      topic:     r.metadata.topic,
      type:      r.metadata.type,
      relevance: r.score,
    }));

    // 5. Save to history
    this._pushHistory('user',  input);
    this._pushHistory('agent', response, { intent, sources });

    // 6. Persist chat log asynchronously (for later review / training)
    try {
      this._saveChatLog({ question: input, response, intent, sources, timestamp: new Date().toISOString() });
    } catch (e) {
      console.warn('⚠️  Could not persist chat log:', e && e.message);
    }

    return {
      success:   true,
      response,
      intent,
      sources,
      timestamp: new Date().toISOString(),
    };
  }

  // ── Utility methods ───────────────────────────────────────
  getAvailableTopics() {
    return this.retriever.getAvailableTopics();
  }
  
  getAvailableTopicsFiltered(query = '', subject = '') {
    return this.retriever.getAvailableTopics(query, subject);
  }

  getAvailableTopicsWithScores(query = '', subject = '') {
    return this.retriever.getAvailableTopicsWithScores(query, subject);
  }

  getHistory(limit = 20) {
    return this.history.slice(-limit);
  }

  clearHistory() {
    this.history = [];
    return { success: true, message: 'Conversation history cleared.' };
  }

  getStats() {
    return {
      ready:         this.isReady,
      documentsLoaded: this.retriever.getDocumentCount(),
      historyLength: this.history.length,
      topics:        this.getAvailableTopics(),
    };
  }

  // ── Private: push a message to history ────────────────────
  _pushHistory(role, content, meta = {}) {
    this.history.push({
      role,
      content,
      ...meta,
      timestamp: new Date().toISOString(),
    });
    // Keep last 50 messages only
    if (this.history.length > 50) this.history.shift();
  }

  // ── Persist chat logs to data/chat_logs.json ──────────────
  _saveChatLog(entry) {
    try {
      const filePath = path.join(__dirname, '../data/chat_logs.json');
      let logs = [];
      if (fs.existsSync(filePath)) {
        try {
          logs = JSON.parse(fs.readFileSync(filePath, 'utf8')) || [];
        } catch (e) {
          logs = [];
        }
      }
      logs.push(entry);
      // Keep only last 500 logs to avoid huge files
      if (logs.length > 500) logs = logs.slice(-500);
      fs.writeFileSync(filePath, JSON.stringify(logs, null, 2), 'utf8');
    } catch (e) {
      // Don't crash the agent for logging errors
      console.warn('⚠️  Failed to write chat log:', e && e.message);
    }
  }

  // ── Return persisted chat logs ───────────────────────────
  getChatLogs(limit = 100) {
    try {
      const filePath = path.join(__dirname, '../data/chat_logs.json');
      if (!fs.existsSync(filePath)) return [];
      const logs = JSON.parse(fs.readFileSync(filePath, 'utf8')) || [];
      return logs.slice(-limit).reverse();
    } catch (e) {
      return [];
    }
  }

  // ── Add a new topic to the persistent dataset and index it immediately
  addTopic(subjectName, topicObj) {
    try {
      const datasetPath = path.join(__dirname, '../data/study_dataset.json');
      const dataset = fs.existsSync(datasetPath) ? JSON.parse(fs.readFileSync(datasetPath, 'utf8')) : { subjects: [] };

      let subject = dataset.subjects.find(s => s.name.toLowerCase() === subjectName.toLowerCase());
      if (!subject) {
        subject = { name: subjectName, topics: [] };
        dataset.subjects.push(subject);
      }

      // Ensure topic has necessary fields
      const topic = {
        name: topicObj.name || topicObj.title || 'Imported Topic',
        content: topicObj.content || '',
        key_concepts: topicObj.key_concepts || [],
        examples: topicObj.examples || [],
        quiz: topicObj.quiz || [],
      };

      subject.topics.push(topic);

      // Persist dataset
      fs.writeFileSync(datasetPath, JSON.stringify(dataset, null, 2), 'utf8');

      // Index newly added topic in retriever
      this.retriever.addDocument(`${topic.name} ${topic.content}`, {
        subject: subject.name,
        topic: topic.name,
        type: 'content',
        fullContent: topic.content,
        examples: topic.examples || [],
        quiz: topic.quiz || [],
        key_concepts: topic.key_concepts || [],
      });

      if (topic.key_concepts && topic.key_concepts.length) {
        topic.key_concepts.forEach(concept => {
          this.retriever.addDocument(`${concept.term} ${concept.definition}`, {
            subject: subject.name,
            topic: topic.name,
            type: 'concept',
            term: concept.term,
            definition: concept.definition,
          });
        });
      }

      return { success: true, message: 'Topic added and indexed.' };
    } catch (e) {
      console.error('AddTopic error:', e);
      return { success: false, error: e.message };
    }
  }

  // ── Ingest a chat Q/A as an example under an existing subject/topic
  ingestChatAsExample(question, answer, subjectName, topicName) {
    try {
      const datasetPath = path.join(__dirname, '../data/study_dataset.json');
      if (!fs.existsSync(datasetPath)) return { success: false, error: 'Dataset not found.' };
      const dataset = JSON.parse(fs.readFileSync(datasetPath, 'utf8'));

      const subject = dataset.subjects.find(s => s.name.toLowerCase() === subjectName.toLowerCase());
      if (!subject) return { success: false, error: 'Subject not found.' };
      const topic = subject.topics.find(t => (t.name || t.topic || '').toLowerCase() === topicName.toLowerCase());
      if (!topic) return { success: false, error: 'Topic not found.' };

      if (!topic.examples) topic.examples = [];
      topic.examples.push(`${question} → ${answer}`);

      // Persist updated dataset
      fs.writeFileSync(datasetPath, JSON.stringify(dataset, null, 2), 'utf8');

      // Index the new example as a small document
      this.retriever.addDocument(`${topic.name} ${question} ${answer}`, {
        subject: subject.name,
        topic: topic.name,
        type: 'example',
        example: `${question} → ${answer}`,
      });

      // Reinforce the intent classifier from high-confidence question patterns
      try {
        const best = this.classifier.getBestClassification(question);
        if (best && best.label && best.confidence >= 0.6) {
          this.classifier.addTrainingExample(question, best.label);
        }
      } catch (e) {
        console.warn('⚠️  Could not queue intent example from saved chat:', e && e.message);
      }

      return { success: true, message: 'Chat ingested as example.' };
    } catch (e) {
      console.error('Ingest chat error:', e);
      return { success: false, error: e.message };
    }
  }
}

module.exports = StudyAgent;
