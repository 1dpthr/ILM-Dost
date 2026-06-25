import { useState, useEffect } from 'react';
import { BookOpen, ClipboardList, Users, Plus, TrendingUp, FileText, Calendar } from 'lucide-react';
import { User } from '../../types/user';

interface TeacherDashboardProps {
  user: User;
}

interface StudentProgress {
  id: string;
  name: string;
  course: string;
  progress: number;
  lastActive: string;
  averageScore: number;
}

export default function TeacherDashboard({ user }: TeacherDashboardProps) {
  const [myCourses, setMyCourses] = useState([
    { id: '1', name: 'Advanced Mathematics', students: 32, progress: 65, color: 'bg-blue-500' },
    { id: '2', name: 'Physics 101', students: 28, progress: 72, color: 'bg-purple-500' },
    { id: '3', name: 'Computer Science', students: 24, progress: 58, color: 'bg-green-500' },
  ]);

  const [studentsProgress, setStudentsProgress] = useState<StudentProgress[]>([
    { id: '1', name: 'Ahmed Khan', course: 'Advanced Mathematics', progress: 75, lastActive: '2 hours ago', averageScore: 85 },
    { id: '2', name: 'Fatima Ali', course: 'Physics 101', progress: 82, lastActive: '1 day ago', averageScore: 92 },
    { id: '3', name: 'Hassan Raza', course: 'Computer Science', progress: 68, lastActive: '3 hours ago', averageScore: 78 },
    { id: '4', name: 'Ayesha Malik', course: 'Advanced Mathematics', progress: 90, lastActive: '30 mins ago', averageScore: 88 },
  ]);

  const [upcomingClasses, setUpcomingClasses] = useState([
    { id: '1', course: 'Advanced Mathematics', topic: 'Calculus - Integration', time: '09:00 AM', date: 'May 13' },
    { id: '2', course: 'Physics 101', topic: 'Thermodynamics', time: '11:00 AM', date: 'May 13' },
    { id: '3', course: 'Computer Science', topic: 'Data Structures', time: '02:00 PM', date: 'May 14' },
  ]);

  const teacherStats = [
    { label: 'My Courses', value: myCourses.length.toString(), icon: BookOpen, color: 'bg-blue-500' },
    { label: 'Total Students', value: myCourses.reduce((sum, c) => sum + c.students, 0).toString(), icon: Users, color: 'bg-green-500' },
    { label: 'Tests Created', value: '18', icon: ClipboardList, color: 'bg-purple-500' },
    { label: 'Avg. Performance', value: '82%', icon: TrendingUp, color: 'bg-orange-500' },
  ];

  const teacherName = user?.user_metadata?.name?.split(' ')[0] || 'Teacher';

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-1">Teacher Dashboard</h1>
          <p className="text-sm text-gray-500">Welcome back, {teacherName}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">Today</p>
          <p className="text-sm font-medium text-gray-900">Tuesday, May 12, 2026</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {teacherStats.map((stat, index) => (
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">My Courses</h2>
              <button className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium">
                <Plus className="w-4 h-4" />
                New Course
              </button>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              {myCourses.map((course) => (
                <div key={course.id} className="bg-white rounded-lg border border-gray-200 p-4">
                  <div className={`${course.color} w-10 h-10 rounded-lg flex items-center justify-center mb-3`}>
                    <BookOpen className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-sm font-medium text-gray-900 mb-2">{course.name}</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">{course.students} students</span>
                      <span className="font-medium">{course.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`${course.color} h-2 rounded-full transition-all`}
                        style={{ width: `${course.progress}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Student Progress</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Student</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Course</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Progress</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Avg. Score</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Last Active</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {studentsProgress.map((student) => (
                    <tr key={student.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{student.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{student.course}</td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-emerald-500 h-2 rounded-full"
                              style={{ width: `${student.progress}%` }}
                            ></div>
                          </div>
                          <span className="text-gray-600">{student.progress}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          student.averageScore >= 90 ? 'bg-green-100 text-green-700' :
                          student.averageScore >= 75 ? 'bg-blue-100 text-blue-700' :
                          'bg-orange-100 text-orange-700'
                        }`}>
                          {student.averageScore}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{student.lastActive}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wide">Quick Actions</h3>
            <div className="space-y-3">
              <button className="w-full text-left px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg hover:border-emerald-300 hover:bg-emerald-50 transition-colors">
                <div className="flex items-center gap-3">
                  <ClipboardList className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm font-medium">Create Test</span>
                </div>
              </button>
              <button className="w-full text-left px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg hover:border-emerald-300 hover:bg-emerald-50 transition-colors">
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm font-medium">Create Assignment</span>
                </div>
              </button>
              <button className="w-full text-left px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg hover:border-emerald-300 hover:bg-emerald-50 transition-colors">
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm font-medium">Schedule Class</span>
                </div>
              </button>
              <button className="w-full text-left px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg hover:border-emerald-300 hover:bg-emerald-50 transition-colors">
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm font-medium">View Analytics</span>
                </div>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wide">Upcoming Classes</h3>
            <div className="space-y-3">
              {upcomingClasses.map((classItem) => (
                <div key={classItem.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm font-medium text-gray-900">{classItem.course}</p>
                  <p className="text-xs text-gray-600 mt-1">{classItem.topic}</p>
                  <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                    <Calendar className="w-3 h-3" />
                    <span>{classItem.date} at {classItem.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
