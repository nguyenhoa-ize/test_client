// Component InputSection hiển thị phần nhập liệu để tạo bài đăng mới
import { useUser } from '@/contexts/UserContext';
import { useRef } from 'react';
import gsap from 'gsap';
import FilteredInput from './FilteredInput'; 


const InputSection = ({ onOpenModal, theme }: { onOpenModal?: () => void, theme?: string }) => {
  const { user } = useUser();
  const inputRef = useRef<HTMLInputElement>(null);
  const bgColor = theme === 'reflective' ? '#E3D5CA' : '#fff';
  const hoverBg = theme === 'reflective' ? '#E3D5CA' : '#B7CCEC';

  // Animation on focus
  const handleFocus = () => {
    if (inputRef.current) {
      gsap.to(inputRef.current, { boxShadow: '0 4px 24px 0 rgba(140,169,213,0.18)', scale: 1.04, duration: 0.3, ease: 'power2.out' });
    }
  };
  const handleBlur = () => {
    if (inputRef.current) {
      gsap.to(inputRef.current, { boxShadow: 'none', scale: 1, duration: 0.22, ease: 'power2.inOut' });
    }
  };

  return (
    <div style={{ background: bgColor }} className="rounded-[20px] border border-black/20 w-full my-4 sm:my-6 px-4 sm:px-6 py-4 sm:py-5 shadow-lg flex flex-col gap-3 transition-all duration-300">
      <div className="flex items-center gap-3 sm:gap-4 mb-2">
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-tr from-indigo-200 via-blue-100 to-pink-100 flex items-center justify-center overflow-hidden border-2 border-indigo-200 shadow">
          {user?.avatar_url ? (
            <img src={user.avatar_url} alt="avatar" className="w-full h-full object-cover" />
          ) : (
            <span className="material-symbols-outlined text-black text-2xl sm:text-3xl">person</span>
          )}
        </div>
        <div className="flex flex-col flex-1">
          <span className="font-semibold text-slate-900 text-sm sm:text-base leading-tight">{user ? `${user.first_name} ${user.last_name}` : 'Bạn'}</span>
          <FilteredInput
            ref={inputRef}
            type="text"
            placeholder="Bạn đang nghĩ gì hôm nay?..."
            className="mt-1 px-3 sm:px-4 py-2 rounded-full border border-black/20 bg-white text-sm sm:text-base font-normal placeholder:text-gray-400 focus:outline-none text-black shadow-sm transition-all duration-200"
            readOnly
            onClick={onOpenModal}
            onFocus={handleFocus}
            onBlur={handleBlur}
          />
        </div>
      </div>
      {/* Các công cụ hỗ trợ đăng bài */}
      <div className="flex items-center justify-between px-2 mt-1">
        <div className="flex gap-2">
          {/* Icon thêm hình ảnh */}
          <span className="material-symbols-outlined text-indigo-500 text-xl sm:text-2xl cursor-pointer rounded-md transition-all duration-150 hover:bg-indigo-100 hover:scale-110">image</span>
          {/* Icon ghi âm */}
          <span className="material-symbols-outlined text-pink-400 text-xl sm:text-2xl cursor-pointer rounded-md transition-all duration-150 hover:bg-pink-100 hover:scale-110">mic</span>
          {/* Icon thêm cảm xúc */}
          <span className="material-symbols-outlined text-yellow-500 text-xl sm:text-2xl cursor-pointer rounded-md transition-all duration-150 hover:bg-yellow-100 hover:scale-110">mood</span>
          {/* Icon tùy chọn khác */}
          <span className="material-symbols-outlined text-gray-500 text-xl sm:text-2xl cursor-pointer rounded-md transition-all duration-150 hover:bg-gray-100 hover:scale-110">more_horiz</span>
        </div>
        {/* Icon gửi bài đăng */}
        <span className="material-symbols-outlined text-green-500 text-xl sm:text-2xl cursor-pointer rounded-md transition-all duration-150 hover:bg-green-100 hover:scale-110">send</span>
      </div>
    </div>
  );
};

export default InputSection;