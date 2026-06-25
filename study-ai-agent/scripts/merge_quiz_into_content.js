const fs = require('fs');
const path = require('path');

const datasetPath = path.join(__dirname, '..', 'data', 'study_dataset.json');
if (!fs.existsSync(datasetPath)) {
  console.error('Dataset not found at', datasetPath);
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(datasetPath, 'utf8'));
let changed = 0;

data.subjects.forEach(subject => {
  subject.topics.forEach(topic => {
    if (topic.quiz && topic.quiz.length > 0) {
      // Only append if we don't already find our marker
      if (!topic.content || !topic.content.includes('--- Q&A examples ---')) {
        const qa = topic.quiz.map(q => `Q: ${q.question}\nA: ${q.answer}`).join('\n\n');
        topic.content = (topic.content || '') + '\n\n--- Q&A examples ---\n' + qa;
        changed++;
      }
    }
  });
});

fs.writeFileSync(datasetPath, JSON.stringify(data, null, 2), 'utf8');
console.log(`Merged quiz into content for ${changed} topics. Run npm run train to re-index.`);
