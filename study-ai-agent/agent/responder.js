// ============================================================
//  agent/responder.js
//  Response Generator — builds formatted answers by intent
// ============================================================

class StudyResponder {

  constructor() {
    this._greetings = [
      "Hello! I'm your study assistant 📚 What would you like to learn today?",
      "Hi there! Ready to study? Ask me to explain a topic, quiz you, or define a term!",
      "Hey! I'm here to help you learn. Ask me anything about your subjects 🎓",
    ];
  }

  // ── Main entry point ──────────────────────────────────────
  generateResponse(intent, results, query) {
    // Try direct math solving first; this should work even when retrieval misses.
    const directSolution = this._solveMathWordProblem(query, results[0]);
    if (directSolution) return directSolution;

    const mixedStudyPlan = this._mixedStudyPlan(query);
    if (mixedStudyPlan) return mixedStudyPlan;

    const commonKnowledge = this._commonStudyKnowledge(query);
    if (commonKnowledge) return commonKnowledge;

    if (results.length === 0) return this._notFound(query);

    const top = results[0];
    // Prefer long-form content when the top result is highly relevant.
    // Many scores in the retriever are in the 0-40 range; use a conservative threshold.
    const topScore = Number(top.score || top.relevance || 0);
    const HIGH_RELEVANCE_THRESHOLD = 12; // tuneable: lower = more aggressive content preference
    const MIN_RELEVANCE_THRESHOLD = 6;

    // Guardrail: avoid confidently answering with unrelated content when relevance is weak.
    if (topScore < MIN_RELEVANCE_THRESHOLD && ['general', 'explain', 'define', 'summarize', 'example'].includes(intent)) {
      return this._notFound(query);
    }

    // Guardrail for define-like queries: ensure retrieved term/topic roughly matches requested term.
    if (intent === 'define') {
      const requestedTerm = (query || '')
        .toLowerCase()
        .replace(/^\s*(define|what is|who is|meaning of|definition of)\s+/i, '')
        .trim();

      const topText = `${top?.metadata?.term || ''} ${top?.metadata?.topic || ''} ${top?.metadata?.subject || ''}`.toLowerCase();
      if (requestedTerm) {
        const token = requestedTerm.split(/\s+/)[0];
        if (token && !topText.includes(token) && topScore < 15) {
          return this._notFound(query);
        }
      }
    }

    if (topScore >= HIGH_RELEVANCE_THRESHOLD) {
      // If user intent is vague/general, prefer an explanation from the content.
      if (intent === 'general') intent = 'explain';
      // If user asked for a quiz but none exist, fall back to an explanation instead of a generic prompt.
      if (intent === 'quiz' && (!top.metadata || !Array.isArray(top.metadata.quiz) || top.metadata.quiz.length === 0)) {
        intent = 'explain';
      }
    }

    switch (intent) {
      case 'explain':   return this._explain(top, results);
      case 'define':    return this._define(top, results);
      case 'example':   return this._example(top);
      case 'quiz':      return this._quiz(top);
      case 'summarize': return this._summarize(top);
      case 'general':   return this._general(query);
      default:          return this._explain(top, results);
    }
  }

  // ── simple word-problem solving for common geometry questions ─────
  _solveMathWordProblem(query, top) {
    const q = (query || '').toLowerCase();

    // Basic arithmetic parsing: supports +, -, *, x, /
    const arithmeticMatch = q.match(/(-?\d+(?:\.\d+)?)\s*([+\-*x\/])\s*(-?\d+(?:\.\d+)?)/i);
    if (arithmeticMatch) {
      const a = Number(arithmeticMatch[1]);
      const op = arithmeticMatch[2].toLowerCase();
      const b = Number(arithmeticMatch[3]);
      let value = null;
      if (op === '+') value = a + b;
      if (op === '-') value = a - b;
      if (op === '*' || op === 'x') value = a * b;
      if (op === '/') {
        if (b === 0) return 'Division by zero is undefined.';
        value = a / b;
      }
      if (value !== null) {
        return `**Answer:** ${a} ${op} ${b} = ${value}`;
      }
    }

    const circleMatch = q.match(/area\s+of\s+(?:a\s+)?circle.*?radius(?:\s+of)?\s+(\d+(?:\.\d+)?)/i);
    if (circleMatch) {
      const radius = Number(circleMatch[1]);
      const area = Math.PI * radius * radius;
      return (
        `### Geometry Answer — Circle Area\n\n` +
        `Using the formula $A = \\pi r^2$:\n\n` +
        `- Radius = ${radius}\n- Area = \\pi × ${radius}^2 = ${area.toFixed(2)}\n\n` +
        `**Final Answer:** ${area.toFixed(2)} square units`
      );
    }

    const triangleMatch = q.match(/area\s+of\s+(?:a\s+)?triangle.*?base\s+(\d+(?:\.\d+)?).*?height\s+(\d+(?:\.\d+)?)/i);
    if (triangleMatch) {
      const base = Number(triangleMatch[1]);
      const height = Number(triangleMatch[2]);
      const area = (base * height) / 2;
      return (
        `### Geometry Answer — Triangle Area\n\n` +
        `Using the formula $A = \frac{1}{2}bh$:\n\n` +
        `- Base = ${base}\n- Height = ${height}\n- Area = 1/2 × ${base} × ${height} = ${area}\n\n` +
        `**Final Answer:** ${area} square units`
      );
    }

    const rectangleMatch = q.match(/area\s+of\s+(?:a\s+)?rectangle.*?(?:length|l)\s+(\d+(?:\.\d+)?).*?(?:width|w)\s+(\d+(?:\.\d+)?)/i);
    if (rectangleMatch) {
      const length = Number(rectangleMatch[1]);
      const width = Number(rectangleMatch[2]);
      const area = length * width;
      return (
        `### Geometry Answer — Rectangle Area\n\n` +
        `Using the formula $A = lw$:\n\n` +
        `- Length = ${length}\n- Width = ${width}\n- Area = ${length} × ${width} = ${area}\n\n` +
        `**Final Answer:** ${area} square units`
      );
    }

    return null;
  }

  // ── direct knowledge for common school questions ────────────────
  _commonStudyKnowledge(query) {
    const q = (query || '').toLowerCase();

    if (/calculus|derivative|differentiat/i.test(q)) {
      return (
        `### Calculus Derivatives\n\n` +
        `A derivative measures how fast a function changes at a point. It is the slope of the curve at that point.\n\n` +
        `For example, if $f(x) = x^2$, then $f'(x) = 2x$. That means the slope at $x = 3$ is $6$.\n\n` +
        `If you want, I can also explain the product rule, quotient rule, or chain rule.`
      );
    }

    if (/newton.*third law|third law of motion|action and reaction/i.test(q)) {
      return (
        `### Newton's Third Law\n\n` +
        `For every action, there is an equal and opposite reaction.\n\n` +
        `Example: when you push on a wall, the wall pushes back on you with the same force in the opposite direction.`
      );
    }

    if (/photosynthesis/i.test(q)) {
      return (
        `### Photosynthesis\n\n` +
        `Photosynthesis is the process plants use to turn sunlight, carbon dioxide, and water into glucose and oxygen.\n\n` +
        `Equation: 6CO2 + 6H2O + light energy → C6H12O6 + 6O2`
      );
    }

    if (/reproduction/i.test(q)) {
      return (
        `### Reproduction\n\n` +
        `Reproduction is the biological process by which organisms produce offspring. In humans and many animals, it usually involves the combination of male and female sex cells.`
      );
    }

    if (/cell|dna|gene/i.test(q)) {
      return (
        `### Cells and DNA\n\n` +
        `A cell is the basic unit of life. DNA is the molecule that stores genetic information, and genes are sections of DNA that help determine traits.`
      );
    }

    return null;
  }

  // ── direct study planning help for broad, multi-subject questions ───
  _mixedStudyPlan(query) {
    const q = (query || '').toLowerCase();

    const looksLikePlanning = /\b(study plan|study schedule|how should i study|how do i study|best way to study|what should i study|revision plan|remember formulas|overwhelmed|mixed|two hours|short on time)\b/i.test(q);
    const mentionsMultipleAreas = /\b(math|biology|science|physics|chemistry|history|english|geography|computer science|study|exam)\b/i.test(q) && /\b(and|mixed|plus|with)\b/i.test(q);

    if (!looksLikePlanning && !mentionsMultipleAreas) return null;

    return (
      `### Study Plan for a Mixed Test\n\n` +
      `If you have about two hours and feel overwhelmed, use a simple plan:\n\n` +
      `1. Spend 10 minutes calming down and listing the topics you need to cover.\n` +
      `2. Spend 35 minutes on your weakest topic first.\n` +
      `3. Spend 35 minutes on the second subject.\n` +
      `4. Spend 20 minutes making or reviewing flashcards or formula notes.\n` +
      `5. Spend 15 minutes testing yourself without notes.\n` +
      `6. Spend the last 5 minutes reviewing only the mistakes you made.\n\n` +
      `For formulas, write each one on a card with one example problem. For biology facts, use short questions and active recall. If you want, I can make a subject-by-subject plan for the exact topics you have.`
    );
  }

  // ── explain ───────────────────────────────────────────────
  _explain(top, all) {
    const m   = top.metadata;
    let out   = `## ${m.topic}\n*Subject: ${m.subject}*\n\n`;
    out      += `${m.fullContent || top.content}\n`;

    if (m.key_concepts && m.key_concepts.length) {
      out += `\n### 🔑 Key Concepts\n`;
      m.key_concepts.slice(0, 4).forEach(c => {
        out += `- **${c.term}**: ${c.definition}\n`;
      });
    }

    const related = all.slice(1)
      .map(r => r.metadata.topic)
      .filter(Boolean)
      .slice(0, 2);
    if (related.length) {
      out += `\n💡 *Related topics you can explore: ${related.join(', ')}*`;
    }

    return out;
  }

  // ── define ────────────────────────────────────────────────
  _define(top, all) {
    const m = top.metadata;

    // Direct concept match
    if (m.type === 'concept') {
      return (
        `**${m.term}**\n\n${m.definition}\n\n` +
        `*Part of: ${m.subject} → ${m.topic}*`
      );
    }

    // Key concepts from a content document
    if (m.key_concepts && m.key_concepts.length) {
      let out = `### 📖 Key Definitions — ${m.topic}\n\n`;
      m.key_concepts.forEach(c => {
        out += `**${c.term}**: ${c.definition}\n\n`;
      });
      return out;
    }

    return this._explain(top, all);
  }

  // ── example ───────────────────────────────────────────────
  _example(top) {
    const m = top.metadata;

    if (!m.examples || !m.examples.length) {
      return (
        `I don't have specific examples for **${m.topic}** yet.\n\n` +
        `Here's the main content instead:\n\n${m.fullContent}`
      );
    }

    let out = `### ✏️ Examples — ${m.topic}\n\n`;
    m.examples.forEach((ex, i) => {
      out += `**Example ${i + 1}:** ${ex}\n\n`;
    });
    return out;
  }

  // ── quiz ──────────────────────────────────────────────────
  _quiz(top) {
    const m = top.metadata;

    if (!m.quiz || !m.quiz.length) {
      return (
        `I don't have quiz questions for **${m.topic}** yet. ` +
        `Try asking me to explain it first, then come back for a quiz!`
      );
    }

    const q = m.quiz[Math.floor(Math.random() * m.quiz.length)];
    return (
      `### 🧪 Quiz — ${m.topic} (${m.subject})\n\n` +
      `**Question:** ${q.question}\n\n` +
      `<details>\n<summary>👆 Click to reveal the answer</summary>\n\n` +
      `**Answer:** ${q.answer}\n</details>`
    );
  }

  // ── summarize ─────────────────────────────────────────────
  _summarize(top) {
    const m       = top.metadata;
    const content = m.fullContent || top.content;

    // Extract first 2 meaningful sentences as summary
    const sentences = content
      .split(/(?<=[.!?])\s+/)
      .filter(s => s.trim().length > 30);
    const summary = sentences.slice(0, 2).join(' ');

    let out = `### 📝 Summary — ${m.topic}\n\n${summary}\n`;

    if (m.key_concepts && m.key_concepts.length) {
      out += `\n**Key Terms:** ${m.key_concepts.map(c => c.term).join(' · ')}`;
    }

    return out;
  }

  // ── general / greeting ────────────────────────────────────
  _general(query) {
    const q = query.toLowerCase();

    if (/^(hi|hello|hey|howdy|greet|good\s*(morning|evening|afternoon))/i.test(q)) {
      return this._greetings[Math.floor(Math.random() * this._greetings.length)];
    }
    if (/thank/i.test(q)) {
      return "You're welcome! Keep it up — you're doing great! 🌟";
    }
    if (/bye|goodbye|see you/i.test(q)) {
      return "Goodbye! Come back anytime to keep studying. Good luck! 📚";
    }
    if (/what can you do|how.*use/i.test(q)) {
      return (
        "Here's what I can do for you:\n\n" +
        "- **Explain** a topic → *\"Explain photosynthesis\"*\n" +
        "- **Define** a term → *\"What is a variable?\"*\n" +
        "- **Give examples** → *\"Show me an example of Newton's laws\"*\n" +
        "- **Quiz you** → *\"Quiz me on Algebra\"*\n" +
        "- **Summarize** → *\"Summarize World War II\"*\n\n" +
        "Just ask naturally!"
      );
    }

    return (
      "I'm your study assistant! Try asking me to:\n" +
      "- **Explain** a topic\n- **Define** a term\n" +
      "- **Quiz** you\n- **Summarize** a subject\n- Give an **example**"
    );
  }

  // ── not found ─────────────────────────────────────────────
  _notFound(query) {
    return (
      `I couldn't find information about **"${query}"** in my knowledge base.\n\n` +
      `💡 **Tips:**\n` +
      `- Try rephrasing, e.g. *"explain algebra"* or *"what is photosynthesis"*\n` +
      `- Ask your teacher to add more topics to my dataset!\n` +
      `- Type *"what can you do"* to see all my capabilities.`
    );
  }
}

module.exports = StudyResponder;
