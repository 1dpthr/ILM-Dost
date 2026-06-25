// Local storage wrapper for demo mode
const STORAGE_PREFIX = 'ilmdost_';

export const localStorageDB = {
  get: (key: string) => {
    try {
      const data = localStorage.getItem(STORAGE_PREFIX + key);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  },

  set: (key: string, value: any) => {
    try {
      localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
    } catch (e) {
      console.error('LocalStorage error:', e);
    }
  },

  getAll: (prefix: string) => {
    const results: any[] = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(STORAGE_PREFIX + prefix)) {
          const data = localStorage.getItem(key);
          if (data) {
            results.push(JSON.parse(data));
          }
        }
      }
    } catch (e) {
      console.error('LocalStorage getAll error:', e);
    }
    return results;
  },

  remove: (key: string) => {
    try {
      localStorage.removeItem(STORAGE_PREFIX + key);
    } catch (e) {
      console.error('LocalStorage remove error:', e);
    }
  },

  clear: (prefix?: string) => {
    try {
      if (prefix) {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(STORAGE_PREFIX + prefix)) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
      } else {
        localStorage.clear();
      }
    } catch (e) {
      console.error('LocalStorage clear error:', e);
    }
  }
};

// Demo mode API client using localStorage
export const demoApiClient = {
  async get(endpoint: string) {
    await new Promise(resolve => setTimeout(resolve, 300)); // Simulate network delay

    if (endpoint === '/courses') {
      return { courses: localStorageDB.getAll('course_') };
    } else if (endpoint === '/courses/approved') {
      const courses = localStorageDB.getAll('course_');
      return { courses: courses.filter((c: any) => c.status === 'approved') };
    } else if (endpoint === '/courses/pending') {
      const courses = localStorageDB.getAll('course_');
      return { courses: courses.filter((c: any) => c.status === 'pending') };
    } else if (endpoint.startsWith('/enrollments/')) {
      const userId = endpoint.split('/')[2];
      const enrollments = localStorageDB.getAll('enrollment_');
      return { enrollments: enrollments.filter((e: any) => e.studentId === userId) };
    } else if (endpoint === '/tests') {
      return { tests: localStorageDB.getAll('test_') };
    } else if (endpoint === '/events') {
      return { events: localStorageDB.getAll('event_') };
    } else if (endpoint === '/analytics') {
      return { analytics: localStorageDB.get('analytics') || {} };
    } else if (endpoint === '/ai/chat/history') {
      return { messages: localStorageDB.getAll('chat_') };
    }
    return {};
  },

  async post(endpoint: string, data: any) {
    await new Promise(resolve => setTimeout(resolve, 300));

    if (endpoint === '/courses') {
      const id = data.id || Date.now().toString();
      const courseData = {
        ...data,
        id,
        createdAt: data.createdAt || new Date().toISOString(),
        status: data.status || 'pending',
      };
      localStorageDB.set(`course_${id}`, courseData);
      return { success: true, course: courseData };
    } else if (endpoint === '/enrollments') {
      const id = data.id || Date.now().toString();
      const enrollmentData = {
        ...data,
        id,
        enrolledAt: new Date().toISOString(),
        progress: 0,
        completedChapters: [],
        notes: {},
      };
      localStorageDB.set(`enrollment_${id}`, enrollmentData);
      return { success: true, enrollment: enrollmentData };
    } else if (endpoint === '/tests') {
      const id = data.id || Date.now().toString();
      localStorageDB.set(`test_${id}`, { ...data, id });
      return { success: true, test: { ...data, id } };
    } else if (endpoint === '/events') {
      const id = data.id || Date.now().toString();
      localStorageDB.set(`event_${id}`, { ...data, id });
      return { success: true, event: { ...data, id } };
    } else if (endpoint === '/ai/chat') {
      const messageId = Date.now().toString();
      localStorageDB.set(`chat_${messageId}`, {
        role: 'user',
        content: data.message,
        timestamp: new Date().toISOString()
      });
      return { response: getAIResponse(data.message) };
    }
    return { success: true };
  },

  async put(endpoint: string, data: any) {
    await new Promise(resolve => setTimeout(resolve, 300));

    const courseMatch = endpoint.match(/\/courses\/(.+)/);
    const enrollmentMatch = endpoint.match(/\/enrollments\/(.+)/);

    if (courseMatch) {
      const id = courseMatch[1];
      localStorageDB.set(`course_${id}`, data);
      return { success: true, course: data };
    } else if (enrollmentMatch) {
      const id = enrollmentMatch[1];
      localStorageDB.set(`enrollment_${id}`, data);
      return { success: true, enrollment: data };
    }
    return { success: true };
  },

  async delete(endpoint: string) {
    await new Promise(resolve => setTimeout(resolve, 300));

    const courseMatch = endpoint.match(/\/courses\/(.+)/);
    const eventMatch = endpoint.match(/\/events\/(.+)/);
    const testMatch = endpoint.match(/\/tests\/(.+)/);

    if (courseMatch) {
      localStorageDB.remove(`course_${courseMatch[1]}`);
    } else if (eventMatch) {
      localStorageDB.remove(`event_${eventMatch[1]}`);
    } else if (testMatch) {
      localStorageDB.remove(`test_${testMatch[1]}`);
    }
    return { success: true };
  }
};

function getAIResponse(query: string): string {
  const lowerQuery = query.toLowerCase();

  if (lowerQuery.includes('study plan') || lowerQuery.includes('schedule')) {
    return 'Based on your current progress and upcoming exams, I recommend:\n\n1. Math (Calculus): 2 hours daily - Focus on practice problems\n2. Science: 1.5 hours daily - Review lab concepts\n3. English: 1 hour daily - Literature analysis\n\nYour optimal study time appears to be 4-6 PM based on your past performance data.';
  }

  if (lowerQuery.includes('weak') || lowerQuery.includes('improve')) {
    return 'Analyzing your test results, here are areas that need attention:\n\n• English Literature Analysis - 68% average\n• Physics Mechanics - 72% average\n• Math Trigonometry - 75% average\n\nI suggest dedicating 30 extra minutes daily to your weakest subject and using practice tests to reinforce concepts.';
  }

  if (lowerQuery.includes('calculus') || lowerQuery.includes('derivative')) {
    return 'Calculus derivatives represent the rate of change. Here\'s a simple explanation:\n\nIf f(x) = x², then f\'(x) = 2x\n\nThis means at any point x, the slope of the curve is 2x. For example:\n• At x = 3, slope = 2(3) = 6\n• At x = 5, slope = 2(5) = 10\n\nWould you like me to explain specific derivative rules?';
  }

  if (lowerQuery.includes('photosynthesis') || lowerQuery.includes('biology')) {
    return 'Photosynthesis is the process where plants convert light energy into chemical energy:\n\n6CO₂ + 6H₂O + Light → C₆H₁₂O₆ + 6O₂\n\nKey stages:\n1. Light Reactions (in thylakoids)\n2. Calvin Cycle (in stroma)\n\nThis process produces glucose and oxygen, making it essential for life on Earth.';
  }

  return `I understand you're asking about "${query}". As your AI study assistant, I can:\n\n• Provide study recommendations based on your data\n• Explain academic concepts\n• Create personalized study schedules\n• Analyze your performance patterns\n• Answer subject-specific questions\n\nCould you provide more details about what you'd like to know?`;
}
