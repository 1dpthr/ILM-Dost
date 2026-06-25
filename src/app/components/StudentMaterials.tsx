import { useState, useEffect } from 'react';
import { FileText, Download, BookOpen, Loader2, Search, Upload, CheckCircle } from 'lucide-react';
import { Material } from '../../types/material';
import { MaterialSubmission } from '../../types/submission';
import { localStorageDB } from '../../lib/localStorage';
import { User } from '../../types/user';

interface StudentMaterialsProps {
  user: User;
}

export default function StudentMaterials({ user }: StudentMaterialsProps) {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [filteredMaterials, setFilteredMaterials] = useState<Material[]>([]);
  const [submissions, setSubmissions] = useState<MaterialSubmission[]>([]);
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterSubject, setFilterSubject] = useState<string>('all');
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    loadMaterials();
    loadSubmissions();
    loadEnrollments();
  }, []);

  const loadEnrollments = () => {
    try {
      const enrollments = localStorageDB.getAll('enrollment_');
      const myCourseIds = enrollments
        .filter((e: any) => e.studentId === user.id)
        .map((e: any) => e.courseId);
      setEnrolledCourseIds(myCourseIds);
    } catch (error) {
      console.error('Error loading enrollments:', error);
    }
  };


  useEffect(() => {
    filterMaterials();
  }, [materials, searchQuery, filterType, filterSubject]);


  const loadMaterials = () => {
    try {
      setLoading(true);
      const allMaterials = localStorageDB.getAll('material_');
      const scoped = enrolledCourseIds.length > 0
        ? allMaterials.filter((m: Material) => !!m.courseId && enrolledCourseIds.includes(m.courseId))
        : [];
      setMaterials(scoped);
      setFilteredMaterials(scoped);

    } catch (error) {
      console.error('Error loading materials:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSubmissions = () => {
    try {
      const allSubmissions = localStorageDB.getAll('material_submission_');
      const mySubmissions = allSubmissions.filter((s: MaterialSubmission) => s.studentId === user.id);
      setSubmissions(mySubmissions);
    } catch (error) {
      console.error('Error loading submissions:', error);
    }
  };

  const filterMaterials = () => {
    // `materials` is already course-scoped; keep this function for search/type/subject
    let filtered = materials;


    if (searchQuery.trim()) {
      filtered = filtered.filter(m =>
        m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (filterType !== 'all') {
      filtered = filtered.filter(m => m.type === filterType);
    }

    if (filterSubject !== 'all') {
      filtered = filtered.filter(m => m.subject === filterSubject);
    }

    setFilteredMaterials(filtered);
  };

  const downloadMaterial = (material: Material) => {
    alert(`Downloading: ${material.fileName}\n\nIn a real application, this would download the file.`);
  };

  const startSubmission = (material: Material) => {
    setSelectedMaterial(material);
    setShowSubmitModal(true);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadFile(file);
    }
  };

  const submitAssignment = () => {
    if (!uploadFile || !selectedMaterial) return;

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
      const submission: MaterialSubmission = {
        id: Date.now().toString(),
        materialId: selectedMaterial.id,
        studentId: user.id,
        studentName: user.user_metadata.name,
        submittedAt: new Date().toISOString(),
        fileName: uploadFile.name,
        fileSize: uploadFile.size,
      };

      localStorageDB.set(`material_submission_${submission.id}`, submission);
      setSubmissions([...submissions, submission]);
      setShowSubmitModal(false);
      setSelectedMaterial(null);
      setUploadFile(null);
      setUploadProgress(0);
    }, 1200);
  };

  const hasSubmitted = (materialId: string) => {
    return submissions.some(s => s.materialId === materialId);
  };

  const getSubmission = (materialId: string) => {
    return submissions.find(s => s.materialId === materialId);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'lecture':
        return <BookOpen className="w-5 h-5" />;
      case 'notes':
        return <FileText className="w-5 h-5" />;
      case 'assignment':
        return <FileText className="w-5 h-5" />;
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

  const subjects = ['all', ...new Set(materials.map(m => m.subject))];

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const stats = [
    { label: 'Total Materials', value: materials.length },
    { label: 'Lectures', value: materials.filter(m => m.type === 'lecture').length },
    { label: 'Notes', value: materials.filter(m => m.type === 'notes').length },
    { label: 'Assignments', value: materials.filter(m => m.type === 'assignment').length },
  ];

  return (
    <div className="p-6 space-y-6">
      {showSubmitModal && selectedMaterial && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Submit Assignment</h3>
            <p className="text-sm text-gray-600 mb-4">{selectedMaterial.title}</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Upload Your Work</label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                  <input
                    type="file"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="assignment-upload"
                    accept=".pdf,.doc,.docx,.txt,.jpg,.png"
                  />
                  <label
                    htmlFor="assignment-upload"
                    className="cursor-pointer text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                  >
                    Click to upload
                  </label>
                  {uploadFile && (
                    <p className="text-xs text-gray-600 mt-2">{uploadFile.name} ({formatFileSize(uploadFile.size)})</p>
                  )}
                </div>
              </div>
              {uploadProgress > 0 && uploadProgress < 100 && (
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-emerald-600 h-2 rounded-full transition-all"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={submitAssignment}
                  disabled={!uploadFile || (uploadProgress > 0 && uploadProgress < 100)}
                  className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium disabled:opacity-50"
                >
                  Submit
                </button>
                <button
                  onClick={() => {
                    setShowSubmitModal(false);
                    setSelectedMaterial(null);
                    setUploadFile(null);
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

      <div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-1">Study Materials</h1>
        <p className="text-sm text-gray-500">Access lectures, notes, and resources shared by your teachers</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white rounded-lg border border-gray-200 p-5">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">{stat.label}</p>
            <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search materials..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">All Types</option>
            <option value="lecture">Lectures</option>
            <option value="notes">Notes</option>
            <option value="assignment">Assignments</option>
            <option value="resource">Resources</option>
          </select>
          <select
            value={filterSubject}
            onChange={(e) => setFilterSubject(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {subjects.map(subject => (
              <option key={subject} value={subject}>
                {subject === 'all' ? 'All Subjects' : subject}
              </option>
            ))}
          </select>
        </div>
      </div>

      {filteredMaterials.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <FileText className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-600">
            {searchQuery || filterType !== 'all' || filterSubject !== 'all'
              ? 'No materials match your filters'
              : 'No materials available yet'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMaterials.map((material) => (
            <div key={material.id} className="bg-white rounded-lg border border-gray-200 p-5 hover:border-emerald-300 hover:shadow-sm transition-all">
              <div className="flex items-start gap-3 mb-3">
                <div className={`${getTypeColor(material.type)} w-12 h-12 rounded-lg flex items-center justify-center text-white flex-shrink-0`}>
                  {getTypeIcon(material.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                    material.type === 'lecture' ? 'bg-blue-100 text-blue-700' :
                    material.type === 'notes' ? 'bg-green-100 text-green-700' :
                    material.type === 'assignment' ? 'bg-orange-100 text-orange-700' :
                    'bg-purple-100 text-purple-700'
                  }`}>
                    {material.type}
                  </span>
                </div>
              </div>
              <h3 className="text-sm font-medium text-gray-900 mb-2">{material.title}</h3>
              {material.description && (
                <p className="text-xs text-gray-600 mb-3">{material.description}</p>
              )}
              <div className="space-y-1 text-xs text-gray-500 mb-4">
                <p>Subject: {material.subject}</p>
                <p>By: {material.teacherName}</p>
                <p>File: {material.fileName}</p>
                <p>Size: {formatFileSize(material.fileSize || 0)}</p>
                <p>Uploaded: {new Date(material.uploadedAt).toLocaleDateString()}</p>
              </div>

              {material.type === 'assignment' ? (
                hasSubmitted(material.id) ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg border border-green-200 text-sm font-medium">
                      <CheckCircle className="w-4 h-4" />
                      Submitted
                    </div>
                    {getSubmission(material.id)?.grade && (
                      <div className="text-center text-sm">
                        <span className="font-medium">Grade: </span>
                        <span className="text-emerald-600">{getSubmission(material.id)?.grade}%</span>
                      </div>
                    )}
                    <button
                      onClick={() => downloadMaterial(material)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                    >
                      <Download className="w-4 h-4" />
                      Download Assignment
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <button
                      onClick={() => downloadMaterial(material)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                    >
                      <Download className="w-4 h-4" />
                      Download Assignment
                    </button>
                    <button
                      onClick={() => startSubmission(material)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium"
                    >
                      <Upload className="w-4 h-4" />
                      Submit Work
                    </button>
                  </div>
                )
              ) : (
                <button
                  onClick={() => downloadMaterial(material)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
