import { useState, useEffect } from 'react';
import { TrendingUp, BookOpen, Clock, Target, Award, Brain, Loader2 } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { User } from '../../types/user';
import { apiClient } from '../../lib/supabase';

interface DashboardProps {
  user: User;
}

export default function Dashboard({ user }: DashboardProps) {
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<any[]>([]);
  const [tests, setTests] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [coursesRes, testsRes, eventsRes] = await Promise.all([
        apiClient.get('/courses').catch(() => ({ courses: [] })),
        apiClient.get('/tests').catch(() => ({ tests: [] })),
        apiClient.get('/events').catch(() => ({ events: [] })),
      ]);

      setCourses(coursesRes.courses || []);
      setTests(testsRes.tests || []);
      setEvents(eventsRes.events || []);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };
  // Calculate study hours per day from events
  const studyData = (() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const today = new Date();
    const weekData = days.map((day, index) => {
      const dayDate = new Date(today);
      dayDate.setDate(today.getDate() - today.getDay() + index + 1);

      const dayEvents = events.filter(e => {
        const eventDate = new Date(e.date);
        return eventDate.toDateString() === dayDate.toDateString() && e.type === 'study';
      });

      const hours = dayEvents.reduce((sum, e) => {
        const start = new Date(`2000-01-01 ${e.startTime}`);
        const end = new Date(`2000-01-01 ${e.endTime}`);
        return sum + ((end.getTime() - start.getTime()) / (1000 * 60 * 60));
      }, 0);

      return { day, hours: parseFloat(hours.toFixed(1)) };
    });
    return weekData;
  })();

  // Calculate performance by subject from tests
  const performanceData = (() => {
    const subjectScores: Record<string, { total: number; count: number }> = {};

    tests.forEach(test => {
      if (!subjectScores[test.subject]) {
        subjectScores[test.subject] = { total: 0, count: 0 };
      }
      subjectScores[test.subject].total += (test.score / test.totalMarks) * 100;
      subjectScores[test.subject].count += 1;
    });

    return Object.entries(subjectScores).map(([subject, data]) => ({
      subject,
      score: Math.round(data.total / data.count) || 0,
    }));
  })();

  // Calculate progress from courses
  const progressData = (() => {
    const totalChapters = courses.reduce((sum, c) => sum + (c.chapters?.length || 0), 0);
    const completedCount = courses.reduce((sum, c) =>
      sum + (c.chapters?.filter((ch: any) => ch.completed).length || 0), 0
    );
    const inProgressCount = courses.filter(c =>
      c.progress > 0 && c.progress < 100
    ).reduce((sum, c) => sum + (c.chapters?.filter((ch: any) => !ch.completed).length || 0), 0);
    const pendingCount = totalChapters - completedCount - inProgressCount;

    const completed = totalChapters > 0 ? Math.round((completedCount / totalChapters) * 100) : 0;
    const inProgress = totalChapters > 0 ? Math.round((inProgressCount / totalChapters) * 100) : 0;
    const pending = totalChapters > 0 ? Math.max(0, 100 - completed - inProgress) : 0;

    return [
      { name: 'Completed', value: completed, color: '#10b981' },
      { name: 'In Progress', value: inProgress, color: '#3b82f6' },
      { name: 'Pending', value: pending, color: '#f59e0b' },
    ];
  })();

  // Generate AI insights from actual data
  const aiInsights = (() => {
    const insights: string[] = [];

    // Best subject
    if (performanceData.length > 0) {
      const best = performanceData.reduce((max, curr) => curr.score > max.score ? curr : max);
      if (best.score >= 85) {
        insights.push(`Excellent performance in ${best.subject} with ${best.score}% average!`);
      }
    }

    // Weakest subject
    if (performanceData.length > 0) {
      const weakest = performanceData.reduce((min, curr) => curr.score < min.score ? curr : min);
      if (weakest.score < 80) {
        insights.push(`Consider spending more time on ${weakest.subject} (${weakest.score}% average)`);
      }
    }

    // Study consistency
    const totalWeekHours = studyData.reduce((sum, d) => sum + d.hours, 0);
    if (totalWeekHours > 20) {
      insights.push(`Great consistency! You studied ${totalWeekHours.toFixed(1)} hours this week`);
    } else if (totalWeekHours < 10) {
      insights.push(`Try to increase study time - only ${totalWeekHours.toFixed(1)} hours this week`);
    }

    // Upcoming events
    const upcomingExams = events.filter(e =>
      e.type === 'exam' && new Date(e.date) >= new Date()
    ).length;
    if (upcomingExams > 0) {
      insights.push(`You have ${upcomingExams} upcoming exam${upcomingExams > 1 ? 's' : ''} - prepare well!`);
    }

    // Default insight if none generated
    if (insights.length === 0) {
      insights.push('Add courses, tests, and study sessions to get personalized insights');
    }

    return insights;
  })();

  const userName = user?.user_metadata?.name?.split(' ')[0] || 'Student';

  // Calculate stats from data
  const totalStudyHours = courses.reduce((sum, course) => sum + (course.totalHours || 0), 0);
  const completedChapters = courses.reduce((sum, course) =>
    sum + (course.chapters?.filter((c: any) => c.completed).length || 0), 0
  );
  const averageScore = tests.length > 0
    ? tests.reduce((sum, test) => sum + (test.score / test.totalMarks) * 100, 0) / tests.length
    : 0;
  const achievements = tests.filter(t => (t.score / t.totalMarks) * 100 >= 90).length;

  const stats = [
    { label: 'Study Hours (Total)', value: `${totalStudyHours.toFixed(1)}h`, icon: Clock, color: 'bg-blue-500' },
    { label: 'Completed Chapters', value: completedChapters.toString(), icon: BookOpen, color: 'bg-green-500' },
    { label: 'Average Score', value: `${averageScore.toFixed(1)}%`, icon: Target, color: 'bg-purple-500' },
    { label: 'Achievements', value: achievements.toString(), icon: Award, color: 'bg-orange-500' },
  ];

  const upcomingEvents = events
    .filter(e => new Date(e.date) >= new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 4);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-1">Welcome back, {userName}</h1>
          <p className="text-sm text-gray-500">Here's your learning progress</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">Today</p>
          <p className="text-sm font-medium text-gray-900">Tuesday, May 12, 2026</p>
        </div>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wide">Weekly Study Hours</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={studyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="hours" stroke="#3b82f6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wide">Subject Performance</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="subject" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="score" fill="#8b5cf6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wide">Course Progress</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={progressData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {progressData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 space-y-2">
            {progressData.map((item, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                  <span>{item.name}</span>
                </div>
                <span>{item.value}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
          <h3 className="text-lg mb-4 flex items-center gap-2">
            <Brain className="w-5 h-5 text-pink-600" />
            AI Insights
          </h3>
          <div className="space-y-3">
            {aiInsights.map((insight, index) => (
              <div key={index} className="p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-100">
                <p className="text-sm text-gray-700">{insight}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wide">Upcoming Events</h3>
          <div className="space-y-2">
            {upcomingEvents.map((event, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <div className={`w-1.5 h-1.5 rounded-full mt-1.5 ${
                  event.type === 'exam' ? 'bg-red-500' :
                  event.type === 'assignment' ? 'bg-orange-500' :
                  event.type === 'class' ? 'bg-blue-500' : 'bg-green-500'
                }`}></div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-900 truncate">{event.title}</p>
                  <p className="text-xs text-gray-500">{new Date(event.date).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
