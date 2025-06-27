"use client";

import React, { useEffect, useRef, useState, useCallback, memo } from "react";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { useUser } from "@/contexts/UserContext";
import Toast, { ToastProps } from "./Toast";
import Link from "next/link";
import gsap from "gsap";
import FilteredInput from "@/components/FilteredInput";
import { debounce } from 'lodash';
import { socket } from '@/socket';
import axios from 'axios';
import { Notification } from "@/types/notification";
import { formatDate } from "@/lib/dateUtils";
import PostDetailPopup from "./PostDetailPopup";
import clsx from "clsx";


// Định nghĩa kiểu props cho Header
interface HeaderProps {
  onOpenAuth?: (tab: "login" | "signup") => void;
  theme?: "inspiring" | "reflective";
  searchValue?: string;
  onSearchChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSearch?: () => void;
  onSearchKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

// Định nghĩa kiểu dữ liệu cho các gợi ý tìm kiếm
interface SearchSuggestion {
  id: string | number;
  name: string;
  type: 'user' | 'post';
  avatar?: string;
}

// Component Header: Thanh điều hướng trên cùng của ứng dụng
const Header = memo<HeaderProps>(({
  onOpenAuth,
  theme = "inspiring",
  searchValue = "",
  onSearchChange,
  onSearch,
  onSearchKeyDown,
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, logout, accessToken, setCurrentConversationId } = useUser();

  // State declarations
  const [search, setSearch] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: ToastProps["type"] } | null>(null);
  // Tổng số tin nhắn chưa đọc
  const [unreadCount, setUnreadCount] = useState(0);
  //Tổng số thông báo chưa đọc
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  // State kiểm soát hiển thị biểu tượng tin nhắn và thông báo
  const [showMessageIcon, setShowMessageIcon] = useState(true);
  const [showNotificationIcon, setShowNotificationIcon] = useState(true);
  const [searchHistory, setSearchHistory] = useState<{ id: string; keyword: string }[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  // State kiểm soát hiển thị dropdown thông báo
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);
  const notificationDropdownRef = useRef<HTMLDivElement>(null);
  const notificationScrollContainerRef = useRef<HTMLDivElement>(null);
  // State kiểm soát hiển thị dropdown tin nhắn
  const [showMessageDropdown, setShowMessageDropdown] = useState(false);
  const messageDropdownRef = useRef<HTMLDivElement>(null);
  const messageScrollContainerRef = useRef<HTMLDivElement>(null);
  // State cho popup chi tiết bài post
  const [openPost, setOpenPost] = useState<any>(null);
  const [showPostModal, setShowPostModal] = useState(false);
  const [followedUserIds, setFollowedUserIds] = useState<string[]>([]);
  // Online users for dropdown message
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  useEffect(() => {
    const handleOnline = (users: string[]) => setOnlineUsers(new Set(users));
    socket.on('onlineUsers', handleOnline);
    return () => { socket.off('onlineUsers', handleOnline); };
  }, []);

  useEffect(() => {
    if (user?.id && socket.connected) {
      socket.emit('register', user.id);
    }
  }, [user?.id]);

  // Refs
  const inputWrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const loginBtnRef = useRef<HTMLButtonElement>(null);
  const signupBtnRef = useRef<HTMLButtonElement>(null);
  const messageBtnRef = useRef<HTMLButtonElement>(null);
  const notificationBtnRef = useRef<HTMLButtonElement>(null);
  const historyRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const debouncedUpdate = useCallback(
    debounce((count: number) => {
      setUnreadCount(count);
    }, 300),
    []
  );

  // Constants
  const isControlled = typeof searchValue === 'string' && typeof onSearchChange === 'function';
  const value = isControlled ? searchValue : search;
  const reflectiveColor = "#D5BDAF";
  const inspiringColor = "#AECBEB";
  const headerBg = theme === "reflective" ? reflectiveColor : inspiringColor;
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
  // Hàm xử lý thay đổi giá trị ô tìm kiếm
  const handleChange = isControlled ? onSearchChange : (e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value);
  // Hàm xử lý sự kiện nhấn phím trong ô tìm kiếm
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (onSearchKeyDown) {
      onSearchKeyDown(e);
      return;
    }
    if (e.key === 'Enter') {
      if (onSearch) onSearch();
      setShowSuggestions(false);
    }
  };
  // Hàm xử lý click nút tìm kiếm
  const handleClick = () => {
    if (onSearch) onSearch();
    setShowSuggestions(false);
  };

  // Lấy gợi ý tìm kiếm từ API khi giá trị thay đổi
  useEffect(() => {
    const keyword = value.trim();
    if (keyword) {
      fetch(`/api/search-suggestions?query=${encodeURIComponent(keyword)}`)
        .then(res => res.json())
        .then(data => {
          // Lọc lại ở client: chỉ user có avatar
          setSuggestions(Array.isArray(data) ? data.filter(s => s.type === 'user' && s.avatar) : []);
          setShowSuggestions(true);
        });
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [value]);

  // Đóng gợi ý khi click ra ngoài
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        inputWrapperRef.current &&
        !inputWrapperRef.current.contains(event.target as Node) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
        setShowHistory(false);
      }
      
      // Đóng dropdown thông báo khi click ra ngoài
      if (
        notificationDropdownRef.current &&
        !notificationDropdownRef.current.contains(event.target as Node) &&
        notificationBtnRef.current &&
        !notificationBtnRef.current.contains(event.target as Node)
      ) {
        setShowNotificationDropdown(false);
      }

      // Đóng dropdown tin nhắn khi click ra ngoài
      if (
        messageDropdownRef.current &&
        !messageDropdownRef.current.contains(event.target as Node) &&
        messageBtnRef.current &&
        !messageBtnRef.current.contains(event.target as Node)
      ) {
        setShowMessageDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Đóng menu người dùng khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Memoized handlers
  const memoizedHandleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (isControlled && onSearchChange) {
      onSearchChange(e);
    } else {
      setSearch(e.target.value);
    }
  }, [isControlled, onSearchChange]);

  const memoizedHandleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (onSearchKeyDown) {
      onSearchKeyDown(e);
      return;
    }
    if (e.key === "Enter") {
      if (onSearch) {
        onSearch();
      } else if (value.trim()) {
        router.push(`/search?query=${encodeURIComponent(value.trim())}`);
      }
      setShowSuggestions(false);
    }
  }, [onSearchKeyDown, onSearch, value, router]);

  const memoizedHandleClick = useCallback(() => {
    if (onSearch) {
      onSearch();
    } else if (value.trim()) {
      router.push(`/search?query=${encodeURIComponent(value.trim())}`);
    }
    setShowSuggestions(false);
  }, [onSearch, value, router]);

  const handleInputFocus = async () => {
    setShowSuggestions(true);
    await fetchSearchHistory();
    setShowHistory(true);
  };

  const handleInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const relatedTarget = e.relatedTarget as Node;
    if (dropdownRef.current && relatedTarget && dropdownRef.current.contains(relatedTarget)) {
      return;
    }
    setTimeout(() => {
      setShowHistory(false);
      setShowSuggestions(false);
    }, 200);
  };

  const handleSearchWithHistory = async () => {
    if (onSearch) onSearch();
    else if (value.trim()) router.push(`/search?query=${encodeURIComponent(value.trim())}`);
    setShowSuggestions(false);
    await saveSearchHistory(value);
  };

  const saveSearchHistory = async (keyword: string) => {
    if (user && keyword.trim()) {
      try {
        await axios.post(`${API_URL}/api/search_history`, { keyword: keyword.trim() }, {
          withCredentials: true,
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
      } catch (error) {
        console.error("Error saving search history:", error);
      }
    }
  };

  const handleSuggestionClick = useCallback(async (suggestion: SearchSuggestion) => {
    setShowSuggestions(false);
    if (suggestion.type === 'user') {
      router.push(`/profile/${suggestion.id}`);
    } else {
      if (onSearchChange) onSearchChange({ target: { value: suggestion.name } } as any);
      if (onSearch) onSearch();
    }
  }, [onSearchChange, onSearch, router]);


  // Fetch tổng số unread khi user thay đổi
  useEffect(() => {
    if (!user) return;
    
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/messages/unread-total`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    })
      .then(res => res.json())
      .then(data => {
        setUnreadCount(data.total);
      })
      .catch(error => {
        console.error('Error fetching unread count:', error);
      });
  }, [user, accessToken]);

  // Fetch tổng số thông báo chưa đọc khi user thay đổi
  useEffect(() => {
    if (!user) return;
    
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/notifications/unread-total`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    })
      .then(res => res.json())
      .then(data => {
        setUnreadNotifications(data.total || 0);
      })
      .catch(error => {
        console.error('Error fetching unread notifications count:', error);
      });
  }, [user, accessToken]);

  // Realtime cập nhật khi có unread tăng
  useEffect(() => {
    if (!user) return;

    const handleUnreadUpdate = (data: { total: number }) => {
      debouncedUpdate(data.total);
    };

    socket.on("unreadTotalUpdated", handleUnreadUpdate);
    
    return () => {
      socket.off("unreadTotalUpdated", handleUnreadUpdate);
      debouncedUpdate.cancel();
    };
  }, [user, debouncedUpdate]);

  // Realtime cập nhật thông báo chưa đọc
  useEffect(() => {
    if (!user) return;

    const handleNotificationUpdate = (data: { total: number }) => {
      setUnreadNotifications(data.total);
    };

    socket.on("notificationUnreadTotalUpdated", handleNotificationUpdate);
    
    return () => {
      socket.off("notificationUnreadTotalUpdated", handleNotificationUpdate);
    };
  }, [user]);

  // Functions
  const showToast = (message: string, type: ToastProps["type"]) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleLogout = async () => {
    if (loading) return;
    try {
      await logout();
      showToast("Đăng xuất thành công!", "success");
      router.push("/");
    } catch (error) {
      console.error("Logout error:", error);
      const errorMessage = error instanceof Error ? error.message : "Có lỗi xảy ra khi đăng xuất";
      showToast(errorMessage, "error");
    }
  };

  const resetAnimation = (elements: (HTMLButtonElement | null)[]) => {
    gsap.set(elements.filter(Boolean) as HTMLButtonElement[], { clearProps: "all" });
  };

  const handleBtnHover = (ref: React.RefObject<HTMLButtonElement | null>, scale = 1.08) => {
    if (ref.current) {
      gsap.to(ref.current, { scale, boxShadow: "0 4px 24px 0 rgba(140,169,213,0.18)", duration: 0.25, ease: "power2.out" });
    }
  };

  const handleBtnLeave = (ref: React.RefObject<HTMLButtonElement | null>) => {
    if (ref.current) {
      gsap.to(ref.current, { scale: 1, boxShadow: "none", duration: 0.22, ease: "power2.inOut" });
    }
  };

  // Effects
  useEffect(() => {
    const keyword = value.trim();
    if (keyword) {
      fetch(`/api/search-suggestions?query=${encodeURIComponent(keyword)}`)
        .then(res => res.json())
        .then(data => {
          // Lọc lại ở client: chỉ user có avatar
          setSuggestions(Array.isArray(data) ? data.filter(s => s.type === 'user' && s.avatar) : []);
          setShowSuggestions(true);
        });
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (inputWrapperRef.current && !inputWrapperRef.current.contains(event.target as Node)) setShowSuggestions(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) setShowUserMenu(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (loginBtnRef.current && signupBtnRef.current) {
      gsap.from([loginBtnRef.current, signupBtnRef.current], {
        opacity: 0,
        y: 30,
        duration: 0.7,
        stagger: 0,
        ease: "power3.out",
        onComplete: () => resetAnimation([loginBtnRef.current, signupBtnRef.current]),
      });
    }
  }, []);

  // Hiệu ứng xuất hiện cho các nút
  useEffect(() => {
    const buttons = [loginBtnRef.current, signupBtnRef.current, messageBtnRef.current, notificationBtnRef.current].filter(Boolean) as HTMLButtonElement[];
    if (buttons.length > 0) {
      gsap.from(buttons, {
        opacity: 0,
        y: 30,
        duration: 0.7,
        stagger: 0,
        ease: "power3.out",
        onComplete: () => resetAnimation(buttons),
      });
    }
  }, []);

  // Xử lý click vào nút tin nhắn
  const handleMessageClick = () => {
    if (pathname === "/messages") {
      setShowMessageIcon(false);
      router.push("/messages");
    } else {
      const newDropdownState = !showMessageDropdown;
      setShowMessageDropdown(newDropdownState);
      
      // Nếu mở dropdown, fetch lại số lượng tin nhắn chưa đọc
      if (newDropdownState && user && accessToken) {
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/messages/unread-total`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        })
          .then(res => res.json())
          .then(data => {
            setUnreadCount(data.total);
          })
          .catch(error => {
            console.error('Error fetching unread count:', error);
          });
      }
    }
  };

  // Xử lý click vào nút thông báo
  const handleNotificationClick = () => {
    if (pathname === "/notifications") {
      setShowNotificationIcon(false);
      router.push("/notifications");
    } else {
      const newDropdownState = !showNotificationDropdown;
      setShowNotificationDropdown(newDropdownState);
      
      // Nếu mở dropdown, fetch lại số lượng thông báo chưa đọc
      if (newDropdownState && user && accessToken) {
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/notifications/unread-total`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        })
          .then(res => res.json())
          .then(data => {
            setUnreadNotifications(data.total || 0);
          })
          .catch(error => {
            console.error('Error fetching unread notifications count:', error);
          });
      }
    }
  };

  // Hiển thị lại các biểu tượng dựa trên route hiện tại
  useEffect(() => {
    setShowMessageIcon(pathname !== "/messages");
    setShowNotificationIcon(pathname !== "/notifications");
  }, [pathname, user]);

  // Hiệu ứng xuất hiện cho box đề xuất/lịch sử
  useEffect(() => {
    if ((showSuggestions && suggestions.length > 0) || (showHistory && searchHistory.length > 0)) {
      gsap.fromTo(
        dropdownRef.current,
        { opacity: 0, y: -20, scale: 0.98 },
        { opacity: 1, y: 0, scale: 1, duration: 0.35, ease: "power3.out" }
      );
    }
  }, [showSuggestions, showHistory, suggestions.length, searchHistory.length]);

  // Hiệu ứng xuất hiện từng item
  useEffect(() => {
    if (showSuggestions && suggestions.length > 0 && dropdownRef.current) {
      gsap.fromTo(
        dropdownRef.current.querySelectorAll('.suggestion-item'),
        { opacity: 0, x: -20 },
        { opacity: 1, x: 0, stagger: 0.05, duration: 0.25, ease: "power2.out" }
      );
    }
    if (showHistory && searchHistory.length > 0 && dropdownRef.current) {
      gsap.fromTo(
        dropdownRef.current.querySelectorAll('.history-item'),
        { opacity: 0, x: -20 },
        { opacity: 1, x: 0, stagger: 0.05, duration: 0.25, ease: "power2.out" }
      );
    }
  }, [showSuggestions, showHistory, suggestions.length, searchHistory.length]);

  // Hàm xóa local trước, 1s sau mới xóa thật và reload lại lịch sử
  const handleDeleteKeywordByIndex = async (idx: number) => {
    const el = document.getElementById(`history-item-${idx}`);
    if (el && dropdownRef.current) {
      el.classList.add('being-removed');
      const dropdownHeight = dropdownRef.current.offsetHeight;
      dropdownRef.current.style.height = `${dropdownHeight}px`;
      await gsap.to(el, { opacity: 0, height: 0, margin: 0, duration: 0.35, ease: "power2.in" });
      dropdownRef.current.style.height = '';
    }
    const item = searchHistory[idx];
    setSearchHistory(prev => prev.filter((_, i) => i !== idx));
    if (inputRef.current) {
      inputRef.current.focus();
      setShowHistory(true);
    }
    setTimeout(async () => {
      try {
        await axios.delete(`${API_URL}/api/search_history/by-keyword/${encodeURIComponent(item.keyword)}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          withCredentials: true,
        });
        await fetchSearchHistory();
      } catch (error) {
        console.error("Error deleting search history:", error);
      }
    }, 1000);
  };

  // Khi focus vào input hoặc mount lại, luôn fetch lại lịch sử mới nhất
  const fetchSearchHistory = async () => {
    if (user) {
      try {
        const res = await axios.get(`${API_URL}/api/search_history`, {
          withCredentials: true,
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
        if (res.data && Array.isArray(res.data.history)) {
          setSearchHistory(res.data.history.map((h: any) => ({ id: h.id, keyword: h.keyword })));
        }
      } catch (error) {
        console.error("Error fetching search history:", error);
      }
    }
  };

  useEffect(() => {
    fetchSearchHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Thêm hàm xóa tất cả với hiệu ứng:
  const handleDeleteAllHistory = async () => {
    if (!searchHistory.length) return;
    // Hiệu ứng GSAP cho tất cả item
    const ids = searchHistory.slice(0, 8).map((_, idx) => `history-item-${idx}`);
    const els = ids.map(id => document.getElementById(id)).filter(Boolean);
    if (els.length) {
      await Promise.all(els.map(el => {
        if (el) {
          el.classList.add('being-removed');
          return gsap.to(el, { opacity: 0, height: 0, margin: 0, duration: 0.35, ease: 'power2.in' });
        }
        return Promise.resolve();
      }));
    }
    setSearchHistory([]); // Xóa local ngay
    if (inputRef.current) {
      inputRef.current.focus();
      setShowHistory(true);
    }
    setTimeout(async () => {
      try {
        await axios.delete(`${API_URL}/api/search_history/all`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          withCredentials: true,
        });
        await fetchSearchHistory();
      } catch (error) {
        console.error('Error deleting all search history:', error);
      }
    }, 1000);
  };

  // Định nghĩa các biến state và hằng số trước khi dùng trong các hook
  const DROPDOWN_PAGE_SIZE = 10;
  const DROPDOWN_MAX = 30;
  const [dropdownPage, setDropdownPage] = useState(1);
  const [dropdownHasMore, setDropdownHasMore] = useState(true);
  const [dropdownLoading, setDropdownLoading] = useState(false);
  const [recentNotifications, setRecentNotifications] = useState<Notification[]>([]);
  // State cho message dropdown
  const [messageDropdownPage, setMessageDropdownPage] = useState(1);
  const [messageDropdownHasMore, setMessageDropdownHasMore] = useState(true);
  const [messageDropdownLoading, setMessageDropdownLoading] = useState(false);
  const [recentConversations, setRecentConversations] = useState<any[]>([]);
  // State cho tab dropdown notification
  const [dropdownTab, setDropdownTab] = useState<'all' | 'unread' | 'system'>('all');

  // Fetch notifications cho dropdown (có phân trang, theo tab)
  const fetchDropdownNotifications = useCallback(async (pageNum: number, tab = dropdownTab) => {
    if (!user || !accessToken) return;
    try {
      setDropdownLoading(true);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/notifications?page=${pageNum}&limit=${DROPDOWN_PAGE_SIZE}&tab=${tab}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      if (pageNum === 1) {
        setRecentNotifications(data.notifications);
        if (data.notifications.length < DROPDOWN_PAGE_SIZE || data.notifications.length >= DROPDOWN_MAX) {
          setDropdownHasMore(false);
        } else {
          setDropdownHasMore(true);
        }
        setUnreadNotifications(data.notifications.filter((n: Notification) => !n.is_read).length);
      } else {
        setRecentNotifications(prev => {
          const merged = [...prev, ...data.notifications];
          if (merged.length >= DROPDOWN_MAX || data.notifications.length < DROPDOWN_PAGE_SIZE) {
            setDropdownHasMore(false);
          } else {
            setDropdownHasMore(true);
          }
          const totalUnread = merged.filter((n: Notification) => !n.is_read).length;
          setUnreadNotifications(totalUnread);
          return merged.slice(0, DROPDOWN_MAX);
        });
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setDropdownLoading(false);
    }
  }, [user, accessToken, dropdownTab]);

  // Fetch conversations cho message dropdown (có phân trang)
  const fetchDropdownConversations = useCallback(async (pageNum: number) => {
    if (!user || !accessToken) return;
    try {
      setMessageDropdownLoading(true);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/messages?page=${pageNum}&limit=${DROPDOWN_PAGE_SIZE}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      if (pageNum === 1) {
        setRecentConversations(data.conversations || []);
        if ((data.conversations?.length || 0) < DROPDOWN_PAGE_SIZE || (data.conversations?.length || 0) >= DROPDOWN_MAX) {
          setMessageDropdownHasMore(false);
        } else {
          setMessageDropdownHasMore(true);
        }
        // Tính unread count cho trang đầu
        const totalUnread = (data.conversations || []).reduce((sum: number, conv: any) => sum + (conv.unread_count || 0), 0);
        setUnreadCount(totalUnread);
      } else {
        setRecentConversations(prev => {
          const merged = [...prev, ...(data.conversations || [])];
          if (merged.length >= DROPDOWN_MAX || (data.conversations?.length || 0) < DROPDOWN_PAGE_SIZE) {
            setMessageDropdownHasMore(false);
          } else {
            setMessageDropdownHasMore(true);
          }
          // Tính unread count cho tất cả conversations sau khi merge
          const totalUnread = merged.reduce((sum: number, conv: any) => sum + (conv.unread_count || 0), 0);
          setUnreadCount(totalUnread);
          return merged.slice(0, DROPDOWN_MAX);
        });
      }
    } catch (err) {
      console.error('Error fetching conversations:', err);
    } finally {
      setMessageDropdownLoading(false);
    }
  }, [user, accessToken]);

  // Khi mở dropdown, reset state và fetch trang đầu với tab hiện tại
  useEffect(() => {
    if (showNotificationDropdown && user && accessToken) {
      setRecentNotifications([]);
      setDropdownPage(1);
      setDropdownHasMore(true);
      fetchDropdownNotifications(1, dropdownTab);
    }
  }, [showNotificationDropdown, user, accessToken, fetchDropdownNotifications, dropdownTab]);

  // Khi mở message dropdown, reset state và fetch trang đầu
  useEffect(() => {
    if (showMessageDropdown && user && accessToken) {
      setRecentConversations([]);
      setMessageDropdownPage(1);
      setMessageDropdownHasMore(true);
      fetchDropdownConversations(1);
    }
  }, [showMessageDropdown, user, accessToken, fetchDropdownConversations]);

  // Infinite scroll handler: chỉ tăng page, fetch ở useEffect khác
  useEffect(() => {
    const container = notificationScrollContainerRef.current;
    if (!container) return;
    const handleScroll = () => {
      if (
        container.scrollTop + container.clientHeight >= container.scrollHeight - 80 &&
        dropdownHasMore && !dropdownLoading && recentNotifications.length < DROPDOWN_MAX
      ) {
        setDropdownPage(prev => prev + 1);
      }
    };
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [dropdownHasMore, dropdownLoading, recentNotifications.length, dropdownPage]);

  // Infinite scroll handler cho message dropdown
  useEffect(() => {
    const container = messageScrollContainerRef.current;
    if (!container) return;
    const handleScroll = () => {
      if (
        container.scrollTop + container.clientHeight >= container.scrollHeight - 80 &&
        messageDropdownHasMore && !messageDropdownLoading && recentConversations.length < DROPDOWN_MAX
      ) {
        setMessageDropdownPage(prev => prev + 1);
      }
    };
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [messageDropdownHasMore, messageDropdownLoading, recentConversations.length, messageDropdownPage]);

  // Khi dropdownPage thay đổi (và > 1), fetch thêm
  useEffect(() => {
    if (dropdownPage > 1 && dropdownHasMore && !dropdownLoading) {
      fetchDropdownNotifications(dropdownPage, dropdownTab);
    }
  }, [dropdownPage, dropdownHasMore, dropdownLoading, fetchDropdownNotifications, dropdownTab]);

  // Khi messageDropdownPage thay đổi (và > 1), fetch thêm
  useEffect(() => {
    if (messageDropdownPage > 1 && messageDropdownHasMore && !messageDropdownLoading) {
      fetchDropdownConversations(messageDropdownPage);
    }
  }, [messageDropdownPage, messageDropdownHasMore, messageDropdownLoading, fetchDropdownConversations]);

  // Đánh dấu đã đọc cho từng thông báo
  const markDropdownAsRead = async (id: string) => {
    if (!user || !accessToken) return;
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/notifications/${id}/read`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setRecentNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      // Giảm số lượng thông báo chưa đọc
      setUnreadNotifications(prev => Math.max(0, prev - 1));
    } catch (e) {
      console.error('Error marking notification as read:', e);
    }
  };

  // Hàm đánh dấu tất cả đã đọc trong dropdown
  const markAllDropdownAsRead = async () => {
    if (!user || !accessToken) return;
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/notifications/read-all`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setRecentNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      // Đặt số lượng thông báo chưa đọc về 0
      setUnreadNotifications(0);
    } catch (e) {
      console.error('Error marking all as read:', e);
    }
  };
  // Hàm xóa tất cả thông báo trong dropdown
  const deleteAllDropdownNotifications = async () => {
    if (!user || !accessToken) return;
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/notifications/all`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setRecentNotifications([]);
      // Đặt số lượng thông báo chưa đọc về 0
      setUnreadNotifications(0);
    } catch (e) {
      console.error('Error deleting all notifications:', e);
    }
  };
  // Hàm xóa 1 thông báo
  const deleteDropdownNotification = async (id: string) => {
    if (!user || !accessToken) return;
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/notifications/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const notificationToDelete = recentNotifications.find(n => n.id === id);
      setRecentNotifications((prev) => prev.filter((n) => n.id !== id));
      // Giảm số lượng thông báo chưa đọc nếu thông báo bị xóa chưa đọc
      if (notificationToDelete && !notificationToDelete.is_read) {
        setUnreadNotifications((prev) => Math.max(0, prev - 1));
      }
    } catch (e) {
      console.error('Error deleting notification:', e);
    }
  };

  // Real-time: prepend notification vào dropdown khi có newNotification
  useEffect(() => {
    if (!user) return;
    const handleNewNotification = (notification: Notification) => {
      if (notification.type === 'report_new' || notification.type === 'post_approval') {
        return;
      }

      // Cập nhật tổng số thông báo chưa đọc
      setUnreadNotifications(prev => prev + 1);

      // Chỉ thêm vào dropdown nếu đang mở
      if (showNotificationDropdown) {
        // Lọc theo tab đang chọn trong dropdown
        if (dropdownTab === 'system' && notification.type !== 'system') {
          return;
        }
        // Với tab 'all' và 'unread', thêm tất cả thông báo mới
        setRecentNotifications(prev => [notification, ...prev].slice(0, 30));
      }
    };
    socket.on('newNotification', handleNewNotification);
    return () => {
      socket.off('newNotification', handleNewNotification);
    };
  }, [user, showNotificationDropdown, dropdownTab]);

  // Real-time: cập nhật conversations khi có tin nhắn mới
  useEffect(() => {
    if (!user) return;
    const handleNewMessage = (message: any) => {
      // Cập nhật unread count
      setUnreadCount(prev => prev + 1);
      
      // Cập nhật conversations trong dropdown nếu đang mở
      if (showMessageDropdown) {
        setRecentConversations(prev => {
          const existingIndex = prev.findIndex(conv => conv.id === message.conversation_id);
          if (existingIndex !== -1) {
            // Cập nhật conversation hiện có
            const updated = [...prev];
            updated[existingIndex] = {
              ...updated[existingIndex],
              last_message: message.content || '[Hình ảnh]',
              last_message_at: message.created_at,
              unread_count: (updated[existingIndex].unread_count || 0) + 1
            };
            // Di chuyển lên đầu
            const [moved] = updated.splice(existingIndex, 1);
            return [moved, ...updated];
          } else {
            // Thêm conversation mới (nếu có thể fetch được)
            // Có thể cần fetch conversation details
            return prev;
          }
        });
      }
    };
    socket.on('newMessage', handleNewMessage);
    return () => {
      socket.off('newMessage', handleNewMessage);
    };
  }, [user, showMessageDropdown]);

  // Hàm lấy chi tiết bài viết
  const handleOpenPostDetail = async (postId: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/posts/${postId}`);
      const data = await res.json();
      setOpenPost({
        id: data.id || data.post?.id || '',
        name: `${data.first_name || data.post?.first_name || ''} ${data.last_name || data.post?.last_name || ''}`.trim(),
        date: data.created_at || data.post?.created_at || '',
        content: data.content || data.post?.content || '',
        likes: data.likes || data.post?.likes || 0,
        comments: data.comments || data.post?.comments || 0,
        shares: data.shares || data.post?.shares || 0,
        images: data.images || data.post?.images || [],
        avatar_url: data.avatar_url || data.post?.avatar_url || '',
        shared_post: data.shared_post || undefined,
      });
      setShowPostModal(true);
    } catch (err) {
      alert('Không lấy được chi tiết bài viết!');
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
      showToast('Đã follow người dùng!', 'success');
    } catch (e) {
      showToast('Không thể follow người dùng này!', 'error');
    }
  };

  // Khi đổi tab trong dropdown
  const handleDropdownTabChange = (tab: 'all' | 'unread' | 'system') => {
    setDropdownTab(tab);
    setDropdownPage(1);
    setDropdownHasMore(true);
    fetchDropdownNotifications(1, tab);
  };

  return (
    <>
      <header className="sticky top-0 z-50 flex items-center justify-between w-full h-14 sm:h-16 md:h-20 px-3 sm:px-4 md:px-6 lg:px-8 xl:px-16" style={{ backgroundColor: headerBg }}>
        {/* Mobile Search View */}
        {showMobileSearch && (
            <div className="absolute inset-0 flex items-center bg-white px-2 z-20">
                <button 
                    onClick={() => setShowMobileSearch(false)} 
                    className="p-2 text-gray-600 hover:text-black"
                >
                    <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <div className="flex-1 relative">
                    <FilteredInput
                      ref={inputRef}
                      type="text"
                      value={value}
                      onChange={memoizedHandleChange}
                      onFocus={handleInputFocus}
                      onBlur={handleInputBlur}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleSearchWithHistory();
                        else memoizedHandleKeyDown(e);
                      }}
                      placeholder="Tìm kiếm..."
                      className="w-full px-4 py-2 bg-gray-100 rounded-full focus:outline-none"
                      autoFocus
                    />
                </div>
            </div>
        )}

        <div
          className={clsx(
            "w-full grid grid-cols-[auto_1fr_auto] items-center",
            { "invisible": showMobileSearch }
          )}
        >
            {/* Logo */}
            <Link href="/" className="flex items-center h-12 w-28 sm:h-14 sm:w-32 md:h-16 md:w-40 lg:h-18 lg:w-44 xl:h-20 xl:w-48 hover:opacity-80 transition-opacity duration-200 cursor-pointer flex-shrink-0">
              <Image src="/logo.png" alt="Solace Logo" width={192} height={80} className="object-contain w-full h-full" priority />
            </Link>
            
            {/* Search Bar - Centered with grid */}
            <div className="hidden md:flex justify-center w-full max-w-[700px] mx-auto relative col-start-2 col-end-3">
              <div className="flex w-full rounded-full border border-black bg-white overflow-hidden" ref={inputWrapperRef}>
                <FilteredInput
                  ref={inputRef}
                  type="text"
                  value={value}
                  onChange={memoizedHandleChange}
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleSearchWithHistory();
                    else memoizedHandleKeyDown(e);
                  }}
                  placeholder="Tìm kiếm..."
                  className="flex-1 px-2 sm:px-3 md:px-4 lg:px-5 py-1.5 sm:py-2 bg-white text-xs sm:text-sm md:text-base font-normal placeholder:text-gray-400 focus:outline-none border-none rounded-none text-black"
                />
                <div 
                  className="flex items-center justify-center px-2 sm:px-3 md:px-4 lg:px-5 border-l border-black cursor-pointer flex-shrink-0" 
                  style={{ minHeight: "32px", backgroundColor: headerBg }} 
                  onClick={memoizedHandleClick}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="black" className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6">
                    <circle cx="11" cy="11" r="7" />
                    <line x1="16.5" y1="16.5" x2="21" y2="21" stroke="black" strokeWidth={2} strokeLinecap="round" />
                  </svg>
                </div>
              </div>
              {/* Search Dropdown */}
              <div className="dropdown-wrapper absolute left-0 right-0 top-full z-50">
                {showSuggestions && suggestions.length > 0 ? (
                  <div ref={dropdownRef} className="bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 sm:max-h-60 overflow-y-auto mt-1">
                    {suggestions.filter(s => s.type === 'user' && s.avatar).map((s, idx) => (
                      <div
                        key={s.id}
                        className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 cursor-pointer hover:bg-gradient-to-r from-blue-50 to-white text-gray-800 text-xs sm:text-sm group suggestion-item transition-all duration-200"
                        onMouseEnter={e => gsap.to(e.currentTarget, { background: 'linear-gradient(to right, #e6f0fa, #ffffff)', duration: 0.2 })}
                        onMouseLeave={e => gsap.to(e.currentTarget, { background: 'transparent', duration: 0.2 })}
                        onMouseDown={() => handleSuggestionClick(s)}
                      >
                        <Image src={typeof s.avatar === 'string' && s.avatar ? s.avatar : '/default-avatar.png'} alt={s.name} width={28} height={28} className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover" />
                        <span className="font-medium text-gray-900 truncate">{s.name}</span>
                      </div>
                    ))}
                  </div>
                ) : showHistory && searchHistory.length > 0 ? (
                  <div ref={dropdownRef} className="bg-white border border-gray-200 rounded-xl shadow-lg max-h-56 sm:max-h-72 overflow-y-auto mt-1">
                    <div className="flex flex-col divide-y divide-gray-100">
                      {searchHistory.slice(0, 8).map((item, idx) => (
                        <div
                          key={item.id}
                          id={`history-item-${idx}`}
                          role="option"
                          aria-selected="false"
                          tabIndex={0}
                          className="flex items-center justify-between px-3 sm:px-4 py-2 hover:bg-gradient-to-r from-blue-50 to-white cursor-pointer text-gray-700 group bg-white history-item transition-all duration-200"
                          onMouseEnter={e => {
                            if (!e.currentTarget.classList.contains('being-removed')) {
                              gsap.to(e.currentTarget, { background: 'linear-gradient(to right, #e6f0fa, #ffffff)', duration: 0.2 });
                            }
                          }}
                          onMouseLeave={e => {
                            if (!e.currentTarget.classList.contains('being-removed')) {
                              gsap.to(e.currentTarget, { background: 'transparent', duration: 0.2 });
                            }
                          }}
                        >
                          <div
                            className="flex items-center gap-2 flex-1 min-w-0"
                            onMouseDown={async (e) => {
                              e.stopPropagation();
                              setSearch(item.keyword);
                              setShowHistory(false);
                              if (onSearchChange) onSearchChange({ target: { value: item.keyword } } as any);
                              await saveSearchHistory(item.keyword);
                              router.push(`/search?query=${encodeURIComponent(item.keyword)}`);
                            }}
                          >
                            <span className="inline-flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 text-gray-500">
                              <svg viewBox="0 0 21 21" aria-hidden="true" width="16" height="16" className="sm:w-5 sm:h-5">
                                <g>
                                  <path d="M9.094 3.095c-3.314 0-6 2.686-6 6s2.686 6 6 6c1.657 0 3.155-.67 4.243-1.757 1.087-1.088 1.757-2.586 1.757-4.243 0-3.314-2.686-6-6-6zm-9 6c0-4.971 4.029-9 9-9s9 4.029 9 9c0 1.943-.617 3.744-1.664 5.215l4.475 4.474-2.122 2.122-4.474-4.475c-1.471 1.047-3.272 1.664-5.215 1.664-4.97-.001-8.999-4.03-9-9z"></path>
                                </g>
                              </svg>
                            </span>
                            <span className="truncate text-xs sm:text-sm font-medium text-gray-900">{item.keyword}</span>
                          </div>
                          <button
                            aria-label="Xóa"
                            type="button"
                            className="ml-1 sm:ml-2 p-1 rounded-full hover:bg-red-100 text-red-500 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity duration-200"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleDeleteKeywordByIndex(idx);
                            }}
                          >
                            <span className="inline-flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6">
                              <svg viewBox="0 0 24 24" aria-hidden="true" width="14" height="14" className="sm:w-4 sm:h-4">
                                <g>
                                  <path d="M10.59 12L4.54 5.96l1.42-1.42L12 10.59l6.04-6.05 1.42 1.42L13.41 12l6.05 6.04-1.42 1.42L12 13.41l-6.04 6.05-1.42-1.42L10.59 12z"></path>
                                </g>
                              </svg>
                            </span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
        </div>
        
        {/* Right Side Actions */}
        <div className="flex items-center gap-1 sm:gap-2 md:gap-3 justify-end flex-shrink-0 min-w-0">
            <button
              onClick={() => setShowMobileSearch(true)}
              className="md:hidden p-1"
              aria-label="Search"
            >
                <span className="material-symbols-outlined text-2xl">search</span>
            </button>
          {loading ? (
            <div className="flex items-center gap-1 sm:gap-2 p-1 sm:p-2">
              <div className="bg-gray-200 rounded-full w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 animate-pulse" />
              <div className="bg-gray-200 rounded-full w-12 sm:w-16 md:w-20 h-3 sm:h-4 animate-pulse" />
            </div>
          ) : !user ? (
            <>
              <button
                ref={loginBtnRef}
                onClick={() => onOpenAuth?.("login")}
                className="hidden sm:inline-flex items-center justify-center min-w-[70px] sm:min-w-[80px] md:min-w-[90px] h-8 sm:h-9 md:h-10 lg:h-11 px-2 sm:px-3 md:px-4 lg:px-6 text-xs sm:text-sm md:text-base font-semibold rounded-full border-2 border-[#8CA9D5] bg-white text-[#3B4252] shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#8CA9D5]"
                aria-label="Log in"
                onMouseEnter={() => handleBtnHover(loginBtnRef)}
                onMouseLeave={() => handleBtnLeave(loginBtnRef)}
                onFocus={() => handleBtnHover(loginBtnRef)}
                onBlur={() => handleBtnLeave(loginBtnRef)}
                type="button"
              >
                Log in
              </button>
              <button
                ref={signupBtnRef}
                onClick={() => onOpenAuth?.("signup")}
                className="inline-flex items-center justify-center min-w-[70px] sm:min-w-[80px] md:min-w-[90px] h-8 sm:h-9 md:h-10 lg:h-11 px-2 sm:px-3 md:px-4 lg:px-6 text-xs sm:text-sm md:text-base font-bold rounded-full bg-gradient-to-r from-[#8CA9D5] to-blue-600 text-white shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-400"
                aria-label="Sign up"
                onMouseEnter={() => handleBtnHover(signupBtnRef)}
                onMouseLeave={() => handleBtnLeave(signupBtnRef)}
                onFocus={() => handleBtnHover(signupBtnRef)}
                onBlur={() => handleBtnLeave(signupBtnRef)}
                type="button"
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              {showMessageIcon && (
                <div className="relative flex-shrink-0">
                  <button
                    ref={messageBtnRef}
                    onClick={handleMessageClick}
                    className="relative flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-full bg-white border border-blue-300 hover:bg-blue-50 transition-all duration-200"
                    aria-label="Messages"
                    onMouseEnter={() => handleBtnHover(messageBtnRef, 1.1)}
                    onMouseLeave={() => handleBtnLeave(messageBtnRef)}
                    onFocus={() => handleBtnHover(messageBtnRef, 1.1)}
                    onBlur={() => handleBtnLeave(messageBtnRef)}
                    type="button"
                  >
                    <span className="material-symbols-outlined text-base sm:text-lg md:text-[20px]" style={{ color: '#2563eb' }}>mail</span>
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 bg-blue-500 text-white text-[10px] sm:text-xs font-bold rounded-full w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 flex items-center justify-center animate-pulse transition-all duration-300 transform scale-100 hover:scale-110 z-10">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </button>
                  {/* Dropdown tin nhắn */}
                  {showMessageDropdown && (
                    <div
                      ref={messageDropdownRef}
                      className="absolute top-full mt-2 right-0 w-72 sm:w-80 md:w-96 max-w-[calc(100vw-2rem)] bg-white rounded-xl shadow-lg py-2 z-50 border border-gray-100 animate-fade-in"
                      style={{
                        minWidth: '260px',
                        maxWidth: 'calc(100vw - 1rem)',
                        right: 0,
                        left: 'auto'
                      }}
                    >
                      {/* Header dropdown */}
                      <div className="flex items-center justify-between px-3 sm:px-4 py-2 border-b border-gray-100">
                        <span className="font-bold text-blue-600 text-sm sm:text-base md:text-lg">Tin nhắn</span>
                        <div className="flex gap-1 sm:gap-2">
                          <button
                            className="w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 flex items-center justify-center rounded-full hover:bg-blue-100 active:bg-blue-200 transition relative group touch-manipulation touch-target-mobile"
                            onClick={() => {
                              setShowMessageDropdown(false);
                              setCurrentConversationId(null);
                              router.push('/messages');
                            }}
                            title="Xem tất cả cuộc trò chuyện"
                          >
                            <span className="material-symbols-outlined text-sm sm:text-lg md:text-xl" style={{ color: '#2563eb' }}>list</span>
                            <span className="absolute left-1/2 -bottom-8 -translate-x-1/2 bg-gray-800 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 pointer-events-none transition hidden sm:block whitespace-nowrap z-50">Xem tất cả cuộc trò chuyện</span>
                          </button>
                        </div>
                      </div>
                      {/* Danh sách tin nhắn */}
                      <div 
                        ref={messageScrollContainerRef}
                        className="max-h-64 sm:max-h-80 md:max-h-96 overflow-y-auto divide-y divide-gray-50 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 scrollbar-mobile" 
                        style={{ maxHeight: '50vh' }}
                      >
                        {recentConversations.length === 0 ? (
                          <div className="text-center text-gray-500 py-4 sm:py-6">
                            <span className="material-symbols-outlined text-xl sm:text-2xl md:text-3xl mb-2" style={{ color: '#9ca3af' }}>mail</span>
                            <div className="text-xs sm:text-sm md:text-base">Không có tin nhắn nào</div>
                          </div>
                        ) : (
                          recentConversations.map((conv) => (
                            <div
                              key={conv.id}
                              className={`group flex items-start gap-2 sm:gap-3 px-2 sm:px-3 md:px-4 py-2 sm:py-3 md:py-4 rounded-lg my-1 sm:my-2 mx-1 sm:mx-2 cursor-pointer transition-all duration-200 relative touch-manipulation ${conv.unread_count > 0 ? 'bg-blue-50 border border-blue-200 shadow' : 'hover:bg-gray-50 active:bg-gray-100'}`}
                              onClick={() => {
                                setShowMessageDropdown(false);
                                setCurrentConversationId(conv.id);
                                router.push('/messages');
                              }}
                            >
                              <div className="relative mr-2">
                                <Image
                                  src={conv.other_user?.avatar || '/default-avatar.png'}
                                  width={40}
                                  height={40}
                                  className="w-8 h-8 sm:w-10 sm:h-10 md:w-11 md:h-11 rounded-full object-cover mt-1 border border-gray-200"
                                  alt={conv.other_user?.name || ''}
                                  unoptimized
                                />
                                <span className={
                                  `absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ` +
                                  (onlineUsers.has(conv.other_user?.id) ? 'bg-green-500' : 'bg-gray-400')
                                } />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-xs sm:text-sm truncate">
                                  <span className="text-blue-600">{conv.other_user?.name || conv.name}</span>
                                </div>
                                <div className="text-xs sm:text-sm text-gray-700 truncate">{conv.last_message || 'Chưa có tin nhắn'}</div>
                                <div className="text-xs text-gray-400 mt-1">
                                  {conv.last_message_at ? formatDate(conv.last_message_at) : ''}
                                </div>
                              </div>
                              {/* Badge unread count */}
                              {conv.unread_count > 0 && (
                                <div className="absolute top-1 sm:top-2 right-1 sm:right-2">
                                  <span className="bg-blue-500 text-white text-[10px] sm:text-xs font-bold rounded-full w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center">
                                    {conv.unread_count > 9 ? '9+' : conv.unread_count}
                                  </span>
                                </div>
                              )}
                            </div>
                          ))
                        )}
                        {/* Spinner chỉ hiện khi đang loading và còn hasMore */}
                        {messageDropdownLoading && messageDropdownHasMore && (
                          <div className="flex justify-center py-2">
                            <span className="animate-spin rounded-full h-5 w-5 sm:h-6 sm:w-6 border-t-2 border-b-2 border-blue-600"></span>
                          </div>
                        )}
                      </div>
                      {/* Nút xem tất cả ở cuối */}
                      <div className="px-3 sm:px-4 py-2 border-t border-gray-100 text-center">
                        <button
                          className="text-blue-600 font-semibold hover:underline text-xs sm:text-sm md:text-base px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 rounded-lg hover:bg-blue-50 active:bg-blue-100 transition touch-manipulation touch-target-mobile"
                          onClick={() => {
                            setShowMessageDropdown(false);
                            setCurrentConversationId(null);
                            router.push('/messages');
                          }}
                        >
                          Xem tất cả
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
              {showNotificationIcon && (
                <div className="relative flex-shrink-0">
                  <button
                    ref={notificationBtnRef}
                    onClick={handleNotificationClick}
                    className="relative flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-full bg-white border border-orange-300 hover:bg-orange-50 transition-all duration-200"
                    aria-label="Notifications"
                    onMouseEnter={() => handleBtnHover(notificationBtnRef, 1.1)}
                    onMouseLeave={() => handleBtnLeave(notificationBtnRef)}
                    onFocus={() => handleBtnHover(notificationBtnRef, 1.1)}
                    onBlur={() => handleBtnLeave(notificationBtnRef)}
                    type="button"
                  >
                    <span className="material-symbols-outlined text-base sm:text-lg md:text-[20px]" style={{ color: '#ea580c' }}>notifications</span>
                    {unreadNotifications > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 bg-orange-500 text-white text-[10px] sm:text-xs font-bold rounded-full w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 flex items-center justify-center animate-pulse transition-all duration-300 transform scale-100 hover:scale-110 z-10">
                        {unreadNotifications > 99 ? '99+' : unreadNotifications}
                      </span>
                    )}
                  </button>
                  {/* Dropdown thông báo */}
                  {showNotificationDropdown && (
                    <div
                      ref={notificationDropdownRef}
                      className="absolute top-full mt-2 right-0 w-72 sm:w-80 md:w-96 max-w-[calc(100vw-2rem)] bg-white rounded-xl shadow-lg py-2 z-50 border border-gray-100 animate-fade-in"
                      style={{
                        minWidth: '260px',
                        maxWidth: 'calc(100vw - 1rem)',
                        right: 0,
                        left: 'auto'
                      }}
                    >
                      {/* Header dropdown */}
                      <div className="flex items-center justify-between px-3 sm:px-4 py-2 border-b border-gray-100">
                        <span className="font-bold text-orange-600 text-sm sm:text-base md:text-lg">Thông báo</span>
                        <div className="flex gap-1 sm:gap-2">
                          <button
                            className="w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 flex items-center justify-center rounded-full hover:bg-orange-100 active:bg-orange-200 transition relative group touch-manipulation touch-target-mobile"
                            onClick={markAllDropdownAsRead}
                            title="Đánh dấu tất cả thông báo đã đọc"
                          >
                            <span className="material-symbols-outlined text-sm sm:text-lg md:text-xl" style={{ color: '#ea580c' }}>done_all</span>
                            <span className="absolute left-1/2 -bottom-8 -translate-x-1/2 bg-gray-800 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 pointer-events-none transition hidden sm:block whitespace-nowrap z-50">Đánh dấu tất cả đã đọc</span>
                          </button>
                          <button
                            className="w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 flex items-center justify-center rounded-full hover:bg-red-100 active:bg-red-200 transition relative group touch-manipulation touch-target-mobile"
                            onClick={deleteAllDropdownNotifications}
                            title="Xóa tất cả thông báo"
                          >
                            <span className="material-symbols-outlined text-sm sm:text-lg md:text-xl" style={{ color: '#ef4444' }}>delete_sweep</span>
                            <span className="absolute left-1/2 -bottom-8 -translate-x-1/2 bg-gray-800 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 pointer-events-none transition hidden sm:block whitespace-nowrap z-50">Xóa tất cả thông báo</span>
                          </button>
                          <button
                            className="w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 flex items-center justify-center rounded-full hover:bg-blue-100 active:bg-blue-200 transition relative group touch-manipulation touch-target-mobile"
                            onClick={() => {
                              setShowNotificationDropdown(false);
                              router.push('/notifications');
                            }}
                            title="Xem tất cả thông báo"
                          >
                            <span className="material-symbols-outlined text-sm sm:text-lg md:text-xl" style={{ color: '#2563eb' }}>list</span>
                            <span className="absolute left-1/2 -bottom-8 -translate-x-1/2 bg-gray-800 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 pointer-events-none transition hidden sm:block whitespace-nowrap z-50">Xem tất cả thông báo</span>
                          </button>
                        </div>
                      </div>
                      {/* Tabs filter */}
                      <div className="flex border-b border-orange-100 mb-2 px-3 sm:px-4 gap-2">
                        <button onClick={() => handleDropdownTabChange('all')} className={`px-2 py-1 rounded font-semibold text-xs sm:text-sm transition ${dropdownTab === 'all' ? 'text-orange-600 bg-orange-50' : 'text-gray-600 hover:bg-gray-50'}`}>Tất cả</button>
                        <button onClick={() => handleDropdownTabChange('unread')} className={`px-2 py-1 rounded font-semibold text-xs sm:text-sm transition ${dropdownTab === 'unread' ? 'text-orange-600 bg-orange-50' : 'text-gray-600 hover:bg-gray-50'}`}>Chưa đọc</button>
                        <button onClick={() => handleDropdownTabChange('system')} className={`px-2 py-1 rounded font-semibold text-xs sm:text-sm transition ${dropdownTab === 'system' ? 'text-orange-600 bg-orange-50' : 'text-gray-600 hover:bg-gray-50'}`}>Hệ thống</button>
                      </div>
                      {/* Danh sách thông báo */}
                      <div 
                        ref={notificationScrollContainerRef}
                        className="max-h-64 sm:max-h-80 md:max-h-96 overflow-y-auto divide-y divide-gray-50 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 scrollbar-mobile" 
                        style={{ maxHeight: '50vh' }}
                      >
                        {recentNotifications.length === 0 ? (
                          <div className="text-center text-gray-500 py-4 sm:py-6">
                            <span className="material-symbols-outlined text-xl sm:text-2xl md:text-3xl mb-2" style={{ color: '#9ca3af' }}>notifications_off</span>
                            <div className="text-xs sm:text-sm md:text-base">Không có thông báo nào</div>
                          </div>
                        ) : (
                          recentNotifications.map((noti) => (
                            <div
                              key={noti.id}
                              className={`group flex items-start gap-2 sm:gap-3 px-2 sm:px-3 md:px-4 py-2 sm:py-3 md:py-4 rounded-lg my-1 sm:my-2 mx-1 sm:mx-2 cursor-pointer transition-all duration-200 relative touch-manipulation ${!noti.is_read ? 'bg-orange-50 border border-orange-200 shadow' : 'hover:bg-gray-50 active:bg-gray-100'}`}
                              onClick={() => {
                                setShowNotificationDropdown(false);
                                if (noti.related_type === 'post' && noti.related_id) {
                                  handleOpenPostDetail(noti.related_id);
                                } else if (noti.related_id) {
                                  router.push(`/profile/${noti.related_id}`);
                                }
                              }}
                            >
                              {noti.type === 'system' ? (
                                <span className="material-symbols-outlined text-lg sm:text-xl md:text-2xl mt-1" style={{ color: '#ea580c' }}>info</span>
                              ) : (
                                <Image
                                  src={noti.sender?.avatar_url || '/default-avatar.png'}
                                  width={40}
                                  height={40}
                                  className="w-8 h-8 sm:w-10 sm:h-10 md:w-11 md:h-11 rounded-full object-cover mt-1 border border-gray-200 cursor-pointer"
                                  alt={noti.sender?.first_name || ''}
                                  unoptimized
                                  onClick={e => {
                                    e.stopPropagation();
                                    if (noti.sender && noti.sender.id) router.push(`/profile/${noti.sender.id}`);
                                  }}
                                />
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-xs sm:text-sm truncate">
                                  {noti.type === 'system'
                                    ? noti.title
                                    : <span
                                        className="text-orange-600 cursor-pointer hover:underline"
                                        onClick={e => {
                                          e.stopPropagation();
                                          if (noti.sender && noti.sender.id) router.push(`/profile/${noti.sender.id}`);
                                        }}
                                      >
                                        {noti.sender?.first_name} {noti.sender?.last_name}
                                      </span>}
                                </div>
                                <div className="text-xs sm:text-sm text-gray-700 truncate">{noti.content}</div>
                                <div className="text-xs text-gray-400 mt-1">{formatDate(noti.created_at)}</div>
                              </div>
                              {/* Nhóm icon thao tác góc phải trên - luôn hiển thị trên mobile, chỉ hover trên desktop */}
                              <div className="absolute top-1 sm:top-2 right-1 sm:right-2 flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition">
                                {/* Nút follow lại */}
                                {noti.type === 'follow' && noti.sender && noti.sender.id && !followedUserIds.includes(noti.sender.id) && (
                                  <button
                                    className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md-8 flex items-center justify-center rounded-full hover:bg-orange-100 active:bg-orange-200 transition-colors touch-manipulation touch-target-mobile relative group"
                                    title="Follow lại"
                                    onClick={e => {
                                      e.stopPropagation();
                                      if (noti.sender && noti.sender.id) handleFollow(noti.sender.id);
                                    }}
                                  >
                                    <span className="material-symbols-outlined text-sm sm:text-base" style={{ color: '#ea580c' }}>person_add</span>
                                  </button>
                                )}
                                {/* Nút đánh dấu đã đọc, chỉ hiện nếu chưa đọc */}
                                {!noti.is_read && (
                                  <button
                                    className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md-8 flex items-center justify-center rounded-full hover:bg-orange-100 active:bg-orange-200 transition-colors touch-manipulation touch-target-mobile relative group"
                                    title="Đánh dấu thông báo đã đọc"
                                    onClick={e => { e.stopPropagation(); markDropdownAsRead(noti.id); }}
                                  >
                                    <span className="material-symbols-outlined text-sm sm:text-base" style={{ color: '#ea580c' }}>done</span>
                                  </button>
                                )}
                                {/* Nút xóa */}
                                <button
                                  className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md-8 flex items-center justify-center rounded-full hover:bg-red-100 active:bg-red-200 transition-colors touch-manipulation touch-target-mobile relative group"
                                  title="Xóa thông báo này"
                                  onClick={e => { e.stopPropagation(); deleteDropdownNotification(noti.id); }}
                                >
                                  <span className="material-symbols-outlined text-sm sm:text-base" style={{ color: '#ef4444' }}>delete</span>
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                        {/* Spinner chỉ hiện khi đang loading và còn hasMore */}
                        {dropdownLoading && dropdownHasMore && (
                          <div className="flex justify-center py-2">
                            <span className="animate-spin rounded-full h-5 w-5 sm:h-6 sm:w-6 border-t-2 border-b-2 border-orange-600"></span>
                          </div>
                        )}
                      </div>
                      {/* Nút xem tất cả ở cuối */}
                      <div className="px-3 sm:px-4 py-2 border-t border-gray-100 text-center">
                        <button
                          className="text-orange-600 font-semibold hover:underline text-xs sm:text-sm md:text-base px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 rounded-lg hover:bg-orange-50 active:bg-orange-100 transition touch-manipulation touch-target-mobile"
                          onClick={() => {
                            setShowNotificationDropdown(false);
                            router.push('/notifications');
                          }}
                        >
                          Xem tất cả
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
              <div className="relative flex-shrink-0 user-menu-container" ref={userMenuRef}>
                <button
                  className="flex items-center gap-1 sm:gap-2 hover:bg-gray-50 rounded-full p-1 sm:p-2 transition-all duration-300 ease-in-out group touch-manipulation"
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  aria-label="User menu"
                  aria-expanded={showUserMenu}
                  aria-haspopup="true"
                >
                  <Image src={user.avatar_url || "/default-avatar.png"} 
                    alt="User Avatar" width={28} height={28} className="w-7 h-7 sm:w-8 sm:h-8 md:w-8 md:h-8 rounded-full ring-2 ring-offset-2 ring-[#8CA9D5] group-hover:ring-blue-600 transition-all" />
                  <span className="hidden sm:inline text-xs sm:text-sm font-medium text-gray-700 group-hover:text-blue-600 truncate">{user.last_name} {user.first_name}</span>
                </button>
                {showUserMenu && (
                  <div className="absolute top-full right-0 mt-2 w-40 sm:w-44 md:w-48 bg-white rounded-xl shadow-lg py-1 z-50 transform transition-all duration-200 ease-out border border-gray-100"
                       >
                    <button
                      onClick={() => router.push("/profile")}
                      className="flex items-center gap-2 w-full text-left px-3 sm:px-4 py-2.5 text-xs sm:text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors duration-200 touch-manipulation"
                    >
                      <span className="material-symbols-outlined text-base sm:text-lg md:text-[20px] flex-shrink-0" style={{ color: '#6b7280' }}>person</span>
                      <span className="truncate">Profile</span>
                    </button>
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-2 w-full text-left px-3 sm:px-4 py-2.5 text-xs sm:text-sm text-red-600 hover:bg-red-50 transition-colors duration-200 touch-manipulation"
                    >
                      <span className="material-symbols-outlined text-base sm:text-lg md:text-[20px] flex-shrink-0" style={{ color: '#dc2626' }}>logout</span>
                      <span className="truncate">Sign out</span>
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </header>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      {showPostModal && openPost && (
        <PostDetailPopup post={openPost} onClose={() => setShowPostModal(false)} />
      )}
    </>
  );
});

Header.displayName = 'Header';

export default Header;