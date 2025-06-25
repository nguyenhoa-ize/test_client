"use client";

import React, { useState, useEffect, useRef, Fragment } from 'react';
import type { ReactElement } from 'react';
import { FiSearch, FiChevronDown, FiTrash2, FiEye, FiCheck, FiMail } from 'react-icons/fi';
import AdminLayout from '@/components/AdminLayout';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Image from 'next/image';
import AdminGuard from '@/components/AdminGuard';
import { FixedSizeList as List } from 'react-window';
import { Listbox, Transition } from '@headlessui/react';
import { HiSelector } from 'react-icons/hi';
import LoadingSpinner from '@/components/LoadingSpinner';
import { socket } from '@/socket';

type Report = {
  report_id: string;
  date_reported: string;
  reported_by: string;
  reported_account: string;
  content: string;
  status: string;
  reporter_id: string;
  reported_user_id: string;
};

type ReportedPost = {
  id: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  created_at?: string;
  content?: string;
  images?: string;
};

const statusOptions = [
  { value: 'all', label: 'Tất cả trạng thái' },
  { value: 'processed', label: 'Đã xử lý' },
  { value: 'pending', label: 'Chưa xử lý' },
];

const timeOptions = [
  { value: 'newest', label: 'Báo cáo mới nhất' },
  { value: 'oldest', label: 'Báo cáo cũ nhất' },
];

function CustomDropdown({ value, onChange, options, widthClass, placeholder }: { value: string, onChange: (val: string) => void, options: { value: string, label: string }[], widthClass?: string, placeholder?: string }) {
  const getLabel = (val: string) => {
    const found = options.find(opt => opt.value === val);
    return found ? found.label : (placeholder || val);
  };
  return (
    <div className={`${widthClass || 'w-44'} text-sm font-medium text-gray-700`}>
      <Listbox value={value} onChange={onChange}>
        <div className="relative">
          <Listbox.Button className="relative w-full cursor-pointer rounded-xl border border-gray-300 bg-white py-2 pl-3 pr-10 text-left shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition">
            <span className="block truncate">{getLabel(value)}</span>
            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
              <HiSelector className="h-5 w-5 text-gray-400" />
            </span>
          </Listbox.Button>
          <Transition
            as={Fragment}
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <Listbox.Options className="absolute z-50 mt-2 max-h-60 w-full overflow-auto rounded-xl bg-white py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm">
              {options.map((opt) => (
                <Listbox.Option
                  key={opt.value}
                  className={({ active }) =>
                    `relative cursor-pointer select-none py-2 px-4 rounded-lg mx-1 ${
                      active ? 'bg-indigo-100 text-indigo-700' : 'text-gray-900'
                    }`
                  }
                  value={opt.value}
                >
                  {opt.label}
                </Listbox.Option>
              ))}
            </Listbox.Options>
          </Transition>
        </div>
      </Listbox>
    </div>
  );
}

export default function ReportsPage(): ReactElement {
  const [reports, setReports] = useState<Report[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | 'processed' | 'pending'>('all');
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLButtonElement>(null);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [reportedPost, setReportedPost] = useState<ReportedPost | null>(null);
  const [sharedPost, setSharedPost] = useState<ReportedPost | null>(null);
  const [showMailDialog, setShowMailDialog] = useState(false);
  const [mailTarget, setMailTarget] = useState<'reporter' | 'reported'>('reporter');
  const [mailTitle, setMailTitle] = useState('');
  const [mailContent, setMailContent] = useState('');
  const [mailType, setMailType] = useState('system');
  const [mailUserId, setMailUserId] = useState<string | null>(null);
  const [mailReport, setMailReport] = useState<Report | null>(null);
  const [deleteReportId, setDeleteReportId] = useState<string | null>(null);
  const [sortTime, setSortTime] = useState<'newest' | 'oldest' | null>(null);
  const timeDropdownRef = useRef<HTMLButtonElement>(null);
  const [showTimeDropdown, setShowTimeDropdown] = useState(false);
  const listRef = useRef<List>(null);
  const [listHeight, setListHeight] = useState(420);
  const [listWidth, setListWidth] = useState<string | number>('100%');
  const PAGE_SIZE_INITIAL = 10;
  const PAGE_SIZE_MORE = 3;
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1200
  );
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);
  const mobileListRef = useRef<HTMLDivElement>(null);

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

  const fetchReports = async (reset = false) => {
    if (loading) return;
    setLoading(true);
    try {
      const pageSize = reset ? PAGE_SIZE_INITIAL : PAGE_SIZE_MORE;
      const params = new URLSearchParams();
      if (status !== 'all') params.set('status', status);
      if (search.trim()) params.set('search', search);
      params.set('offset', reset ? '0' : offset.toString());
      params.set('limit', pageSize.toString());
      const res = await fetch(`/api/reports?${params.toString()}`);
      const result = await res.json();
      let fetched = (result.items || []).map((report: any) => ({
        report_id: String(report.report_id || 'Không có mã'),
        date_reported: String(report.date_reported || ''),
        reported_by: String(report.reported_by || ''),
        reported_account: String(report.reported_account || ''),
        content: String(report.content || ''),
        status: String(report.status || ''),
        reporter_id: String(report.reporter_id || ''),
        reported_user_id: String(report.reported_user_id || ''),
      }));
      if (sortTime === 'newest') {
        fetched = [...fetched].sort((a, b) => new Date(b.date_reported).getTime() - new Date(a.date_reported).getTime());
      } else if (sortTime === 'oldest') {
        fetched = [...fetched].sort((a, b) => new Date(a.date_reported).getTime() - new Date(b.date_reported).getTime());
      }
      if (reset) {
        setReports(fetched);
        setOffset(pageSize);
      } else {
        setReports(prev => {
          const all = [...prev, ...fetched];
          const seen = new Set();
          const unique = [];
          for (const r of all) {
            if (!seen.has(r.report_id)) {
              unique.push(r);
              seen.add(r.report_id);
            }
          }
          return unique;
        });
        setOffset(prev => prev + pageSize);
      }
      setHasMore(fetched.length === pageSize);
    } catch (err) {
      console.error('Lỗi khi tải danh sách báo cáo:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setOffset(0);
    setHasMore(true);
    fetchReports(true);
    // eslint-disable-next-line
  }, [status, sortTime]);

  useEffect(() => {
    // Debounce tìm kiếm realtime
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    debounceTimeout.current = setTimeout(() => {
      setOffset(0);
      setHasMore(true);
      fetchReports(true);
    }, 300);
    return () => {
      if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
      return undefined;
    };
    // eslint-disable-next-line
  }, [search]);

  useEffect(() => {
    const handleResize = () => {
      const container = document.querySelector('.table-container');
      if (container) {
        const height = Math.min(600, window.innerHeight * 0.6);
        const width = container.clientWidth;
        setListHeight(height);
        setListWidth(width > 900 ? width : 900);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  useEffect(() => {
    const handleNewReport = (data: { report: Report }) => {
      setReports((prev) => {
        if (prev.some(r => r.report_id === data.report.report_id)) return prev;
        return [data.report, ...prev.filter(r => r.report_id !== data.report.report_id)];
      });
    };
    const handleReportDeleted = (data: { reportId: string }) => {
      setReports((prev) => prev.filter(r => r.report_id !== data.reportId));
    };
    socket.on('newReport', handleNewReport);
    socket.on('reportDeleted', handleReportDeleted);
    return () => {
      socket.off('newReport', handleNewReport);
      socket.off('reportDeleted', handleReportDeleted);
    };
  }, []);

  useEffect(() => {
    // Join admin_room để nhận realtime update
    socket.emit('join', 'admin_room');
    return () => {
      socket.emit('leave', 'admin_room');
    };
  }, []);

  const handleProcess = async (id: string) => {
    await fetch(`/api/reports/${id}/process`, { method: 'PUT' });
    toast.success('Đã xử lý báo cáo!');
    setReports(prev => prev.map(r => r.report_id === id ? { ...r, status: 'Đã xử lý' } : r));
  };

  const handleDelete = (id: string) => {
    setDeleteReportId(id);
  };

  const confirmDelete = async () => {
    if (deleteReportId) {
      await fetch(`/api/reports/${deleteReportId}`, { method: 'DELETE' });
      toast.success('Đã xóa báo cáo!');
      setDeleteReportId(null);
      fetchReports();
    }
  };

  const handleViewReport = async (report: Report) => {
    const res = await fetch(`/api/reports/${report.report_id}`);
    const result = await res.json();
    if (result.success) {
      setSelectedReport(result.report);
      setReportedPost(result.post);
      setSharedPost(result.shared_post || null);
    } else {
      toast.error(result.error || 'Không lấy được chi tiết báo cáo');
    }
  };

  const handleOpenMailDialog = (report: Report, target: 'reporter' | 'reported') => {
    setMailReport(report);
    setMailTarget(target);
    setShowMailDialog(true);
    setMailTitle('');
    setMailContent('');
    setMailType('system');
    const userId = target === 'reporter' ? report.reporter_id : report.reported_user_id;
    setMailUserId(userId);
    setSelectedReport(null);
    setReportedPost(null);
  };

  const handleSendNotification = async () => {
    if (!mailTitle.trim() || !mailContent.trim()) {
      toast.error('Vui lòng nhập tiêu đề và nội dung!');
      return;
    }
    if (!mailUserId) {
      toast.error('Không xác định được người nhận!');
      return;
    }
    const res = await fetch('/api/reports/send-notification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: mailUserId,
        title: mailTitle,
        content: mailContent,
        type: 'system',
      }),
    });
    const result = await res.json();
    if (result.success) {
      toast.success('Đã gửi thông báo!');
      setShowMailDialog(false);
    } else {
      toast.error(result.message || 'Gửi thông báo thất bại!');
    }
  };

  const handleSearch = () => {
    setOffset(0);
    setHasMore(true);
    fetchReports(true);
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) fetchReports(false);
  };

  const sortedReports = [...reports];
  if (sortTime === 'newest') {
    sortedReports.sort((a, b) => new Date(b.date_reported).getTime() - new Date(a.date_reported).getTime());
  } else if (sortTime === 'oldest') {
    sortedReports.sort((a, b) => new Date(a.date_reported).getTime() - new Date(b.date_reported).getTime());
  }

  return (
    <AdminGuard>
      <AdminLayout onOpenAuth={() => {}}>
        <main className="p-4 sm:p-6">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 text-gray-900">Quản lý báo cáo</h1>

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
                  placeholder="Tìm theo người báo cáo hoặc người bị báo cáo..."
                  className="pl-10 pr-4 py-2 bg-[#F5F0E5] rounded-xl text-gray-800 w-full outline-none text-sm sm:text-base"
                />
              </div>
              {/* Dropdown filter cho desktop */}
              <div className="hidden sm:flex flex-row gap-4 ml-auto">
                <CustomDropdown value={status} onChange={v => setStatus(v as any)} options={statusOptions} widthClass="w-48" />
                <CustomDropdown value={sortTime || ''} onChange={v => setSortTime(v as any)} options={timeOptions} placeholder="Thời gian" widthClass="w-48" />
              </div>
            </div>

            {/* Card view for mobile, giống user/post */}
            <div className="block sm:hidden" ref={mobileListRef} style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              <div className="flex flex-col gap-2 mb-2">
                <CustomDropdown value={status} onChange={v => setStatus(v as any)} options={statusOptions} widthClass="w-full" />
                <CustomDropdown value={sortTime || ''} onChange={v => setSortTime(v as any)} options={timeOptions} placeholder="Thời gian" widthClass="w-full" />
              </div>
              {loading && sortedReports.length === 0 ? (
                <div className="p-6 text-center text-gray-500 bg-white rounded-xl border">
                  <span className="inline-flex items-center justify-center">
                    <svg className="animate-spin h-5 w-5 text-blue-500 mr-2" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                    Đang tải dữ liệu...
                  </span>
                </div>
              ) : sortedReports.length === 0 ? (
                <div className="p-6 text-center text-gray-500 bg-white rounded-xl border">
                  {search.trim()
                    ? 'Không có kết quả nào phù hợp với từ khóa tìm kiếm.'
                    : 'Không có báo cáo nào phù hợp với bộ lọc hiện tại.'}
                </div>
              ) : (
                <>
                  {sortedReports.map((report) => (
                    <div key={report.report_id} className="bg-white border rounded-xl p-4 mb-4 shadow-sm hover:shadow-md transition">
                      <div className="flex flex-col gap-2">
                        <p className="text-gray-600 text-sm"><span className="font-medium">Mã báo cáo:</span> <span className="text-gray-700">{truncateIfNeeded(report.report_id, windowWidth)}</span></p>
                        <p className="text-gray-600 text-sm"><span className="font-medium">Ngày báo cáo:</span> <span className="text-gray-700">{new Date(report.date_reported).toLocaleDateString('vi-VN')}</span></p>
                        <p className="text-gray-600 text-sm"><span className="font-medium">Người báo cáo:</span> <span className="text-gray-700">{truncateIfNeeded(report.reported_by, windowWidth)}</span></p>
                        <p className="text-gray-600 text-sm"><span className="font-medium">Tài khoản bị báo cáo:</span> <span className="text-gray-700">{truncateIfNeeded(report.reported_account, windowWidth)}</span></p>
                        <p className="text-gray-600 text-sm"><span className="font-medium">Nội dung:</span> <span className="text-gray-700 whitespace-pre-line">{truncateIfNeeded(report.content, windowWidth)}</span></p>
                        <p className="text-gray-600 text-sm"><span className="font-medium">Trạng thái:</span> <span className={`px-2 py-1 rounded-full text-xs ${report.status === 'Đã xử lý' ? 'bg-blue-200' : 'bg-yellow-200'}`}>{truncateIfNeeded(report.status, windowWidth)}</span></p>
                        <div className="flex gap-2 mt-2">
                          <button className="text-blue-500 hover:text-blue-600" onClick={() => handleViewReport(report)}><FiEye size={18} /></button>
                          {report.status !== 'Đã xử lý' && (
                            <button onClick={() => handleProcess(report.report_id)} className="text-green-600 hover:text-green-700"><FiCheck size={18} /></button>
                          )}
                          <button onClick={() => handleDelete(report.report_id)} className="text-red-500 hover:text-red-600"><FiTrash2 size={18} /></button>
                          <button className="text-orange-500 hover:text-orange-600" title="Gửi thông báo" onClick={() => handleOpenMailDialog(report, 'reporter')}><FiMail size={18} /></button>
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
            <div className="hidden sm:block border border-[#DBE0E5] rounded-xl bg-white">
              <div>
                <div className="flex w-full text-sm font-semibold bg-white border-b border-[#DBE0E5] sticky top-0 z-20 items-center">
                  <div className="p-3 flex-1 min-w-0 text-gray-800 flex justify-center items-center text-center break-words whitespace-normal">Mã báo cáo</div>
                  <div className="p-3 flex-1 min-w-0 text-gray-800 flex justify-center items-center text-center break-words whitespace-normal">Ngày báo cáo</div>
                  <div className="p-3 flex-1 min-w-0 text-gray-800 flex justify-center items-center text-center break-words whitespace-normal">Người báo cáo</div>
                  <div className="p-3 flex-1 min-w-0 text-gray-800 flex justify-center items-center text-center break-words whitespace-normal">Tài khoản bị báo cáo</div>
                  <div className="p-3 flex-1 min-w-0 text-gray-800 flex justify-center items-center text-center break-words whitespace-normal">Nội dung</div>
                  <div className="p-3 flex-1 min-w-0 text-gray-800 flex justify-center items-center text-center break-words whitespace-normal">Trạng thái</div>
                  <div className="p-3 flex-1 min-w-0 text-gray-800 flex justify-center items-center text-center break-words whitespace-normal">Hành động</div>
                </div>
                {loading && sortedReports.length === 0 ? (
                  <div className="p-6 text-center text-gray-500 bg-white">
                    <span className="inline-flex items-center justify-center">
                      <svg className="animate-spin h-5 w-5 text-blue-500 mr-2" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                      </svg>
                      Đang tải dữ liệu...
                    </span>
                  </div>
                ) : sortedReports.length === 0 ? (
                  <div className="p-6 text-center text-gray-500 bg-white">
                    {search.trim()
                      ? 'Không có kết quả nào phù hợp với từ khóa tìm kiếm.'
                      : 'Không có báo cáo nào phù hợp với bộ lọc hiện tại.'}
                  </div>
                ) : (
                  <>
                    <List
                      ref={listRef}
                      height={listHeight}
                      itemCount={sortedReports.length}
                      itemSize={56}
                      width={listWidth}
                      className="relative z-10"
                      onScroll={handleLoadMore}
                    >
                      {({ index, style }) => {
                        const report = sortedReports[index];
                        return (
                          <div
                            key={report.report_id}
                            style={style}
                            className="flex w-full text-sm bg-white border-b border-[#E5E8EB] hover:bg-gray-50 transition items-center"
                          >
                            <div className="p-3 flex-1 min-w-0 flex justify-center items-center text-center truncate" title={report.report_id}>{truncateIfNeeded(report.report_id, windowWidth)}</div>
                            <div className="p-3 flex-1 min-w-0 flex justify-center items-center text-center" title={report.date_reported}>{new Date(report.date_reported).toLocaleDateString('vi-VN')}</div>
                            <div className="p-3 flex-1 min-w-0 flex justify-center items-center text-center truncate" title={report.reported_by}>{truncateIfNeeded(report.reported_by, windowWidth)}</div>
                            <div className="p-3 flex-1 min-w-0 flex justify-center items-center text-center truncate" title={report.reported_account}>{truncateIfNeeded(report.reported_account, windowWidth)}</div>
                            <div className="p-3 flex-1 min-w-0 flex justify-center items-center text-center truncate" title={report.content}>{truncateIfNeeded(report.content, windowWidth)}</div>
                            <div className="p-3 flex-1 min-w-0 flex justify-center items-center text-center"><span className={`px-2 py-1 rounded-full text-xs ${report.status === 'Đã xử lý' ? 'bg-blue-200' : 'bg-yellow-200'}`}>{truncateIfNeeded(report.status, windowWidth)}</span></div>
                            <div className="p-3 flex-1 min-w-0 text-center"><div className="flex gap-2 justify-center"><button className="text-blue-500 hover:text-blue-600" onClick={() => handleViewReport(report)}><FiEye size={18} /></button>{report.status !== 'Đã xử lý' && (<button onClick={() => handleProcess(report.report_id)} className="text-green-600 hover:text-green-700"><FiCheck size={18} /></button>)}<button onClick={() => handleDelete(report.report_id)} className="text-red-500 hover:text-red-600"><FiTrash2 size={18} /></button><button className="text-orange-500 hover:text-orange-600" title="Gửi thông báo" onClick={() => handleOpenMailDialog(report, 'reporter')}><FiMail size={18} /></button></div></div>
                          </div>
                        );
                      }}
                    </List>
                    {loading && sortedReports.length > 0 && (
                      <div className="flex justify-center py-2"><LoadingSpinner size={24} color="#ea580c" /></div>
                    )}
                    {!hasMore && sortedReports.length > 0 && (
                      <div className="text-center py-2 text-gray-400 text-sm">Đã hiển thị hết danh sách</div>
                    )}
                  </>
                )}
              </div>
            </div>

            <ToastContainer position="top-right" autoClose={3000} aria-label="Thông báo hệ thống" />

            {showMailDialog && (
              <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[9999] p-4" onClick={() => setShowMailDialog(false)}>
                <div
                  className="bg-white rounded-2xl shadow-xl p-4 sm:p-6 w-full max-w-sm animate-fadeIn"
                  onClick={(e) => e.stopPropagation()}
                >
                  <h2 className="text-lg sm:text-xl font-bold mb-4 text-gray-800">Gửi thông báo</h2>
                  <div className="mb-3">
                    <label className="block font-medium mb-1 text-sm sm:text-base">Gửi cho:</label>
                    <select
                      className="w-full p-2 border rounded mb-2 text-sm sm:text-base"
                      value={mailTarget}
                      onChange={(e) => {
                        setMailTarget(e.target.value as 'reporter' | 'reported');
                        if (mailReport) {
                          const userId =
                            e.target.value === 'reporter'
                              ? mailReport.reporter_id
                              : mailReport.reported_user_id;
                          setMailUserId(userId);
                        }
                      }}
                    >
                      <option value="reporter">Người báo cáo</option>
                      <option value="reported">Người bị báo cáo</option>
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="block font-medium mb-1 text-sm sm:text-base">Tiêu đề</label>
                    <input
                      className="w-full p-2 border rounded text-sm sm:text-base"
                      value={mailTitle}
                      onChange={(e) => setMailTitle(e.target.value)}
                      placeholder="Nhập tiêu đề..."
                    />
                  </div>
                  <div className="mb-3">
                    <label className="block font-medium mb-1 text-sm sm:text-base">Nội dung</label>
                    <textarea
                      className="w-full p-2 border rounded text-sm sm:text-base"
                      value={mailContent}
                      onChange={(e) => setMailContent(e.target.value)}
                      placeholder="Nhập nội dung..."
                      rows={4}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="block font-medium mb-1 text-sm sm:text-base">Loại thông báo</label>
                    <input
                      className="w-full p-2 border rounded text-sm sm:text-base"
                      value={mailType}
                      disabled
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      className="px-3 sm:px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 text-sm sm:text-base"
                      onClick={handleSendNotification}
                    >
                      Gửi
                    </button>
                    <button
                      className="px-3 sm:px-4 py-2 bg-gray-200 text-gray-800 rounded-xl hover:bg-gray-300 text-sm sm:text-base"
                      onClick={() => setShowMailDialog(false)}
                    >
                      Hủy
                    </button>
                  </div>
                </div>
              </div>
            )}

            {selectedReport && (
              <div
                className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
                onClick={() => {
                  setSelectedReport(null);
                  setReportedPost(null);
                  setSharedPost(null);
                }}
              >
                <div
                  className="bg-white rounded-2xl shadow-xl p-4 sm:p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto animate-fadeIn"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="mb-4">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-2">
                      Báo cáo #{selectedReport.report_id}
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-500 mb-1">
                      Ngày báo cáo: {selectedReport.date_reported}
                    </p>
                    <p className="text-xs sm:text-sm text-gray-500 mb-1">
                      Người báo cáo: {selectedReport.reported_by}
                    </p>
                    <p className="text-xs sm:text-sm text-gray-500 mb-1">
                      Tài khoản bị báo cáo: {selectedReport.reported_account}
                    </p>
                    <p className="text-xs sm:text-sm text-gray-500 mb-1">
                      Trạng thái: {selectedReport.status}
                    </p>
                  </div>
                  {reportedPost && (
                    <div className="mb-4">
                      <h4 className="font-semibold text-gray-700 mb-2 text-sm sm:text-base">Bài đăng bị báo cáo</h4>
                      <div className="bg-white rounded-xl shadow border p-4 flex flex-col gap-2">
                        <div className="flex items-center gap-3">
                          {reportedPost.avatar_url && (
                            <Image
                              src={reportedPost.avatar_url}
                              alt="avatar"
                              width={40}
                              height={40}
                              className="w-10 h-10 rounded-full object-cover border"
                              unoptimized
                            />
                          )}
                          <div>
                            <div className="font-semibold text-gray-900 text-sm sm:text-base">
                              {(reportedPost.first_name || '') + ' ' + (reportedPost.last_name || '')}
                            </div>
                            {sharedPost && (
                              <div className="text-xs text-gray-500">
                                đã chia sẻ bài viết của {(sharedPost.first_name || '') + ' ' + (sharedPost.last_name || '')}
                              </div>
                            )}
                            <div className="text-xs text-gray-500">
                              {reportedPost.created_at
                                ? new Date(reportedPost.created_at).toLocaleString('vi-VN')
                                : ''}
                            </div>
                          </div>
                        </div>
                        <div className="text-gray-800 text-sm sm:text-base whitespace-pre-line">{reportedPost.content}</div>
                        {reportedPost.images && (() => {
                          let imgs: string[] = [];
                          try {
                            imgs = JSON.parse(reportedPost.images);
                          } catch {}
                          return Array.isArray(imgs) && imgs.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                              {imgs.map((img, idx) => (
                                <Image
                                  key={img + '-' + idx}
                                  src={img}
                                  alt={`Ảnh ${idx + 1}`}
                                  width={128}
                                  height={128}
                                  className="w-full h-32 object-cover rounded border"
                                  unoptimized
                                />
                              ))}
                            </div>
                          ) : null;
                        })()}
                        {sharedPost && (
                          <div className="border rounded-lg bg-gray-50 p-3 mt-2">
                            <div className="flex items-center gap-2 sm:gap-3 mb-1">
                              {sharedPost.avatar_url && (
                                <Image
                                  src={sharedPost.avatar_url}
                                  alt="avatar"
                                  width={32}
                                  height={32}
                                  className="w-8 h-8 rounded-full object-cover border"
                                  unoptimized
                                />
                              )}
                              <div>
                                <div className="font-semibold text-gray-900 text-sm">
                                  {(sharedPost.first_name || '') + ' ' + (sharedPost.last_name || '')}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {sharedPost.created_at
                                    ? new Date(sharedPost.created_at).toLocaleString('vi-VN')
                                    : ''}
                                </div>
                              </div>
                            </div>
                            <div className="text-gray-800 text-sm whitespace-pre-line">{sharedPost.content}</div>
                            {sharedPost.images && (() => {
                              let imgs: string[] = [];
                              try {
                                imgs = JSON.parse(sharedPost.images);
                              } catch {}
                              return Array.isArray(imgs) && imgs.length > 0 ? (
                                <div className="flex flex-wrap gap-2 mt-2">
                                  {imgs.map((img, idx) => (
                                    <Image
                                      key={img + '-' + idx}
                                      src={img}
                                      alt={`Ảnh ${idx + 1}`}
                                      width={96}
                                      height={96}
                                      className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded border"
                                      unoptimized
                                    />
                                  ))}
                                </div>
                              ) : null;
                            })()}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  <div className="mb-4">
                    <h4 className="font-semibold text-gray-700 mb-2 text-sm sm:text-base">Nội dung báo cáo</h4>
                    <div className="bg-gray-100 rounded-lg p-4 text-gray-800 text-sm sm:text-base">
                      {selectedReport.content}
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      className="px-3 sm:px-4 py-2 bg-gray-200 text-gray-800 rounded-xl hover:bg-gray-300 text-sm sm:text-base"
                      onClick={() => {
                        setSelectedReport(null);
                        setReportedPost(null);
                        setSharedPost(null);
                      }}
                    >
                      Đóng
                    </button>
                  </div>
                </div>
              </div>
            )}

            {deleteReportId && (
              <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[9999] p-4" onClick={() => setDeleteReportId(null)}>
                <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-6 w-full max-w-sm animate-fadeIn" onClick={(e) => e.stopPropagation()}>
                  <h2 className="text-lg sm:text-xl font-bold mb-4 text-center text-gray-800">Xác nhận xóa</h2>
                  <p className="mb-4 sm:mb-6 text-center text-gray-500 text-sm sm:text-base">Bạn có chắc chắn muốn xóa báo cáo này?</p>
                  <div className="flex justify-end gap-2">
                    <button
                      className="px-3 sm:px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 text-sm sm:text-base"
                      onClick={confirmDelete}
                    >
                      Xóa
                    </button>
                    <button
                      className="px-3 sm:px-4 py-2 bg-gray-200 text-gray-800 rounded-xl hover:bg-gray-300 text-sm sm:text-base"
                      onClick={() => setDeleteReportId(null)}
                    >
                      Hủy
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