import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  MessageSquare,
  BookOpen,
  ClipboardList,
  Calendar,
  Mic,
  LogOut,
  GraduationCap,
  FileText
} from 'lucide-react';
import { User } from '../../types/user';

interface SidebarProps {
  onLogout: () => Promise<void>;
  user: User;
}

export default function Sidebar({ onLogout, user }: SidebarProps) {
  const userRole = user?.user_metadata?.role || 'student';

  // Role-specific navigation items
  const getNavItems = () => {
    if (userRole === 'admin') {
      return [
        { path: '/dashboard', icon: LayoutDashboard, label: 'Admin Dashboard' },
      ];
    }

    if (userRole === 'teacher') {
      return [
        { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { path: '/courses', icon: BookOpen, label: 'My Courses' },
        { path: '/tests', icon: ClipboardList, label: 'Tests & Assignments' },
        { path: '/materials', icon: FileText, label: 'Study Materials' },
        { path: '/schedule', icon: Calendar, label: 'Schedule' },
      ];
    }

    // Student navigation (default)
    return [
      { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { path: '/ai-chat', icon: MessageSquare, label: 'AI Chat' },
      { path: '/courses', icon: BookOpen, label: 'Courses' },
      { path: '/tests', icon: ClipboardList, label: 'Tests & Analytics' },
      { path: '/materials', icon: FileText, label: 'Study Materials' },
      { path: '/schedule', icon: Calendar, label: 'Schedule' },
      { path: '/voice-assistant', icon: Mic, label: 'Voice Assistant' },
    ];
  };

  const navItems = getNavItems();

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-3 mb-6">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            userRole === 'admin' ? 'bg-red-600' :
            userRole === 'teacher' ? 'bg-purple-600' :
            'bg-emerald-600'
          }`}>
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Ilm Dost</h2>
            <p className="text-xs text-gray-500 capitalize">{userRole}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium text-white ${
            userRole === 'admin' ? 'bg-red-600' :
            userRole === 'teacher' ? 'bg-purple-600' :
            'bg-emerald-600'
          }`}>
            {user?.user_metadata?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'S'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{user?.user_metadata?.name || 'Student'}</p>
            <p className="text-xs text-gray-500 truncate">{user?.email || ''}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm ${
                isActive
                  ? userRole === 'admin' ? 'bg-red-50 text-red-700 font-medium' :
                    userRole === 'teacher' ? 'bg-purple-50 text-purple-700 font-medium' :
                    'bg-emerald-50 text-emerald-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`
            }
          >
            <item.icon className="w-5 h-5" />
            <span className="text-sm">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-200">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2 text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-lg transition-colors text-sm"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}
