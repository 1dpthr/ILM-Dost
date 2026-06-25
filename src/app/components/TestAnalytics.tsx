import { useState, useEffect } from 'react';
import { ClipboardList, TrendingUp, Award, Target, Brain, BarChart3, CheckCircle, XCircle, Loader2, Trash2 } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { apiClient } from '../../lib/supabase';

interface Test {
  id: string;
  subject: string;
  title: string;
  date: string;
  score: number;
  totalMarks: number;
  duration: string;
  topics: string[];
}

const INITIAL_TESTS: Test[] = [
  {
    id: '1',
    subject: 'Mathematics',
    title: 'Calculus Midterm',
    date: '2026-05-05',
    score: 85,
    totalMarks: 100,
    duration: '2h 30m',
    topics: ['Derivatives', 'Integration', 'Limits'],
  },
  {
    id: '2',
    subject: 'Physics',
    title: 'Mechanics Quiz',
    date: '2026-05-08',
    score: 92,
    totalMarks: 100,
    duration: '1h 15m',
    topics: ['Newton\'s Laws', 'Energy', 'Momentum'],
  },
  {
    id: '3',
    subject: 'Computer Science',
    title: 'Data Structures Exam',
    date: '2026-05-10',
    score: 88,
    totalMarks: 100,
    duration: '2h',
    topics: ['Trees', 'Graphs', 'Hash Tables'],
  },
  {
    id: '4',
    subject: 'English',
    title: 'Literature Analysis',
    date: '2026-05-11',
    score: 78,
    totalMarks: 100,
    duration: '2h',
    topics: ['Shakespeare', 'Poetry', 'Critical Thinking'],
  },
];

export default function TestAnalytics() {
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddTest, setShowAddTest] = useState(false);
  const [newTest, setNewTest] = useState({
    subject: '',
    title: '',
    score: '',
    totalMarks: '100',
    duration: '',
    date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    loadTests();
  }, []);

  const loadTests = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/tests');

      if (response.tests && response.tests.length > 0) {
        setTests(response.tests);
      } else {
        await seedInitialTests();
      }
    } catch (error) {
      console.error('Error loading tests:', error);
      setTests(INITIAL_TESTS);
    } finally {
      setLoading(false);
    }
  };

  const seedInitialTests = async () => {
    try {
      for (const test of INITIAL_TESTS) {
        await apiClient.post('/tests', test);
      }
      setTests(INITIAL_TESTS);
    } catch (error) {
      console.error('Error seeding tests:', error);
      setTests(INITIAL_TESTS);
    }
  };

  const addNewTest = async () => {
    if (!newTest.subject.trim() || !newTest.title.trim() || !newTest.score || !newTest.duration) {
      alert('Please fill in all fields');
      return;
    }

    const testToAdd: Test = {
      id: Date.now().toString(),
      subject: newTest.subject,
      title: newTest.title,
      date: newTest.date,
      score: parseInt(newTest.score),
      totalMarks: parseInt(newTest.totalMarks),
      duration: newTest.duration,
      topics: [],
    };

    try {
      await apiClient.post('/tests', testToAdd);
      setTests([...tests, testToAdd]);
      setShowAddTest(false);
      setNewTest({
        subject: '',
        title: '',
        score: '',
        totalMarks: '100',
        duration: '',
        date: new Date().toISOString().split('T')[0],
      });
    } catch (error) {
      console.error('Error adding test:', error);
    }
  };

  const deleteTest = async (testId: string) => {
    if (!confirm('Delete this test result?')) return;

    try {
      await apiClient.delete(`/tests/${testId}`);
      setTests(tests.filter(t => t.id !== testId));
    } catch (error) {
      console.error('Error deleting test:', error);
    }
  };

  const performanceTrend = [
    { month: 'Jan', score: 75 },
    { month: 'Feb', score: 78 },
    { month: 'Mar', score: 82 },
    { month: 'Apr', score: 85 },
    { month: 'May', score: 86 },
  ];

  const subjectComparison = [
    { subject: 'Math', score: 85 },
    { subject: 'Physics', score: 92 },
    { subject: 'CS', score: 88 },
    { subject: 'English', score: 78 },
    { subject: 'History', score: 82 },
  ];

  const skillsRadar = [
    { skill: 'Problem Solving', value: 90 },
    { skill: 'Critical Thinking', value: 75 },
    { skill: 'Memory', value: 85 },
    { skill: 'Speed', value: 80 },
    { skill: 'Accuracy', value: 88 },
    { skill: 'Analysis', value: 82 },
  ];

  const aiInsights = [
    {
      type: 'strength',
      icon: CheckCircle,
      text: 'Excellent performance in Physics - consistent 90+ scores',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      type: 'weakness',
      icon: XCircle,
      text: 'English literature analysis needs improvement - practice critical essays',
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
    {
      type: 'trend',
      icon: TrendingUp,
      text: 'Overall performance improved by 15% in the last 3 months',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      type: 'recommendation',
      icon: Brain,
      text: 'Focus 30min daily on weakest topics for optimal improvement',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
  ];

  const averageScore = tests.length > 0
    ? tests.reduce((sum, test) => sum + (test.score / test.totalMarks) * 100, 0) / tests.length
    : 0;
  const highestScore = tests.length > 0 ? Math.max(...tests.map(t => t.score)) : 0;
  const totalTests = tests.length;
  const passedTests = tests.filter(t => (t.score / t.totalMarks) * 100 >= 60).length;

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {showAddTest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Test Result</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                <input
                  type="text"
                  value={newTest.subject}
                  onChange={(e) => setNewTest({...newTest, subject: e.target.value})}
                  placeholder="e.g., Mathematics"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Test Title</label>
                <input
                  type="text"
                  value={newTest.title}
                  onChange={(e) => setNewTest({...newTest, title: e.target.value})}
                  placeholder="e.g., Midterm Exam"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Score</label>
                  <input
                    type="number"
                    value={newTest.score}
                    onChange={(e) => setNewTest({...newTest, score: e.target.value})}
                    placeholder="85"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Total Marks</label>
                  <input
                    type="number"
                    value={newTest.totalMarks}
                    onChange={(e) => setNewTest({...newTest, totalMarks: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Duration</label>
                <input
                  type="text"
                  value={newTest.duration}
                  onChange={(e) => setNewTest({...newTest, duration: e.target.value})}
                  placeholder="e.g., 2h"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                <input
                  type="date"
                  value={newTest.date}
                  onChange={(e) => setNewTest({...newTest, date: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={addNewTest}
                  className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
                >
                  Add Test
                </button>
                <button
                  onClick={() => setShowAddTest(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-1">Tests & Analytics</h1>
          <p className="text-sm text-gray-500">Track your test performance and get AI-powered insights</p>
        </div>
        <button
          onClick={() => setShowAddTest(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium"
        >
          <ClipboardList className="w-4 h-4" />
          Add Test
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-blue-500 w-10 h-10 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Average Score</p>
          </div>
          <p className="text-2xl font-semibold text-gray-900">{averageScore.toFixed(1)}%</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-green-500 w-10 h-10 rounded-lg flex items-center justify-center">
              <Award className="w-5 h-5 text-white" />
            </div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Highest Score</p>
          </div>
          <p className="text-2xl font-semibold text-gray-900">{highestScore}%</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-purple-500 w-10 h-10 rounded-lg flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-white" />
            </div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Tests</p>
          </div>
          <p className="text-2xl font-semibold text-gray-900">{totalTests}</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-orange-500 w-10 h-10 rounded-lg flex items-center justify-center">
              <Target className="w-5 h-5 text-white" />
            </div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Passed Tests</p>
          </div>
          <p className="text-2xl font-semibold text-gray-900">{passedTests}/{totalTests}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wide">Performance Trend</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={performanceTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={2} name="Average Score %" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wide">Subject Comparison</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={subjectComparison}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="subject" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Legend />
              <Bar dataKey="score" fill="#8b5cf6" name="Score %" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wide">Skills Analysis</h3>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={skillsRadar}>
              <PolarGrid />
              <PolarAngleAxis dataKey="skill" />
              <PolarRadiusAxis domain={[0, 100]} />
              <Radar name="Your Skills" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wide flex items-center gap-2">
            <Brain className="w-4 h-4 text-purple-600" />
            AI-Powered Insights
          </h3>
          <div className="space-y-3">
            {aiInsights.map((insight, index) => (
              <div key={index} className={`p-4 rounded-lg border ${insight.bgColor}`}>
                <div className="flex items-start gap-3">
                  <insight.icon className={`w-5 h-5 ${insight.color} flex-shrink-0 mt-0.5`} />
                  <p className="text-sm text-gray-700">{insight.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Recent Tests</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-sm text-gray-600">Subject</th>
                <th className="px-6 py-3 text-left text-sm text-gray-600">Test Title</th>
                <th className="px-6 py-3 text-left text-sm text-gray-600">Date</th>
                <th className="px-6 py-3 text-left text-sm text-gray-600">Score</th>
                <th className="px-6 py-3 text-left text-sm text-gray-600">Duration</th>
                <th className="px-6 py-3 text-left text-sm text-gray-600">Topics</th>
                <th className="px-6 py-3 text-left text-sm text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {tests.map((test) => {
                const percentage = (test.score / test.totalMarks) * 100;
                return (
                  <tr key={test.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm">{test.subject}</td>
                    <td className="px-6 py-4 text-sm">{test.title}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(test.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          percentage >= 90 ? 'bg-green-100 text-green-700' :
                          percentage >= 75 ? 'bg-blue-100 text-blue-700' :
                          percentage >= 60 ? 'bg-orange-100 text-orange-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {test.score}/{test.totalMarks} ({percentage.toFixed(0)}%)
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{test.duration}</td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex flex-wrap gap-1">
                        {test.topics.map((topic, idx) => (
                          <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                            {topic}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <button
                        onClick={() => deleteTest(test.id)}
                        className="text-red-600 hover:text-red-700 p-2 hover:bg-red-50 rounded transition-colors"
                        title="Delete test"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
