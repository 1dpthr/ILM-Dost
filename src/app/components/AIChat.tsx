import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, MessageSquare } from 'lucide-react';
import { apiClient } from '../../lib/supabase';
import studyAgentClient from '../../lib/studyAgentClient';
import SaveExampleModal from './SaveExampleModal';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function AIChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I\'m your local AI learning assistant. I can help you with study recommendations, answer academic questions, explain concepts, and create personalized study plans. All processing happens locally on your machine for complete privacy. How can I assist you today?',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const [saveOpenId, setSaveOpenId] = useState<string | null>(null);
  const [correctOpenId, setCorrectOpenId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [notice, setNotice] = useState<string | null>(null);

  const INTENTS = ['explain', 'quiz', 'summarize', 'example', 'define', 'general'];

  const getPrevUserMessage = (index: number) => {
    const prev = messages[index - 1];
    return prev && prev.role === 'user' ? prev.content : '';
  };

  const handleConfirmHelpful = async (index: number, messageId: string) => {
    const question = getPrevUserMessage(index);
    if (!question) return setNotice('Could not find the corresponding user question.');
    setActionLoading(prev => ({ ...prev, [messageId]: true }));
    try {
      const cls = await studyAgentClient.classify(question);
      const intent = (cls && cls.suggested) ? cls.suggested : 'general';
      await studyAgentClient.sendFeedback(question, intent);
      setNotice('Thanks — feedback recorded.');
      setTimeout(() => setNotice(null), 2500);
    } catch (e) {
      console.error(e);
      setNotice('Feedback failed.');
    } finally {
      setActionLoading(prev => ({ ...prev, [messageId]: false }));
    }
  };

  const handleOpenCorrect = (id: string) => {
    setCorrectOpenId(prev => (prev === id ? null : id));
    setSaveOpenId(null);
  };

  const handleSubmitCorrection = async (index: number, messageId: string, corrected: string) => {
    const question = getPrevUserMessage(index);
    if (!question) return setNotice('Could not find question to correct.');
    setActionLoading(prev => ({ ...prev, [messageId]: true }));
    try {
      await studyAgentClient.sendFeedback(question, corrected);
      setNotice('Correction recorded.');
      setCorrectOpenId(null);
      setTimeout(() => setNotice(null), 2500);
    } catch (e) {
      console.error(e);
      setNotice('Correction failed.');
    } finally {
      setActionLoading(prev => ({ ...prev, [messageId]: false }));
    }
  };

  const handleOpenSave = (id: string) => {
    setSaveOpenId(prev => (prev === id ? null : id));
    setCorrectOpenId(null);
  };

  const handleSubmitSave = async (index: number, messageId: string, subject: string, topic: string) => {
    const question = getPrevUserMessage(index);
    const answer = messages[index].content;
    if (!question) return setNotice('Could not find question to save.');
    setActionLoading(prev => ({ ...prev, [messageId]: true }));
    try {
      await studyAgentClient.ingestChat(question, answer, subject || 'Imported', topic || 'General');
      setNotice('Saved to dataset.');
      setSaveOpenId(null);
      setTimeout(() => setNotice(null), 2500);
    } catch (e) {
      console.error(e);
      setNotice('Save failed.');
    } finally {
      setActionLoading(prev => ({ ...prev, [messageId]: false }));
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    const messageText = input;
    setMessages([...messages, userMessage]);
    setInput('');
    setIsThinking(true);

    try {
      // Prefer the local Study AI Agent service if available
      const agentRes = await studyAgentClient.ask(messageText);
      if (agentRes && agentRes.success && agentRes.response) {
        const responseId = (Date.now() + 1).toString();
        const aiResponse: Message = {
          id: responseId,
          role: 'assistant',
          content: agentRes.response,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, aiResponse]);
        setIsThinking(false);

        return;
      }

      // Fallback to demo api client
      const response = await apiClient.post('/ai/chat', { message: messageText });
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.response,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiResponse]);
    } catch (error) {
      console.error('AI chat error:', error);
    } finally {
      setIsThinking(false);
    }
  };

  const getLocalAIResponse = (query: string): string => {
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

    return `I understand you're asking about "${query}". As a local AI assistant, I can:\n\n• Provide study recommendations based on your data\n• Explain academic concepts\n• Create personalized study schedules\n• Analyze your performance patterns\n• Answer subject-specific questions\n\nCould you provide more details about what you'd like to know?`;
  };

  const quickPrompts = [
    'Create a study plan for this week',
    'What are my weak areas?',
    'Explain calculus derivatives',
    'Help with photosynthesis',
  ];

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <div className="bg-white border-b border-gray-200 p-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Study Assistant</h1>
            <p className="text-xs text-gray-500">Ask me anything about your studies</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((message, idx) => (
          <div
            key={message.id}
            className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {message.role === 'assistant' && (
              <div className="w-7 h-7 bg-emerald-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-white" />
              </div>
            )}
            <div
              className={`max-w-2xl px-4 py-2.5 rounded-lg text-sm ${
                message.role === 'user'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-50 border border-gray-200'
              }`}
            >
              <p className="whitespace-pre-line leading-relaxed">{message.content}</p>
              <p className={`text-xs mt-1.5 ${message.role === 'user' ? 'text-emerald-100' : 'text-gray-400'}`}>
                {message.timestamp.toLocaleTimeString()}
              </p>
            </div>

            {message.role === 'assistant' && (
              <div className="flex flex-col items-end gap-2">
                <div className="flex gap-2">
                  <button
                    onClick={() => handleConfirmHelpful(idx, message.id)}
                    disabled={!!actionLoading[message.id]}
                    className="px-2 py-1 bg-emerald-600 text-white rounded text-xs"
                  >
                    {actionLoading[message.id] ? '...' : 'Confirm Helpful'}
                  </button>
                  <button onClick={() => handleOpenCorrect(message.id)} className="px-2 py-1 bg-gray-200 rounded text-xs">Correct Intent</button>
                  <button onClick={() => handleOpenSave(message.id)} accessKey="s" className="px-2 py-1 bg-white border rounded text-xs">Save Example</button>
                </div>

                {correctOpenId === message.id && (
                  <div className="mt-2 p-2 bg-white border rounded w-48">
                    <div className="text-xs text-gray-500 mb-1">Select correct intent</div>
                    <div className="flex gap-2">
                      <select id={`intent-select-${message.id}`} className="flex-1 px-2 py-1 border rounded text-sm">
                        {INTENTS.map(i => <option key={i} value={i}>{i}</option>)}
                      </select>
                      <button
                        onClick={() => {
                          const sel = (document.getElementById(`intent-select-${message.id}`) as HTMLSelectElement).value;
                          handleSubmitCorrection(idx, message.id, sel);
                        }}
                        className="px-2 py-1 bg-emerald-600 text-white rounded text-sm"
                      >Apply</button>
                    </div>
                  </div>
                )}

                {saveOpenId === message.id && (
                  <SaveExampleModal
                    open={saveOpenId === message.id}
                    question={getPrevUserMessage(idx)}
                    answer={message.content}
                    onClose={() => setSaveOpenId(null)}
                    onSaved={() => setNotice('Saved to dataset.')}
                  />
                )}
              </div>
            )}

            {message.role === 'user' && (
              <div className="w-7 h-7 bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-white" />
              </div>
            )}
          </div>
        ))}

        {isThinking && (
          <div className="flex gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div className="bg-white border border-gray-200 px-4 py-3 rounded-xl">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {messages.length === 1 && (
        <div className="px-6 pb-4">
          <p className="text-sm text-gray-600 mb-3">Try these quick prompts:</p>
          <div className="grid grid-cols-2 gap-2">
            {quickPrompts.map((prompt, index) => (
              <button
                key={index}
                onClick={() => setInput(prompt)}
                className="text-left px-4 py-2 bg-white border border-gray-200 rounded-lg hover:border-emerald-300 hover:bg-emerald-50 transition-colors text-sm"
              >
                <MessageSquare className="w-4 h-4 inline mr-2 text-emerald-600" />
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white border-t border-gray-200 p-6">
        <div className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask a question..."
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isThinking}
            className="px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
