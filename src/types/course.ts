export interface Chapter {
  id: string;
  title: string;
  completed: boolean;
  notes: string;
}

export interface Course {
  id: string;
  name: string;
  color: string;
  progress: number;
  chapters: Chapter[];
  totalHours: number;
  teacherId: string;
  teacherName: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  approvedAt?: string;
  approvedBy?: string;
}

export interface CourseEnrollment {
  id: string;
  courseId: string;
  studentId: string;
  enrolledAt: string;
  progress: number;
  completedChapters: string[];
  notes: Record<string, string>; // chapterId -> note
}
