import React, { useState, useRef } from 'react';
import { PhotoService, PhotoInfo, PhotoUploadProgress } from '../../services/photoService';
import {
  Upload,
  Camera,
  X,
  Plus,
  AlertCircle,
  CheckCircle,
  Loader,
  Image as ImageIcon
} from 'lucide-react';

interface PhotoUploadProps {
  destinationId: string;
  onPhotosUploaded: (photos: PhotoInfo[]) => void;
  maxPhotos?: number;
  existingPhotos?: PhotoInfo[];
  className?: string;
}

const PhotoUpload: React.FC<PhotoUploadProps> = ({
  destinationId,
  onPhotosUploaded,
  maxPhotos = 20,
  existingPhotos = [],
  className = ''
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Map<string, PhotoUploadProgress>>(new Map());
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canUploadMore = existingPhotos.length < maxPhotos;
  const remainingSlots = maxPhotos - existingPhotos.length;

  const handleFileSelect = async (files: FileList) => {
    if (!canUploadMore) {
      alert(`Maximum ${maxPhotos} Fotos erlaubt`);
      return;
    }

    const filesToUpload = Array.from(files).slice(0, remainingSlots);
    setIsUploading(true);
    setUploadProgress(new Map());

    try {
      const uploadedPhotos = await PhotoService.uploadPhotos(
        filesToUpload,
        destinationId,
        (progress) => {
          setUploadProgress(prev => new Map(prev.set(progress.photoId, progress)));
        }
      );

      // Filter out failed uploads
      const successfulUploads = uploadedPhotos.filter(photo => photo);
      
      if (successfulUploads.length > 0) {
        onPhotosUploaded(successfulUploads);
      }

      // Clear progress after a delay
      setTimeout(() => {
        setUploadProgress(new Map());
      }, 2000);

    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload fehlgeschlagen');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      handleFileSelect(files);
    }
    // Reset input value to allow same file selection
    e.target.value = '';
  };

  const progressEntries = Array.from(uploadProgress.values());
  const hasActiveUploads = progressEntries.some(p => p.status === 'uploading');
  const hasErrors = progressEntries.some(p => p.status === 'error');

  return (
    <div className={className}>
      {/* Upload Area */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        style={{
          border: isDragging 
            ? '2px dashed #3b82f6' 
            : canUploadMore 
              ? '2px dashed #d1d5db' 
              : '2px dashed #fca5a5',
          borderRadius: '12px',
          padding: '2rem',
          textAlign: 'center',
          background: isDragging 
            ? '#dbeafe' 
            : canUploadMore 
              ? '#f9fafb' 
              : '#fef2f2',
          cursor: canUploadMore ? 'pointer' : 'not-allowed',
          transition: 'all 0.2s',
          marginBottom: '1rem'
        }}
        onClick={canUploadMore ? handleButtonClick : undefined}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileInputChange}
          style={{ display: 'none' }}
          disabled={!canUploadMore || isUploading}
        />

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1rem'
        }}>
          {canUploadMore ? (
            <>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: isDragging ? '#3b82f6' : '#e5e7eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s'
              }}>
                {isUploading ? (
                  <Loader size={24} style={{ color: 'white', animation: 'spin 1s linear infinite' }} />
                ) : (
                  <Upload size={24} style={{ color: isDragging ? 'white' : '#6b7280' }} />
                )}
              </div>

              <div>
                <h3 style={{
                  margin: '0 0 0.5rem 0',
                  fontSize: '1.125rem',
                  fontWeight: '600',
                  color: '#1f2937'
                }}>
                  {isDragging ? 'Fotos hier ablegen' : 'Fotos hochladen'}
                </h3>
                
                <p style={{
                  margin: '0 0 0.5rem 0',
                  color: '#6b7280',
                  fontSize: '0.875rem'
                }}>
                  Drag & Drop oder klicken zum Auswählen
                </p>
                
                <p style={{
                  margin: 0,
                  color: '#9ca3af',
                  fontSize: '0.75rem'
                }}>
                  {remainingSlots} von {maxPhotos} Slots verfügbar • JPEG, PNG, WebP • Max 10MB
                </p>
              </div>

              <button
                style={{
                  background: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.75rem 1.5rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  transition: 'all 0.2s'
                }}
                disabled={isUploading}
              >
                <Camera size={16} />
                Fotos auswählen
              </button>
            </>
          ) : (
            <>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: '#fca5a5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <X size={24} style={{ color: 'white' }} />
              </div>

              <div>
                <h3 style={{
                  margin: '0 0 0.5rem 0',
                  fontSize: '1.125rem',
                  fontWeight: '600',
                  color: '#dc2626'
                }}>
                  Maximum erreicht
                </h3>
                
                <p style={{
                  margin: 0,
                  color: '#6b7280',
                  fontSize: '0.875rem'
                }}>
                  Sie haben bereits {maxPhotos} Fotos hochgeladen.
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Upload Progress */}
      {progressEntries.length > 0 && (
        <div style={{
          background: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          padding: '1rem',
          marginBottom: '1rem'
        }}>
          <h4 style={{
            margin: '0 0 1rem 0',
            fontSize: '1rem',
            fontWeight: '600',
            color: '#1f2937'
          }}>
            Upload Status
          </h4>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {progressEntries.map((progress) => (
              <div
                key={progress.photoId}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem',
                  background: '#f9fafb',
                  borderRadius: '6px'
                }}
              >
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: progress.status === 'error' 
                    ? '#fca5a5' 
                    : progress.status === 'completed'
                      ? '#10b981'
                      : '#3b82f6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  {progress.status === 'uploading' && (
                    <Loader size={16} style={{ color: 'white', animation: 'spin 1s linear infinite' }} />
                  )}
                  {progress.status === 'completed' && (
                    <CheckCircle size={16} style={{ color: 'white' }} />
                  )}
                  {progress.status === 'error' && (
                    <AlertCircle size={16} style={{ color: 'white' }} />
                  )}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '0.25rem'
                  }}>
                    <span style={{
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      color: '#1f2937'
                    }}>
                      Foto {progress.photoId.split('_')[1]}
                    </span>
                    
                    <span style={{
                      fontSize: '0.75rem',
                      color: progress.status === 'error' ? '#dc2626' : '#6b7280'
                    }}>
                      {progress.status === 'uploading' && `${progress.progress}%`}
                      {progress.status === 'completed' && 'Fertig'}
                      {progress.status === 'error' && (progress.error || 'Fehler')}
                    </span>
                  </div>

                  {progress.status === 'uploading' && (
                    <div style={{
                      width: '100%',
                      height: '4px',
                      background: '#e5e7eb',
                      borderRadius: '2px',
                      overflow: 'hidden'
                    }}>
                      <div
                        style={{
                          width: `${progress.progress}%`,
                          height: '100%',
                          background: '#3b82f6',
                          transition: 'width 0.3s ease'
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div style={{
            marginTop: '1rem',
            padding: '0.75rem',
            background: hasErrors ? '#fef2f2' : hasActiveUploads ? '#dbeafe' : '#ecfdf5',
            borderRadius: '6px',
            border: `1px solid ${hasErrors ? '#fca5a5' : hasActiveUploads ? '#3b82f6' : '#10b981'}`
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.875rem',
              color: hasErrors ? '#dc2626' : hasActiveUploads ? '#3b82f6' : '#059669'
            }}>
              {hasErrors ? (
                <AlertCircle size={16} />
              ) : hasActiveUploads ? (
                <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />
              ) : (
                <CheckCircle size={16} />
              )}
              
              <span>
                {hasErrors && 'Einige Uploads sind fehlgeschlagen'}
                {hasActiveUploads && 'Upload läuft...'}
                {!hasErrors && !hasActiveUploads && 'Alle Uploads abgeschlossen'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Photo Guidelines */}
      <div style={{
        background: '#f0f9ff',
        border: '1px solid #bae6fd',
        borderRadius: '8px',
        padding: '1rem'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.75rem'
        }}>
          <ImageIcon size={20} style={{ color: '#0891b2', marginTop: '0.125rem', flexShrink: 0 }} />
          
          <div>
            <h4 style={{
              margin: '0 0 0.5rem 0',
              fontSize: '0.875rem',
              fontWeight: '600',
              color: '#0891b2'
            }}>
              Foto-Richtlinien
            </h4>
            
            <ul style={{
              margin: 0,
              paddingLeft: '1rem',
              fontSize: '0.75rem',
              color: '#0c4a6e',
              lineHeight: '1.5'
            }}>
              <li>Unterstützte Formate: JPEG, PNG, WebP, HEIC</li>
              <li>Maximale Dateigröße: 10MB pro Foto</li>
              <li>Maximum {maxPhotos} Fotos pro Destination</li>
              <li>Fotos werden automatisch optimiert</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PhotoUpload;