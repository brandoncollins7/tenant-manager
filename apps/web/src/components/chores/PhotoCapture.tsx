import { useState, useRef } from 'react';
import { Camera, Upload, X, RotateCcw } from 'lucide-react';
import { Button } from '../ui/Button';

interface PhotoCaptureProps {
  onCapture: (file: File) => void;
  onCancel: () => void;
}

export function PhotoCapture({ onCapture, onCancel }: PhotoCaptureProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCapturedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRetake = () => {
    setPreview(null);
    setCapturedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleConfirm = () => {
    if (capturedFile) {
      onCapture(capturedFile);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/80">
        <button onClick={onCancel} className="text-white p-2 touch-target">
          <X className="w-6 h-6" />
        </button>
        <span className="text-white font-medium">Take Photo</span>
        <div className="w-10" />
      </div>

      {/* Preview or Camera UI */}
      <div className="flex-1 flex items-center justify-center p-4">
        {preview ? (
          <img
            src={preview}
            alt="Preview"
            className="max-w-full max-h-full object-contain rounded-lg"
          />
        ) : (
          <div className="text-center text-white">
            <Camera className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg mb-2">Take a photo of the cleaned area</p>
            <p className="text-sm opacity-70">
              This will be used as proof of completion
            </p>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="p-4 bg-black/80 safe-bottom">
        {preview ? (
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={handleRetake}>
              <RotateCcw className="w-5 h-5 mr-2" />
              Retake
            </Button>
            <Button variant="success" className="flex-1" onClick={handleConfirm}>
              Use Photo
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {/* Camera button (for mobile) */}
            <label className="btn-primary w-full flex items-center justify-center gap-2 cursor-pointer">
              <Camera className="w-5 h-5" />
              Take Photo
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>

            {/* Upload button (fallback) */}
            <label className="btn-secondary w-full flex items-center justify-center gap-2 cursor-pointer">
              <Upload className="w-5 h-5" />
              Upload from Gallery
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>
        )}
      </div>
    </div>
  );
}
