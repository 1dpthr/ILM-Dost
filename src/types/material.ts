export interface Material {
  id: string;
  title: string;
  description?: string;
  type: 'lecture' | 'notes' | 'assignment' | 'resource';
  subject: string;
  teacherId: string;
  teacherName: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  uploadedAt: string;
  courseId?: string;
}
