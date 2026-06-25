import { useState, useEffect } from 'react';
import { BookOpen, Plus, ChevronDown, ChevronRight, FileText, CheckCircle, Circle, Loader2, Trash2 } from 'lucide-react';
import { apiClient } from '../../lib/supabase';

interface Chapter {
  id: string;
  title: string;
  completed: boolean;
  notes: string;
}

interface Course {
  id: string;
  name: string;
  color: string;
  progress: number;
  chapters: Chapter[];
  totalHours: number;
}

const INITIAL_COURSES: Course[] = [
  {
    id: '1',
    name: 'Advanced Mathematics',
    color: 'bg-blue-500',
    progress: 75,
    totalHours: 48,
    chapters: [
      { id: '1', title: 'Calculus I - Limits and Continuity', completed: true, notes: 'Review epsilon-delta definition' },
      { id: '2', title: 'Calculus I - Derivatives', completed: true, notes: 'Practice chain rule problems' },
      { id: '3', title: 'Calculus II - Integration', completed: false, notes: '' },
      { id: '4', title: 'Linear Algebra - Matrices', completed: false, notes: '' },
    ],
  },
  {
    id: '2',
    name: 'Physics',
    color: 'bg-purple-500',
    progress: 60,
    totalHours: 36,
    chapters: [
      { id: '1', title: 'Mechanics - Newton\'s Laws', completed: true, notes: 'F=ma applications' },
      { id: '2', title: 'Mechanics - Energy and Work', completed: true, notes: '' },
      { id: '3', title: 'Thermodynamics - Heat Transfer', completed: false, notes: '' },
      { id: '4', title: 'Electromagnetism - Electric Fields', completed: false, notes: '' },
    ],
  },
  {
    id: '3',
    name: 'Computer Science',
    color: 'bg-green-500',
    progress: 85,
    totalHours: 52,
    chapters: [
      { id: '1', title: 'Data Structures - Arrays and Lists', completed: true, notes: 'Big O notation mastered' },
      { id: '2', title: 'Data Structures - Trees and Graphs', completed: true, notes: '' },
      { id: '3', title: 'Algorithms - Sorting', completed: true, notes: 'Quick sort, merge sort' },
      { id: '4', title: 'Algorithms - Dynamic Programming', completed: false, notes: '' },
    ],
  },
  {
    id: '4',
    name: 'English Literature',
    color: 'bg-orange-500',
    progress: 50,
    totalHours: 28,
    chapters: [
      { id: '1', title: 'Shakespeare - Hamlet', completed: true, notes: 'Character analysis complete' },
      { id: '2', title: 'Modern Poetry - T.S. Eliot', completed: false, notes: '' },
      { id: '3', title: 'American Literature - Fitzgerald', completed: false, notes: '' },
      { id: '4', title: 'Critical Analysis Techniques', completed: false, notes: '' },
    ],
  },
];

export default function CourseManagement() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);
  const [editingNote, setEditingNote] = useState<{ courseId: string; chapterId: string } | null>(null);
  const [noteText, setNoteText] = useState('');
  const [showAddCourse, setShowAddCourse] = useState(false);
  const [newCourseName, setNewCourseName] = useState('');
  const [newCourseColor, setNewCourseColor] = useState('bg-blue-500');

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/courses');

      if (response.courses && response.courses.length > 0) {
        setCourses(response.courses);
      } else {
        await seedInitialCourses();
      }
    } catch (error) {
      console.error('Error loading courses:', error);
      setCourses(INITIAL_COURSES);
    } finally {
      setLoading(false);
    }
  };

  const seedInitialCourses = async () => {
    try {
      for (const course of INITIAL_COURSES) {
        await apiClient.post('/courses', course);
      }
      setCourses(INITIAL_COURSES);
    } catch (error) {
      console.error('Error seeding courses:', error);
      setCourses(INITIAL_COURSES);
    }
  };

  const updateCourse = async (updatedCourse: Course) => {
    try {
      await apiClient.put(`/courses/${updatedCourse.id}`, updatedCourse);
      setCourses(courses.map(c => c.id === updatedCourse.id ? updatedCourse : c));
    } catch (error) {
      console.error('Error updating course:', error);
    }
  };

  const toggleCourse = (courseId: string) => {
    setExpandedCourse(expandedCourse === courseId ? null : courseId);
  };

  const toggleChapter = (courseId: string, chapterId: string) => {
    const course = courses.find(c => c.id === courseId);
    if (!course) return;

    const updatedCourse = {
      ...course,
      chapters: course.chapters.map(chapter =>
        chapter.id === chapterId ? { ...chapter, completed: !chapter.completed } : chapter
      ),
    };

    const completedCount = updatedCourse.chapters.filter(c => c.completed).length;
    updatedCourse.progress = Math.round((completedCount / updatedCourse.chapters.length) * 100);

    updateCourse(updatedCourse);
  };

  const saveNote = (courseId: string, chapterId: string) => {
    const course = courses.find(c => c.id === courseId);
    if (!course) return;

    const updatedCourse = {
      ...course,
      chapters: course.chapters.map(chapter =>
        chapter.id === chapterId ? { ...chapter, notes: noteText } : chapter
      ),
    };

    updateCourse(updatedCourse);
    setEditingNote(null);
    setNoteText('');
  };

  const startEditingNote = (courseId: string, chapterId: string, currentNote: string) => {
    setEditingNote({ courseId, chapterId });
    setNoteText(currentNote);
  };

  const addNewCourse = async () => {
    if (!newCourseName.trim()) return;

    const newCourse: Course = {
      id: Date.now().toString(),
      name: newCourseName,
      color: newCourseColor,
      progress: 0,
      totalHours: 0,
      chapters: [
        { id: '1', title: 'Introduction', completed: false, notes: '' },
      ],
    };

    try {
      await apiClient.post('/courses', newCourse);
      setCourses([...courses, newCourse]);
      setNewCourseName('');
      setNewCourseColor('bg-blue-500');
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
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
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

  return (
    <div className="p-6 space-y-6">
      {showAddCourse && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Course</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Course Name</label>
                <input
                  type="text"
                  value={newCourseName}
                  onChange={(e) => setNewCourseName(e.target.value)}
                  placeholder="e.g., Advanced Mathematics"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                  className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
                >
                  Add Course
                </button>
                <button
                  onClick={() => {
                    setShowAddCourse(false);
                    setNewCourseName('');
                    setNewCourseColor('bg-blue-500');
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
          <h1 className="text-2xl font-semibold text-gray-900 mb-1">Course Management</h1>
          <p className="text-sm text-gray-500">Track your subjects, chapters, and study notes</p>
        </div>
        <button
          onClick={() => setShowAddCourse(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Add Course
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {courses.map((course) => (
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
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Progress</span>
                <span className="font-medium">{course.progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`${course.color} h-2 rounded-full transition-all`}
                  style={{ width: `${course.progress}%` }}
                ></div>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>{course.chapters.filter(c => c.completed).length}/{course.chapters.length} chapters</span>
                <span>{course.totalHours}h studied</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Course Details & Chapters</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {courses.map((course) => (
            <div key={course.id}>
              <button
                onClick={() => toggleCourse(course.id)}
                className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className={`${course.color} w-10 h-10 rounded-lg flex items-center justify-center`}>
                    <BookOpen className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-sm font-medium text-gray-900">{course.name}</h3>
                    <p className="text-xs text-gray-500">
                      {course.chapters.filter(c => c.completed).length} of {course.chapters.length} chapters completed
                    </p>
                  </div>
                </div>
                {expandedCourse === course.id ? (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                )}
              </button>

              {expandedCourse === course.id && (
                <div className="px-6 pb-6 space-y-3 bg-gray-50">
                  {course.chapters.map((chapter) => (
                    <div key={chapter.id} className="bg-white rounded-lg p-4 border border-gray-200">
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => toggleChapter(course.id, chapter.id)}
                          className="mt-1"
                        >
                          {chapter.completed ? (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          ) : (
                            <Circle className="w-5 h-5 text-gray-300" />
                          )}
                        </button>
                        <div className="flex-1">
                          <p className={`mb-2 ${chapter.completed ? 'line-through text-gray-500' : ''}`}>
                            {chapter.title}
                          </p>
                          {editingNote?.courseId === course.id && editingNote?.chapterId === chapter.id ? (
                            <div className="space-y-2">
                              <textarea
                                value={noteText}
                                onChange={(e) => setNoteText(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                rows={2}
                                placeholder="Add notes..."
                              />
                              <div className="flex gap-2">
                                <button
                                  onClick={() => saveNote(course.id, chapter.id)}
                                  className="px-3 py-1 bg-emerald-600 text-white rounded text-sm hover:bg-emerald-700 font-medium"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => setEditingNote(null)}
                                  className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              {chapter.notes && (
                                <div className="flex items-start gap-2 text-sm text-gray-600 bg-blue-50 p-2 rounded">
                                  <FileText className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                  <p>{chapter.notes}</p>
                                </div>
                              )}
                              <button
                                onClick={() => startEditingNote(course.id, chapter.id, chapter.notes)}
                                className="text-sm text-emerald-600 hover:text-emerald-700 mt-2 font-medium"
                              >
                                {chapter.notes ? 'Edit note' : 'Add note'}
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
