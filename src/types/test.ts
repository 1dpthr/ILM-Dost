export interface Test {
  id: string;
  subject: string;
  title: string;
  date: string;
  totalMarks: number;
  duration: string;
  topics: string[];
  teacherId: string;
  teacherName: string;
  courseId: string;
  createdAt: string;
  questions?: TestQuestion[];
  attachments?: {
    fileName: string;
    fileSize: number;
    uploadedAt: string;
  }[];
}


export interface TestQuestion {
  id: string;
  question: string;
  options?: string[];
  correctAnswer?: string;
  points: number;
}

export interface TestAttempt {
  id: string;
  testId: string;
  studentId: string;
  studentName: string;
  attemptedAt: string;
  score: number;
  totalMarks: number;
  answers: Record<string, string>; // questionId -> answer
  completed: boolean;
}
