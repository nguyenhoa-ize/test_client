import React from 'react';
import { useUser } from '../contexts/UserContext';
import FilteredInput from './FilteredInput'; 


// Component để tạo bài viết mới
const CreatePost: React.FC<{ onOpenModal: () => void }> = ({ onOpenModal }) => {
  const { user } = useUser();
  return (
    // Container chính của phần tạo bài viết
    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow">
      {/* Phần header với avatar và input */}
      <div className="flex items-center mb-4">
        {/* Avatar người dùng */}
        <img
          src={user?.photoURL || '/default-avatar.png'}
          alt="User"
          className="w-12 h-12 rounded-full object-cover mr-4 border-2 border-violet-500 hover:scale-105 transition-transform"
        />
        {/* Input nhập nội dung bài viết */}
        <FilteredInput
          type="text"
          placeholder={`Bạn đang nghĩ gì, ${user?.displayName || 'bạn'}?`}
          className="flex-1 px-4 py-3 rounded-full bg-gray-100 dark:bg-gray-700 border-none focus:ring-2 focus:ring-violet-300 focus:outline-none"
          readOnly
          onClick={onOpenModal}
        />
      </div>
      {/* Phần footer với các tùy chọn thêm vào bài viết */}
      <div className="flex justify-between gap-2 text-sm text-gray-600 dark:text-gray-400">
        {/* Tùy chọn thêm Ảnh/Video */}
        <div className="flex items-center gap-2 cursor-pointer hover:text-green-500">
          <span className="material-symbols-outlined text-lg">image</span>
          Ảnh/Video
        </div>
        {/* Tùy chọn thêm Cảm xúc */}
        <div className="flex items-center gap-2 cursor-pointer hover:text-yellow-500">
          <span className="material-symbols-outlined text-lg">emoji_emotions</span>
          Cảm xúc
        </div>
        {/* Tùy chọn thêm Vị trí */}
        <div className="flex items-center gap-2 cursor-pointer hover:text-pink-500">
          <span className="material-symbols-outlined text-lg">location_on</span>
          Vị trí
        </div>
      </div>
    </div>
  );
};

export default CreatePost;
