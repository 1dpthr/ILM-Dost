import { useState, useEffect } from 'react';
import { Users, BookOpen, ClipboardList, TrendingUp, UserPlus, Settings, Shield, CheckCircle, XCircle, Clock } from 'lucide-react';
import AdminAgentReview from './AdminAgentReview';
import { User } from '../../types/user';
import { Course } from '../../types/course';
import { apiClient } from '../../lib/supabase';

interface AdminDashboardProps {
  user: User;
}

interface SystemStats {
  totalStudents: number;
  totalTeachers: number;
  totalCourses: number;
  totalTests: number;
  activeUsers: number;
}

interface UserData {
  id: string;
  name: string;
  email: string;
  role: string;
  joinDate: string;
  status: 'active' | 'inactive';
}

export default function AdminDashboard({ user }: AdminDashboardProps) {
  const [stats, setStats] = useState<SystemStats>({
    totalStudents: 0,
    totalTeachers: 0,
    totalCourses: 0,
    totalTests: 0,
    activeUsers: 0,
  });

  const [users, setUsers] = useState<UserData[]>([]);
  const [pendingCourses, setPendingCourses] = useState<Course[]>([]);
  const [showAddUser, setShowAddUser] = useState(false);
  const [showEditUser, setShowEditUser] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [showAgentReview, setShowAgentReview] = useState(false);
  const [newUserData, setNewUserData] = useState({
    name: '',
    email: '',
    role: 'student' as 'student' | 'teacher' | 'admin',
  });

  useEffect(() => {
    loadPendingCourses();
    loadUsers();
    loadStats();
  }, []);

  const loadUsers = () => {
    const storedUsers = JSON.parse(localStorage.getItem('ilmdost_users') || '[]');
    const formattedUsers = storedUsers.map((u: any) => ({
      id: u.id,
      name: u.user_metadata.name,
      email: u.email,
      role: u.user_metadata.role,
      joinDate: u.joinDate || new Date().toISOString(),
      status: 'active' as const,
    }));
    setUsers(formattedUsers);
  };

  const loadStats = async () => {
    try {
      const storedUsers = JSON.parse(localStorage.getItem('ilmdost_users') || '[]');
      const coursesRes = await apiClient.get('/courses');
      const testsRes = await apiClient.get('/tests');

      setStats({
        totalStudents: storedUsers.filter((u: any) => u.user_metadata.role === 'student').length,
        totalTeachers: storedUsers.filter((u: any) => u.user_metadata.role === 'teacher').length,
        totalCourses: (coursesRes.courses || []).length,
        totalTests: (testsRes.tests || []).length,
        activeUsers: storedUsers.length,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadPendingCourses = async () => {
    try {
      const response = await apiClient.get('/courses/pending');
      setPendingCourses(response.courses || []);
    } catch (error) {
      console.error('Error loading pending courses:', error);
    }
  };

  const approveCourse = async (courseId: string) => {
    try {
      const course = pendingCourses.find(c => c.id === courseId);
      if (!course) return;

      const updatedCourse = {
        ...course,
        status: 'approved' as const,
        approvedAt: new Date().toISOString(),
        approvedBy: user.id,
      };

      await apiClient.put(`/courses/${courseId}`, updatedCourse);
      setPendingCourses(pendingCourses.filter(c => c.id !== courseId));
      await loadStats();
    } catch (error) {
      console.error('Error approving course:', error);
    }
  };

  const rejectCourse = async (courseId: string) => {
    try {
      const course = pendingCourses.find(c => c.id === courseId);
      if (!course) return;

      const updatedCourse = {
        ...course,
        status: 'rejected' as const,
      };

      await apiClient.put(`/courses/${courseId}`, updatedCourse);
      setPendingCourses(pendingCourses.filter(c => c.id !== courseId));
    } catch (error) {
      console.error('Error rejecting course:', error);
    }
  };

  const addUser = () => {
    if (!newUserData.name.trim() || !newUserData.email.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    const newUser = {
      id: `user-${Date.now()}`,
      email: newUserData.email,
      user_metadata: {
        name: newUserData.name,
        role: newUserData.role,
      },
      joinDate: new Date().toISOString(),
    };

    const storedUsers = JSON.parse(localStorage.getItem('ilmdost_users') || '[]');
    storedUsers.push(newUser);
    localStorage.setItem('ilmdost_users', JSON.stringify(storedUsers));

    setNewUserData({ name: '', email: '', role: 'student' });
    setShowAddUser(false);
    loadUsers();
    loadStats();
  };

  const startEditUser = (userData: UserData) => {
    setEditingUser(userData);
    setShowEditUser(true);
  };

  const updateUser = () => {
    if (!editingUser) return;

    const storedUsers = JSON.parse(localStorage.getItem('ilmdost_users') || '[]');
    const updatedUsers = storedUsers.map((u: any) =>
      u.id === editingUser.id
        ? {
            ...u,
            user_metadata: {
              name: editingUser.name,
              role: editingUser.role,
            },
            email: editingUser.email,
          }
        : u
    );

    localStorage.setItem('ilmdost_users', JSON.stringify(updatedUsers));
    setShowEditUser(false);
    setEditingUser(null);
    loadUsers();
    loadStats();
  };

  const deleteUser = (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    const storedUsers = JSON.parse(localStorage.getItem('ilmdost_users') || '[]');
    const updatedUsers = storedUsers.filter((u: any) => u.id !== userId);
    localStorage.setItem('ilmdost_users', JSON.stringify(updatedUsers));
    loadUsers();
    loadStats();
  };

  const adminStats = [
    { label: 'Total Students', value: stats.totalStudents.toString(), icon: Users, color: 'bg-blue-500' },
    { label: 'Total Teachers', value: stats.totalTeachers.toString(), icon: Shield, color: 'bg-purple-500' },
    { label: 'Total Courses', value: stats.totalCourses.toString(), icon: BookOpen, color: 'bg-green-500' },
    { label: 'Total Tests', value: stats.totalTests.toString(), icon: ClipboardList, color: 'bg-orange-500' },
  ];

  const adminName = user?.user_metadata?.name?.split(' ')[0] || 'Admin';

  return (
    <div className="p-6 space-y-6">
      {showAddUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New User</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                <input
                  type="text"
                  value={newUserData.name}
                  onChange={(e) => setNewUserData({ ...newUserData, name: e.target.value })}
                  placeholder="e.g., John Doe"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  value={newUserData.email}
                  onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                  placeholder="e.g., john@example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                <select
                  value={newUserData.role}
                  onChange={(e) => setNewUserData({ ...newUserData, role: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="student">Student</option>
                  <option value="teacher">Teacher</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={addUser}
                  className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
                >
                  Add User
                </button>
                <button
                  onClick={() => {
                    setShowAddUser(false);
                    setNewUserData({ name: '', email: '', role: 'student' });
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

      {showEditUser && editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit User</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                <input
                  type="text"
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  value={editingUser.email}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                <select
                  value={editingUser.role}
                  onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="student">Student</option>
                  <option value="teacher">Teacher</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={updateUser}
                  className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
                >
                  Update User
                </button>
                <button
                  onClick={() => {
                    setShowEditUser(false);
                    setEditingUser(null);
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

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-1">Admin Dashboard</h1>
          <p className="text-sm text-gray-500">Welcome back, {adminName}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">Today</p>
          <p className="text-sm font-medium text-gray-900">Tuesday, May 12, 2026</p>
        </div>
      </div>

      <div className="mb-6">
        <button onClick={() => setShowAgentReview(!showAgentReview)} className="px-3 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700">
          {showAgentReview ? 'Close AI Review' : 'Review AI Chats'}
        </button>
      </div>

      {showAgentReview && (
        <div className="mb-6 bg-gray-50 rounded-lg border border-gray-200 p-4">
          {/* Lazy-load the component to avoid importing heavy modules at top-level */}
          <AdminAgentReview />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {adminStats.map((stat, index) => (
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

      {pendingCourses.length > 0 && (
        <div className="bg-white rounded-lg border border-yellow-200">
          <div className="p-6 border-b border-yellow-200 bg-yellow-50">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-yellow-600" />
              <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Pending Course Approvals</h2>
              <span className="ml-auto bg-yellow-200 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium">
                {pendingCourses.length} pending
              </span>
            </div>
          </div>
          <div className="p-6 space-y-4">
            {pendingCourses.map((course) => (
              <div key={course.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center gap-4">
                  <div className={`${course.color} w-10 h-10 rounded-lg flex items-center justify-center`}>
                    <BookOpen className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">{course.name}</h3>
                    <p className="text-xs text-gray-500">By {course.teacherName} • {course.chapters.length} chapters • {course.totalHours}h</p>
                    <p className="text-xs text-gray-500 mt-1">Created {new Date(course.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => approveCourse(course.id)}
                    className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Approve
                  </button>
                  <button
                    onClick={() => rejectCourse(course.id)}
                    className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                  >
                    <XCircle className="w-4 h-4" />
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">User Management</h2>
            <button
              onClick={() => setShowAddUser(true)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium"
            >
              <UserPlus className="w-4 h-4" />
              Add User
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Join Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {users.map((userData) => (
                  <tr key={userData.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{userData.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{userData.email}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        userData.role === 'admin' ? 'bg-red-100 text-red-700' :
                        userData.role === 'teacher' ? 'bg-purple-100 text-purple-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {userData.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{new Date(userData.joinDate).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        userData.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {userData.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => startEditUser(userData)}
                          className="text-emerald-600 hover:text-emerald-700 font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteUser(userData.id)}
                          className="text-red-600 hover:text-red-700 font-medium"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wide">Quick Actions</h3>
            <div className="space-y-3">
              <button className="w-full text-left px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg hover:border-emerald-300 hover:bg-emerald-50 transition-colors">
                <div className="flex items-center gap-3">
                  <Users className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm font-medium">Manage Users</span>
                </div>
              </button>
              <button className="w-full text-left px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg hover:border-emerald-300 hover:bg-emerald-50 transition-colors">
                <div className="flex items-center gap-3">
                  <BookOpen className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm font-medium">Manage Courses</span>
                </div>
              </button>
              <button className="w-full text-left px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg hover:border-emerald-300 hover:bg-emerald-50 transition-colors">
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm font-medium">View Analytics</span>
                </div>
              </button>
              <button className="w-full text-left px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg hover:border-emerald-300 hover:bg-emerald-50 transition-colors">
                <div className="flex items-center gap-3">
                  <Settings className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm font-medium">System Settings</span>
                </div>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wide">Recent Activity</h3>
            <div className="space-y-3">
              <div className="text-sm">
                <p className="text-gray-900 font-medium">New user registered</p>
                <p className="text-xs text-gray-500">Bilal Ahmed - 2 hours ago</p>
              </div>
              <div className="text-sm">
                <p className="text-gray-900 font-medium">Course created</p>
                <p className="text-xs text-gray-500">Advanced Physics - 5 hours ago</p>
              </div>
              <div className="text-sm">
                <p className="text-gray-900 font-medium">Test published</p>
                <p className="text-xs text-gray-500">Math Midterm - 1 day ago</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
