const fs = require('fs');
const path = require('path');

const datasetPath = path.join(__dirname, '../data/study_dataset.json');

function slug(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function buildTopic(subjectName, topicName, focus, useCase) {
  return {
    name: topicName,
    content: `${topicName} is a key topic in ${subjectName}. ${focus}. It helps learners understand ${useCase}.`,
    key_concepts: [
      {
        term: `${topicName} overview`,
        definition: `The basic idea behind ${topicName} in ${subjectName}.`,
      },
      {
        term: `${topicName} process`,
        definition: `The main steps, stages, or logic involved in ${topicName}.`,
      },
      {
        term: `${topicName} application`,
        definition: `A real-world situation where ${topicName} is used or observed.`,
      },
      {
        term: `${topicName} example`,
        definition: `A clear classroom example that shows how ${topicName} works.`,
      },
    ],
    examples: [
      `${topicName}: A student uses this idea when ${useCase}.`,
      `In ${subjectName.toLowerCase()}, ${topicName.toLowerCase()} is useful because ${focus.toLowerCase()}.`,
      `A practical example of ${topicName} is discussing how ${useCase}.`,
    ],
    quiz: [
      {
        question: `What is ${topicName}?`,
        answer: `${topicName} is an important concept in ${subjectName} that helps explain ${focus.toLowerCase()}.`,
      },
      {
        question: `Why is ${topicName} useful in ${subjectName}?`,
        answer: `It helps students understand ${useCase}.`,
      },
      {
        question: `Give one example of ${topicName}.`,
        answer: `One example is when ${useCase}.`,
      },
    ],
  };
}

const additions = [
  {
    name: 'Physics',
    topics: [
      buildTopic('Physics', 'Motion and Speed', 'It explains how objects move and how quickly they travel', 'a cyclist covering a distance in a given time'),
      buildTopic('Physics', 'Forces and Newton\'s Laws', 'It describes pushes, pulls, and how motion changes', 'a ball speeding up when kicked harder'),
      buildTopic('Physics', 'Energy and Work', 'It shows how energy is transferred and used to do work', 'lifting a backpack onto a shelf'),
      buildTopic('Physics', 'Waves and Sound', 'It explains vibrations, pitch, and how sound travels', 'speaking into a microphone or hearing music'),
      buildTopic('Physics', 'Electricity and Circuits', 'It describes how electric current flows through components', 'a torch light turning on when the switch closes'),
      buildTopic('Physics', 'Heat and Thermodynamics', 'It studies temperature, heat transfer, and energy changes', 'a metal spoon warming up in hot tea'),
    ],
  },
  {
    name: 'Economics',
    topics: [
      buildTopic('Economics', 'Supply and Demand', 'It explains how prices change when buyers and sellers change', 'more people want a product than there are products available'),
      buildTopic('Economics', 'Market Structures', 'It compares competition in different kinds of markets', 'a small shop competing with many nearby sellers'),
      buildTopic('Economics', 'Inflation and Price Index', 'It measures how prices rise over time', 'the cost of groceries increasing each year'),
      buildTopic('Economics', 'Banking and Money', 'It explains saving, borrowing, and how money moves through the economy', 'depositing money in a bank account'),
      buildTopic('Economics', 'International Trade', 'It shows how countries buy and sell goods across borders', 'one country exporting tea and importing machinery'),
      buildTopic('Economics', 'Personal Finance', 'It helps people budget, save, and spend wisely', 'planning monthly expenses and saving for school fees'),
    ],
  },
  {
    name: 'Civics',
    topics: [
      buildTopic('Civics', 'Government Branches', 'It explains how power is shared between different parts of government', 'the legislature making laws and the courts interpreting them'),
      buildTopic('Civics', 'Constitution and Rights', 'It describes the rules of a nation and the freedoms people have', 'a citizen speaking freely within the law'),
      buildTopic('Civics', 'Voting and Elections', 'It shows how leaders are chosen by the public', 'casting a ballot in a school or national election'),
      buildTopic('Civics', 'Local Government', 'It focuses on services managed close to the community', 'a city council fixing roads or managing waste collection'),
      buildTopic('Civics', 'Citizenship and Civic Duty', 'It highlights responsibilities that help society work well', 'keeping public spaces clean and following rules'),
      buildTopic('Civics', 'Law and Justice', 'It explains how rules are enforced and fairness is protected', 'a court resolving a dispute according to law'),
    ],
  },
  {
    name: 'Psychology',
    topics: [
      buildTopic('Psychology', 'Memory and Learning', 'It studies how information is stored and recalled', 'remembering a formula after practice'),
      buildTopic('Psychology', 'Motivation and Emotion', 'It explores why people act and how feelings influence behavior', 'studying hard because of a future goal'),
      buildTopic('Psychology', 'Development Stages', 'It looks at growth across childhood, adolescence, and adulthood', 'learning to speak, read, and solve problems over time'),
      buildTopic('Psychology', 'Personality', 'It describes consistent patterns in behavior, thoughts, and feelings', 'being outgoing in group activities or calm under pressure'),
      buildTopic('Psychology', 'Mental Health', 'It focuses on emotional well-being and coping strategies', 'talking to a trusted adult when stressed'),
      buildTopic('Psychology', 'Research Methods', 'It explains how psychologists collect and test evidence', 'running a survey to study student habits'),
    ],
  },
  {
    name: 'Environmental Science',
    topics: [
      buildTopic('Environmental Science', 'Ecosystems', 'It shows how living things interact with each other and their environment', 'plants, insects, and animals sharing a habitat'),
      buildTopic('Environmental Science', 'Climate Change', 'It examines long-term changes in temperature and weather patterns', 'a region getting warmer over many years'),
      buildTopic('Environmental Science', 'Pollution', 'It describes harmful substances that damage air, water, or land', 'smoke from vehicles affecting city air quality'),
      buildTopic('Environmental Science', 'Renewable Energy', 'It covers energy sources that can be replaced naturally', 'using solar panels to power a house'),
      buildTopic('Environmental Science', 'Conservation', 'It focuses on protecting natural resources for the future', 'saving water during dry seasons'),
      buildTopic('Environmental Science', 'Sustainability', 'It explains how people can meet current needs without harming future generations', 'reducing waste and reusing materials at school'),
    ],
  },
  {
    name: 'Arts and Music',
    topics: [
      buildTopic('Arts and Music', 'Elements of Art', 'It studies line, shape, color, texture, and form', 'drawing a scene with different shapes and colors'),
      buildTopic('Arts and Music', 'Color Theory', 'It explains how colors mix and how they work together', 'using complementary colors in a poster'),
      buildTopic('Arts and Music', 'Composition and Design', 'It covers how to arrange visual elements clearly and attractively', 'placing a title and image in a balanced layout'),
      buildTopic('Arts and Music', 'Music Basics', 'It introduces rhythm, melody, harmony, and tempo', 'clapping a beat and singing a tune'),
      buildTopic('Arts and Music', 'Rhythm and Melody', 'It shows how patterns and tunes create musical structure', 'counting beats while humming a song'),
      buildTopic('Arts and Music', 'Theatre and Performance', 'It explores acting, staging, and communicating to an audience', 'performing a scene in a school drama club'),
    ],
  },
];

function normalizeName(name) {
  return slug(name);
}

function mergeSubjects(existing, additionsList) {
  const subjectMap = new Map(existing.subjects.map(s => [normalizeName(s.name), s]));

  additionsList.forEach(addition => {
    const key = normalizeName(addition.name);
    const current = subjectMap.get(key);
    if (!current) {
      existing.subjects.push(addition);
      subjectMap.set(key, addition);
      return;
    }

    const topicMap = new Set((current.topics || []).map(t => normalizeName(t.name)));
    addition.topics.forEach(topic => {
      if (!topicMap.has(normalizeName(topic.name))) {
        current.topics.push(topic);
        topicMap.add(normalizeName(topic.name));
      }
    });
  });
}

function main() {
  if (!fs.existsSync(datasetPath)) {
    throw new Error(`Dataset not found at ${datasetPath}`);
  }

  const dataset = JSON.parse(fs.readFileSync(datasetPath, 'utf8'));
  if (!dataset.subjects) dataset.subjects = [];

  mergeSubjects(dataset, additions);

  fs.writeFileSync(datasetPath, JSON.stringify(dataset, null, 2), 'utf8');

  const topicCount = dataset.subjects.reduce((total, subject) => total + (subject.topics || []).length, 0);
  const conceptCount = dataset.subjects.reduce((total, subject) => total + (subject.topics || []).reduce((sum, topic) => sum + ((topic.key_concepts || []).length), 0), 0);
  console.log(`Updated dataset with ${dataset.subjects.length} subjects, ${topicCount} topics, and ${conceptCount} concepts.`);
}

main();
