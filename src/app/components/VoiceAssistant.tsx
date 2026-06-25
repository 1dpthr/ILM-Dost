import { useState, useEffect } from 'react';
import studyAgentClient from '../../lib/studyAgentClient';
import { Mic, MicOff, Volume2, VolumeX, Sparkles, Brain, Zap } from 'lucide-react';

interface VoiceCommand {
  id: string;
  command: string;
  response: string;
  timestamp: Date;
}

export default function VoiceAssistant() {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [history, setHistory] = useState<VoiceCommand[]>([]);
  const [currentResponse, setCurrentResponse] = useState('');

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (isListening) {
      timeout = setTimeout(() => {
        setIsListening(false);
        if (transcript) {
          handleVoiceCommand(transcript);
        }
      }, 3000);
    }
    return () => clearTimeout(timeout);
  }, [isListening, transcript]);

  const toggleListening = () => {
    if (isListening) {
      setIsListening(false);
    } else {
      setIsListening(true);
      setTranscript('');
      simulateVoiceRecognition();
    }
  };

  const simulateVoiceRecognition = () => {
    const sampleCommands = [
      'What are my upcoming exams?',
      'How many study hours this week?',
      'What is my weakest subject?',
      'Create a study plan for tomorrow',
      'What is my average score?',
    ];
    const randomCommand = sampleCommands[Math.floor(Math.random() * sampleCommands.length)];

    let currentText = '';
    const words = randomCommand.split(' ');
    words.forEach((word, index) => {
      setTimeout(() => {
        currentText += (index > 0 ? ' ' : '') + word;
        setTranscript(currentText);
      }, index * 200);
    });
  };

  const handleVoiceCommand = async (command: string) => {
    // Prefer the Study AI Agent when available
    let response = '';
    try {
      const agentRes = await studyAgentClient.ask(command);
      if (agentRes && agentRes.success && agentRes.response) {
        response = agentRes.response;
      } else {
        response = getVoiceResponse(command);
      }
    } catch (e) {
      response = getVoiceResponse(command);
    }

    const newCommand: VoiceCommand = {
      id: Date.now().toString(),
      command,
      response,
      timestamp: new Date(),
    };

    setHistory([newCommand, ...history]);
    setCurrentResponse(response);
    setIsSpeaking(true);

    setTimeout(() => {
      setIsSpeaking(false);
      setTranscript('');
      setCurrentResponse('');
    }, 4000);
  };

  const getVoiceResponse = (command: string): string => {
    const lowerCommand = command.toLowerCase();

    if (lowerCommand.includes('exam')) {
      return 'You have a Physics Midterm Exam on May 15th at 10 AM, and a Math Assignment due on May 14th.';
    }

    if (lowerCommand.includes('study hours') || lowerCommand.includes('hours')) {
      return 'This week you have completed 30.2 hours of study time. Great progress!';
    }

    if (lowerCommand.includes('weak') || lowerCommand.includes('improve')) {
      return 'Your weakest subject is English Literature with an average of 78%. I recommend spending extra time on critical analysis.';
    }

    if (lowerCommand.includes('study plan') || lowerCommand.includes('schedule')) {
      return 'I recommend starting with Math for 2 hours, followed by Physics for 1.5 hours, and ending with English for 1 hour. Your peak performance time is between 4 and 6 PM.';
    }

    if (lowerCommand.includes('average') || lowerCommand.includes('score')) {
      return 'Your current average score across all subjects is 84.8%. You are performing well!';
    }

    return 'I can help you with study schedules, exam information, performance analytics, and learning recommendations. What would you like to know?';
  };

  const quickCommands = [
    'What are my upcoming exams?',
    'How many study hours this week?',
    'What is my weakest subject?',
    'Create a study plan for tomorrow',
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-1">Voice Assistant</h1>
        <p className="text-sm text-gray-500">Hands-free learning support</p>
      </div>

      <div className="bg-emerald-600 rounded-lg p-8 text-white border border-emerald-700">
        <div className="flex flex-col items-center justify-center space-y-6">
          <div className="relative">
            <button
              onClick={toggleListening}
              className={`w-32 h-32 rounded-full flex items-center justify-center transition-all ${
                isListening
                  ? 'bg-red-500 scale-110'
                  : 'bg-white/20 hover:bg-white/30'
              }`}
            >
              {isListening ? (
                <MicOff className="w-16 h-16" />
              ) : (
                <Mic className="w-16 h-16" />
              )}
            </button>

            {isListening && (
              <div className="absolute -inset-4">
                <div className="w-full h-full rounded-full border-4 border-red-400 animate-ping opacity-75"></div>
              </div>
            )}

            {isSpeaking && (
              <div className="absolute -inset-4">
                <div className="w-full h-full rounded-full border-4 border-green-400 animate-pulse"></div>
              </div>
            )}
          </div>

          <div className="text-center space-y-2">
            <h2 className="text-2xl">
              {isListening ? 'Listening...' : isSpeaking ? 'Speaking...' : 'Ready to assist'}
            </h2>
            <p className="text-white/70">
              {isListening
                ? 'Say your question or command'
                : isSpeaking
                ? 'Processing your request'
                : 'Click the microphone to start'}
            </p>
          </div>

          {transcript && (
            <div className="w-full max-w-2xl bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <div className="flex items-start gap-3">
                <Mic className="w-5 h-5 flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <p className="text-sm text-white/70 mb-1">You said:</p>
                  <p className="text-lg">{transcript}</p>
                </div>
              </div>
            </div>
          )}

          {currentResponse && (
            <div className="w-full max-w-2xl bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <div className="flex items-start gap-3">
                <Volume2 className="w-5 h-5 flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <p className="text-sm text-white/70 mb-1">Assistant:</p>
                  <p className="text-lg">{currentResponse}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wide">Quick Voice Commands</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {quickCommands.map((command, index) => (
            <button
              key={index}
              onClick={() => {
                setTranscript(command);
                handleVoiceCommand(command);
              }}
              className="text-left px-4 py-3 bg-white border border-gray-200 rounded-lg hover:border-emerald-300 hover:bg-emerald-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Mic className="w-4 h-4 text-emerald-600" />
                <span className="text-sm">{command}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Voice Command History</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {history.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <VolumeX className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No voice commands yet. Try asking something!</p>
            </div>
          ) : (
            history.map((item) => (
              <div key={item.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="bg-blue-100 p-2 rounded-lg">
                      <Mic className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-600 mb-1">Command:</p>
                      <p>{item.command}</p>
                    </div>
                    <span className="text-xs text-gray-500">
                      {item.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="bg-green-100 p-2 rounded-lg">
                      <Volume2 className="w-4 h-4 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-600 mb-1">Response:</p>
                      <p className="text-gray-700">{item.response}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">Voice Assistant Capabilities</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h4 className="text-sm mb-2 text-gray-900 font-medium">Schedule Management</h4>
            <p className="text-xs text-gray-600">Ask about upcoming exams, classes, and assignments</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h4 className="text-sm mb-2 text-gray-900 font-medium">Performance Analytics</h4>
            <p className="text-xs text-gray-600">Get insights on scores, weak areas, and improvements</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h4 className="text-sm mb-2 text-gray-900 font-medium">Study Planning</h4>
            <p className="text-xs text-gray-600">Create personalized study schedules and recommendations</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h4 className="text-sm mb-2 text-gray-900 font-medium">Progress Tracking</h4>
            <p className="text-xs text-gray-600">Monitor study hours, completed chapters, and goals</p>
          </div>
        </div>
      </div>
    </div>
  );
}
