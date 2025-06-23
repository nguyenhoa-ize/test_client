import React, { useEffect, useRef, useState, useCallback } from 'react';
import axios from 'axios';
import gsap from 'gsap';
import Toast from './Toast';
import FilteredInput from './FilteredInput';


interface Comment {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
}

export default function CommentsSection({ postId, currentUser, onCommentAdded }: { postId: string, currentUser: any, onCommentAdded?: (inc?: number) => void }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const inputGroupRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [visibleCount, setVisibleCount] = useState(4); // Số comment hiển thị ban đầu
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const COMMENTS_PER_PAGE = 10;
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error' | 'info' | 'warning'}|null>(null);

  // Lấy danh sách comment khi mở post hoặc khi page thay đổi
  useEffect(() => {
    const fetchComments = async () => {
      const res = await axios.get(`/api/comments?post_id=${postId}&page=${page}&limit=${COMMENTS_PER_PAGE}`, {
        baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000',
      });
      if (page === 1) {
        setComments(res.data);
      } else {
        setComments(prev => [...prev, ...res.data]);
      }
      setHasMore(res.data.length === COMMENTS_PER_PAGE);
    };
    fetchComments();
  }, [postId, page]);

  useEffect(() => {
    if (inputGroupRef.current) {
      gsap.fromTo(
        inputGroupRef.current,
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.5, delay: 0.6, ease: 'power3.out' }
      );
    }
  }, []);

  useEffect(() => {
    setVisibleCount(COMMENTS_PER_PAGE); // Reset khi đổi post
    setPage(1);
  }, [postId]);

  // Lazy load: tăng số lượng comment hiển thị khi kéo gần cuối vùng comment
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 100) {
      if (visibleCount < comments.length) {
        setVisibleCount((prev) => Math.min(prev + COMMENTS_PER_PAGE, comments.length));
      } else if (hasMore) {
        setPage((prev) => prev + 1);
      }
    }
  }, [comments.length, visibleCount, hasMore]);

  // Thêm comment mới
  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    setLoading(true);
    try {
      const res = await axios.post('/api/comments', {
        post_id: postId,
        user_id: currentUser.id,
        content: newComment,
      }, {
        baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000',
      });
      // Merge thêm thông tin user hiện tại để hiển thị ngay
      const comment: Comment = {
        ...res.data,
        first_name: currentUser.first_name,
        last_name: currentUser.last_name,
        avatar_url: currentUser.avatar_url,
      };
      setComments(prev => [...prev, comment]);
      setNewComment('');
      if (onCommentAdded) {
        onCommentAdded(1); // truyền số lượng comment tăng thêm
      }
    } catch (err) {
      setToast({ message: 'Bình luận thất bại', type: 'error' });
    }
    setLoading(false);
  };

  return (
    <div className="mt-4">
      {/* Toast notification */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <h4 className="font-semibold mb-2">Bình luận</h4>
      <div className="space-y-4 mb-4" style={{ maxHeight: 350, overflowY: 'auto' }} onScroll={handleScroll}>
        {comments.slice(0, visibleCount).map(c => (
          <div key={c.id} className="flex items-start gap-3">
            <img src={c.avatar_url || '/default-avatar.png'} className="w-8 h-8 rounded-full object-cover" alt="avatar" />
            <div>
              <div className="font-medium">{c.first_name} {c.last_name}</div>
              <div className="text-sm text-gray-700">{c.content}</div>
              <div className="text-xs text-gray-400">{new Date(c.created_at).toLocaleString()}</div>
            </div>
          </div>
        ))}
      </div>
      <div
        ref={inputGroupRef}
        className="flex items-center gap-2 transition-all"
        style={{
          transform: isFocused ? 'scale(1.03)' : 'scale(1)',
          boxShadow: isFocused ? '0 2px 8px #b7caff33' : 'none',
          border: isFocused ? '2px solid #6c5ce7' : '1px solid #ccc',
          borderRadius: 12,
          background: isFocused ? '#f8f9fd' : '#fff',
          padding: 4,
        }}
      >
        <FilteredInput
          ref={inputRef}
          value={newComment}
          onChange={e => setNewComment(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className="flex-1 px-3 py-2 border-none outline-none bg-transparent"
          placeholder="Viết bình luận..."
        />
        <button
          onClick={handleAddComment}
          disabled={loading || !newComment.trim()}
          className="px-4 py-2 rounded transition-all"
          style={{
            background: isFocused ? '#6c5ce7' : '#b7ccfc',
            color: '#fff',
            opacity: loading || !newComment.trim() ? 0.5 : 1,
            transform: isFocused ? 'scale(1.08)' : 'scale(1)',
            boxShadow: isFocused ? '0 2px 8px #6c5ce799' : 'none',
          }}
        >
          Gửi
        </button>
      </div>
    </div>
  );
}
