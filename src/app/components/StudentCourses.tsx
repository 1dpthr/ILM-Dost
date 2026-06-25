import { useState, useEffect } from 'react';
import { BookOpen, CheckCircle, Circle, FileText, Loader2, UserPlus } from 'lucide-react';
import { apiClient } from '../../lib/supabase';
import { User } from '../../types/user';

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
  teacherId: string;
  teacherName: string;
  status: string;
}

interface Enrollment {
  id: string;
  courseId: string;
  studentId: string;
  progress: number;
  completedChapters: string[];
  notes: Record<string, string>;
}

interface StudentCoursesProps {
  user: User;
}

export default function StudentCourses({ user }: StudentCoursesProps) {
  const [availableCourses, setAvailableCourses] = useState<Course[]>([]);
  const [enrolledCourses, setEnrolledCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);
  const [editingNote, setEditingNote] = useState<{ courseId: string; chapterId: string } | null>(null);
  const [noteText, setNoteText] = useState('');

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      setLoading(true);
      const [coursesRes, enrollmentsRes] = await Promise.all([
        apiClient.get('/courses/approved'),
        apiClient.get(`/enrollments/${user.id}`),
      ]);

      const approved = coursesRes.courses || [];
      const myEnrollments = enrollmentsRes.enrollments || [];

      setEnrollments(myEnrollments);

      const enrolledIds = myEnrollments.map((e: Enrollment) => e.courseId);
      const enrolled = approved.filter((c: Course) => enrolledIds.includes(c.id));
      const available = approved.filter((c: Course) => !enrolledIds.includes(c.id));

      setEnrolledCourses(enrolled);
      setAvailableCourses(available);
    } catch (error) {
      console.error('Error loading courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const enrollInCourse = async (courseId: string) => {
    try {
      await apiClient.post('/enrollments', {
        courseId,
        studentId: user.id,
        studentName: user.user_metadata.name,
      });
      await loadCourses();
    } catch (error) {
      console.error('Error enrolling:', error);
    }
  };

  const toggleChapter = async (courseId: string, chapterId: string) => {
    const enrollment = enrollments.find(e => e.courseId === courseId);
    if (!enrollment) return;

    const completedChapters = enrollment.completedChapters || [];
    const isCompleted = completedChapters.includes(chapterId);

    const updated = isCompleted
      ? completedChapters.filter(id => id !== chapterId)
      : [...completedChapters, chapterId];

    const course = enrolledCourses.find(c => c.id === courseId);
    const totalChapters = course?.chapters.length || 1;
    const progress = Math.round((updated.length / totalChapters) * 100);

    try {
      await apiClient.put(`/enrollments/${enrollment.id}`, {
        ...enrollment,
        completedChapters: updated,
        progress,
      });
      await loadCourses();
    } catch (error) {
      console.error('Error updating chapter:', error);
    }
  };

  const saveNote = async (courseId: string, chapterId: string) => {
    const enrollment = enrollments.find(e => e.courseId === courseId);
    if (!enrollment) return;

    const updatedNotes = { ...enrollment.notes, [chapterId]: noteText };

    try {
      await apiClient.put(`/enrollments/${enrollment.id}`, {
        ...enrollment,
        notes: updatedNotes,
      });
      setEditingNote(null);
      setNoteText('');
      await loadCourses();
    } catch (error) {
      console.error('Error saving note:', error);
    }
  };

  const startEditingNote = (courseId: string, chapterId: string) => {
    const enrollment = enrollments.find(e => e.courseId === courseId);
    const currentNote = enrollment?.notes?.[chapterId] || '';
    setEditingNote({ courseId, chapterId });
    setNoteText(currentNote);
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-1">My Courses</h1>
        <p className="text-sm text-gray-500">Enroll in courses and track your progress</p>
      </div>

      {availableCourses.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Available Courses</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableCourses.map((course) => (
              <div key={course.id} className="bg-white rounded-lg border border-gray-200 p-5">
                <div className={`${course.color} w-10 h-10 rounded-lg flex items-center justify-center mb-3`}>
                  <BookOpen className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-sm font-medium mb-2 text-gray-900">{course.name}</h3>
                <p className="text-xs text-gray-500 mb-3">By {course.teacherName}</p>
                <button
                  onClick={() => enrollInCourse(course.id)}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium"
                >
                  <UserPlus className="w-4 h-4" />
                  Enroll
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">My Enrolled Courses</h2>
        {enrolledCourses.length === 0 ? (
          <div className="bg-gray-50 rounded-lg p-8 text-center">
            <BookOpen className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-600">No courses enrolled yet. Browse available courses above!</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {enrolledCourses.map((course) => {
                const enrollment = enrollments.find(e => e.courseId === course.id);
                return (
                  <div key={course.id} className="bg-white rounded-lg border border-gray-200 p-5">
                    <div className={`${course.color} w-10 h-10 rounded-lg flex items-center justify-center mb-3`}>
                      <BookOpen className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-sm font-medium mb-2 text-gray-900">{course.name}</h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Progress</span>
                        <span className="font-medium">{enrollment?.progress || 0}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`${course.color} h-2 rounded-full transition-all`}
                          style={{ width: `${enrollment?.progress || 0}%` }}
                        ></div>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>{enrollment?.completedChapters?.length || 0}/{course.chapters.length} chapters</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="bg-white rounded-lg border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Course Details</h3>
              </div>
              <div className="divide-y divide-gray-200">
                {enrolledCourses.map((course) => {
                  const enrollment = enrollments.find(e => e.courseId === course.id);
                  return (
                    <div key={course.id}>
                      <button
                        onClick={() => setExpandedCourse(expandedCourse === course.id ? null : course.id)}
                        className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`${course.color} w-10 h-10 rounded-lg flex items-center justify-center`}>
                            <BookOpen className="w-5 h-5 text-white" />
                          </div>
                          <div className="text-left">
                            <h3 className="text-sm font-medium text-gray-900">{course.name}</h3>
                            <p className="text-xs text-gray-500">
                              {enrollment?.completedChapters?.length || 0} of {course.chapters.length} chapters completed
                            </p>
                          </div>
                        </div>
                      </button>

                      {expandedCourse === course.id && (
                        <div className="px-6 pb-6 space-y-3 bg-gray-50">
                          {course.chapters.map((chapter) => {
                            const isCompleted = enrollment?.completedChapters?.includes(chapter.id);
                            const note = enrollment?.notes?.[chapter.id] || '';
                            return (
                              <div key={chapter.id} className="bg-white rounded-lg p-4 border border-gray-200">
                                <div className="flex items-start gap-3">
                                  <button
                                    onClick={() => toggleChapter(course.id, chapter.id)}
                                    className="mt-1"
                                  >
                                    {isCompleted ? (
                                      <CheckCircle className="w-5 h-5 text-green-500" />
                                    ) : (
                                      <Circle className="w-5 h-5 text-gray-300" />
                                    )}
                                  </button>
                                  <div className="flex-1">
                                    <p className={`mb-2 ${isCompleted ? 'line-through text-gray-500' : ''}`}>
                                      {chapter.title}
                                    </p>
                                    {editingNote?.courseId === course.id && editingNote?.chapterId === chapter.id ? (
                                      <div className="space-y-2">
                                        <textarea
                                          value={noteText}
                                          onChange={(e) => setNoteText(e.target.value)}
                                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
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
                                        {note && (
                                          <div className="flex items-start gap-2 text-sm text-gray-600 bg-blue-50 p-2 rounded">
                                            <FileText className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                            <p>{note}</p>
                                          </div>
                                        )}
                                        <button
                                          onClick={() => startEditingNote(course.id, chapter.id)}
                                          className="text-sm text-emerald-600 hover:text-emerald-700 mt-2 font-medium"
                                        >
                                          {note ? 'Edit note' : 'Add note'}
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
