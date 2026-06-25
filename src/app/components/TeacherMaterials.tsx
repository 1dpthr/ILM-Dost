import { useState, useEffect } from 'react';
import { FileText, Upload, Plus, Trash2, Loader2, Download, BookOpen, Users } from 'lucide-react';
import { User } from '../../types/user';
import { Material } from '../../types/material';
import { MaterialSubmission } from '../../types/submission';
import { localStorageDB } from '../../lib/localStorage';

interface TeacherMaterialsProps {
  user: User;
}

export default function TeacherMaterials({ user }: TeacherMaterialsProps) {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [submissions, setSubmissions] = useState<MaterialSubmission[]>([]);
  const [activeTab, setActiveTab] = useState<'materials' | 'submissions'>('materials');
  const [loading, setLoading] = useState(true);
  const [showAddMaterial, setShowAddMaterial] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [courses, setCourses] = useState<{ id: string; name: string }[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');

  const [newMaterial, setNewMaterial] = useState({
    title: '',
    description: '',
    type: 'lecture' as Material['type'],
    subject: '',
    file: null as File | null,
  });

  useEffect(() => {
    loadMaterials();
    loadSubmissions();
    loadMyCourses();
  }, []);

  const loadMyCourses = () => {
    try {
      const allCourses = localStorageDB.getAll('course_');
      const myCourses = allCourses.filter((c: any) => c.teacherId === user.id);
      setCourses(myCourses.map((c: any) => ({ id: c.id, name: c.name })));
      if (!selectedCourseId && myCourses.length > 0) {
        setSelectedCourseId(myCourses[0].id);
      }
    } catch (error) {
      console.error('Error loading courses:', error);
    }
  };


  const loadMaterials = () => {
    try {
      setLoading(true);
      const allMaterials = localStorageDB.getAll('material_');
      const myMaterials = allMaterials.filter((m: Material) => m.teacherId === user.id);
      setMaterials(myMaterials);
    } catch (error) {
      console.error('Error loading materials:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSubmissions = () => {
    try {
      const allSubmissions = localStorageDB.getAll('material_submission_');
      const myMaterialIds = materials.map(m => m.id);
      const relevantSubmissions = allSubmissions.filter((s: MaterialSubmission) =>
        myMaterialIds.includes(s.materialId)
      );
      setSubmissions(relevantSubmissions);
    } catch (error) {
      console.error('Error loading submissions:', error);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewMaterial({ ...newMaterial, file });
    }
  };

  const uploadMaterial = async () => {
    if (!newMaterial.title.trim() || !newMaterial.subject.trim()) {
      alert('Please fill in required fields');
      return;
    }

    // Simulate file upload
    setUploadProgress(0);
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 10;
      });
    }, 100);

    setTimeout(() => {
      if (!selectedCourseId) {
        alert('Please select a course before uploading material');
        return;
      }

      const material: Material = {
        id: Date.now().toString(),
        title: newMaterial.title,
        description: newMaterial.description,
        type: newMaterial.type,
        subject: newMaterial.subject,
        teacherId: user.id,
        teacherName: user.user_metadata.name,
        courseId: selectedCourseId,
        fileName: newMaterial.file?.name || 'document.pdf',
        fileSize: newMaterial.file?.size || 0,
        uploadedAt: new Date().toISOString(),
      };

      localStorageDB.set(`material_${material.id}`, material);
      setMaterials([...materials, material]);
      setShowAddMaterial(false);
      setNewMaterial({
        title: '',
        description: '',
        type: 'lecture',
        subject: '',
        file: null,
      });
      setUploadProgress(0);
    }, 1200);
  };

  const deleteMaterial = (materialId: string) => {
    if (!confirm('Are you sure you want to delete this material?')) return;

    localStorageDB.remove(`material_${materialId}`);
    setMaterials(materials.filter(m => m.id !== materialId));
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'lecture':
        return <BookOpen className="w-5 h-5" />;
      case 'notes':
        return <FileText className="w-5 h-5" />;
      case 'assignment':
        return <Upload className="w-5 h-5" />;
      case 'resource':
        return <Download className="w-5 h-5" />;
      default:
        return <FileText className="w-5 h-5" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'lecture':
        return 'bg-blue-500';
      case 'notes':
        return 'bg-green-500';
      case 'assignment':
        return 'bg-orange-500';
      case 'resource':
        return 'bg-purple-500';
      default:
        return 'bg-gray-500';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  const stats = [
    { label: 'Total Materials', value: materials.length, type: 'all' },
    { label: 'Lectures', value: materials.filter(m => m.type === 'lecture').length, type: 'lecture' },
    { label: 'Notes', value: materials.filter(m => m.type === 'notes').length, type: 'notes' },
    { label: 'Assignments', value: materials.filter(m => m.type === 'assignment').length, type: 'assignment' },
  ];

  return (
    <div className="p-6 space-y-6">
      {showAddMaterial && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload Material</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Course</label>
                <select
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {courses.length === 0 ? (
                    <option value="">No courses available</option>
                  ) : (
                    courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))
                  )}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                <input
                  type="text"
                  value={newMaterial.title}
                  onChange={(e) => setNewMaterial({ ...newMaterial, title: e.target.value })}
                  placeholder="e.g., Calculus Lecture 5"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                <select
                  value={newMaterial.type}
                  onChange={(e) => setNewMaterial({ ...newMaterial, type: e.target.value as Material['type'] })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="lecture">Lecture</option>
                  <option value="notes">Notes</option>
                  <option value="assignment">Assignment</option>
                  <option value="resource">Resource</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                <input
                  type="text"
                  value={newMaterial.subject}
                  onChange={(e) => setNewMaterial({ ...newMaterial, subject: e.target.value })}
                  placeholder="e.g., Mathematics"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description (Optional)</label>
                <textarea
                  value={newMaterial.description}
                  onChange={(e) => setNewMaterial({ ...newMaterial, description: e.target.value })}
                  placeholder="Brief description..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">File</label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                  <input
                    type="file"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="file-upload"
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.txt"
                  />
                  <label
                    htmlFor="file-upload"
                    className="cursor-pointer text-sm text-purple-600 hover:text-purple-700 font-medium"
                  >
                    Click to upload
                  </label>
                  {newMaterial.file && (
                    <p className="text-xs text-gray-600 mt-2">{newMaterial.file.name}</p>
                  )}
                </div>
              </div>
              {uploadProgress > 0 && uploadProgress < 100 && (
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-purple-600 h-2 rounded-full transition-all"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={uploadMaterial}
                  disabled={uploadProgress > 0 && uploadProgress < 100}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium disabled:opacity-50"
                >
                  Upload
                </button>
                <button
                  onClick={() => {
                    setShowAddMaterial(false);
                    setNewMaterial({ title: '', description: '', type: 'lecture', subject: '', file: null });
                    setUploadProgress(0);
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

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-1">Study Materials</h1>
          <p className="text-sm text-gray-500">Upload lectures, notes, and resources for students</p>
        </div>
        <button
          onClick={() => setShowAddMaterial(true)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Upload Material
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white rounded-lg border border-gray-200 p-5">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">{stat.label}</p>
            <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg border border-gray-200">
        <div className="border-b border-gray-200">
          <div className="flex">
            <button
              onClick={() => setActiveTab('materials')}
              className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === 'materials'
                  ? 'text-purple-600 border-b-2 border-purple-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              My Materials ({materials.length})
            </button>
            <button
              onClick={() => setActiveTab('submissions')}
              className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === 'submissions'
                  ? 'text-purple-600 border-b-2 border-purple-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Users className="w-4 h-4" />
                Student Submissions ({submissions.length})
              </div>
            </button>
          </div>
        </div>

        {activeTab === 'materials' && materials.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-600">No materials uploaded yet. Click "Upload Material" to start!</p>
          </div>
        ) : activeTab === 'materials' ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Title</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Subject</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">File</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Size</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Uploaded</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {materials.map((material) => (
                  <tr key={material.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className={`${getTypeColor(material.type)} w-10 h-10 rounded-lg flex items-center justify-center text-white`}>
                        {getTypeIcon(material.type)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-gray-900">{material.title}</p>
                      {material.description && (
                        <p className="text-xs text-gray-500">{material.description}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{material.subject}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{material.fileName}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{formatFileSize(material.fileSize || 0)}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(material.uploadedAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <button
                        onClick={() => deleteMaterial(material.id)}
                        className="text-red-600 hover:text-red-700 font-medium"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            {submissions.length === 0 ? (
              <div className="p-8 text-center">
                <Users className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-600">No student submissions yet</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Student</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Assignment</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">File</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Size</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Submitted</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Grade</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {submissions.map((submission) => {
                    const material = materials.find(m => m.id === submission.materialId);
                    return (
                      <tr key={submission.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{submission.studentName}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{material?.title || 'Unknown'}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{submission.fileName}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{formatFileSize(submission.fileSize)}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {new Date(submission.submittedAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {submission.grade ? (
                            <span className="text-emerald-600 font-medium">{submission.grade}%</span>
                          ) : (
                            <span className="text-gray-400">Not graded</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <button className="text-emerald-600 hover:text-emerald-700 font-medium mr-3">
                            View
                          </button>
                          <button className="text-purple-600 hover:text-purple-700 font-medium">
                            Grade
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
