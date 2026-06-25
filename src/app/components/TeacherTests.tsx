import { useState, useEffect } from 'react';
import { ClipboardList, Plus, Calendar, Clock, Award, Loader2, Trash2, Users, Upload, FileText, X } from 'lucide-react';
import { apiClient } from '../../lib/supabase';
import { User } from '../../types/user';
import { Test } from '../../types/test';

interface TeacherTestsProps {
  user: User;
}

export default function TeacherTests({ user }: TeacherTestsProps) {
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddTest, setShowAddTest] = useState(false);
  const [courses, setCourses] = useState<{ id: string; name: string }[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');

  const [newTest, setNewTest] = useState({
    subject: '',
    title: '',
    date: '',
    totalMarks: '',
    duration: '',
    topics: '',
  });

  const [testFiles, setTestFiles] = useState<File[]>([]);

  useEffect(() => {
    loadTests();
    loadMyCourses();
  }, []);


  const loadMyCourses = async () => {
    try {
      const response = await apiClient.get('/courses');
      const allCourses = response.courses || [];
      const myCourses = allCourses.filter((c: any) => c.teacherId === user.id);
      setCourses(myCourses.map((c: any) => ({ id: c.id, name: c.name })));
      if (!selectedCourseId && myCourses.length > 0) {
        setSelectedCourseId(myCourses[0].id);
      }
    } catch (error) {
      console.error('Error loading courses:', error);
    }
  };

  const loadTests = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/tests');
      const allTests = response.tests || [];
      const myTests = allTests.filter((t: Test) => t.teacherId === user.id);
      setTests(myTests);
    } catch (error) {
      console.error('Error loading tests:', error);
    } finally {
      setLoading(false);
    }
  };


  const addNewTest = async () => {
    if (!newTest.subject.trim() || !newTest.title.trim()) return;

    const attachments = testFiles.map(file => ({
      fileName: file.name,
      fileSize: file.size,
      uploadedAt: new Date().toISOString(),
    }));

    if (!selectedCourseId) {
      alert('Please select a course before creating a test');
      return;
    }

    const test: Test = {
      id: Date.now().toString(),
      subject: newTest.subject,
      title: newTest.title,
      date: newTest.date || new Date().toISOString(),
      totalMarks: parseInt(newTest.totalMarks) || 100,
      duration: newTest.duration || '1 hour',
      topics: newTest.topics.split(',').map(t => t.trim()).filter(t => t),
      teacherId: user.id,
      teacherName: user.user_metadata.name,
      courseId: selectedCourseId,
      createdAt: new Date().toISOString(),
      attachments: attachments.length > 0 ? attachments : undefined,
    };


    try {
      await apiClient.post('/tests', test);
      setTests([...tests, test]);
      setNewTest({ subject: '', title: '', date: '', totalMarks: '', duration: '', topics: '' });
      setTestFiles([]);
      setShowAddTest(false);
    } catch (error) {
      console.error('Error adding test:', error);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setTestFiles([...testFiles, ...files]);
  };

  const removeFile = (index: number) => {
    setTestFiles(testFiles.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const deleteTest = async (testId: string) => {
    if (!confirm('Are you sure you want to delete this test?')) return;

    try {
      await apiClient.delete(`/tests/${testId}`);
      setTests(tests.filter(t => t.id !== testId));
    } catch (error) {
      console.error('Error deleting test:', error);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  const stats = [
    { label: 'Total Tests', value: tests.length.toString(), icon: ClipboardList, color: 'bg-blue-500' },
    { label: 'Upcoming', value: tests.filter(t => new Date(t.date) > new Date()).length.toString(), icon: Calendar, color: 'bg-green-500' },
    { label: 'Total Marks', value: tests.reduce((sum, t) => sum + t.totalMarks, 0).toString(), icon: Award, color: 'bg-purple-500' },
    { label: 'Active', value: tests.length.toString(), icon: Users, color: 'bg-orange-500' },
  ];

  return (
    <div className="p-6 space-y-6">
      {showAddTest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Test</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Course</label>
                <select
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {courses.length === 0 ? (
                    <option value="">No courses available</option>
                  ) : (
                    courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))
                  )}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                <input
                  type="text"
                  value={newTest.subject}
                  onChange={(e) => setNewTest({ ...newTest, subject: e.target.value })}
                  placeholder="e.g., Mathematics"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Test Title</label>
                <input
                  type="text"
                  value={newTest.title}
                  onChange={(e) => setNewTest({ ...newTest, title: e.target.value })}
                  placeholder="e.g., Midterm Exam"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                  <input
                    type="date"
                    value={newTest.date}
                    onChange={(e) => setNewTest({ ...newTest, date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Duration</label>
                  <input
                    type="text"
                    value={newTest.duration}
                    onChange={(e) => setNewTest({ ...newTest, duration: e.target.value })}
                    placeholder="e.g., 2 hours"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Total Marks</label>
                <input
                  type="number"
                  value={newTest.totalMarks}
                  onChange={(e) => setNewTest({ ...newTest, totalMarks: e.target.value })}
                  placeholder="e.g., 100"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Topics (comma-separated)</label>
                <input
                  type="text"
                  value={newTest.topics}
                  onChange={(e) => setNewTest({ ...newTest, topics: e.target.value })}
                  placeholder="e.g., Calculus, Algebra, Geometry"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Attach Files (Optional)</label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                  <Upload className="w-6 h-6 mx-auto text-gray-400 mb-2" />
                  <input
                    type="file"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="test-file-upload"
                    accept=".pdf,.doc,.docx,.txt"
                    multiple
                  />
                  <label
                    htmlFor="test-file-upload"
                    className="cursor-pointer text-sm text-purple-600 hover:text-purple-700 font-medium"
                  >
                    Click to upload test files
                  </label>
                  <p className="text-xs text-gray-500 mt-1">PDF, DOC, DOCX, TXT</p>
                </div>
                {testFiles.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {testFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-200">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <FileText className="w-4 h-4 text-gray-500 flex-shrink-0" />
                          <span className="text-sm text-gray-700 truncate">{file.name}</span>
                          <span className="text-xs text-gray-500 flex-shrink-0">({formatFileSize(file.size)})</span>
                        </div>
                        <button
                          onClick={() => removeFile(index)}
                          className="text-red-600 hover:text-red-700 p-1"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={addNewTest}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
                >
                  Create Test
                </button>
                <button
                  onClick={() => {
                    setShowAddTest(false);
                    setNewTest({ subject: '', title: '', date: '', totalMarks: '', duration: '', topics: '' });
                    setTestFiles([]);
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

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-1">My Tests</h1>
          <p className="text-sm text-gray-500">Create and manage tests for your students</p>
        </div>
        <button
          onClick={() => setShowAddTest(true)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Create Test
        </button>
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

      {tests.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <ClipboardList className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-600">No tests created yet. Click "Create Test" to start!</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">All Tests</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Test</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Subject</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Course</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Duration</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Marks</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Attachments</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Actions</th>

                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {tests.map((test) => (
                  <tr key={test.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{test.title}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{test.subject}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {courses.find(c => c.id === test.courseId)?.name || test.courseId}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{new Date(test.date).toLocaleDateString()}</td>

                    <td className="px-6 py-4 text-sm text-gray-600">{test.duration}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{test.totalMarks}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {test.attachments && test.attachments.length > 0 ? (
                        <span className="flex items-center gap-1">
                          <FileText className="w-4 h-4" />
                          {test.attachments.length} file{test.attachments.length > 1 ? 's' : ''}
                        </span>
                      ) : (
                        <span className="text-gray-400">No files</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <button
                        onClick={() => deleteTest(test.id)}
                        className="text-red-600 hover:text-red-700 font-medium"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
