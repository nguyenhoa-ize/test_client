import { useState, useCallback } from 'react';

interface UseFileUploadProps {
  onUploadComplete: (imageUrls: string[]) => void;
  onError: (error: string) => void;
}

export const useFileUpload = ({ onUploadComplete, onError }: UseFileUploadProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ percent: 0 });

  const uploadFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;

      setIsUploading(true);
      setUploadProgress({ percent: 0 });

      try {
        const formData = new FormData();
        for (let i = 0; i < files.length; i++) {
          formData.append('media', files[i]);
        }

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/posts/upload-media`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to upload files');
        }

        const data = await response.json();
        onUploadComplete(data.images);
        setUploadProgress({ percent: 100 });
      } catch (error) {
        onError(error instanceof Error ? error.message : 'Failed to upload files');
      } finally {
        setIsUploading(false);
      }
    },
    [onUploadComplete, onError]
  );

  return { uploadFiles, isUploading, uploadProgress };
};