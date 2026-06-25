import { useState, useEffect } from 'react';
import { BookOpen, Plus, ChevronDown, ChevronRight, Loader2, Trash2, Clock, CheckCircle, XCircle } from 'lucide-react';
import { apiClient } from '../../lib/supabase';
import { User } from '../../types/user';
import { Course } from '../../types/course';

interface TeacherCoursesProps {
  user: User;
}

export default function TeacherCourses({ user }: TeacherCoursesProps) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);
  const [showAddCourse, setShowAddCourse] = useState(false);
  const [newCourseName, setNewCourseName] = useState('');
  const [newCourseColor, setNewCourseColor] = useState('bg-blue-500');
  const [newCourseTotalHours, setNewCourseTotalHours] = useState('');

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/courses');
      const allCourses = response.courses || [];
      const myCourses = allCourses.filter((c: Course) => c.teacherId === user.id);
      setCourses(myCourses);
    } catch (error) {
      console.error('Error loading courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const addNewCourse = async () => {
    if (!newCourseName.trim()) return;

    const newCourse: Course = {
      id: Date.now().toString(),
      name: newCourseName,
      color: newCourseColor,
      progress: 0,
      totalHours: parseInt(newCourseTotalHours) || 0,
      teacherId: user.id,
      teacherName: user.user_metadata.name,
      status: 'pending',
      createdAt: new Date().toISOString(),
      chapters: [
        { id: '1', title: 'Introduction', completed: false, notes: '' },
      ],
    };

    try {
      await apiClient.post('/courses', newCourse);
      setCourses([...courses, newCourse]);
      setNewCourseName('');
      setNewCourseColor('bg-blue-500');
      setNewCourseTotalHours('');
      setShowAddCourse(false);
    } catch (error) {
      console.error('Error adding course:', error);
    }
  };

  const deleteCourse = async (courseId: string) => {
    if (!confirm('Are you sure you want to delete this course?')) return;

    try {
      await apiClient.delete(`/courses/${courseId}`);
      setCourses(courses.filter(c => c.id !== courseId));
    } catch (error) {
      console.error('Error deleting course:', error);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  const colorOptions = [
    { name: 'Blue', class: 'bg-blue-500' },
    { name: 'Green', class: 'bg-green-500' },
    { name: 'Purple', class: 'bg-purple-500' },
    { name: 'Orange', class: 'bg-orange-500' },
    { name: 'Red', class: 'bg-red-500' },
    { name: 'Pink', class: 'bg-pink-500' },
    { name: 'Indigo', class: 'bg-indigo-500' },
    { name: 'Teal', class: 'bg-teal-500' },
  ];

  const getStatusIcon = (status: string) => {
    if (status === 'approved') return <CheckCircle className="w-5 h-5 text-green-500" />;
    if (status === 'rejected') return <XCircle className="w-5 h-5 text-red-500" />;
    return <Clock className="w-5 h-5 text-yellow-500" />;
  };

  const getStatusText = (status: string) => {
    if (status === 'approved') return { text: 'Approved', color: 'text-green-700 bg-green-50' };
    if (status === 'rejected') return { text: 'Rejected', color: 'text-red-700 bg-red-50' };
    return { text: 'Pending Approval', color: 'text-yellow-700 bg-yellow-50' };
  };

  return (
    <div className="p-6 space-y-6">
      {showAddCourse && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Course</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Course Name</label>
                <input
                  type="text"
                  value={newCourseName}
                  onChange={(e) => setNewCourseName(e.target.value)}
                  placeholder="e.g., Advanced Mathematics"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Estimated Total Hours</label>
                <input
                  type="number"
                  value={newCourseTotalHours}
                  onChange={(e) => setNewCourseTotalHours(e.target.value)}
                  placeholder="e.g., 40"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
                <div className="grid grid-cols-4 gap-2">
                  {colorOptions.map((color) => (
                    <button
                      key={color.class}
                      onClick={() => setNewCourseColor(color.class)}
                      className={`${color.class} h-10 rounded-lg border-2 ${
                        newCourseColor === color.class ? 'border-gray-900' : 'border-transparent'
                      }`}
                    />
                  ))}
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={addNewCourse}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
                >
                  Create Course
                </button>
                <button
                  onClick={() => {
                    setShowAddCourse(false);
                    setNewCourseName('');
                    setNewCourseColor('bg-blue-500');
                    setNewCourseTotalHours('');
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
          <h1 className="text-2xl font-semibold text-gray-900 mb-1">My Courses</h1>
          <p className="text-sm text-gray-500">Create and manage your courses (requires admin approval)</p>
        </div>
        <button
          onClick={() => setShowAddCourse(true)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Create Course
        </button>
      </div>

      {courses.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <BookOpen className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-600">No courses created yet. Click "Create Course" to start!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map((course) => {
            const statusInfo = getStatusText(course.status);
            return (
              <div key={course.id} className="bg-white rounded-lg border border-gray-200 p-5 relative group">
                <button
                  onClick={() => deleteCourse(course.id)}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-red-600 hover:text-red-700 p-1 hover:bg-red-50 rounded transition-all"
                  title="Delete course"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <div className={`${course.color} w-10 h-10 rounded-lg flex items-center justify-center mb-3`}>
                  <BookOpen className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-sm font-medium mb-2 text-gray-900">{course.name}</h3>
                <div className="space-y-2">
                  <div className={`flex items-center gap-2 px-2 py-1 rounded text-xs font-medium ${statusInfo.color}`}>
                    {getStatusIcon(course.status)}
                    <span>{statusInfo.text}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{course.chapters.length} chapters</span>
                    <span>{course.totalHours}h estimated</span>
                  </div>
                  {course.status === 'approved' && course.approvedAt && (
                    <p className="text-xs text-gray-500">
                      Approved {new Date(course.approvedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
