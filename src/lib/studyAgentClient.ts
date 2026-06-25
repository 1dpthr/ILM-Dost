const DEFAULT_AGENT_URL = import.meta.env.VITE_STUDY_AGENT_URL || 'http://localhost:3001';

async function request(path: string, options: RequestInit = {}) {
  const url = `${DEFAULT_AGENT_URL}${path}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { 'Content-Type': 'application/json' }, ...options });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`Agent request failed: ${res.status}`);
    return await res.json();
  } catch (e) {
    clearTimeout(timeout);
    throw e;
  }
}

export async function isAvailable(): Promise<boolean> {
  try {
    const r = await request('/api/health', { method: 'GET' });
    return !!(r && r.status === 'running');
  } catch (e) {
    return false;
  }
}

export async function ask(question: string): Promise<{ success: boolean; response?: string; intent?: string; sources?: any[] }> {
  try {
    const body = JSON.stringify({ question });
    const r = await request('/api/ask', { method: 'POST', body });
    return r;
  } catch (e) {
    return { success: false };
  }
}

export async function getTopics(query = '', subject = ''): Promise<any> {
  try {
    const q = query ? `?q=${encodeURIComponent(query)}` : '';
    const s = subject ? (q ? `&subject=${encodeURIComponent(subject)}` : `?subject=${encodeURIComponent(subject)}`) : '';
    return await request(`/api/topics${q}${s}`, { method: 'GET' });
  } catch (e) {
    return { success: false };
  }
}

export async function getTopicsWithScores(query = '', subject = ''): Promise<any> {
  try {
    const q = query ? `?q=${encodeURIComponent(query)}` : '';
    const s = subject ? (q ? `&subject=${encodeURIComponent(subject)}` : `?subject=${encodeURIComponent(subject)}`) : '';
    const inc = q || s ? (q || s ? `${q || '?'}${s ? (q ? `&subject=${encodeURIComponent(subject)}` : `subject=${encodeURIComponent(subject)}`) : ''}` : '') : '';
    // simpler: always append includeScores
    const sep = q || s ? '&' : '?';
    const url = `/api/topics${q}${s}${sep}includeScores=true`;
    return await request(url, { method: 'GET' });
  } catch (e) {
    return { success: false };
  }
}

const client = { isAvailable, ask, getTopics, getTopicsWithScores, sendFeedback, getChatLogs, retrain, classify, ingestChat, uploadFile };
export default client;

export async function sendFeedback(question: string, correct_intent: string) {
  try {
    const body = JSON.stringify({ question, correct_intent });
    return await request('/api/feedback', { method: 'POST', body });
  } catch (e) {
    return { success: false };
  }
}

export async function getChatLogs(limit = 100) {
  try {
    return await request(`/api/chatlogs?limit=${limit}`, { method: 'GET' });
  } catch (e) {
    return { success: false };
  }
}

export async function retrain() {
  try {
    return await request('/api/retrain', { method: 'POST' });
  } catch (e) {
    return { success: false };
  }
}

export async function classify(text: string) {
  try {
    const body = JSON.stringify({ text });
    return await request('/api/classify', { method: 'POST', body });
  } catch (e) {
    return { success: false };
  }
}

export async function ingestChat(question: string, response: string, subject: string, topic: string) {
  try {
    const body = JSON.stringify({ question, response, subject, topic });
    return await request('/api/ingest-chat', { method: 'POST', body });
  } catch (e) {
    return { success: false };
  }
}

export async function uploadFile(file: File, subject = 'Imported', topic = '') {
  try {
    const url = `${DEFAULT_AGENT_URL}/api/upload`;
    const fd = new FormData();
    fd.append('file', file);
    fd.append('subject', subject);
    if (topic) fd.append('topic', topic);

    const res = await fetch(url, { method: 'POST', body: fd });
    if (!res.ok) throw new Error('Upload failed');
    return await res.json();
  } catch (e) {
    return { success: false };
  }
}
