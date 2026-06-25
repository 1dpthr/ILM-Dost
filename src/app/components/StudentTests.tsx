import { useState, useEffect } from 'react';
import { ClipboardList, Calendar, Clock, Award, TrendingUp, Loader2, BookOpen, Download, FileText, Upload, CheckCircle } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { apiClient } from '../../lib/supabase';
import { User } from '../../types/user';
import { Test, TestAttempt } from '../../types/test';
import { TestSubmission } from '../../types/submission';
import { localStorageDB } from '../../lib/localStorage';

interface StudentTestsProps {
  user: User;
}

export default function StudentTests({ user }: StudentTestsProps) {
  const [availableTests, setAvailableTests] = useState<Test[]>([]);
  const [myAttempts, setMyAttempts] = useState<TestAttempt[]>([]);
  const [testSubmissions, setTestSubmissions] = useState<TestSubmission[]>([]);
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [selectedTest, setSelectedTest] = useState<Test | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);


  useEffect(() => {
    loadData();
    loadSubmissions();
  }, []);


  const loadData = async () => {
    try {
      setLoading(true);

      // Load enrolled course ids for this student
      const enrollRes = await apiClient.get(`/enrollments/${user.id}`);
      const myEnrollments = enrollRes.enrollments || [];
      const courseIds = myEnrollments.map((e: any) => e.courseId).filter((id: any) => !!id);
      setEnrolledCourseIds(courseIds);

      const response = await apiClient.get('/tests');
      const allTests = response.tests || [];

      // attempts are stored inside `tests` table currently in this demo app
      const attempts = allTests.filter((t: any) => t.studentId === user.id && t.attemptedAt);

      // available online + handwritten submissions are course-scoped
      const available = allTests.filter((t: any) => {
        const isAvailableTest = !t.studentId && t.teacherId;
        const inMyCourse = courseIds.includes(t.courseId);
        return isAvailableTest && inMyCourse;
      });

      setMyAttempts(attempts);
      setAvailableTests(available);
    } catch (error) {
      console.error('Error loading tests:', error);
    } finally {
      setLoading(false);
    }
  };


  const attemptTest = async (test: Test) => {
    const attempt: TestAttempt = {
      id: Date.now().toString(),
      testId: test.id,
      studentId: user.id,
      studentName: user.user_metadata.name,
      attemptedAt: new Date().toISOString(),
      score: Math.floor(Math.random() * 30) + 70,
      totalMarks: test.totalMarks,
      answers: {},
      completed: true,
    };

    try {
      await apiClient.post('/tests', attempt);
      await loadData();
    } catch (error) {
      console.error('Error attempting test:', error);
    }
  };

  const loadSubmissions = () => {
    try {
      const allSubmissions = localStorageDB.getAll('test_submission_');
      const mySubmissions = allSubmissions.filter((s: TestSubmission) => s.studentId === user.id);
      setTestSubmissions(mySubmissions);
    } catch (error) {
      console.error('Error loading test submissions:', error);
    }
  };


  const downloadAttachment = (fileName: string) => {
    alert(`Downloading: ${fileName}\n\nIn a real application, this would download the test file.`);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const startTestSubmission = (test: Test) => {
    setSelectedTest(test);
    setShowSubmitModal(true);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadFile(file);
    }
  };

  const submitTest = () => {
    if (!uploadFile || !selectedTest) return;

    setUploadProgress(0);
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 10;
      });
    }, 100);

    setTimeout(() => {
      const submission: TestSubmission = {
        id: Date.now().toString(),
        testId: selectedTest.id,
        studentId: user.id,
        studentName: user.user_metadata.name,
        submittedAt: new Date().toISOString(),
        fileName: uploadFile.name,
        fileSize: uploadFile.size,
      };

      localStorageDB.set(`test_submission_${submission.id}`, submission);
      setTestSubmissions([...testSubmissions, submission]);
      setShowSubmitModal(false);
      setSelectedTest(null);
      setUploadFile(null);
      setUploadProgress(0);
    }, 1200);
  };

  const hasSubmittedTest = (testId: string) => {
    return testSubmissions.some(s => s.testId === testId);
  };

  const getTestSubmission = (testId: string) => {
    return testSubmissions.find(s => s.testId === testId);
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const avgScore = myAttempts.length > 0
    ? Math.round(myAttempts.reduce((sum, a) => sum + (a.score / a.totalMarks * 100), 0) / myAttempts.length)
    : 0;

  const performanceTrend = myAttempts.slice(-6).map((attempt, index) => ({
    test: `Test ${index + 1}`,
    score: Math.round((attempt.score / attempt.totalMarks) * 100),
  }));

  const subjectPerformance = Object.entries(
    myAttempts.reduce((acc: any, attempt: any) => {
      const subject = attempt.subject || 'General';
      if (!acc[subject]) acc[subject] = { total: 0, count: 0 };
      acc[subject].total += (attempt.score / attempt.totalMarks) * 100;
      acc[subject].count += 1;
      return acc;
    }, {})
  ).map(([subject, data]: [string, any]) => ({
    subject,
    average: Math.round(data.total / data.count),
  }));

  const skillsData = [
    { skill: 'Problem Solving', score: avgScore + Math.floor(Math.random() * 10 - 5) },
    { skill: 'Critical Thinking', score: avgScore + Math.floor(Math.random() * 10 - 5) },
    { skill: 'Time Management', score: avgScore + Math.floor(Math.random() * 10 - 5) },
    { skill: 'Accuracy', score: avgScore + Math.floor(Math.random() * 10 - 5) },
    { skill: 'Comprehension', score: avgScore + Math.floor(Math.random() * 10 - 5) },
  ];

  const stats = [
    { label: 'Tests Attempted', value: myAttempts.length.toString(), icon: ClipboardList, color: 'bg-blue-500' },
    { label: 'Average Score', value: `${avgScore}%`, icon: Award, color: 'bg-green-500' },
    { label: 'Best Score', value: myAttempts.length > 0 ? `${Math.round(Math.max(...myAttempts.map(a => a.score / a.totalMarks * 100)))}%` : '0%', icon: TrendingUp, color: 'bg-purple-500' },
    { label: 'Available Tests', value: availableTests.length.toString(), icon: BookOpen, color: 'bg-orange-500' },
  ];

  return (
    <div className="p-6 space-y-6">
      {showSubmitModal && selectedTest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Submit Test</h3>
            <p className="text-sm text-gray-600 mb-4">{selectedTest.title} - {selectedTest.subject}</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Upload Your Completed Test</label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                  <input
                    type="file"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="test-upload"
                    accept=".pdf,.jpg,.png,.doc,.docx"
                  />
                  <label
                    htmlFor="test-upload"
                    className="cursor-pointer text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                  >
                    Click to upload
                  </label>
                  <p className="text-xs text-gray-500 mt-1">PDF, Images, DOC, DOCX</p>
                  {uploadFile && (
                    <p className="text-xs text-gray-600 mt-2">{uploadFile.name} ({formatFileSize(uploadFile.size)})</p>
                  )}
                </div>
              </div>
              {uploadProgress > 0 && uploadProgress < 100 && (
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-emerald-600 h-2 rounded-full transition-all"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={submitTest}
                  disabled={!uploadFile || (uploadProgress > 0 && uploadProgress < 100)}
                  className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium disabled:opacity-50"
                >
                  Submit
                </button>
                <button
                  onClick={() => {
                    setShowSubmitModal(false);
                    setSelectedTest(null);
                    setUploadFile(null);
                    setUploadProgress(0);
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-1">Tests & Analytics</h1>
        <p className="text-sm text-gray-500">Attempt tests and track your performance</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className={`${stat.color} w-10 h-10 rounded-lg flex items-center justify-center`}>
                <stat.icon className="w-5 h-5 text-white" />
              </div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{stat.label}</p>
            </div>
            <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
          </div>
        ))}
      </div>

      {availableTests.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Available Tests</h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableTests.map((test) => (
              <div key={test.id} className="bg-gray-50 rounded-lg border border-gray-200 p-5">

                <h3 className="text-sm font-medium text-gray-900 mb-2">{test.title}</h3>
                <div className="space-y-2 text-xs text-gray-600 mb-4">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    <span>{test.subject}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>{new Date(test.date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>{test.duration}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4" />
                    <span>{test.totalMarks} marks</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">By {test.teacherName}</p>
                </div>
                {test.attachments && test.attachments.length > 0 && (
                  <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-xs font-medium text-blue-900 mb-2 flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      Test Materials ({test.attachments.length})
                    </p>
                    <div className="space-y-1">
                      {test.attachments.map((attachment, index) => (
                        <button
                          key={index}
                          onClick={() => downloadAttachment(attachment.fileName)}
                          className="w-full flex items-center justify-between p-2 bg-white rounded hover:bg-blue-50 transition-colors text-left border border-blue-100"
                        >
                          <span className="text-xs text-gray-700 truncate flex-1">{attachment.fileName}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">{formatFileSize(attachment.fileSize)}</span>
                            <Download className="w-3 h-3 text-blue-600" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {hasSubmittedTest(test.id) ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg border border-green-200 text-sm font-medium">
                      <CheckCircle className="w-4 h-4" />
                      Test Submitted
                    </div>
                    {getTestSubmission(test.id)?.grade && (
                      <div className="text-center text-sm">
                        <span className="font-medium">Grade: </span>
                        <span className="text-emerald-600">{getTestSubmission(test.id)?.grade}%</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <button
                      onClick={() => attemptTest(test)}
                      className="w-full px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium"
                    >
                      Attempt Online
                    </button>
                    <button
                      onClick={() => startTestSubmission(test)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                      <Upload className="w-4 h-4" />
                      Upload Handwritten
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {myAttempts.length > 0 && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wide">Performance Trend</h2>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={performanceTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="test" tick={{ fontSize: 12 }} stroke="#888" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#888" domain={[0, 100]} />
                  <Tooltip />
                  <Line type="monotone" dataKey="score" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981', r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wide">Subject Performance</h2>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={subjectPerformance}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="subject" tick={{ fontSize: 12 }} stroke="#888" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#888" domain={[0, 100]} />
                  <Tooltip />
                  <Bar dataKey="average" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Recent Test Attempts</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Test</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Subject</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {myAttempts.slice(-10).reverse().map((attempt: any) => {
                      const percentage = Math.round((attempt.score / attempt.totalMarks) * 100);
                      return (
                        <tr key={attempt.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">{attempt.title || 'Test'}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">{attempt.subject || 'General'}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">{new Date(attempt.attemptedAt).toLocaleDateString()}</td>
                          <td className="px-6 py-4 text-sm">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              percentage >= 90 ? 'bg-green-100 text-green-700' :
                              percentage >= 75 ? 'bg-blue-100 text-blue-700' :
                              percentage >= 60 ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {percentage}% ({attempt.score}/{attempt.totalMarks})
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wide">Skills Analysis</h2>
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={skillsData}>
                  <PolarGrid stroke="#e5e7eb" />
                  <PolarAngleAxis dataKey="skill" tick={{ fontSize: 11 }} stroke="#888" />
                  <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="#888" />
                  <Radar name="Skills" dataKey="score" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.5} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
