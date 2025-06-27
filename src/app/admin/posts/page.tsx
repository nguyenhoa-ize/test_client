'use client';

import React, { useEffect, useRef, useState, Fragment, useCallback } from 'react';
import { FiSearch, FiChevronDown, FiTrash2, FiEye, FiCheck } from 'react-icons/fi';
import AdminLayout from '@/components/AdminLayout';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { socket } from '@/socket';
import AdminGuard from '@/components/AdminGuard';
import { FixedSizeList as List } from 'react-window';
import LoadingSpinner from '@/components/LoadingSpinner';

type Post = {
  id: string;
  content: string;
  created_at: string;
  type_post: 'positive' | 'negative';
  is_approved: boolean;
  like_count: number;
  first_name: string;
  last_name: string;
  avatar_url?: string;
  access_modifier?: 'public' | 'people' | 'lock';
  images?: string[] | string;
  shared_post_id?: string | null;
};

// CustomDropdown (no dependency)
type DropdownOption = { value: string; label: string };
interface CustomDropdownProps {
  value: string;
  onChange: (val: string) => void;
  options: DropdownOption[];
  widthClass?: string;
  placeholder?: string;
}
function CustomDropdown({ value, onChange, options, widthClass, placeholder }: CustomDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);
  const getLabel = (val: string) => {
    const found = options.find((opt) => opt.value === val);
    return found ? found.label : (placeholder || val);
  };
  return (
    <div className={`${widthClass || 'w-44'} text-sm font-medium text-gray-700 relative`} ref={ref}>
      <button
        className="relative w-full cursor-pointer rounded-xl border border-gray-300 bg-white py-2 pl-3 pr-10 text-left shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition"
        onClick={() => setOpen((v) => !v)}
        type="button"
      >
        <span className="block truncate">{getLabel(value)}</span>
        <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
          <FiChevronDown className="h-5 w-5 text-gray-400" />
        </span>
      </button>
      {open && (
        <div className="absolute z-50 mt-2 max-h-60 w-full overflow-auto rounded-xl bg-white py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm">
          {options.map((opt) => (
            <div
              key={opt.value}
              className="relative cursor-pointer select-none py-2 px-4 rounded-lg mx-1 hover:bg-indigo-100 hover:text-indigo-700 text-gray-900"
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PostManagementPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [search, setSearch] = useState('');
  const [type, setType] = useState<'all' | 'positive' | 'negative'>('all');
  const [status, setStatus] = useState<'all' | 'approved' | 'pending'>('all');
  const [sortTime, setSortTime] = useState<'newest' | 'oldest' | null>(null);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [sharedPost, setSharedPost] = useState<Post | null>(null);
  const [deletePostId, setDeletePostId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1200
  );
  const listRef = useRef<any>(null);
  const mobileListRef = useRef<HTMLDivElement>(null);
  const PAGE_SIZE_INITIAL = 10;
  const PAGE_SIZE_MORE = 3;
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const statusOptions = [
    { value: 'all', label: 'Tất cả trạng thái' },
    { value: 'approved', label: 'Đã duyệt' },
    { value: 'pending', label: 'Chưa duyệt' },
  ];
  const timeOptions = [
    { value: 'newest', label: 'Bài đăng mới nhất' },
    { value: 'oldest', label: 'Bài đăng cũ nhất' },
  ];
  const typeOptions = [
    { value: 'all', label: 'Tất cả loại' },
    { value: 'positive', label: 'Tích cực' },
    { value: 'negative', label: 'Tiêu cực' },
  ];

  const truncateIfNeeded = (text: string, width: number): string => {
    if (text == null || typeof text !== 'string') {
      return '';
    }
    const trimmedText = text.trim();
    if (width < 640) {
      // Mobile: chỉ lấy 5 từ đầu tiên
      const words = trimmedText.split(/\s+/);
      if (words.length > 5) {
        return words.slice(0, 5).join(' ') + '...';
      }
      return trimmedText;
    }
    // Desktop/tablet: giữ logic cũ
    const processedWords = trimmedText.split(/\s+/).map(word => {
      if (word.length > 7) {
        return word.substring(0, 7);
      }
      return word;
    });
    const wordLimit = (width >= 640 && width <= 1500) ? 2 : 5;
    if (processedWords.length > wordLimit) {
      return processedWords.slice(0, wordLimit).join(' ') + '...';
    }
    const finalResult = processedWords.join(' ');
    if (finalResult.length < trimmedText.length) {
      return finalResult + '...';
    }
    return finalResult;
  };

  const fetchPosts = async (reset = false) => {
    if (loading) return;
    setLoading(true);
    try {
      const pageSize = reset ? PAGE_SIZE_INITIAL : PAGE_SIZE_MORE;
      const params = new URLSearchParams();
      if (type !== 'all') params.set('type', type);
      if (status !== 'all') params.set('status', status);
      if (search.trim()) params.set('search', search);
      params.set('offset', reset ? '0' : offset.toString());
      params.set('limit', pageSize.toString());
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/posts?${params.toString()}`);
      const result = await res.json();
      let sortedPosts = [...(result.items || [])];
      if (sortTime === 'newest') {
        sortedPosts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      } else if (sortTime === 'oldest') {
        sortedPosts.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      }
      if (reset) {
        setPosts(sortedPosts);
        setOffset(pageSize);
      } else {
        setPosts(prev => {
          const all = [...prev, ...sortedPosts];
          const unique = Array.from(new Map(all.map(r => [r.id, r])).values());
          return unique;
        });
        setOffset(prev => prev + pageSize);
      }
      setHasMore(sortedPosts.length === pageSize);
    } catch (err) {
      console.error('Lỗi khi tải danh sách bài đăng:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setOffset(0);
    setHasMore(true);
    fetchPosts(true);
    // eslint-disable-next-line
  }, [type, status, sortTime]);

  useEffect(() => {
    // Debounce tìm kiếm realtime
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    debounceTimeout.current = setTimeout(() => {
      setOffset(0);
      setHasMore(true);
      fetchPosts(true);
    }, 300);
    return () => {
      if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
      return undefined;
    };
    // eslint-disable-next-line
  }, [search]);

  // Socket events (same as before)
  useEffect(() => {
    const handleNewPost = (data: { post: Post }) => {
      setPosts((prev) => {
        if (prev.some(p => p.id === data.post.id)) return prev;
        return [data.post, ...prev].sort((a, b) =>
          sortTime === 'newest'
            ? new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            : sortTime === 'oldest'
            ? new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            : 0
        );
      });
    };
    const handlePostApproved = (data: { post: Post }) => {
      setPosts((prev) =>
        prev
          .map((p) => (p.id === data.post.id ? { ...p, is_approved: true } : p))
          .sort((a, b) =>
            sortTime === 'newest'
              ? new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
              : sortTime === 'oldest'
              ? new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
              : 0
          )
      );
    };
    const handlePostDeleted = (data: { postId: string }) => {
      setPosts((prev) =>
        prev
          .filter((p) => p.id !== data.postId)
          .sort((a, b) =>
            sortTime === 'newest'
              ? new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
              : sortTime === 'oldest'
              ? new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
              : 0
          )
      );
    };
    socket.on('newPost', handleNewPost);
    socket.on('postApproved', handlePostApproved);
    socket.on('postDeleted', handlePostDeleted);
    return () => {
      socket.off('newPost', handleNewPost);
      socket.off('postApproved', handlePostApproved);
      socket.off('postDeleted', handlePostDeleted);
    };
  }, [type, status, sortTime]);

  const handleApprove = async (id: string) => {
    const post = posts.find((p) => p.id === id);
    if (!post) return;
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/posts/${id}/approve`, { method: 'PUT' });
    toast.success(`Đã duyệt bài: "${post.content.slice(0, 50)}..."`);
    fetchPosts(true);
  };

  const handleViewPost = async (postId: string) => {
    setSelectedPost(null);
    setSharedPost(null);
    try {
      const res = await fetch(`/api/admin/posts/${postId}`);
      if (!res.ok) return;
      const data = await res.json();
      setSelectedPost(data.post);
      setSharedPost(data.shared_post);
    } catch {
      setSelectedPost(null);
      setSharedPost(null);
    }
  };

  const handleDelete = (id: string) => {
    setDeletePostId(id);
  };

  const confirmDeletePost = async () => {
    if (deletePostId) {
      const post = posts.find((p) => p.id === deletePostId);
      if (!post) return;
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/posts/${deletePostId}`, { method: 'DELETE' });
      toast.success(`Đã xóa bài: "${post.content.slice(0, 50)}..."`);
      setDeletePostId(null);
      fetchPosts(true);
    }
  };

  const handleSearch = () => {
    setOffset(0);
    setHasMore(true);
    fetchPosts(true);
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) fetchPosts(false);
  };

  useEffect(() => {
    const ref = mobileListRef.current;
    if (!ref) return;
    const handleScroll = () => {
      if (loading || !hasMore) return;
      if (ref.scrollHeight - ref.scrollTop - ref.clientHeight < 100) {
        handleLoadMore();
      }
    };
    ref.addEventListener('scroll', handleScroll);
    return () => ref.removeEventListener('scroll', handleScroll);
  }, [loading, hasMore]);

  const sortedPosts = [...posts];
  if (sortTime === 'newest') {
    sortedPosts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } else if (sortTime === 'oldest') {
    sortedPosts.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }

  useEffect(() => {
    socket.emit('joinAdminRoom');
  }, []);

  return (
    <AdminGuard>
      <AdminLayout onOpenAuth={() => {}}>
        <main className="p-4 sm:p-6">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 text-gray-900">Quản lý bài đăng</h1>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 mb-4 sm:mb-6 items-stretch sm:items-center">
              <div className="relative flex-1">
                <FiSearch
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 cursor-pointer"
                  onClick={handleSearch}
                  title="Tìm kiếm"
                />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Tìm kiếm bài viết..."
                  className="pl-10 pr-4 py-2 bg-[#F5F0E5] rounded-xl text-gray-800 w-full outline-none text-sm sm:text-base"
                />
              </div>
              {/* Dropdown filter cho desktop */}
              <div className="hidden sm:flex flex-row gap-4 ml-auto">
                <CustomDropdown value={type} onChange={v => setType(v as any)} options={typeOptions} widthClass="w-48" />
                <CustomDropdown value={status} onChange={v => setStatus(v as any)} options={statusOptions} widthClass="w-48" />
                <CustomDropdown value={sortTime || ''} onChange={v => setSortTime(v as any)} options={timeOptions} placeholder="Thời gian" widthClass="w-48" />
              </div>
            </div>
            {/* Card view for mobile, giống report */}
            <div className="block sm:hidden" ref={mobileListRef} style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              {/* Filter nằm trong vùng cuộn, giống report */}
              <div className="flex flex-col gap-2 mb-2">
                <div>
                  <CustomDropdown value={type} onChange={v => setType(v as any)} options={typeOptions} widthClass="w-full" />
                </div>
                <div>
                  <CustomDropdown value={status} onChange={v => setStatus(v as any)} options={statusOptions} widthClass="w-full" />
                </div>
                <div>
                  <CustomDropdown value={sortTime || ''} onChange={v => setSortTime(v as any)} options={timeOptions} placeholder="Thời gian" widthClass="w-full" />
                </div>
              </div>
              {loading && sortedPosts.length === 0 ? (
                <div className="p-6 text-center text-gray-500 bg-white rounded-xl border">
                  <span className="inline-flex items-center justify-center">
                    <svg className="animate-spin h-5 w-5 text-blue-500 mr-2" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                    Đang tải dữ liệu...
                  </span>
                </div>
              ) : sortedPosts.length === 0 ? (
                <div className="p-6 text-center text-gray-500 bg-white rounded-xl border">
                  {search.trim()
                    ? 'Không có kết quả nào phù hợp với từ khóa tìm kiếm.'
                    : 'Không có bài viết nào phù hợp với bộ lọc hiện tại.'}
                </div>
              ) : (
                <>
                  {sortedPosts.map((post) => (
                    <div key={post.id} className="bg-white border rounded-xl p-4 mb-4 shadow-sm hover:shadow-md transition">
                      <div className="flex flex-col gap-2">
                        <p className="text-gray-600 text-sm">
                          <span className="font-medium">Người đăng:</span>{' '}
                          <span className="text-gray-700">{truncateIfNeeded(post.first_name + ' ' + post.last_name, windowWidth)}</span>
                        </p>
                        <p className="text-gray-600 text-sm">
                          <span className="font-medium">Nội dung:</span>{' '}
                          <span className="text-gray-700 break-words whitespace-pre-wrap" title={post.content}>
                              {truncateIfNeeded(post.content, windowWidth)}
                          </span>
                        </p>
                        <p className="text-gray-600 text-sm">
                          <span className="font-medium">Loại:</span>{' '}
                          <span
                            className={`px-2 py-1 rounded-full text-xs ${
                              post.type_post === 'positive' ? 'bg-blue-200' : 'bg-red-100'
                            }`}
                          >
                            {post.type_post === 'positive' ? 'Tích cực' : 'Tiêu cực'}
                          </span>
                        </p>
                        <p className="text-gray-600 text-sm">
                          <span className="font-medium">Ngày đăng:</span>{' '}
                          <span className="text-gray-700">{new Date(post.created_at).toLocaleDateString('vi-VN')}</span>
                        </p>
                        <p className="text-gray-600 text-sm">
                          <span className="font-medium">Cảm xúc:</span>{' '}
                          <span className="text-gray-700">{post.like_count}</span>
                        </p>
                        <p className="text-gray-600 text-sm">
                          <span className="font-medium">Trạng thái:</span>{' '}
                          <span
                            className={`px-2 py-1 rounded-full text-xs ${
                              post.is_approved ? 'bg-green-200' : 'bg-yellow-200'
                            }`}
                          >
                            {post.is_approved ? 'Đã duyệt' : 'Chưa duyệt'}
                          </span>
                        </p>
                        <div className="flex gap-2 mt-2">
                          <button className="text-blue-500 hover:text-blue-600" onClick={() => handleViewPost(post.id)}>
                            <FiEye size={18} />
                          </button>
                          {!post.is_approved && (
                            <button onClick={() => handleApprove(post.id)} className="text-green-600 hover:text-green-700">
                              <FiCheck size={18} />
                            </button>
                          )}
                          <button onClick={() => handleDelete(post.id)} className="text-red-500 hover:text-red-600">
                            <FiTrash2 size={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {/* Infinite scroll: spinner sẽ hiện khi loading */}
                  {loading && hasMore && (
                    <div className="flex justify-center py-2"><LoadingSpinner size={24} color="#ea580c" /></div>
                  )}
                </>
              )}
            </div>
            {/* Table view for desktop, hidden on mobile */}
            <div className="hidden sm:block border border-[#DBE0E5] rounded-xl bg-white overflow-x-hidden">
              <div>
                <div className="flex w-full text-sm font-semibold bg-white border-b border-[#DBE0E5] sticky top-0 z-20 items-center">
                  <div className="p-3 flex-1 min-w-0 text-gray-800 flex justify-center items-center text-center break-words whitespace-normal">Nội dung</div>
                  <div className="p-3 flex-1 min-w-0 text-gray-800 flex justify-center items-center text-center break-words whitespace-normal">Loại</div>
                  <div className="p-3 flex-1 min-w-0 text-gray-800 flex justify-center items-center text-center break-words whitespace-normal">Người đăng</div>
                  <div className="p-3 flex-1 min-w-0 text-gray-800 flex justify-center items-center text-center break-words whitespace-normal">Ngày đăng</div>
                  <div className="p-3 flex-1 min-w-0 text-gray-800 flex justify-center items-center text-center break-words whitespace-normal">Cảm xúc</div>
                  <div className="p-3 flex-1 min-w-0 text-gray-800 flex justify-center items-center text-center break-words whitespace-normal">Trạng thái</div>
                  <div className="p-3 flex-1 min-w-0 text-gray-800 flex justify-center items-center text-center break-words whitespace-normal">Hành động</div>
                </div>
                {loading && sortedPosts.length === 0 ? (
                  <div className="p-6 text-center text-gray-500 bg-white">
                    <span className="inline-flex items-center justify-center">
                      <svg className="animate-spin h-5 w-5 text-blue-500 mr-2" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                      </svg>
                      Đang tải dữ liệu...
                    </span>
                  </div>
                ) : sortedPosts.length === 0 ? (
                  <div className="p-6 text-center text-gray-500 bg-white">
                    {search.trim()
                      ? 'Không có kết quả nào phù hợp với từ khóa tìm kiếm.'
                      : 'Không có bài viết nào phù hợp với bộ lọc hiện tại.'}
                  </div>
                ) : (
                  <>
                    <List
                      ref={listRef}
                      height={420}
                      itemCount={sortedPosts.length}
                      itemSize={56}
                      width={"100%"}
                      className="relative z-10"
                      onScroll={handleLoadMore}
                    >
                      {({ index, style }) => {
                        const post = sortedPosts[index];
                        return (
                          <div
                            key={post.id}
                            style={style}
                            className="flex w-full text-sm bg-white border-b border-[#E5E8EB] hover:bg-gray-50 transition items-center"
                          >
                            <div className="p-3 flex-1 min-w-0 flex justify-center items-center text-center truncate" title={post.content}>{truncateIfNeeded(post.content, windowWidth)}</div>
                            <div className="p-3 flex-1 min-w-0 flex justify-center items-center text-center">
                              <span
                                className={`px-2 py-1 rounded-full text-xs whitespace-nowrap ${post.type_post === 'positive' ? 'bg-blue-200' : 'bg-red-100'}`}
                              >
                                {post.type_post === 'positive' ? 'Tích cực' : 'Tiêu cực'}
                              </span>
                            </div>
                            <div className="p-3 flex-1 min-w-0 flex justify-center items-center text-center truncate" title={post.first_name + ' ' + post.last_name}>
                              {truncateIfNeeded(post.first_name + ' ' + post.last_name, windowWidth)}
                            </div>
                            <div className="p-3 flex-1 min-w-0 flex justify-center items-center text-center" title={post.created_at}>{new Date(post.created_at).toLocaleDateString('vi-VN')}</div>
                            <div className="p-3 flex-1 min-w-0 flex justify-center items-center text-center">{post.like_count}</div>
                            <div className="p-3 flex-1 min-w-0 flex justify-center items-center text-center">
                              <span className={`px-2 py-1 rounded-full text-xs whitespace-nowrap ${post.is_approved ? 'bg-green-200' : 'bg-yellow-200'}`}>{post.is_approved ? 'Đã duyệt' : 'Chưa duyệt'}</span>
                            </div>
                            <div className="p-3 flex-1 min-w-0 text-center"><div className="flex gap-2 justify-center"><button className="text-blue-500 hover:text-blue-600" onClick={() => handleViewPost(post.id)}><FiEye size={18} /></button>{!post.is_approved && (<button onClick={() => handleApprove(post.id)} className="text-green-600 hover:text-green-700"><FiCheck size={18} /></button>)}<button onClick={() => handleDelete(post.id)} className="text-red-500 hover:text-red-600"><FiTrash2 size={18} /></button></div></div>
                          </div>
                        );
                      }}
                    </List>
                    {loading && sortedPosts.length > 0 && (
                      <div className="flex justify-center py-2"><LoadingSpinner size={24} color="#ea580c" /></div>
                    )}
                    {!hasMore && sortedPosts.length > 0 && (
                      <div className="text-center py-2 text-gray-400 text-sm">Đã hiển thị hết danh sách</div>
                    )}
                  </>
                )}
              </div>
            </div>
            <ToastContainer position="top-right" autoClose={3000} aria-label="Thông báo hệ thống" />
            {selectedPost && (
              <div
                className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
                onClick={() => {
                  setSelectedPost(null);
                  setSharedPost(null);
                }}
              >
                <div
                  className="bg-white rounded-2xl shadow-xl p-4 sm:p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto animate-fadeIn"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center gap-3 sm:gap-4 mb-4">
                    <img
                      src={selectedPost.avatar_url || '/avatar.jpg'}
                      alt="avatar"
                      className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover border"
                    />
                    <div>
                      <h3 className="text-base sm:text-lg font-semibold text-gray-800">
                        Bài viết của {selectedPost.first_name} {selectedPost.last_name}
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-500">
                        {new Date(selectedPost.created_at).toLocaleString()} ·{' '}
                        {selectedPost.access_modifier === 'lock'
                          ? 'Chỉ mình tôi'
                          : selectedPost.access_modifier === 'people'
                          ? 'Mọi người'
                          : 'Công khai'}
                      </p>
                      {sharedPost && (
                        <div className="text-xs text-gray-500">
                          đã chia sẻ bài viết của {sharedPost.first_name} {sharedPost.last_name}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-gray-700 text-sm sm:text-base mb-4 whitespace-pre-wrap break-words">
                    {selectedPost.content.match(/.{1,40}/g)?.map((line, index) => (
                      <p key={index}>{line}</p>
                    )) || selectedPost.content}
                  </div>
                  {(() => {
                    let parsedImages: string[] = [];
                    if (selectedPost.images) {
                      if (typeof selectedPost.images === 'string') {
                        try {
                          parsedImages = JSON.parse(selectedPost.images);
                        } catch {}
                      } else if (Array.isArray(selectedPost.images)) {
                        parsedImages = selectedPost.images;
                      }
                    }
                    return parsedImages.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                        {parsedImages.map((img, i) => (
                          <img key={i} src={img} alt={`Image ${i}`} className="w-full rounded-xl object-cover shadow" />
                        ))}
                      </div>
                    ) : null;
                  })()}
                  {sharedPost && (
                    <div className="border rounded-lg bg-gray-50 p-3 mt-2">
                      <div className="flex items-center gap-2 sm:gap-3 mb-1">
                        <img
                          src={sharedPost.avatar_url || '/avatar.jpg'}
                          alt="avatar"
                          className="w-8 h-8 rounded-full object-cover border"
                        />
                        <div>
                          <div className="font-semibold text-gray-900 text-sm">
                            {sharedPost.first_name} {sharedPost.last_name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {sharedPost.created_at ? new Date(sharedPost.created_at).toLocaleString('vi-VN') : ''}
                          </div>
                        </div>
                      </div>
                      <div className="text-gray-800 text-sm whitespace-pre-wrap break-words">
                        {sharedPost.content.match(/.{1,40}/g)?.map((line, index) => (
                          <p key={index}>{line}</p>
                        )) || sharedPost.content}
                      </div>
                      {(() => {
                        let imgs: string[] = [];
                        if (sharedPost.images) {
                          if (typeof sharedPost.images === 'string') {
                            try {
                              imgs = JSON.parse(sharedPost.images);
                            } catch {}
                          } else if (Array.isArray(sharedPost.images)) {
                            imgs = sharedPost.images;
                          }
                        }
                        return imgs.length > 0 ? (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {imgs.map((img, idx) => (
                              <img
                                key={idx}
                                src={img}
                                alt={`Ảnh ${idx + 1}`}
                                className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded border"
                              />
                            ))}
                          </div>
                        ) : null;
                      })()}
                    </div>
                  )}
                  <div className="flex justify-end mt-4 gap-2">
                    {!selectedPost.is_approved && (
                      <button
                        className="px-3 sm:px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 text-sm sm:text-base"
                        onClick={() => {
                          handleApprove(selectedPost.id);
                          setSelectedPost(null);
                          setSharedPost(null);
                        }}
                      >
                        Duyệt bài
                      </button>
                    )}
                    <button
                      className="px-3 sm:px-4 py-2 bg-gray-200 text-gray-800 rounded-xl hover:bg-gray-300 text-sm sm:text-base"
                      onClick={() => {
                        setSelectedPost(null);
                        setSharedPost(null);
                      }}
                    >
                      Đóng
                    </button>
                  </div>
                </div>
              </div>
            )}
            {deletePostId && (
              <div
                className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
                onClick={() => setDeletePostId(null)}
              >
                <div
                  className="bg-white rounded-2xl shadow-xl p-4 sm:p-6 w-full max-w-sm animate-fadeIn"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex flex-col items-center text-center">
                    <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-2">Xác nhận xóa</h2>
                    <p className="text-gray-600 text-sm sm:text-base mb-4 sm:mb-6">
                      Bạn có chắc chắn muốn xóa bài đăng này không? Hành động này không thể hoàn tác.
                    </p>
                  </div>
                  <div className="flex justify-end gap-2 sm:gap-3">
                    <button
                      className="px-3 sm:px-4 py-2 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 transition text-sm sm:text-base"
                      onClick={() => setDeletePostId(null)}
                    >
                      Hủy
                    </button>
                    <button
                      className="px-3 sm:px-4 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700 transition font-medium sm:text-center text-sm sm:text-base"
                      onClick={confirmDeletePost}
                    >
                      Xóa bài
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </AdminLayout>
    </AdminGuard>
  );
}