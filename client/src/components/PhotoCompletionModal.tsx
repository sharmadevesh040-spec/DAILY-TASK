import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  Upload,
  X,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Loader2,
  FileImage,
  Info,
  Clock,
  Timer,
  AlertOctagon,
} from 'lucide-react';
import { Task, TaskProof } from '../types';
import { taskService } from '../services/task.service';
import { useToastContext } from '../context/ToastContext';

interface Props {
  task: Task;
  onClose: () => void;
  onSuccess: (updatedTask: Task, proof: TaskProof) => void;
}

type Step = 'select' | 'camera' | 'preview' | 'submitting' | 'result';

export function getTaskDeadlineInfo(task: Task): {
  hasDeadline: boolean;
  deadline: Date | null;
  isExpired: boolean;
  remainingText: string;
  formattedDeadline: string;
} {
  if (!task.dueDate) {
    return {
      hasDeadline: false,
      deadline: null,
      isExpired: false,
      remainingText: 'No deadline set',
      formattedDeadline: 'No time limit',
    };
  }

  const dateStr = task.dueDate.includes('T') ? task.dueDate.split('T')[0] : task.dueDate;
  const [year, month, day] = dateStr.split('-').map(Number);

  let hours = 23;
  let minutes = 59;
  if (task.dueTime) {
    const parts = task.dueTime.split(':').map(Number);
    if (!isNaN(parts[0]) && !isNaN(parts[1])) {
      hours = parts[0];
      minutes = parts[1];
    }
  }

  const deadline = new Date(year, month - 1, day, hours, minutes, 59, 999);
  const now = new Date();
  const diffMs = deadline.getTime() - now.getTime();
  const isExpired = diffMs <= 0;

  const formattedDeadline = deadline.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  if (isExpired) {
    const elapsedMins = Math.abs(Math.floor(diffMs / (60 * 1000)));
    let text = `${elapsedMins}m ago`;
    if (elapsedMins >= 60) {
      const h = Math.floor(elapsedMins / 60);
      const m = elapsedMins % 60;
      text = `${h}h ${m}m ago`;
    }
    return {
      hasDeadline: true,
      deadline,
      isExpired: true,
      remainingText: `Expired ${text}`,
      formattedDeadline,
    };
  }

  const totalMinutes = Math.floor(diffMs / (60 * 1000));
  let remainingText = `${totalMinutes}m remaining`;
  if (totalMinutes >= 60) {
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    remainingText = `${h}h ${m}m remaining`;
  }

  return {
    hasDeadline: true,
    deadline,
    isExpired: false,
    remainingText,
    formattedDeadline,
  };
}

async function compressImageIfNeeded(file: File): Promise<File> {
  // If file is already small (e.g. <= 1.5MB), return as is
  if (file.size <= 1.5 * 1024 * 1024) {
    return file;
  }

  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const canvas = document.createElement('canvas');
      let { width, height } = img;
      const MAX_DIM = 1920;
      if (width > MAX_DIM || height > MAX_DIM) {
        if (width > height) {
          height = Math.round((height * MAX_DIM) / width);
          width = MAX_DIM;
        } else {
          width = Math.round((width * MAX_DIM) / height);
          height = MAX_DIM;
        }
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(file);
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) return resolve(file);
          const compressed = new File([blob], file.name.replace(/\.[^/.]+$/, '.jpg'), {
            type: 'image/jpeg',
          });
          resolve(compressed);
        },
        'image/jpeg',
        0.85
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };
    img.src = objectUrl;
  });
}

export default function PhotoCompletionModal({ task, onClose, onSuccess }: Props) {
  const { toast } = useToastContext();

  const [step, setStep] = useState<Step>('select');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    verified: boolean;
    feedback: string;
    confidence: number;
    updatedTask?: Task;
    proof?: TaskProof;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Stop camera stream when unmounting
  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, []);

  function stopCameraStream() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }

  // Handle live webcam capture
  async function startLiveCamera() {
    try {
      stopCameraStream();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      setStep('camera');
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 100);
    } catch (err: any) {
      console.warn('Camera access error:', err);
      toast('Could not open camera stream. Please use standard file or photo capture.', 'info');
      // Fallback to native camera input
      cameraInputRef.current?.click();
    }
  }

  function capturePhotoFromStream() {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `task-proof-${Date.now()}.jpg`, { type: 'image/jpeg' });
        stopCameraStream();
        handleSelectedFile(file);
      },
      'image/jpeg',
      0.9
    );
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      handleSelectedFile(file);
    }
  }

  async function handleSelectedFile(file: File) {
    const validExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.heic', '.heif'];
    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    const isImage = file.type.startsWith('image/') || validExtensions.includes(ext);

    if (!isImage) {
      toast('Please upload a valid image (JPEG, PNG, WEBP, or HEIC)', 'error');
      return;
    }

    try {
      const processedFile = await compressImageIfNeeded(file);

      // Validate size (10MB max after compression)
      const MAX_SIZE = 10 * 1024 * 1024;
      if (processedFile.size > MAX_SIZE) {
        toast('Image exceeds the 10MB size limit. Please choose a smaller photo.', 'error');
        return;
      }

      setSelectedFile(processedFile);
      const objectUrl = URL.createObjectURL(processedFile);
      setPreviewUrl(objectUrl);
      setStep('preview');
    } catch {
      setSelectedFile(file);
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
      setStep('preview');
    }
  }

  function handleRetake() {
    stopCameraStream();
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(null);
    setPreviewUrl(null);
    setVerificationResult(null);
    setStep('select');
  }

  const deadlineInfo = getTaskDeadlineInfo(task);

  async function handleSubmit() {
    if (!selectedFile) return;

    if (deadlineInfo.isExpired) {
      toast('The submission time limit for this task has expired. Submissions must be uploaded before the deadline.', 'error');
      return;
    }

    setStep('submitting');
    setUploadProgress(0);
    setIsVerifying(false);

    try {
      const response = await taskService.submitCompletion(
        task.id,
        selectedFile,
        notes.trim() || undefined,
        (progress) => {
          setUploadProgress(progress);
          if (progress >= 100) {
            setIsVerifying(true);
          }
        }
      );

      setVerificationResult({
        verified: response.verified,
        feedback: response.feedback,
        confidence: response.confidence,
        updatedTask: response.task,
        proof: response.proof,
      });

      setStep('result');

      if (response.verified) {
        toast('Task verified & completed! 🎉', 'success');
        // Notify parent
        onSuccess(response.task, response.proof);
      } else {
        toast('Verification was not approved. Please see feedback.', 'error');
      }
    } catch (err: any) {
      console.error('Submission error:', err);
      toast(err?.response?.data?.message || 'Failed to submit completion photo', 'error');
      setStep('preview');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh]">
        {/* ── Modal Header ──────────────────────────────────────────────── */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between shrink-0 bg-gray-50/50">
          <div className="min-w-0 pr-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-primary-100 text-primary-700 text-xs font-semibold">
                AI
              </span>
              <h2 className="text-base font-semibold text-gray-900 truncate">
                Photo Task Completion
              </h2>
            </div>
            <p className="text-xs text-gray-500 truncate mt-0.5" title={task.title}>
              For: <span className="font-medium text-gray-700">{task.title}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Modal Content ──────────────────────────────────────────────── */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* ── Time Limit & Deadline Status Banner ────────────────────────── */}
          {deadlineInfo.hasDeadline && (
            <div
              className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs transition-colors ${
                deadlineInfo.isExpired
                  ? 'bg-red-50 border-red-200 text-red-800'
                  : 'bg-emerald-50/90 border-emerald-200 text-emerald-900'
              }`}
            >
              {deadlineInfo.isExpired ? (
                <AlertOctagon className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              ) : (
                <Timer className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="font-semibold">
                    {deadlineInfo.isExpired ? 'Time Limit Expired' : 'Task Time Limit'}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                      deadlineInfo.isExpired
                        ? 'bg-red-200/80 text-red-900'
                        : 'bg-emerald-200/70 text-emerald-800'
                    }`}
                  >
                    {deadlineInfo.remainingText}
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] opacity-90 leading-relaxed">
                  Deadline: <span className="font-medium">{deadlineInfo.formattedDeadline}</span>.
                  {deadlineInfo.isExpired
                    ? ' Submissions are locked because the deadline has passed. Please update the deadline if you need more time.'
                    : ' Compare with your deadline before submitting. You are within the time limit and ready to upload proof.'}
                </p>
              </div>
            </div>
          )}
          {/* STEP 1: Select Mode */}
          {step === 'select' && (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-xl flex items-start gap-2.5 text-xs text-blue-800">
                <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <p>
                  To complete this task, upload or capture a photo showing evidence or progress.
                  Our AI verification assistant reviews the photo for visual relevance before completing the task.
                </p>
              </div>

              {/* Action buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {/* Take Photo button */}
                <button
                  onClick={startLiveCamera}
                  className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-primary-200 rounded-xl bg-primary-50/40 hover:bg-primary-50 hover:border-primary-400 transition-all text-center group"
                >
                  <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 group-hover:scale-110 transition-transform mb-2">
                    <Camera className="w-6 h-6" />
                  </div>
                  <span className="font-medium text-sm text-gray-900">Take Photo</span>
                  <span className="text-xs text-gray-500 mt-0.5">Use camera or webcam</span>
                </button>

                {/* Upload from Gallery button */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50 hover:bg-gray-100/70 hover:border-gray-300 transition-all text-center group"
                >
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 group-hover:scale-110 transition-transform mb-2">
                    <Upload className="w-6 h-6" />
                  </div>
                  <span className="font-medium text-sm text-gray-900">Upload Image</span>
                  <span className="text-xs text-gray-500 mt-0.5">JPEG, PNG, WEBP, HEIC</span>
                </button>
              </div>

              {/* Hidden file inputs */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,image/heic"
                className="hidden"
                onChange={handleFileChange}
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          )}

          {/* STEP 2: Live Camera View */}
          {step === 'camera' && (
            <div className="space-y-4">
              <div className="relative rounded-xl overflow-hidden bg-black aspect-video sm:aspect-4/3 flex items-center justify-center">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    stopCameraStream();
                    setStep('select');
                  }}
                  className="btn-secondary py-2.5 px-4"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={capturePhotoFromStream}
                  className="btn-primary py-2.5 px-6 gap-2 flex-1"
                >
                  <Camera className="w-4 h-4" />
                  <span>Capture Photo</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Preview & Notes */}
          {step === 'preview' && previewUrl && (
            <div className="space-y-4">
              <div className="relative rounded-xl overflow-hidden border border-gray-200 bg-gray-900 flex items-center justify-center max-h-72">
                <img
                  src={previewUrl}
                  alt="Task proof preview"
                  className="max-h-72 w-full object-contain"
                />
                <button
                  type="button"
                  onClick={handleRetake}
                  className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-lg p-1.5 transition-colors"
                  title="Retake photo"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>

              {/* File details */}
              {selectedFile && (
                <div className="flex items-center justify-between text-xs text-gray-500 px-1">
                  <span className="flex items-center gap-1 truncate max-w-[200px]">
                    <FileImage className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    {selectedFile.name}
                  </span>
                  <span>{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</span>
                </div>
              )}

              {/* Optional Notes */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Completion Notes (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Completed today at 4pm, cleaned workspace and checked off list."
                  rows={2}
                  className="input-field text-xs resize-none"
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleRetake}
                  className="btn-secondary py-2.5 px-4"
                >
                  Retake / Change
                </button>

                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={deadlineInfo.isExpired}
                  className={`py-2.5 px-6 gap-2 flex-1 rounded-lg font-medium text-sm transition-colors duration-150 inline-flex items-center justify-center ${
                    deadlineInfo.isExpired
                      ? 'bg-red-100 text-red-600 border border-red-200 cursor-not-allowed opacity-80'
                      : 'btn-primary'
                  }`}
                  title={deadlineInfo.isExpired ? 'Cannot submit past time limit' : 'Verify & Complete'}
                >
                  {deadlineInfo.isExpired ? (
                    <>
                      <AlertOctagon className="w-4 h-4 text-red-600" />
                      <span>Time Limit Expired</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-primary-200" />
                      <span>Verify & Complete</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Submitting & AI Verification */}
          {step === 'submitting' && (
            <div className="py-10 text-center space-y-4">
              <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-4 border-primary-100 animate-pulse" />
                <div className="w-12 h-12 rounded-full bg-primary-600 text-white flex items-center justify-center">
                  <Sparkles className="w-6 h-6 animate-spin text-yellow-200" />
                </div>
              </div>

              <div className="space-y-1">
                <h3 className="text-base font-semibold text-gray-900">
                  {isVerifying ? 'Analyzing Photo with AI...' : 'Uploading Image...'}
                </h3>
                <p className="text-xs text-gray-500 max-w-xs mx-auto">
                  {isVerifying
                    ? 'Assessing photo visual relevance against task details...'
                    : `Uploading secure object storage (${uploadProgress}%)`}
                </p>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden max-w-xs mx-auto">
                <div
                  className="bg-primary-600 h-full transition-all duration-300 rounded-full"
                  style={{ width: `${isVerifying ? 100 : uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* STEP 5: Verification Result */}
          {step === 'result' && verificationResult && (
            <div className="py-4 space-y-4 text-center">
              {verificationResult.verified ? (
                /* SUCCESS STATE */
                <div className="space-y-4 animate-scale-in">
                  <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Task Completed! 🎉</h3>
                    <p className="text-xs text-gray-500 mt-1">Photo verification was accepted.</p>
                  </div>

                  <div className="p-3.5 bg-green-50/70 border border-green-200 rounded-xl text-left text-xs space-y-1.5">
                    <div className="font-semibold text-green-900 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-green-600" />
                      AI Verification Feedback
                    </div>
                    <p className="text-green-800 leading-relaxed">
                      {verificationResult.feedback}
                    </p>
                    {verificationResult.confidence && (
                      <div className="text-[11px] text-green-600 pt-1 font-medium">
                        Relevance Confidence: {Math.round(verificationResult.confidence * 100)}%
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={onClose}
                    className="btn-primary w-full py-2.5"
                  >
                    Done
                  </button>
                </div>
              ) : (
                /* REJECTED STATE */
                <div className="space-y-4 animate-scale-in">
                  <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto">
                    <AlertTriangle className="w-10 h-10" />
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Photo Not Verified</h3>
                    <p className="text-xs text-gray-500 mt-1">
                      Task remains incomplete. Please review the guidance below.
                    </p>
                  </div>

                  <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl text-left text-xs space-y-1.5">
                    <div className="font-semibold text-amber-900 flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5 text-amber-600" />
                      Verification Feedback
                    </div>
                    <p className="text-amber-800 leading-relaxed">
                      {verificationResult.feedback}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={onClose}
                      className="btn-secondary py-2.5 px-4 flex-1 text-xs"
                    >
                      Close for Now
                    </button>
                    <button
                      type="button"
                      onClick={handleRetake}
                      className="btn-primary py-2.5 px-4 flex-1 gap-1.5 text-xs"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Submit New Photo</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
