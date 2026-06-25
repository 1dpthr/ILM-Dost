import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { GraduationCap } from 'lucide-react';
import Dashboard from './components/Dashboard';
import AdminDashboard from './components/AdminDashboard';
import TeacherDashboard from './components/TeacherDashboard';
import AIChat from './components/AIChat';
import CourseManagement from './components/CourseManagement';
import StudentCourses from './components/StudentCourses';
import TeacherCourses from './components/TeacherCourses';
import TestAnalytics from './components/TestAnalytics';
import StudentTests from './components/StudentTests';
import TeacherTests from './components/TeacherTests';
import Schedule from './components/Schedule';
import StudentSchedule from './components/StudentSchedule';
import StudentMaterials from './components/StudentMaterials';
import TeacherMaterials from './components/TeacherMaterials';
import VoiceAssistant from './components/VoiceAssistant';
import Login from './components/Login';
import Sidebar from './components/Sidebar';

function AppContent() {
  const { user, loading, signOut } = useAuth();

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-20 h-20 bg-emerald-600 rounded-lg flex items-center justify-center mx-auto mb-6 animate-pulse">
            <GraduationCap className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Ilm Dost</h2>
          <p className="text-sm text-gray-500">Loading your learning space...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  const getDashboardComponent = () => {
    const role = user?.user_metadata?.role;
    if (role === 'admin') return <AdminDashboard user={user} />;
    if (role === 'teacher') return <TeacherDashboard user={user} />;
    return <Dashboard user={user} />;
  };

  // Role-based route protection
  const ProtectedRoute = ({ element, allowedRoles }: { element: JSX.Element; allowedRoles: string[] }) => {
    const userRole = user?.user_metadata?.role || 'student';
    if (!allowedRoles.includes(userRole)) {
      return <Navigate to="/dashboard" replace />;
    }
    return element;
  };

  return (
    <Router>
      <div className="flex h-screen bg-gray-50">
        <Sidebar onLogout={signOut} user={user} />
        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={getDashboardComponent()} />

            {/* Student-only routes */}
            <Route path="/ai-chat" element={<ProtectedRoute element={<AIChat />} allowedRoles={['student']} />} />
            <Route path="/voice-assistant" element={<ProtectedRoute element={<VoiceAssistant />} allowedRoles={['student']} />} />

            {/* Courses - role-specific components */}
            <Route
              path="/courses"
              element={
                user?.user_metadata?.role === 'teacher'
                  ? <ProtectedRoute element={<TeacherCourses user={user} />} allowedRoles={['teacher']} />
                  : <ProtectedRoute element={<StudentCourses user={user} />} allowedRoles={['student']} />
              }
            />

            {/* Tests - role-specific components */}
            <Route
              path="/tests"
              element={
                user?.user_metadata?.role === 'teacher'
                  ? <ProtectedRoute element={<TeacherTests user={user} />} allowedRoles={['teacher']} />
                  : <ProtectedRoute element={<StudentTests user={user} />} allowedRoles={['student']} />
              }
            />

            {/* Schedule - role-specific components */}
            <Route
              path="/schedule"
              element={
                user?.user_metadata?.role === 'teacher'
                  ? <ProtectedRoute element={<Schedule />} allowedRoles={['teacher']} />
                  : <ProtectedRoute element={<StudentSchedule />} allowedRoles={['student']} />
              }
            />

            {/* Materials - role-specific components */}
            <Route
              path="/materials"
              element={
                user?.user_metadata?.role === 'teacher'
                  ? <ProtectedRoute element={<TeacherMaterials user={user} />} allowedRoles={['teacher']} />
                  : <ProtectedRoute element={<StudentMaterials user={user} />} allowedRoles={['student']} />
              }
            />

            {/* Catch all - redirect to dashboard */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}