'use client';

import React, { ReactElement, useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { FiBell, FiUser, FiMenu, FiAlertCircle, FiCheckCircle } from 'react-icons/fi';
import { useRouter } from 'next/navigation';
import Toast from './Toast';
import { socket } from '@/socket';
import { useUser } from '@/contexts/UserContext';
import { Notification } from '@/types/notification';

const NOTI_PAGE_SIZE = 10;

export default function HeaderAdmin({
  onOpenAuth,
  className = '',
}: {
  onOpenAuth: (tab: 'login' | 'signup') => void;
  className?: string;
}): ReactElement {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const notiWrapperRef = useRef<HTMLDivElement>(null);
  const notiListRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const userDropdownRef = useRef<HTMLDivElement>(null);
  const [notiLoading, setNotiLoading] = useState(false);
  const [notiPage, setNotiPage] = useState(1);
  const [notiHasMore, setNotiHasMore] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const { accessToken } = useUser();

  // State cho tab dropdown notification
  const [dropdownTab, setDropdownTab] = useState<'all' | 'unread'>('all');

  // Fetch unread count from backend
  const fetchUnreadCount = async () => {
    try {
      const res = await fetch('/api/admin/notifications/unread-total', {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      const data = await res.json();
      setUnreadCount(data.total || 0);
    } catch (err) {
      setUnreadCount(0);
    }
  };

  // Fetch notifications with pagination and tab
  const fetchNotifications = async (page = 1, reset = false, tab = dropdownTab) => {
    setNotiLoading(true);
    try {
      const res = await fetch(`/api/admin/notifications?page=${page}&limit=${NOTI_PAGE_SIZE}&tab=${tab}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      let data = await res.json();
      data = data.notifications as Notification[];
      setNotifications(prev => (reset ? data : [...prev, ...data]));
      setNotiHasMore(data.length === NOTI_PAGE_SIZE);
      setNotiPage(page);
    } catch (err) {
      setToast({ message: 'Lỗi tải thông báo', type: 'error' });
      console.error('Failed to fetch notifications:', err);
    } finally {
      setNotiLoading(false);
    }
  };

  // Fetch unread count on mount and when dropdown closes
  useEffect(() => {
    fetchUnreadCount();
  }, []);

  useEffect(() => {
    if (!showDropdown) {
      fetchUnreadCount();
    }
  }, [showDropdown]);

  // Khi mở dropdown, fetch theo tab hiện tại
  useEffect(() => {
    if (showDropdown) {
      fetchNotifications(1, true, dropdownTab);
    }
  }, [showDropdown, dropdownTab]);

  // Infinite scroll handler
  const handleNotiScroll = () => {
    if (!notiListRef.current || notiLoading || !notiHasMore) return;
    const { scrollTop, scrollHeight, clientHeight } = notiListRef.current;
    if (scrollTop + clientHeight >= scrollHeight - 40) {
      fetchNotifications(notiPage + 1);
    }
  };

  useEffect(() => {
    if (!showDropdown) return;
    const ref = notiListRef.current;
    if (ref) ref.addEventListener('scroll', handleNotiScroll);
    return () => {
      if (ref) ref.removeEventListener('scroll', handleNotiScroll);
    };
  }, [showDropdown, notiLoading, notiHasMore, notiPage]);

  // Toast auto-hide
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 2500);
      return () => clearTimeout(t);
    }
  }, [toast]);

  // Mark as read
  const markAsRead = async (id: string) => {
    try {
      await fetch(`/api/admin/notifications/${id}/read`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      fetchUnreadCount();
    } catch (err) {
      setToast({ message: 'Lỗi đánh dấu đã đọc', type: 'error' });
    }
  };
  const markAllAsRead = async () => {
    try {
      await fetch('/api/admin/notifications/read-all', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      fetchUnreadCount();
      setToast({ message: 'Đã đánh dấu tất cả đã đọc', type: 'success' });
    } catch (err) {
      setToast({ message: 'Lỗi đánh dấu tất cả đã đọc', type: 'error' });
    }
  };
  const deleteNotification = async (id: string) => {
    try {
      await fetch(`/api/admin/notifications/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      setNotifications(prev => prev.filter(n => n.id !== id));
      fetchUnreadCount();
      setToast({ message: 'Đã xóa thông báo', type: 'success' });
    } catch (err) {
      setToast({ message: 'Lỗi xóa thông báo', type: 'error' });
    }
  };
  const deleteAllNotifications = async () => {
    try {
      await fetch('/api/admin/notifications/all', {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      setNotifications([]);
      fetchUnreadCount();
      setToast({ message: 'Đã xóa tất cả thông báo', type: 'success' });
    } catch (err) {
      setToast({ message: 'Lỗi xóa tất cả thông báo', type: 'error' });
    }
  };

  // Khi đổi tab trong dropdown
  const handleDropdownTabChange = (tab: 'all' | 'unread') => {
    setDropdownTab(tab);
    setNotiPage(1);
    setNotiHasMore(true);
    fetchNotifications(1, true, tab);
  };

  // Real-time socket
  useEffect(() => {
    const handleNewNotification = (notification: any) => {
      if (notification.type === 'report_new' || notification.type === 'post_approval') {
        setNotifications(prev => [notification, ...prev]);
        setUnreadCount(prev => prev + 1);
        setToast({ message: 'Có thông báo mới', type: 'success' });
      }
    };
    socket.on('newNotification', handleNewNotification);
    return () => {
      socket.off('newNotification', handleNewNotification);
    };
  }, []);

  const handleToggleDropdown = () => {
    if (showUserDropdown) setShowUserDropdown(false);
    setShowDropdown((prev) => !prev);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(e.target as Node)) {
        setShowUserDropdown(false);
      }
    };
    if (showUserDropdown) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showUserDropdown]);

  return (
    <header
      className={`h-12 sm:h-14 lg:h-16 bg-[#AECBEB] px-4 flex items-center justify-between shadow-md ${className}`}
    >
      {/* Left: Menu button & Logo */}
      <div className="flex items-center gap-4">
        {/* Menu icon - only visible on mobile/tablet */}
        <button className="block lg:hidden p-2 rounded-md hover:bg-white/40">
          <FiMenu className="w-6 h-6 text-gray-900" />
        </button>

        {/* Logo */}
        <div className="flex items-center h-full">
          <Image
            src="/logo.png"
            alt="Solace Logo"
            width={300}
            height={90}
            className="object-contain h-24 sm:h-32 lg:h-30"
            priority
          />
        </div>
      </div>

      {/* Right: Notifications and User icon */}
      <div className="flex items-center gap-3 sm:gap-4 relative" ref={notiWrapperRef}>
        {/* Bell icon */}
        <button
          className={`p-3 sm:p-4 rounded-full relative transition-all duration-200 ${
            showDropdown ? 'bg-gray-50 hover:bg-gray-100' : 'hover:bg-gray-50'
          }`}
          onClick={handleToggleDropdown}
        >
          <FiBell
            className={`w-6 h-6 sm:w-7 h-7 transition-colors duration-200 ${
              showDropdown ? 'text-blue-700' : 'text-gray-900'
            }`}
          />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-600 text-white text-sm font-bold rounded-full px-2 animate-pingOnce">
              {unreadCount}
            </span>
          )}
        </button>

        {/* User icon */}
        <div className="relative" ref={userDropdownRef}>
          <button
            onClick={() => {
              if (showDropdown) setShowDropdown(false);
              setShowUserDropdown((prev) => !prev);
            }}
            className={`p-3 sm:p-4 hover:bg-gray-50 rounded-full transition-all duration-200 ${showUserDropdown ? 'bg-gray-50' : ''}`}
          >
            <FiUser className={`w-6 h-6 sm:w-7 h-7 transition-colors duration-200 ${showUserDropdown ? 'text-blue-700' : 'text-gray-900'}`} />
          </button>
          {showUserDropdown && (
            <div className="absolute right-0 top-full  w-36 bg-white shadow-lg rounded-xl border border-gray-200 z-50 animate-fade-in-down">
              <button
                className="block w-full text-left px-4 py-3 text-gray-800 hover:bg-gray-100 rounded-xl"
                onClick={() => {
                  setShowUserDropdown(false);
                  router.push('/admin/login');
                }}
              >
                Log out
              </button>
            </div>
          )}
        </div>

        {/* Dropdown thông báo */}
        {showDropdown && (
          <div
            className="absolute right-0 top-full mt-2 w-72 sm:w-80 md:w-96 max-w-[calc(100vw-2rem)] bg-white rounded-xl shadow-lg py-2 z-50 border border-orange-200 animate-fade-in notification-dropdown-mobile"
            style={{ 
              minWidth: '260px',
              maxWidth: 'calc(100vw - 1rem)',
              right: '0',
              left: 'auto'
            }}
          >
            {/* Header dropdown */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-orange-100">
              <span className="font-bold text-orange-600 text-lg">Thông báo</span>
              <div className="flex gap-2">
                <button
                  onClick={markAllAsRead}
                  className="w-9 h-9 flex items-center justify-center rounded-full bg-white shadow hover:bg-orange-100 active:bg-orange-200 transition-all duration-150 ring-1 ring-orange-200 hover:scale-110 focus:scale-110 focus:ring-2 focus:ring-orange-400"
                  title="Đánh dấu tất cả đã đọc"
                  tabIndex={0}
                >
                  <span className="material-symbols-outlined text-2xl" style={{ color: '#ea580c' }}>done_all</span>
                </button>
                <button
                  onClick={deleteAllNotifications}
                  className="w-9 h-9 flex items-center justify-center rounded-full bg-white shadow hover:bg-red-100 active:bg-red-200 transition-all duration-150 ring-1 ring-red-200 hover:scale-110 focus:scale-110 focus:ring-2 focus:ring-red-400"
                  title="Xóa tất cả"
                  tabIndex={0}
                >
                  <span className="material-symbols-outlined text-2xl" style={{ color: '#ef4444' }}>delete_sweep</span>
                </button>
              </div>
            </div>
            {/* Tabs filter */}
            <div className="flex border-b border-orange-100 mb-2 px-4 gap-2">
              <button onClick={() => handleDropdownTabChange('all')} className={`px-2 py-1 rounded font-semibold text-xs sm:text-sm transition ${dropdownTab === 'all' ? 'text-orange-600 bg-orange-50' : 'text-gray-600 hover:bg-gray-50'}`}>Tất cả</button>
              <button onClick={() => handleDropdownTabChange('unread')} className={`px-2 py-1 rounded font-semibold text-xs sm:text-sm transition ${dropdownTab === 'unread' ? 'text-orange-600 bg-orange-50' : 'text-gray-600 hover:bg-gray-50'}`}>Chưa đọc</button>
            </div>
            {/* Danh sách thông báo */}
            <div className="max-h-96 overflow-y-auto divide-y divide-gray-50 scrollbar-thin scrollbar-thumb-orange-200 scrollbar-track-gray-100">
              {notiLoading && notifications.length === 0 ? (
                <div className="flex justify-center py-8">
                  <span className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500"></span>
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-orange-300">
                  <span className="material-symbols-outlined text-4xl mb-2" style={{ color: '#ea580c' }}>notifications_off</span>
                  <div className="text-base">Không có thông báo mới</div>
                </div>
              ) : (
                notifications.map((noti) => {
                  return (
                    <div
                      key={noti.id}
                      className={`group flex items-start gap-3 mx-2 px-4 py-4 my-1 rounded-xl cursor-pointer transition-all duration-200 relative ${
                        noti.is_read ? 'bg-white hover:bg-gray-50' : 'bg-orange-50 border border-orange-200 shadow'
                      }`}
                      onClick={() => markAsRead(noti.id)}
                    >
                      <span className="material-symbols-outlined text-2xl mt-1" style={{ color: noti.type === 'report_new' ? '#ea580c' : '#22c55e' }}>
                        {noti.type === 'report_new' ? 'report' : 'task_alt'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-900 flex items-center gap-2">
                          {noti.title}
                        </div>
                        <div className="text-sm text-gray-600 line-clamp-2">{noti.content}</div>
                        <div className="text-xs text-gray-400 mt-1">{new Date(noti.created_at).toLocaleString('vi-VN')}</div>
                      </div>
                      {/* Nút đánh dấu đã đọc */}
                      {!noti.is_read && (
                        <button
                          className="absolute top-2 right-10 w-8 h-8 flex items-center justify-center rounded-full bg-white shadow hover:bg-orange-100 active:bg-orange-200 text-orange-500 hover:text-orange-700 opacity-0 group-hover:opacity-100 transition-all duration-150 ring-1 ring-orange-100 hover:scale-110 focus:scale-110 focus:ring-2 focus:ring-orange-400"
                          onClick={e => { e.stopPropagation(); markAsRead(noti.id); }}
                          title="Đánh dấu đã đọc"
                          tabIndex={0}
                        >
                          <span className="material-symbols-outlined text-xl">done</span>
                        </button>
                      )}
                      {/* Nút xóa */}
                      <button
                        className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center rounded-full bg-white shadow hover:bg-red-100 active:bg-red-200 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all duration-150 ring-1 ring-red-100 hover:scale-110 focus:scale-110 focus:ring-2 focus:ring-red-400"
                        onClick={e => { e.stopPropagation(); deleteNotification(noti.id); }}
                        title="Xóa thông báo"
                        tabIndex={0}
                      >
                        <span className="material-symbols-outlined text-xl" style={{ color: '#ef4444' }}>delete</span>
                      </button>
                    </div>
                  );
                })
              )}
              {notiLoading && notifications.length > 0 && (
                <div className="flex justify-center py-2">
                  <span className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-orange-500"></span>
                </div>
              )}
              {notiHasMore && !notiLoading && notifications.length > 0 && (
                <div className="p-2 text-center text-orange-500 text-sm">Cuộn để xem thêm...</div>
              )}
            </div>
          </div>
        )}
      </div>
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </header>
  );
}