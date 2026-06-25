import { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock, BookOpen, ClipboardList, Users, Bell, Loader2 } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday } from 'date-fns';
import { apiClient } from '../../lib/supabase';

interface Event {
  id: string;
  title: string;
  type: 'class' | 'study' | 'exam' | 'assignment' | 'group';
  date: string;
  startTime: string;
  endTime: string;
  subject?: string;
  description?: string;
}

export default function StudentSchedule() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/events');
      setEvents(response.events || []);
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoading(false);
    }
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getEventsForDate = (date: Date) => {
    return events.filter(event => isSameDay(new Date(event.date), date));
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'class':
        return <BookOpen className="w-4 h-4" />;
      case 'study':
        return <Clock className="w-4 h-4" />;
      case 'exam':
        return <ClipboardList className="w-4 h-4" />;
      case 'assignment':
        return <Bell className="w-4 h-4" />;
      case 'group':
        return <Users className="w-4 h-4" />;
      default:
        return <CalendarIcon className="w-4 h-4" />;
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'class':
        return 'bg-blue-500';
      case 'study':
        return 'bg-green-500';
      case 'exam':
        return 'bg-red-500';
      case 'assignment':
        return 'bg-orange-500';
      case 'group':
        return 'bg-purple-500';
      default:
        return 'bg-gray-500';
    }
  };

  const todayEvents = getEventsForDate(selectedDate);

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
        <h1 className="text-2xl font-semibold text-gray-900 mb-1">Schedule</h1>
        <p className="text-sm text-gray-500">View your classes, study sessions, and deadlines</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">{format(currentDate, 'MMMM yyyy')}</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
                className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 text-sm"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentDate(new Date())}
                className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 text-sm"
              >
                Today
              </button>
              <button
                onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
                className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 text-sm"
              >
                Next
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="text-center text-sm text-gray-600 py-2">
                {day}
              </div>
            ))}

            {Array.from({ length: monthStart.getDay() }).map((_, index) => (
              <div key={`empty-${index}`} className="aspect-square"></div>
            ))}

            {daysInMonth.map((day) => {
              const dayEvents = getEventsForDate(day);
              const isSelected = isSameDay(day, selectedDate);
              const isTodayDate = isToday(day);

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDate(day)}
                  className={`aspect-square p-2 rounded-lg border transition-all ${
                    isSelected
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                      : isTodayDate
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-700 font-semibold'
                      : dayEvents.length > 0
                      ? 'bg-teal-50 border-teal-200 hover:border-teal-300'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex flex-col h-full">
                    <span className="text-sm">{format(day, 'd')}</span>
                    {dayEvents.length > 0 && (
                      <div className="flex-1 flex items-end justify-center">
                        <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-emerald-500'}`}></div>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">
            {format(selectedDate, 'MMMM d, yyyy')}
          </h2>

          {todayEvents.length === 0 ? (
            <div className="text-center py-8">
              <CalendarIcon className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">No events scheduled</p>
            </div>
          ) : (
            <div className="space-y-3">
              {todayEvents
                .sort((a, b) => a.startTime.localeCompare(b.startTime))
                .map((event) => (
                  <div
                    key={event.id}
                    className="p-4 border border-gray-200 rounded-lg"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`${getEventColor(event.type)} w-10 h-10 rounded-lg flex items-center justify-center text-white flex-shrink-0`}>
                        {getEventIcon(event.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm mb-1 truncate">{event.title}</h3>
                        {event.subject && (
                          <p className="text-xs text-gray-600 mb-1">{event.subject}</p>
                        )}
                        <p className="text-xs text-gray-500">
                          {event.startTime} - {event.endTime}
                        </p>
                        {event.description && (
                          <p className="text-xs text-gray-600 mt-2">{event.description}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Upcoming Events</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-sm text-gray-600">Type</th>
                <th className="px-6 py-3 text-left text-sm text-gray-600">Title</th>
                <th className="px-6 py-3 text-left text-sm text-gray-600">Subject</th>
                <th className="px-6 py-3 text-left text-sm text-gray-600">Date</th>
                <th className="px-6 py-3 text-left text-sm text-gray-600">Time</th>
                <th className="px-6 py-3 text-left text-sm text-gray-600">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {events
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                .map((event) => (
                  <tr key={event.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className={`${getEventColor(event.type)} w-8 h-8 rounded-lg flex items-center justify-center text-white`}>
                        {getEventIcon(event.type)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">{event.title}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{event.subject || '-'}</td>
                    <td className="px-6 py-4 text-sm">{format(new Date(event.date), 'MMM d, yyyy')}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {event.startTime} - {event.endTime}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{event.description || '-'}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
