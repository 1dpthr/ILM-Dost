export interface MaterialSubmission {
  id: string;
  materialId: string;
  studentId: string;
  studentName: string;
  submittedAt: string;
  fileName: string;
  fileSize: number;
  grade?: number;
  feedback?: string;
}

export interface TestSubmission {
  id: string;
  testId: string;
  studentId: string;
  studentName: string;
  submittedAt: string;
  fileName: string;
  fileSize: number;
  grade?: number;
  feedback?: string;
}
