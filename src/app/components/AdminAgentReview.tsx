import { useEffect, useState } from 'react';
import studyAgentClient from '../../lib/studyAgentClient';

type ChatLog = {
  question: string;
  response: string;
  intent?: string;
  sources?: any[];
  timestamp: string;
};

const INTENTS = ['explain', 'quiz', 'summarize', 'example', 'define', 'general'];

export default function AdminAgentReview() {
  const [logs, setLogs] = useState<ChatLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Record<number, string>>({});
  const [suggestions, setSuggestions] = useState<Record<number, any>>({});
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setLoading(true);
    const res = await studyAgentClient.getChatLogs(200);
    if (res && res.success && Array.isArray(res.logs)) {
      setLogs(res.logs);
      // prefetch suggestions for top 50
      res.logs.slice(0, 50).forEach((l: any, idx: number) => suggestIntent(l.question, idx));
    }
    setLoading(false);
  };

  const suggestIntent = async (text: string, idx: number) => {
    const r = await studyAgentClient.classify(text);
    if (r && r.success) {
      setSuggestions(prev => ({ ...prev, [idx]: r }));
      setSelected(prev => ({ ...prev, [idx]: r.suggested }));
    }
  };

  const applyFeedback = async (idx: number) => {
    const item = logs[idx];
    const chosen = selected[idx];
    if (!item || !chosen) return;
    await studyAgentClient.sendFeedback(item.question, chosen);
    setMessage('Feedback submitted');
    setTimeout(() => setMessage(''), 2000);
  };

  const applyCorrection = async (idx: number, corrected: string) => {
    const item = logs[idx];
    if (!item) return;
    await studyAgentClient.sendFeedback(item.question, corrected);
    setMessage('Correction submitted');
    setTimeout(() => setMessage(''), 2000);
  };

  const triggerRetrain = async () => {
    setMessage('Retraining...');
    await studyAgentClient.retrain();
    setMessage('Retrain triggered');
    setTimeout(() => setMessage(''), 2000);
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">AI Chat Review</h2>
        <div className="flex items-center gap-2">
          <button onClick={loadLogs} className="px-3 py-2 bg-white border rounded">Refresh</button>
          <button onClick={triggerRetrain} className="px-3 py-2 bg-emerald-600 text-white rounded">Retrain</button>
        </div>
      </div>

      <div className="mb-6 p-4 border rounded bg-white">
        <h3 className="text-sm font-medium mb-2">Upload Document</h3>
        <p className="text-xs text-gray-500 mb-2">Upload a .txt or .md file to add as a topic in the knowledge base.</p>
        <input id="agent-upload-file" type="file" className="mb-2" />
        <div className="flex gap-2">
          <input id="agent-upload-subject" placeholder="Subject (e.g., Science)" className="px-2 py-1 border rounded w-1/3" />
          <input id="agent-upload-topic" placeholder="Topic name (optional)" className="px-2 py-1 border rounded w-1/3" />
          <button onClick={async () => {
            const inputEl = document.getElementById('agent-upload-file') as HTMLInputElement | null;
            const subjectEl = document.getElementById('agent-upload-subject') as HTMLInputElement | null;
            const topicEl = document.getElementById('agent-upload-topic') as HTMLInputElement | null;
            if (!inputEl || !inputEl.files || inputEl.files.length === 0) return alert('Select a file');
            const file = inputEl.files[0];
            const subject = subjectEl?.value || 'Imported';
            const topic = topicEl?.value || file.name;
            const res = await studyAgentClient.uploadFile(file, subject, topic);
            if (res && res.success) {
              alert('Upload successful');
              loadLogs();
            } else {
              alert('Upload failed');
            }
          }} className="px-3 py-2 bg-emerald-600 text-white rounded">Upload</button>
        </div>
      </div>

      {message && <div className="mb-4 text-sm text-green-600">{message}</div>}

      {loading && <div>Loading...</div>}

      {!loading && logs.length === 0 && <div className="text-sm text-gray-500">No chat logs found.</div>}

      <div className="space-y-4">
        {logs.map((log, idx) => (
          <div key={idx} className="p-4 border rounded bg-white">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm text-gray-500">{new Date(log.timestamp).toLocaleString()}</div>
                <div className="mt-2 font-medium">Q: {log.question}</div>
                <div className="mt-2 text-sm text-gray-700 whitespace-pre-line">A: {log.response}</div>
              </div>
              <div className="w-48 ml-4">
                <div className="text-xs text-gray-500">Agent intent</div>
                <div className="font-medium">{log.intent || '-'}</div>

                <div className="mt-3 text-xs text-gray-500">Suggested</div>
                <div className="mt-1">
                  <select
                    value={selected[idx] || ''}
                    onChange={(e) => setSelected(prev => ({ ...prev, [idx]: e.target.value }))}
                    className="w-full px-2 py-1 border rounded"
                  >
                    <option value="">(select)</option>
                    {INTENTS.map(i => (
                      <option key={i} value={i}>{i}</option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-2 mt-3">
                  <button onClick={() => applyFeedback(idx)} className="px-2 py-1 bg-emerald-600 text-white rounded text-sm">Accept</button>
                  <button onClick={() => applyCorrection(idx, prompt('Correct intent (e.g. explain, quiz):') || '')} className="px-2 py-1 bg-gray-200 rounded text-sm">Correct</button>
                </div>

                {suggestions[idx] && (
                  <div className="mt-2 text-xs text-gray-500">
                    Top scores:
                    <ul className="list-disc list-inside">
                      {suggestions[idx].scores.slice(0,3).map((s:any, i:number) => (
                        <li key={i}>{s.label}: {s.value.toFixed(3)}</li>
                      ))}
                    </ul>
                  </div>
                )}

              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
