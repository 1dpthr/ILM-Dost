// ============================================================
//  agent/retriever.js
//  Study Knowledge Retriever — uses TF-IDF (no external API)
//  Finds the most relevant study content for any query.
// ============================================================

const natural = require('natural');
const Fuse = require('fuse.js');

class StudyRetriever {
  constructor() {
    this.tfidf     = new natural.TfIdf();
    this.documents = [];                          // raw docs + metadata
    this.tokenizer = new natural.WordTokenizer();
    this.stemmer   = natural.PorterStemmer;
  }

  // Remove obvious prompt/response contamination from ingested topic content.
  _sanitizeContent(rawText) {
    let text = String(rawText || '').replace(/\r\n/g, '\n').trim();

    // Strip generic assistant fallback text accidentally embedded in dataset content.
    text = text.replace(/I'?m your study assistant! Try asking me to:[\s\S]*/gi, '').trim();

    // Remove one-line noisy training arrows: "Question -> generic fallback"
    text = text.replace(/(?:^|\n)[^\n]*→\s*I'?m your study assistant![^\n]*/gi, '');

    // If an accidental command-like prefix appears before a markdown heading, drop the prefix.
    const firstHeadingIndex = text.indexOf('## ');
    if (firstHeadingIndex > 0 && firstHeadingIndex < 240) {
      text = text.slice(firstHeadingIndex);
    }

    // Collapse repeated empty lines.
    text = text.replace(/\n{3,}/g, '\n\n').trim();
    return text;
  }

  // ── Text preprocessing ────────────────────────────────────
  // Lowercase → tokenize → remove stopwords → stem
  _preprocess(text) {
    const tokens = this.tokenizer.tokenize(text.toLowerCase());
    return tokens
      .filter(t => !natural.stopwords.includes(t) && t.length > 1)
      .map(t => this.stemmer.stem(t))
      .join(' ');
  }

  // ── Add a single document ─────────────────────────────────
  addDocument(content, metadata) {
    const processed = this._preprocess(content);
    this.tfidf.addDocument(processed);
    this.documents.push({ content, metadata });
  }

  // ── Load the full JSON dataset ────────────────────────────
  loadDataset(dataset) {
    dataset.subjects.forEach(subject => {
      subject.topics.forEach(topic => {

        // 1. Index the full topic content (title + body)
        const sanitizedContent = this._sanitizeContent(topic.content);
        this.addDocument(
          `${topic.name} ${sanitizedContent}`,
          {
            subject:      subject.name,
            topic:        topic.name,
            type:         'content',
            fullContent:  sanitizedContent,
            examples:     topic.examples    || [],
            quiz:         topic.quiz        || [],
            key_concepts: topic.key_concepts || [],
          }
        );

        // 2. Index each key concept separately for definition queries
        if (topic.key_concepts) {
          topic.key_concepts.forEach(concept => {
            this.addDocument(
              `${concept.term} ${concept.definition}`,
              {
                subject:    subject.name,
                topic:      topic.name,
                type:       'concept',
                term:       concept.term,
                definition: concept.definition,
              }
            );
          });
        }
      });
    });

    console.log(
      `✅ Retriever loaded ${this.documents.length} documents ` +
      `from ${dataset.subjects.length} subjects`
    );
  }

  // ── Search — returns top N most relevant documents ─────────
  search(query, topN = 3) {
    const processedQuery = this._preprocess(query);
    const scores         = [];

    this.tfidf.tfidfs(processedQuery, (i, measure) => {
      scores.push({ index: i, score: measure });
    });

    return scores
      .sort((a, b) => b.score - a.score)
      .slice(0, topN)
      .filter(item => item.score > 0)
      .map(item => ({
        ...this.documents[item.index],
        score: Math.round(item.score * 100) / 100,
      }));
  }

  // ── Helpers ───────────────────────────────────────────────
  getAvailableTopics(query = '', subjectFilter = '') {
    const map = {};
    const q = (query || '').toString().trim();
    const sFilter = (subjectFilter || '').toString().trim().toLowerCase();

    const docs = this.documents.filter(d => d.metadata.type === 'content');

    // If no query, behave like before (optionally filter by subject)
    if (!q) {
      docs.forEach(d => {
        const subj = d.metadata.subject;
        const topic = d.metadata.topic;
        if (sFilter && subj.toLowerCase() !== sFilter) return;
        if (!map[subj]) map[subj] = [];
        if (!map[subj].includes(topic)) map[subj].push(topic);
      });
      return map;
    }

    // Build search index for fuzzy matching (subject+topic)
    const items = docs.map(d => ({
      subject: d.metadata.subject,
      topic: d.metadata.topic,
      text: `${d.metadata.subject} ${d.metadata.topic}`,
    }));

    const fuse = new Fuse(items, {
      keys: ['text', 'topic', 'subject'],
      threshold: 0.45,
      ignoreLocation: true,
    });

    const results = fuse.search(q, { limit: 200, includeScore: true });

    results.forEach(r => {
      const item = r.item || {};
      const score = typeof r.score === 'number' ? 1 - r.score : 1; // convert Fuse distance to similarity-ish
      const subj = item.subject;
      const topic = item.topic;
      if (sFilter && subj.toLowerCase() !== sFilter) return;
      if (!map[subj]) map[subj] = [];
      if (!map[subj].some(t => t.name === topic)) map[subj].push({ name: topic, score: Math.round(score * 100) / 100 });
    });

    // Convert any existing string topic arrays into {name,score:1} if needed for consistency
    Object.keys(map).forEach(subj => {
      map[subj] = map[subj].map(t => (typeof t === 'string' ? { name: t, score: 1 } : t));
    });

    return map;
  }

  // Return flat list of matches with scores for more advanced UIs
  getAvailableTopicsWithScores(query = '', subjectFilter = '') {
    const q = (query || '').toString().trim();
    const sFilter = (subjectFilter || '').toString().trim().toLowerCase();
    const docs = this.documents.filter(d => d.metadata.type === 'content');
    if (!q) return [];
    const items = docs.map(d => ({ subject: d.metadata.subject, topic: d.metadata.topic, text: `${d.metadata.subject} ${d.metadata.topic}` }));
    const fuse = new Fuse(items, { keys: ['text', 'topic', 'subject'], threshold: 0.45, ignoreLocation: true });
    const results = fuse.search(q, { limit: 200, includeScore: true });
    return results.map(r => ({ subject: r.item.subject, topic: r.item.topic, score: Math.round((1 - (typeof r.score === 'number' ? r.score : 0)) * 100) / 100 }));
  }

  getDocumentCount() {
    return this.documents.length;
  }
}

module.exports = StudyRetriever;
