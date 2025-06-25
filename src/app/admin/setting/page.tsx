'use client';

import React, { useState, useEffect, useRef } from 'react';
import type { ReactElement } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { FiSearch, FiEye, FiTrash2 } from 'react-icons/fi';
import AdminGuard from '@/components/AdminGuard';
import { FixedSizeList as List } from 'react-window';
import LoadingSpinner from '@/components/LoadingSpinner';

type ForbiddenWord = {
  id: string;
  word: string;
  added_at: string;
};

export default function SettingPage(): ReactElement {
  const [words, setWords] = useState<ForbiddenWord[]>([]);
  const [search, setSearch] = useState('');
  const [selectedWord, setSelectedWord] = useState<ForbiddenWord | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newWord, setNewWord] = useState('');
  const [adding, setAdding] = useState(false);
  const [deleteWordId, setDeleteWordId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 20;
  const [searchInput, setSearchInput] = useState('');
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);
  const mobileListRef = useRef<HTMLDivElement>(null);

  const truncateIfNeeded = (text: string): string => {
    if (text == null || typeof text !== 'string') {
      return '';
    }
    const trimmedText = text.trim();
    
    // 1. Process each "word" based on the 7-char rule
    const processedWords = trimmedText.split(/\s+/).map(word => {
        if (word.length > 7) {
            return word.substring(0, 7); // Truncate long words
        }
        return word;
    });

    // 2. Determine word limit based on screen size
    const windowWidth = typeof window !== 'undefined' ? window.innerWidth : Infinity;
    const wordLimit = (windowWidth >= 640 && windowWidth <= 1500) ? 3 : 5;

    // 3. Apply word limit
    if (processedWords.length > wordLimit) {
        return processedWords.slice(0, wordLimit).join(' ') + '...';
    }

    // 4. Join the words and add ellipsis if any truncation happened
    const finalResult = processedWords.join(' ');
    if (finalResult.length < trimmedText.length) {
        return finalResult + '...';
    }

    return finalResult;
  };

  const fetchWords = async (reset = false, searchText?: string) => {
    setLoading(true);
    const params = new URLSearchParams();
    const searchValue = typeof searchText === 'string' ? searchText : search;
    if (searchValue.trim()) params.set('search', searchValue);
    params.set('offset', reset ? '0' : offset.toString());
    params.set('limit', PAGE_SIZE.toString());
    const res = await fetch(`/api/forbidden_words?${params.toString()}`);
    const result = await res.json();
    let fetched = Array.isArray(result.items) ? result.items : [];
    if (reset) {
      setWords(fetched);
      setOffset(PAGE_SIZE);
    } else {
      setWords(prev => {
        const ids = new Set(prev.map((w: ForbiddenWord) => w.id));
        const merged = [...prev, ...fetched.filter((w: ForbiddenWord) => !ids.has(w.id))];
        return merged;
      });
      setOffset(prev => prev + PAGE_SIZE);
    }
    setHasMore(fetched.length === PAGE_SIZE);
    setLoading(false);
  };

  useEffect(() => {
    fetchWords(true);
  }, []);

  useEffect(() => {
    // Debounce tìm kiếm realtime
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    debounceTimeout.current = setTimeout(() => {
      setSearch(searchInput);
      fetchWords(true, searchInput);
    }, 300);
    return () => {
      if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
      return undefined;
    };
  // eslint-disable-next-line
  }, [searchInput]);

  const handleDelete = async (id: string) => {
    setDeleteWordId(id);
  };

  const confirmDelete = async () => {
    if (deleteWordId) {
      await fetch(`/api/forbidden_words/${deleteWordId}`, { method: 'DELETE' });
      toast.success('Đã xóa từ cấm!');
      setDeleteWordId(null);
      fetchWords(true);
    }
  };

  const handleAddWord = async () => {
    if (!newWord.trim()) return;
    setAdding(true);
    const res = await fetch('/api/forbidden_words', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word: newWord.trim() }),
    });
    const result = await res.json();
    setAdding(false);
    if (result.success) {
      toast.success('Đã thêm từ cấm mới!');
      setNewWord('');
      setShowAddModal(false);
      setWords((prev) => [{ id: result.id || Math.random().toString(), word: newWord.trim(), added_at: new Date().toISOString() }, ...prev]);
    } else {
      toast.error('Có lỗi xảy ra, vui lòng thử lại.');
    }
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) fetchWords(false);
  };

  // Sắp xếp từ cấm theo ngày giảm dần, nếu cùng ngày thì so sánh tiếp theo giờ/phút/giây
  const sortedWords = [...words].sort((a, b) => {
    const dateA = new Date(a.added_at);
    const dateB = new Date(b.added_at);
    // So sánh theo ngày (yyyy-mm-dd)
    const dayA = dateA.toISOString().slice(0, 10);
    const dayB = dateB.toISOString().slice(0, 10);
    if (dayA !== dayB) {
      return dayB.localeCompare(dayA); // ngày mới hơn lên đầu
    }
    // Nếu cùng ngày, so sánh tiếp theo giờ/phút/giây
    return dateB.getTime() - dateA.getTime();
  });

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

  return (
    <AdminGuard>
      <AdminLayout onOpenAuth={() => {}}>
        <main className="p-4 sm:p-6">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 text-gray-900">Quản lý từ cấm</h1>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 mb-4 sm:mb-6 items-center">
              <div className="relative flex-1 w-full sm:w-auto">
                <FiSearch
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 cursor-pointer"
                  onClick={() => {
                    setSearch(searchInput);
                    fetchWords(true, searchInput);
                  }}
                  style={{ zIndex: 2 }}
                  title="Tìm kiếm"
                />
                <input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setSearch(searchInput);
                      fetchWords(true, searchInput);
                    }
                    if (e.key === 'Backspace' && (e.target as HTMLInputElement).value === '') {
                      setSearch('');
                      fetchWords(true, '');
                    }
                  }}
                  placeholder="Tìm kiếm từ cấm..."
                  className="pl-10 pr-4 py-2 bg-[#F5F0E5] rounded-xl text-gray-800 w-full outline-none text-sm sm:text-base"
                />
              </div>
              <button
                className="hidden sm:block w-full sm:w-auto px-4 py-2 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600 text-sm"
                onClick={() => setShowAddModal(true)}
              >
                + Thêm từ cấm
              </button>
            </div>

            {/* Danh sách từ cấm trên di động */}
            <div className="block sm:hidden relative" ref={mobileListRef} style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              {words.length === 0 ? (
                <div className="p-6 text-center text-gray-500 bg-white rounded-xl border">
                  {search.trim()
                    ? 'Không có kết quả nào phù hợp với từ khóa tìm kiếm.'
                    : 'Không có từ cấm nào phù hợp với bộ lọc hiện tại.'}
                </div>
              ) : (
                (Array.isArray(words) ? words : []).map((word) => (
                  <div key={word.id} className="bg-white border rounded-xl p-4 mb-4 shadow-sm hover:shadow-md transition">
                    <div className="flex flex-col gap-2">
                      <p className="text-gray-600 text-sm">
                        <span className="font-medium">Mã:</span>{' '}
                        <span className="text-gray-700">{word.id}</span>
                      </p>
                      <p className="text-gray-600 text-sm">
                        <span className="font-medium">Từ cấm:</span>{' '}
                        <span className="text-gray-700">{truncateIfNeeded(word.word)}</span>
                      </p>
                      <p className="text-gray-600 text-sm">
                        <span className="font-medium">Ngày thêm:</span>{' '}
                        <span className="text-gray-700">{new Date(word.added_at).toLocaleDateString('vi-VN')}</span>
                      </p>
                      <div className="flex gap-2 mt-2">
                        <button className="text-blue-500 hover:text-blue-600" onClick={() => setSelectedWord(word)}>
                          <FiEye size={18} />
                        </button>
                        <button onClick={() => handleDelete(word.id)} className="text-red-500 hover:text-red-600">
                          <FiTrash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
              {/* Nút thêm từ cấm nổi dưới cùng bên phải */}
              <button
                className="fixed bottom-6 right-6 z-50 sm:hidden px-5 py-3 bg-blue-500 text-white rounded-full shadow-lg font-semibold hover:bg-blue-600 text-base"
                onClick={() => setShowAddModal(true)}
                style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}
              >
                + Thêm từ cấm
              </button>
              {/* Infinite scroll: spinner sẽ hiện khi loading */}
              {loading && hasMore && (
                <div className="flex justify-center py-2"><LoadingSpinner size={24} color="#ea580c" /></div>
              )}
            </div>

            {/* LazyColumn cho desktop */}
            <div className="hidden sm:block border border-[#DBE0E5] rounded-xl bg-white max-h-[480px] overflow-y-auto">
              {/* Header */}
              <div className="flex w-full text-sm font-semibold bg-white border-b border-[#DBE0E5] sticky top-0 z-10 items-center">
                <div className="p-3 flex-1 text-gray-800 flex justify-center items-center text-center">Mã</div>
                <div className="p-3 flex-1 text-gray-800 flex justify-center items-center text-center">Từ cấm</div>
                <div className="p-3 flex-1 text-gray-800 flex justify-center items-center text-center">Ngày thêm</div>
                <div className="p-3 flex-1 text-gray-800 flex justify-center items-center text-center">Hành động</div>
              </div>
              {/* Nội dung bảng */}
              {loading && words.length === 0 ? (
                <div className="p-6 text-center text-gray-500 bg-white">
                  <span className="inline-flex items-center justify-center">
                    <svg className="animate-spin h-5 w-5 text-blue-500 mr-2" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                    Đang tải dữ liệu...
                  </span>
                </div>
              ) : words.length === 0 ? (
                <div className="p-6 text-center text-gray-500 bg-white">
                  Không có từ cấm nào phù hợp với bộ lọc hiện tại.
                </div>
              ) : (
                <>
                  <List
                    height={320}
                    itemCount={words.length}
                    itemSize={56}
                    width={"100%"}
                    itemKey={index => words[index].id}
                  >
                    {({ index, style }) => {
                      const word = words[index];
                      // Word cell
                      let wordCell = word.word;
                      if (word.word.trim().split(/\s+/).length > 20) {
                        wordCell = truncateIfNeeded(word.word);
                      }
                      return (
                        <div
                          key={word.id}
                          style={style}
                          className="flex w-full text-sm bg-white border-b border-[#E5E8EB] hover:bg-gray-50 transition items-center"
                        >
                          <div className="p-3 flex-1 min-w-0 text-center" title={word.id}>{word.id}</div>
                          <div className="p-3 flex-1 min-w-0 text-center" title={word.word}>{wordCell}</div>
                          <div className="p-3 flex-1 min-w-0 text-center" title={word.added_at}>{new Date(word.added_at).toLocaleDateString('vi-VN')}</div>
                          <div className="p-3 flex-1 flex gap-2 justify-center">
                            <button className="text-blue-500 hover:text-blue-600" onClick={() => setSelectedWord(word)}><FiEye /></button>
                            <button onClick={() => handleDelete(word.id)} className="text-red-500 hover:text-red-600"><FiTrash2 /></button>
                          </div>
                        </div>
                      );
                    }}
                  </List>
                  {/* Khi đang load thêm ở cuối danh sách */}
                  {loading && words.length > 0 && (
                    <div className="flex justify-center py-2"><LoadingSpinner size={24} color="#ea580c" /></div>
                  )}
                  {/* Nếu có phân trang, có thể thêm {!hasMore ...} */}
                </>
              )}
            </div>

            <ToastContainer position="top-right" autoClose={3000} aria-label="Thông báo hệ thống" />

            {/* Modal xem chi tiết từ cấm */}
            {selectedWord && (
              <div
                className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
                onClick={() => setSelectedWord(null)}
              >
                <div
                  className="bg-white rounded-2xl shadow-xl p-4 sm:p-6 max-w-sm w-full animate-fadeIn"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex flex-col items-center text-center">
                    <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-2">Chi tiết từ cấm</h2>
                    <p className="text-gray-600 text-sm sm:text-base mb-4">
                      <strong>ID:</strong> {selectedWord.id}
                      <br />
                      <strong>Từ:</strong> {selectedWord.word}
                      <br />
                      <strong>Thêm lúc:</strong> {new Date(selectedWord.added_at).toLocaleString('vi-VN')}
                    </p>
                  </div>
                  <div className="flex justify-end">
                    <button
                      className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
                      onClick={() => setSelectedWord(null)}
                    >
                      Đóng
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Modal thêm từ cấm */}
            {showAddModal && (
              <div
                className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
                onClick={() => setShowAddModal(false)}
              >
                <div
                  className="bg-white rounded-2xl shadow-xl p-4 sm:p-6 w-full max-w-sm animate-fadeIn"
                  onClick={(e) => e.stopPropagation()}
                >
                  <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-4">Thêm từ cấm mới</h2>
                  <input
                    type="text"
                    value={newWord}
                    onChange={(e) => setNewWord(e.target.value)}
                    placeholder="Nhập từ cấm..."
                    className="w-full p-2 border rounded-xl mb-4"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
                      onClick={() => setShowAddModal(false)}
                    >
                      Hủy
                    </button>
                    <button
                      className="px-4 py-2 rounded-xl bg-blue-500 text-white hover:bg-blue-600 transition"
                      onClick={handleAddWord}
                      disabled={adding}
                    >
                      {adding ? 'Đang thêm...' : 'Thêm'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {deleteWordId && (
              <div
                className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
                onClick={() => setDeleteWordId(null)}
              >
                <div
                  className="bg-white rounded-2xl shadow-xl p-4 sm:p-6 w-full max-w-sm animate-fadeIn"
                  onClick={(e) => e.stopPropagation()}
                >
                  <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-4 text-center">Xác nhận xóa</h2>
                  <p className="text-gray-600 text-sm sm:text-base mb-6 text-center">Bạn có chắc chắn muốn xóa từ cấm này?</p>
                  <div className="flex justify-end gap-2">
                    <button
                      className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
                      onClick={() => setDeleteWordId(null)}
                    >
                      Hủy
                    </button>
                    <button
                      className="px-4 py-2 rounded-xl bg-red-500 text-white hover:bg-red-600 transition"
                      onClick={confirmDelete}
                    >
                      Xóa
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