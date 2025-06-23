import { FC } from 'react';
import { MaterialIcon } from './MaterialIcon';

interface ImageUploadModalProps {
  isOpen: boolean;
  isUploading: boolean;
  uploadProgress: number;
  onClose: () => void;
  onUpload: (files: FileList) => Promise<void>;
}

export const ImageUploadModal: FC<ImageUploadModalProps> = ({
  isOpen,
  isUploading,
  uploadProgress,
  onClose,
  onUpload
}) => {
  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await onUpload(files);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 z-10">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Upload Images</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
            aria-label="Close"
          >
            <MaterialIcon icon="close" />
          </button>
        </div>
        
        {isUploading ? (
          <div className="py-4">
            <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
              <div 
                className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300" 
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            <p className="text-center text-gray-500">
              Uploading {uploadProgress}%...
            </p>
          </div>
        ) : (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-indigo-400 transition-colors">
            <MaterialIcon icon="cloud_upload" className="text-4xl text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500 mb-3">Drag & drop images here</p>
            <p className="text-gray-400 text-sm mb-4">or</p>
            <label className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors cursor-pointer">
              Select Files
              <input
                type="file"
                className="hidden"
                onChange={handleFileChange}
                accept="image/*"
                multiple
              />
            </label>
          </div>
        )}
      </div>
    </div>
  );
};