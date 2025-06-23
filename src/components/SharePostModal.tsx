import React, { useState, useContext } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { UserContext } from '../contexts/UserContext';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import axios from 'axios';
import FilteredTextarea from './FilteredTextarea';
import { useForbiddenWords } from '../contexts/ForbiddenWordsContext';
import { filterForbiddenWords, getForbiddenWordsInText } from '../utils/filterForbiddenWords';

interface PostContent {
  id: string;
  name: string;
  content: string;
  images?: string[];
  avatar_url?: string;
}

interface SharePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: PostContent;
  onShared: (newPost: any) => void;
  typePost: 'positive' | 'negative';
}

const SharePostModal: React.FC<SharePostModalProps> = ({ isOpen, onClose, post, onShared, typePost }) => {
  const [shareText, setShareText] = useState('');
  const { user } = useContext(UserContext);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const forbiddenWords = useForbiddenWords();

  if (!isOpen) return null;

  const handleShare = async () => {
    if (!user?.id) {
      toast.error('Bạn cần đăng nhập để chia sẻ bài viết!');
      return;
    }
    // Kiểm tra từ cấm
    const found = getForbiddenWordsInText(shareText, forbiddenWords);
    if (found.length > 0) {
      toast.error(`Nội dung có chứa từ cấm: "${found.join(', ')}"`);
      return;
    }

    try {
      const res = await axios.post('/api/posts', {
        user_id: user.id,
        content: shareText || `Đã chia sẻ một bài viết từ ${post.name}`,
        shared_post_id: post.id,
        privacy: 'public',
        type_post: typePost,
        images: null,
        feeling: null,
        location: null,
      }, {
        baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000',
      });

      await axios.post('/api/posts/increment-shares', {
        postId: post.id,
      }, {
        baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000',
      });

      toast.success('Bài viết đã được chia sẻ thành công!');
      onShared(res.data);
    } catch (error) {
      console.error('Lỗi khi chia sẻ bài viết:', error);
      toast.error('Có lỗi xảy ra khi chia sẻ bài viết. Vui lòng thử lại!');
    }
  };

  const handleReport = () => {
    if (!user?.id) {
      toast.info('Bạn cần đăng nhập để thực hiện chức năng này!');
      return;
    }
    // TODO: Hiện modal report hoặc xử lý report
    toast.info('Chức năng report sẽ được cập nhật!');
  };

  const handleLike = async () => {
    if (!user?.id || !post.id) {
      toast.info('Bạn cần đăng nhập để thực hiện chức năng này!');
      return;
    }
    const endpoint = liked ? '/api/likes/unlike' : '/api/likes/like';
    try {
      const response = await axios.post(endpoint, 
        { post_id: post.id, user_id: user.id },
        { baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000' }
      );
      setLiked(!liked);
      setLikeCount(response.data.likeCount);
    } catch (error) {
      console.error('Error handling like:', error);
    }
  };

  React.useEffect(() => {
    if (user?.id && post.id) {
      axios.get('/api/likes/is-liked', {
        params: { post_id: post.id, user_id: user.id },
        baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000',
      }).then(res => {
        setLiked(res.data.liked);
        setLikeCount(res.data.likeCount);
      });
    }
  }, [user?.id, post.id]);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const modalContent = (
    <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50" style={{ backdropFilter: 'blur(5px)' }} onClick={handleBackdropClick}>
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -50 }}
        className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md mx-4 relative"
        onClick={e => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-3 right-3 p-2 rounded-full hover:bg-gray-100 transition-colors">
          <span className="material-symbols-outlined text-2xl text-gray-500">close</span>
        </button>
        <div className="flex items-center gap-3 mb-2">
          {user && (
            <img src={user.avatar_url || '/default-avatar.png'} alt="User Avatar" className="w-12 h-12 rounded-full object-cover" />
          )}
          <div className="flex-grow">
            <span className="font-medium text-slate-900 block">{user ? `${user.first_name} ${user.last_name}` : ''}</span>
            <span className="text-sm text-slate-500 block">{new Date().toLocaleString('vi-VN')}</span>
          </div>
        </div>

        <div className="space-y-4 mt-2">
          <FilteredTextarea
            className="w-full p-3 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={4}
            placeholder="Hãy nói gì đó về nội dung này..."
            value={shareText}
            onChange={(e) => setShareText(e.target.value)}
          />
          <div className="bg-gray-50 border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <img src={post.avatar_url || '/default-avatar.png'} alt={post.name} className="w-8 h-8 rounded-full object-cover" />
              <span className="font-semibold">{post.name}</span>
              <span className="text-gray-500 text-xs">{new Date().toLocaleString('vi-VN')}</span>
            </div>
            <div className="mb-2 text-slate-900 whitespace-pre-wrap">{post.content}</div>
            {post.images && post.images.length > 0 && (
              <div className={`grid ${post.images.length > 1 ? 'grid-cols-2' : 'grid-cols-1'} gap-2 mb-2`}>
                {post.images.map((img, idx) => (
                  <div key={idx} className="aspect-video bg-slate-100 rounded-xl flex items-center justify-center">
                    <img src={img} alt={`post-img-${idx}`} className="object-cover w-full h-full rounded-xl" />
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex justify-end mt-4">
            <button
              onClick={handleShare}
              className="px-6 py-3 rounded-lg bg-blue-500 text-white font-bold hover:bg-blue-600 transition-colors w-full"
            >
              Chia sẻ ngay
            </button>
          </div>
        </div>
        <ToastContainer position="bottom-right" autoClose={3000} hideProgressBar newestOnTop closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover />
      </motion.div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default SharePostModal; 