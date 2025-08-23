import React from 'react';
import { render, screen, fireEvent, waitFor } from '../../../test-utils';
import PhotoUpload from '../PhotoUpload';
import { PhotoService } from '../../../services/photoService';

// Mock file for testing
const createMockFile = (name: string, type: string = 'image/jpeg', size: number = 1024) => {
  const file = new File(['mock content'], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

describe('PhotoUpload', () => {
  const mockOnUploadComplete = jest.fn();
  const mockOnUploadProgress = jest.fn();
  const mockOnError = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock PhotoService methods
    (PhotoService.uploadPhoto as jest.Mock).mockResolvedValue('mock-photo-url');
    (PhotoService.generateThumbnail as jest.Mock).mockResolvedValue('mock-thumbnail-url');
    (PhotoService.extractMetadata as jest.Mock).mockResolvedValue({
      size: 1024,
      type: 'image/jpeg',
      dimensions: { width: 800, height: 600 }
    });
  });

  it('renders without crashing', () => {
    render(
      <PhotoUpload
        onUploadComplete={mockOnUploadComplete}
        onUploadProgress={mockOnUploadProgress}
        onError={mockOnError}
      />
    );
    
    expect(screen.getByText('Fotos auswählen oder hier ablegen')).toBeInTheDocument();
  });

  it('accepts file selection via file input', async () => {
    render(
      <PhotoUpload
        onUploadComplete={mockOnUploadComplete}
        onUploadProgress={mockOnUploadProgress}
        onError={mockOnError}
      />
    );
    
    const fileInput = screen.getByLabelText('Fotos hochladen');
    const file = createMockFile('test-photo.jpg');
    
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    await waitFor(() => {
      expect(screen.getByText('test-photo.jpg')).toBeInTheDocument();
    });
  });

  it('validates file types correctly', async () => {
    render(
      <PhotoUpload
        onUploadComplete={mockOnUploadComplete}
        onUploadProgress={mockOnUploadProgress}
        onError={mockOnError}
        acceptedTypes={['image/jpeg', 'image/png']}
      />
    );
    
    const fileInput = screen.getByLabelText('Fotos hochladen');
    const invalidFile = createMockFile('document.pdf', 'application/pdf');
    
    fireEvent.change(fileInput, { target: { files: [invalidFile] } });
    
    await waitFor(() => {
      expect(mockOnError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Dateityp nicht unterstützt')
        })
      );
    });
  });

  it('validates file size limits', async () => {
    render(
      <PhotoUpload
        onUploadComplete={mockOnUploadComplete}
        onUploadProgress={mockOnUploadProgress}
        onError={mockOnError}
        maxFileSize={500} // 500 bytes limit
      />
    );
    
    const fileInput = screen.getByLabelText('Fotos hochladen');
    const largeFile = createMockFile('large-photo.jpg', 'image/jpeg', 1024); // 1KB > 500 bytes
    
    fireEvent.change(fileInput, { target: { files: [largeFile] } });
    
    await waitFor(() => {
      expect(mockOnError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Datei zu groß')
        })
      );
    });
  });

  it('limits number of files correctly', async () => {
    render(
      <PhotoUpload
        onUploadComplete={mockOnUploadComplete}
        onUploadProgress={mockOnUploadProgress}
        onError={mockOnError}
        maxFiles={2}
      />
    );
    
    const fileInput = screen.getByLabelText('Fotos hochladen');
    const files = [
      createMockFile('photo1.jpg'),
      createMockFile('photo2.jpg'),
      createMockFile('photo3.jpg') // This should be rejected
    ];
    
    fireEvent.change(fileInput, { target: { files } });
    
    await waitFor(() => {
      expect(mockOnError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Maximale Anzahl')
        })
      );
    });
  });

  it('shows upload progress correctly', async () => {
    render(
      <PhotoUpload
        onUploadComplete={mockOnUploadComplete}
        onUploadProgress={mockOnUploadProgress}
        onError={mockOnError}
      />
    );
    
    const fileInput = screen.getByLabelText('Fotos hochladen');
    const file = createMockFile('test-photo.jpg');
    
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    // Wait for file to be processed
    await waitFor(() => {
      expect(screen.getByText('test-photo.jpg')).toBeInTheDocument();
    });
    
    // Start upload
    const uploadButton = screen.getByRole('button', { name: /Hochladen/i });
    fireEvent.click(uploadButton);
    
    await waitFor(() => {
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
  });

  it('handles successful upload', async () => {
    render(
      <PhotoUpload
        onUploadComplete={mockOnUploadComplete}
        onUploadProgress={mockOnUploadProgress}
        onError={mockOnError}
      />
    );
    
    const fileInput = screen.getByLabelText('Fotos hochladen');
    const file = createMockFile('test-photo.jpg');
    
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    await waitFor(() => {
      expect(screen.getByText('test-photo.jpg')).toBeInTheDocument();
    });
    
    const uploadButton = screen.getByRole('button', { name: /Hochladen/i });
    fireEvent.click(uploadButton);
    
    await waitFor(() => {
      expect(mockOnUploadComplete).toHaveBeenCalledWith([
        expect.objectContaining({
          url: 'mock-photo-url',
          thumbnailUrl: 'mock-thumbnail-url',
          metadata: expect.any(Object)
        })
      ]);
    });
  });

  it('handles upload errors', async () => {
    (PhotoService.uploadPhoto as jest.Mock).mockRejectedValue(new Error('Upload failed'));
    
    render(
      <PhotoUpload
        onUploadComplete={mockOnUploadComplete}
        onUploadProgress={mockOnUploadProgress}
        onError={mockOnError}
      />
    );
    
    const fileInput = screen.getByLabelText('Fotos hochladen');
    const file = createMockFile('test-photo.jpg');
    
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    await waitFor(() => {
      expect(screen.getByText('test-photo.jpg')).toBeInTheDocument();
    });
    
    const uploadButton = screen.getByRole('button', { name: /Hochladen/i });
    fireEvent.click(uploadButton);
    
    await waitFor(() => {
      expect(mockOnError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Upload failed'
        })
      );
    });
  });

  it('allows removing files before upload', async () => {
    render(
      <PhotoUpload
        onUploadComplete={mockOnUploadComplete}
        onUploadProgress={mockOnUploadProgress}
        onError={mockOnError}
      />
    );
    
    const fileInput = screen.getByLabelText('Fotos hochladen');
    const file = createMockFile('test-photo.jpg');
    
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    await waitFor(() => {
      expect(screen.getByText('test-photo.jpg')).toBeInTheDocument();
    });
    
    const removeButton = screen.getByRole('button', { name: /Entfernen/i });
    fireEvent.click(removeButton);
    
    expect(screen.queryByText('test-photo.jpg')).not.toBeInTheDocument();
  });

  it('supports drag and drop', async () => {
    render(
      <PhotoUpload
        onUploadComplete={mockOnUploadComplete}
        onUploadProgress={mockOnUploadProgress}
        onError={mockOnError}
      />
    );
    
    const dropZone = screen.getByText('Fotos auswählen oder hier ablegen').closest('[data-testid="drop-zone"]');
    const file = createMockFile('dropped-photo.jpg');
    
    const dropEvent = new Event('drop', { bubbles: true });
    Object.defineProperty(dropEvent, 'dataTransfer', {
      value: {
        files: [file],
        types: ['Files']
      }
    });
    
    fireEvent(dropZone!, dropEvent);
    
    await waitFor(() => {
      expect(screen.getByText('dropped-photo.jpg')).toBeInTheDocument();
    });
  });

  it('shows preview thumbnails', async () => {
    render(
      <PhotoUpload
        onUploadComplete={mockOnUploadComplete}
        onUploadProgress={mockOnUploadProgress}
        onError={mockOnError}
        showPreview={true}
      />
    );
    
    const fileInput = screen.getByLabelText('Fotos hochladen');
    const file = createMockFile('test-photo.jpg');
    
    // Mock FileReader
    const mockFileReader = {
      readAsDataURL: jest.fn(),
      result: 'data:image/jpeg;base64,mock-data-url',
      onload: null as any
    };
    
    global.FileReader = jest.fn(() => mockFileReader) as any;
    
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    // Trigger FileReader onload
    mockFileReader.onload();
    
    await waitFor(() => {
      const preview = screen.getByAltText('test-photo.jpg preview');
      expect(preview).toBeInTheDocument();
      expect(preview).toHaveAttribute('src', 'data:image/jpeg;base64,mock-data-url');
    });
  });

  it('handles multiple file upload correctly', async () => {
    render(
      <PhotoUpload
        onUploadComplete={mockOnUploadComplete}
        onUploadProgress={mockOnUploadProgress}
        onError={mockOnError}
        multiple={true}
      />
    );
    
    const fileInput = screen.getByLabelText('Fotos hochladen');
    const files = [
      createMockFile('photo1.jpg'),
      createMockFile('photo2.jpg')
    ];
    
    fireEvent.change(fileInput, { target: { files } });
    
    await waitFor(() => {
      expect(screen.getByText('photo1.jpg')).toBeInTheDocument();
      expect(screen.getByText('photo2.jpg')).toBeInTheDocument();
    });
    
    const uploadButton = screen.getByRole('button', { name: /Hochladen/i });
    fireEvent.click(uploadButton);
    
    await waitFor(() => {
      expect(mockOnUploadComplete).toHaveBeenCalledWith([
        expect.objectContaining({ url: 'mock-photo-url' }),
        expect.objectContaining({ url: 'mock-photo-url' })
      ]);
    });
  });
});