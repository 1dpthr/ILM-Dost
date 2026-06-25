import { useEffect, useState, useRef } from 'react';
import studyAgentClient from '../../lib/studyAgentClient';

interface Props {
  open: boolean;
  question: string;
  answer: string;
  onClose: () => void;
  onSaved?: () => void;
}

export default function SaveExampleModal({ open, question, answer, onClose, onSaved }: Props) {
  const [subjects, setSubjects] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [newTopic, setNewTopic] = useState('');
  const [saving, setSaving] = useState(false);
  const [subjectSuggestions, setSubjectSuggestions] = useState<string[]>([]);
  const [topicSuggestions, setTopicSuggestions] = useState<any[]>([]);
  const [showSubjectList, setShowSubjectList] = useState(false);
  const [showTopicList, setShowTopicList] = useState(false);
  const [subjectFocus, setSubjectFocus] = useState(-1);
  const [topicFocus, setTopicFocus] = useState(-1);

  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoading(true);
      const res = await studyAgentClient.getTopics();
      if (res && res.success && res.topics) setSubjects(res.topics);
      // prefill from localStorage if present
      try {
        const lastSub = localStorage.getItem('study:lastSubject');
        const lastTop = localStorage.getItem('study:lastTopic');
        if (lastSub) setSubject(lastSub);
        if (lastTop) setTopic(lastTop);
      } catch (e) {
        // ignore
      }
      setLoading(false);
    })();
  }, [open]);

  const searchTimer = useRef<number | null>(null);

  const querySubjects = async (q: string) => {
    try {
      const res = await studyAgentClient.getTopicsWithScores(q);
      if (res && res.success && res.list) {
        // res.list is array of {subject, topic, score}
        const groups: Record<string, { name: string; score: number }[]> = {};
        res.list.forEach((it: any) => {
          if (!groups[it.subject]) groups[it.subject] = [];
          if (!groups[it.subject].some((t: any) => t.name === it.topic)) groups[it.subject].push({ name: it.topic, score: it.score });
        });
        setSubjects(groups);
        setSubjectSuggestions(Object.keys(groups).map(s => s));
      } else {
        setSubjectSuggestions([]);
      }
    } catch (e) {
      setSubjectSuggestions([]);
    }
  };

  const queryTopics = async (q: string, subj = '') => {
    try {
      if (subj && !q) {
        const res = await studyAgentClient.getTopics('', subj);
        if (res && res.success && res.topics && res.topics[subj]) {
          setTopicSuggestions((res.topics[subj] || []).map((t: string) => ({ name: t, score: 1 })));
        } else {
          setTopicSuggestions([]);
        }
        return;
      }

      const res = await studyAgentClient.getTopicsWithScores(q, subj);
      if (res && res.success) {
        if (res.list && res.list.length) {
          const topics = subj ? res.list.filter((l: any) => l.subject === subj).map((l: any) => ({ name: l.topic, score: l.score })) : res.list.map((l: any) => ({ name: l.topic, score: l.score }));
          // dedupe by name keeping highest score
          const map: Record<string, number> = {};
          topics.forEach((t: any) => { if (!map[t.name] || map[t.name] < t.score) map[t.name] = t.score; });
          setTopicSuggestions(Object.keys(map).map(k => ({ name: k, score: map[k] })).slice(0, 50));
        } else {
          setTopicSuggestions([]);
        }
      } else {
        setTopicSuggestions([]);
      }
    } catch (e) {
      setTopicSuggestions([]);
    }
  };

  useEffect(() => {
    // reset when open
    if (open) {
      setSubject('');
      setTopic('');
      setNewSubject('');
      setNewTopic('');
    }
  }, [open]);

  if (!open) return null;

  const subjectOptions = Object.keys(subjects || {});
  const topicOptions = subject ? (subjects[subject] || []) : [];

  const handleSave = async () => {
    const finalSubject = subject === '__new__' ? (newSubject || 'Imported') : (subject || newSubject || 'Imported');
    const finalTopic = topic === '__new__' ? (newTopic || 'General') : (topic || newTopic || 'General');

    setSaving(true);
    try {
      const res = await studyAgentClient.ingestChat(question, answer, finalSubject, finalTopic);
      if (res && res.success) {
        try {
          localStorage.setItem('study:lastSubject', finalSubject);
          localStorage.setItem('study:lastTopic', finalTopic);
        } catch (e) {}
        if (onSaved) onSaved();
        onClose();
      } else {
        alert('Save failed');
      }
    } catch (e) {
      console.error(e);
      alert('Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50" role="presentation">
      <div className="bg-white rounded-lg w-full max-w-2xl p-6" role="dialog" aria-modal="true" aria-labelledby="save-example-title" aria-describedby="save-example-desc">
        <div className="flex items-start justify-between">
          <div>
            <h3 id="save-example-title" className="text-lg font-semibold">Save Q/A to Dataset</h3>
            <p id="save-example-desc" className="text-sm text-gray-500">Choose a subject and topic to save this example.</p>
          </div>
          <div>
            <button onClick={onClose} className="text-sm text-gray-500">Close</button>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Question</label>
            <div className="p-3 bg-gray-50 border rounded text-sm whitespace-pre-line">{question}</div>
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">Answer</label>
            <div className="p-3 bg-gray-50 border rounded text-sm whitespace-pre-line">{answer}</div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="relative">
              <label className="block text-xs text-gray-600 mb-1">Subject</label>
              <input
                value={subject === '__new__' ? newSubject : subject}
                onChange={(e) => {
                  const v = e.target.value;
                  setSubject('');
                  setNewSubject(v);
                  setShowSubjectList(true);
                  if (searchTimer.current) window.clearTimeout(searchTimer.current);
                  searchTimer.current = window.setTimeout(() => querySubjects(v), 250);
                  setSubjectFocus(-1);
                }}
                onFocus={() => setShowSubjectList(true)}
                onBlur={() => setTimeout(()=>setShowSubjectList(false), 120)}
                onKeyDown={(e) => {
                  const len = subjectSuggestions.length;
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setSubjectFocus(prev => Math.min(len - 1, prev + 1));
                    setShowSubjectList(true);
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setSubjectFocus(prev => Math.max(-1, prev - 1));
                  } else if (e.key === 'Enter') {
                    if (subjectFocus >= 0 && subjectFocus < subjectSuggestions.length) {
                      const s = subjectSuggestions[subjectFocus];
                      setSubject(s);
                      setNewSubject('');
                      setShowSubjectList(false);
                      queryTopics('', s);
                    }
                  } else if (e.key === 'Escape') {
                    setShowSubjectList(false);
                    setSubjectFocus(-1);
                  }
                }}
                placeholder="Start typing or pick existing subject"
                className="w-full px-2 py-2 border rounded"
              />
              {showSubjectList && subjectSuggestions.length > 0 && (
                <ul id="subject-list" role="listbox" aria-label="Subject suggestions" className="absolute z-40 bg-white border rounded mt-1 w-full max-h-40 overflow-auto text-sm">
                    {subjectSuggestions.map((s, i) => (
                      <li
                        key={s}
                        className={`px-2 py-2 cursor-pointer flex justify-between ${i === subjectFocus ? 'bg-gray-100' : 'hover:bg-gray-100'}`}
                        onMouseDown={() => {
                          setSubject(s);
                          setNewSubject('');
                          setShowSubjectList(false);
                          setTopic('');
                          queryTopics('', s);
                        }}
                        onMouseEnter={() => setSubjectFocus(i)}
                      >
                        <span>{s}</span>
                        <span className="text-xs text-gray-400">&nbsp;</span>
                      </li>
                    ))}
                  <li className="px-2 py-2 hover:bg-gray-100 cursor-pointer text-emerald-600" onMouseDown={() => {
                    setSubject('__new__');
                    setNewSubject('');
                    setShowSubjectList(false);
                  }}>+ Create new subject</li>
                </ul>
              )}
            </div>
            <div className="relative">
              <label className="block text-xs text-gray-600 mb-1">Topic</label>
              <input
                value={topic === '__new__' ? newTopic : topic}
                onChange={(e) => {
                  const v = e.target.value;
                  setTopic('');
                  setNewTopic(v);
                  setShowTopicList(true);
                  if (searchTimer.current) window.clearTimeout(searchTimer.current);
                  searchTimer.current = window.setTimeout(() => queryTopics(v, subject), 250);
                    setTopicFocus(-1);
                }}
                  onFocus={() => setShowTopicList(true)}
                  onBlur={() => setTimeout(()=>setShowTopicList(false), 120)}
                  onKeyDown={(e) => {
                    const len = topicSuggestions.length;
                    if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      setTopicFocus(prev => Math.min(len - 1, prev + 1));
                      setShowTopicList(true);
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      setTopicFocus(prev => Math.max(-1, prev - 1));
                    } else if (e.key === 'Enter') {
                      if (topicFocus >= 0 && topicFocus < topicSuggestions.length) {
                        const t = topicSuggestions[topicFocus];
                        const name = typeof t === 'string' ? t : t.name;
                        setTopic(name);
                        setNewTopic('');
                        setShowTopicList(false);
                      }
                    } else if (e.key === 'Escape') {
                      setShowTopicList(false);
                      setTopicFocus(-1);
                    }
                  }}
                placeholder="Start typing or pick existing topic"
                className="w-full px-2 py-2 border rounded"
              />
              {showTopicList && topicSuggestions.length > 0 && (
                <ul id="topic-list" role="listbox" aria-label="Topic suggestions" className="absolute z-40 bg-white border rounded mt-1 w-full max-h-40 overflow-auto text-sm">
                    {topicSuggestions.map((t: any, i: number) => {
                      const name = typeof t === 'string' ? t : t.name;
                      const score = typeof t === 'string' ? null : t.score;
                      return (
                        <li
                          key={name}
                          className={`px-2 py-2 cursor-pointer flex justify-between ${i === topicFocus ? 'bg-gray-100' : 'hover:bg-gray-100'}`}
                          onMouseDown={() => {
                            setTopic(name);
                            setNewTopic('');
                            setShowTopicList(false);
                          }}
                          onMouseEnter={() => setTopicFocus(i)}
                        >
                          <span>{name}</span>
                          {score !== null && <span className="text-xs text-gray-400">{score}</span>}
                        </li>
                      );
                    })}
                  <li className="px-2 py-2 hover:bg-gray-100 cursor-pointer text-emerald-600" onMouseDown={() => {
                    setTopic('__new__');
                    setNewTopic('');
                    setShowTopicList(false);
                  }}>+ Create new topic</li>
                </ul>
              )}
            </div>
          </div>

        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-emerald-600 text-white rounded">{saving ? 'Saving…' : 'Save Example'}</button>
        </div>
      </div>
    </div>
  );
}
