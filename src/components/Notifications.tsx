'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MaterialIcon } from './MaterialIcon';
import Image from 'next/image';
import { useUser } from '@/contexts/UserContext';
import { socket } from '@/socket';
import { Notification } from '@/types/notification';
import { useRouter } from 'next/navigation';
import PostDetailPopup from './PostDetailPopup';
import { formatDate } from '../lib/dateUtils';
import Toast from "./Toast";
import { PostType } from '@/types/Post';

const NotificationsPage = () => {
  const { user, accessToken } = useUser();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'system'>('all');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const NOTI_PAGE_SIZE = 10;
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isFetchingRef = useRef(false);
  const router = useRouter();
  const [openPost, setOpenPost] = useState<PostType | null>(null);
  const [showPostModal, setShowPostModal] = useState(false);
  const [followedUserIds, setFollowedUserIds] = useState<string[]>([]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchNotifications = useCallback(
    async (pageNum: number) => {
      if (!user || !accessToken || isFetchingRef.current) return;

      try {
        isFetchingRef.current = true;
        setLoading(true);
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/notifications?page=${pageNum}&limit=${NOTI_PAGE_SIZE}&tab=${activeTab}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        if (!response.ok) throw new Error('Failed to fetch notifications');

        const data = await response.json();
        setNotifications((prev) =>
          pageNum === 1 ? data.notifications : [...prev, ...data.notifications]
        );
        setHasMore(data.hasMore);
      } catch (error) {
        console.error('Error fetching notifications:', error);
      } finally {
        setLoading(false);
        isFetchingRef.current = false;
      }
    },
    [user, accessToken, activeTab]
  );

  useEffect(() => {
    if (user && accessToken) {
      setPage(1);
      fetchNotifications(1);
    }
  }, [user, accessToken, activeTab, fetchNotifications]);

  // Handle real-time notifications
  useEffect(() => {
    if (!user || !socket.connected) return;

    const handleNewNotification = (notification: Notification) => {
      if (activeTab === 'system' && notification.type !== 'system') {
        return;
      }
      setNotifications((prev) => [notification, ...prev]);
    };

    socket.on('newNotification', handleNewNotification);

    return () => {
      socket.off('newNotification', handleNewNotification);
    };
  }, [user, activeTab]);

  // Infinite scroll
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const handleScroll = () => {
      if (
        scrollContainer.scrollTop + scrollContainer.clientHeight >=
          scrollContainer.scrollHeight - 100 &&
        hasMore &&
        !loading &&
        !isFetchingRef.current
      ) {
        setPage((prev) => {
          const nextPage = prev + 1;
          fetchNotifications(nextPage);
          return nextPage;
        });
      }
    };

    // Debounce scroll handler
    let timeoutId: NodeJS.Timeout;
    const debouncedHandleScroll = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(handleScroll, 100);
    };

    scrollContainer.addEventListener('scroll', debouncedHandleScroll);
    return () => {
      scrollContainer.removeEventListener('scroll', debouncedHandleScroll);
      clearTimeout(timeoutId);
    };
  }, [hasMore, loading, fetchNotifications]);

  const markAllAsRead = async () => {
    if (!user || !accessToken) return;

    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/notifications/read-all`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      setNotifications((prev) => prev.map((noti) => ({ ...noti, is_read: true })));
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const markAsRead = async (id: string) => {
    if (!user || !accessToken) return;

    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/notifications/${id}/read`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      setNotifications((prev) =>
        prev.map((noti) => (noti.id === id ? { ...noti, is_read: true } : noti))
      );
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  // Hàm lấy chi tiết bài viết
  const handleOpenPostDetail = async (relatedId: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/posts/${relatedId}`);
      const data = await res.json();
      setOpenPost({
        id: data.id || data.post?.id || '',
        user_id: data.user_id || data.post?.user_id || '',
        first_name: data.first_name || data.post?.first_name || '',
        last_name: data.last_name || data.post?.last_name || '',
        content: data.content || data.post?.content || '',
        created_at: data.created_at || data.post?.created_at || '',
        type_post: data.type_post || data.post?.type_post || 'positive',
        like_count: data.like_count || data.post?.like_count || 0,
        comment_count: data.comment_count || data.post?.comment_count || 0,
        shares: data.shares || data.post?.shares || 0,
        images: data.images || data.post?.images || [],
        avatar_url: data.avatar_url || data.post?.avatar_url || '',
        feeling: data.feeling || data.post?.feeling || null,
        location: data.location || data.post?.location || null,
        is_approved: data.is_approved || data.post?.is_approved || false,
        is_liked: data.is_liked || data.post?.is_liked || false,
        shared_post_id: data.shared_post_id || data.post?.shared_post_id,
        shared_post: data.shared_post || data.post?.shared_post || null,
      });
      setShowPostModal(true);
    } catch (err) {
      alert('Không lấy được chi tiết bài viết!');
    }
  };

  // Hàm xóa 1 thông báo
  const deleteNotification = async (id: string) => {
    if (!user || !accessToken) return;
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/notifications/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (e) {
      console.error('Error deleting notification:', e);
    }
  };

  // Hàm xóa tất cả thông báo
  const deleteAllNotifications = async () => {
    if (!user || !accessToken) return;
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/notifications/all`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setNotifications([]);
    } catch (e) {
      console.error('Error deleting all notifications:', e);
    }
  };

  const handleFollow = async (senderId: string) => {
    if (!user || !accessToken) return;
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/${senderId}/follow`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setFollowedUserIds(prev => [...prev, senderId]);
      setToast({ message: 'Đã follow người dùng!', type: 'success' });
      setTimeout(() => setToast(null), 3000);
    } catch (e) {
      setToast({ message: 'Không thể follow người dùng này!', type: 'error' });
      setTimeout(() => setToast(null), 3000);
    }
  };

  if (!mounted) return null;

  const filteredNotifications = notifications.filter((noti) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'unread') return !noti.is_read;
    if (activeTab === 'system') return noti.type === 'system';
    return true;
  });

  return (
    <div className="h-full bg-gray-50 text-gray-800">
      <div className="max-w-3xl mx-auto p-3 sm:p-5 h-full flex flex-col">
        <div className="flex justify-between items-center mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl font-bold text-orange-600">Thông báo</h1>
          <div className="flex gap-2">
            <button className="w-9 h-9 rounded-full flex items-center justify-center bg-gray-100 hover:bg-orange-600 hover:text-white transition-all duration-300 touch-manipulation">
              <MaterialIcon icon="settings" />
            </button>
          </div>
        </div>

        <div className="text-right flex flex-col sm:flex-row justify-end gap-2 sm:gap-4 items-end sm:items-center mb-4">
          <button
            onClick={markAllAsRead}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-orange-200 bg-white text-orange-600 font-semibold hover:bg-orange-50 transition-all duration-200 shadow-sm"
          >
            <MaterialIcon icon="done_all" className="text-orange-600" />
            <span>Đánh dấu tất cả đã đọc</span>
          </button>
          <button
            onClick={deleteAllNotifications}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-red-200 bg-white text-red-500 font-semibold hover:bg-red-50 transition-all duration-200 shadow-sm"
          >
            <MaterialIcon icon="delete_sweep" className="text-red-500" />
            <span>Xóa tất cả</span>
          </button>
        </div>

        <div className="flex border-b border-gray-200 mb-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 sm:px-6 py-3 font-semibold relative whitespace-nowrap touch-manipulation ${activeTab === 'all' ? 'text-orange-600' : ''}`}
          >
            Tất cả
            {activeTab === 'all' && (
              <span className="absolute bottom-0 left-1/4 w-1/2 h-0.5 bg-orange-600 rounded-t"></span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('unread')}
            className={`px-4 sm:px-6 py-3 font-semibold relative whitespace-nowrap touch-manipulation ${activeTab === 'unread' ? 'text-orange-600' : ''}`}
          >
            Chưa đọc
            {activeTab === 'unread' && (
              <span className="absolute bottom-0 left-1/4 w-1/2 h-0.5 bg-orange-600 rounded-t"></span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('system')}
            className={`px-4 sm:px-6 py-3 font-semibold relative whitespace-nowrap touch-manipulation ${activeTab === 'system' ? 'text-orange-600' : ''}`}
          >
            Hệ thống
            {activeTab === 'system' && (
              <span className="absolute bottom-0 left-1/4 w-1/2 h-0.5 bg-orange-600 rounded-t"></span>
            )}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-mobile" ref={scrollContainerRef}>
          {loading && page === 1 ? (
            <div className="text-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-600 mx-auto"></div>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              <MaterialIcon icon="notifications_off" className="text-3xl sm:text-4xl mb-2" />
              <p className="text-sm sm:text-base">Không có thông báo nào</p>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {filteredNotifications.map((noti) => (
                <div
                  key={noti.id}
                  className={`group p-4 sm:p-5 rounded-xl transition-all duration-300 flex items-start relative cursor-pointer touch-manipulation ${
                    !noti.is_read
                      ? 'bg-orange-50 border border-orange-200 shadow-md'
                      : 'bg-white shadow-sm hover:shadow-md hover:bg-gray-50'
                  }`}
                  style={{ minHeight: 64 }}
                  onClick={() => {
                    if (noti.related_id) {
                      handleOpenPostDetail(noti.related_id);
                    }
                    if (!noti.is_read) markAsRead(noti.id);
                  }}
                >
                  {noti.type === 'system' ? (
                    <>
                      <MaterialIcon icon="info" className="text-orange-600 mr-3 sm:mr-4 text-xl sm:text-2xl" />
                      <div className="flex-1">
                        <div className="font-semibold text-sm sm:text-base">{noti.title}</div>
                        <div className="mb-1 text-sm sm:text-base">{noti.content}</div>
                        <div className="text-xs sm:text-sm text-gray-500">
                          {formatDate(noti.created_at)}
                        </div>
                      </div>
                      {!noti.is_read && <div className="w-2 h-2 bg-orange-600 rounded-full"></div>}
                    </>
                  ) : (
                    <>
                      <Image
                        src={noti.sender?.avatar_url || '/default-avatar.png'}
                        width={48}
                        height={48}
                        className="w-10 h-10 sm:w-12 sm:h-12 rounded-full mr-3 sm:mr-4 object-cover cursor-pointer"
                        alt={`${noti.sender?.first_name || ''} ${noti.sender?.last_name || ''}`}
                        unoptimized
                        onClick={e => {
                          e.stopPropagation();
                          if (noti.sender?.id) router.push(`/profile/${noti.sender.id}`);
                        }}
                      />
                      <div className="flex-1">
                        <div className="mb-1 text-sm sm:text-base">
                          <strong
                            className="text-orange-600 cursor-pointer hover:underline"
                            onClick={e => {
                              e.stopPropagation();
                              if (noti.sender?.id) router.push(`/profile/${noti.sender.id}`);
                            }}
                          >
                            {noti.sender?.first_name} {noti.sender?.last_name}
                          </strong>{' '}
                          {noti.content}
                        </div>
                        <div className="text-xs sm:text-sm text-gray-500">
                          {formatDate(noti.created_at)}
                        </div>
                      </div>
                    </>
                  )}
                  {/* Nhóm icon thao tác góc phải trên - luôn hiển thị trên mobile, chỉ hover trên desktop */}
                  <div className="absolute top-2 sm:top-3 right-2 sm:right-3 flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition z-10">
                    {noti.type === 'follow' && noti.sender && noti.sender.id && !followedUserIds.includes(noti.sender.id) && (
                      <button
                        className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center bg-gray-100 hover:bg-orange-100 active:bg-orange-200 transition-all duration-300"
                        title="Follow lại"
                        onClick={e => {
                          e.stopPropagation();
                          if (noti.sender && noti.sender.id) handleFollow(noti.sender.id);
                        }}
                      >
                        <MaterialIcon icon="person_add" className="text-orange-500" />
                      </button>
                    )}
                    {/* Nút đánh dấu đã đọc nếu chưa đọc */}
                    {!noti.is_read && (
                      <button
                        className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center bg-gray-100 hover:bg-orange-100 active:bg-orange-200 transition-all duration-300"
                        title="Đánh dấu đã đọc"
                        onClick={e => { e.stopPropagation(); markAsRead(noti.id); }}
                      >
                        <MaterialIcon icon="done" className="text-orange-500" />
                      </button>
                    )}
                    {/* Nút xóa */}
                    <button
                      className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center bg-gray-100 hover:bg-red-100 active:bg-red-200 transition-all duration-300"
                      title="Xóa thông báo"
                      onClick={e => { e.stopPropagation(); deleteNotification(noti.id); }}
                    >
                      <MaterialIcon icon="delete" className="text-red-500" />
                    </button>
                  </div>
                </div>
              ))}
              {loading && page > 1 && (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-orange-600 mx-auto"></div>
                </div>
              )}
            </div>
          )}
        </div>
        {/* Modal chi tiết bài viết */}
        {showPostModal && openPost && (
          <PostDetailPopup
            post={openPost}
            onClose={() => setShowPostModal(false)}
          />
        )}
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </div>
    </div>
  );
};

export default NotificationsPage;