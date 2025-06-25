'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { FC } from 'react';
import { MaterialIcon } from './MaterialIcon';
import clsx from 'clsx';
import { useUser } from '../contexts/UserContext';
import { useFileUpload } from '../hooks/useFileUpload';
import { Message, Conversation } from '../types/chat';
import { socket } from '@/socket';
import { ConversationList } from './ConversationList';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { NewMessageModal } from './NewMessageModal';
import { ImageUploadModal } from './ImageUploadModal';
import { debounce } from 'lodash';
import { SearchInput } from './SearchInput';
import { useRouter } from 'next/navigation';
import gsap from 'gsap';

const MessagePage: FC = () => {
  // State
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [filteredConversations, setFilteredConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [messagePages, setMessagePages] = useState<Record<string, number>>({});
  const [hasMoreMessages, setHasMoreMessages] = useState<Record<string, boolean>>({});
  const [conversationPage, setConversationPage] = useState(1);
  const [totalConversations, setTotalConversations] = useState(0);
  const PAGE_SIZE = 30;
  const CONVERSATION_PAGE_SIZE = 20;
  const [text, setText] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showImageUpload, setShowImageUpload] = useState(false);
  const { user, accessToken, currentConversationId, setCurrentConversationId } = useUser();
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const typingTimeout = useRef<NodeJS.Timeout | null>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [pendingImageUrls, setPendingImageUrls] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();


  // State quản lý trạng thái và nội dung của Toast thông báo
  const [toast, setToast] = useState<{
    show: boolean;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
  }>({
    show: false,
    message: '',
    type: 'info'
  });

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const previousConversationIdRef = useRef<string | null>(null);
  const isFetchingRef = useRef(false); // Ngăn gọi lặp
  const previousMessageLengthRef = useRef(0); // So sánh số lượng tin nhắn
  const firstLoadRef = useRef(true); // Scroll 1 lần khi mở phòng
  const isLoadingMoreRef = useRef(false);
  const conversationRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const { uploadFiles, isUploading, uploadProgress } = useFileUpload({
    onUploadComplete: (imageUrls) => {
      setPendingImageUrls(prev => [...prev, ...imageUrls]);
      setShowImageUpload(false);
    },
    onError: (error) => {
      setError(error);
      setTimeout(() => setError(null), 3000);
    }
  });

  // Hàm hiển thị Toast với nội dung và loại thông báo tương ứng
  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 3000); // Tự động ẩn Toast sau 3 giây
  };

  // Hàm đóng Toast thủ công
  const closeToast = () => {
    setToast(prev => ({ ...prev, show: false }));
  };

  // Fetch conversations
  const fetchAllConversations = useCallback(
    async (page = 1, append = false) => {
      if (!accessToken) return;
      setIsLoading(true);
      try {
        if (page === 1 && !append) {
          const cachedConversations = localStorage.getItem('conversations');
          if (cachedConversations) {
            const parsed = JSON.parse(cachedConversations);
            setConversations(parsed);
            setFilteredConversations(parsed);
          }
        }
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/messages?page=${page}&limit=${CONVERSATION_PAGE_SIZE}`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );
        if (!response.ok) throw new Error('Failed to fetch conversations');
        const { conversations: data, total } = await response.json();
        setConversations(prev => append ? [...prev, ...data] : data);
        setFilteredConversations(prev => append ? [...prev, ...data] : data);
        setTotalConversations(total);
        localStorage.setItem('conversations', JSON.stringify(append ? [...(conversations || []), ...data] : data));
      } catch (error) {
        // console.error('Error fetching conversations:', error);
        setError('Failed to load conversations');
      } finally {
        setIsLoading(false);
      }
    },
    [accessToken]
  );

  // Fetch messages
  const fetchMessages = useCallback(
    async (conversationId: string, page = 1): Promise<void> => {
      if (!accessToken) return;
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/messages/${conversationId}?page=${page}&limit=${PAGE_SIZE}`,
          { headers: { 'Authorization': `Bearer ${accessToken}` } }
        );
        if (!response.ok) throw new Error('Failed to fetch messages');
        const data = await response.json();
        const messagesData = Array.isArray(data) ? data.reverse() : [];

        setMessages(prev => ({
          ...prev,
          [conversationId]: page === 1
            ? messagesData
            : [...messagesData, ...(prev[conversationId] || [])]
        }));

        setHasMoreMessages(prev => ({
          ...prev,
          [conversationId]: messagesData.length === PAGE_SIZE
        }));
        setMessagePages(prev => ({
          ...prev,
          [conversationId]: page
        }));
      } catch (error) {
        // console.error('Error fetching messages:', error);
      }
    },
    [accessToken]
  );


  const fetchConversation = async (conversationId: string): Promise<Conversation | null> => {
    if (!accessToken) return null;
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/messages/conversation/${conversationId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      if (!response.ok) throw new Error('Failed to fetch conversation');
      const data = await response.json();
      return {
        id: data.id,
        name: data.name,
        type: data.type,
        avatar_group: data.avatar_group,
        last_message: data.last_message_content || 
                    (data.last_message_image_url ? '[Hình ảnh]' : ''),
        last_message_at: data.last_message_at,
        updated_at: data.updated_at || data.last_message_at,
        unread_count: data.unread_count || 0,
        other_user: data.other_user || {
          id: 'unknown',
          name: 'Người dùng mới',
          avatar: '/default-avatar.png',
        },
      };
    } catch (error) {
      // console.error('Lỗi khi lấy chi tiết cuộc hội thoại:', error);
      return null;
    }
  };

  // Initialize
  useEffect(() => {
    // Check mobile
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Fetch data
  useEffect(() => {
    if (accessToken) fetchAllConversations();
  }, [accessToken, fetchAllConversations]);

  useEffect(() => {
    if (user?.id && socket.connected) {
      // console.log('[Messages.tsx] Re-mount → emit register');
      socket.emit('register', user.id);
    }
  }, [user?.id]);


  // Online status
  useEffect(() => {
    const onlineHandler = (users: string[]) => {
      setOnlineUsers(new Set(users));
      // console.log("Update online: ", users);
    }
    socket.on('onlineUsers', onlineHandler);
    
    return () => {
      socket.off('onlineUsers', onlineHandler);
    };
  }, []);

  // Typing indicators
  useEffect(() => {
    if (!user?.id || !currentConversationId) return;

    // Rời khỏi phòng cũ nếu có và khác phòng mới
    if (
      previousConversationIdRef.current &&
      previousConversationIdRef.current !== currentConversationId
    ) {
      socket.emit('leave', previousConversationIdRef.current);
    }

    // Tham gia phòng mới
    socket.emit('joinConversation', { 
      userId: user.id,
      conversationId: currentConversationId 
    });

     // Cập nhật lại ref với phòng hiện tại
    previousConversationIdRef.current = currentConversationId;

    setConversations(prev =>
      prev.map(conv =>
        conv.id === currentConversationId
          ? { ...conv, unread_count: 0 }
          : conv
      )
    );

    const typingHandler = ({ userId }: { userId: string }) => {
      setTypingUsers(prev => new Set(prev).add(userId));
    };

    const stopTypingHandler = ({ userId }: { userId: string }) => {
      setTypingUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    };

    socket.on('typing', typingHandler);
    socket.on('stopTyping', stopTypingHandler);

    return () => {
      socket.off('typing', typingHandler);
      socket.off('stopTyping', stopTypingHandler);
      socket.emit('leave', currentConversationId);
    };
  }, [user?.id, currentConversationId]);

  // In Messages.tsx, modify the handleLoadMoreMessages function
  const handleLoadMoreMessages = useCallback(async () => {
    if (
      !currentConversationId ||
      !scrollContainerRef.current ||
      isLoadingMoreRef.current ||
      !hasMoreMessages[currentConversationId]
    ) return;

    const container = scrollContainerRef.current;
    const scrollPositionBefore = container.scrollHeight - container.scrollTop;

    isLoadingMoreRef.current = true;

    const currentPage = messagePages[currentConversationId] || 1;

    try {
      await fetchMessages(currentConversationId, currentPage + 1);

      // Chờ DOM render rồi mới khôi phục vị trí scroll
      setTimeout(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight - scrollPositionBefore;
        }
      }, 0);
    } catch (err) {
      // console.error('Error loading more messages:', err);
    } finally {
      setTimeout(() => {
        isLoadingMoreRef.current = false;
      }, 10);
    }
  }, [currentConversationId, fetchMessages, messagePages, hasMoreMessages]);



  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    let debounceTimeout: NodeJS.Timeout | null = null;
    const handleScroll = async () => {
      if (container.scrollTop === 0) {
        if (debounceTimeout) clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(async () => {
          await handleLoadMoreMessages();
        }, 200); // 200ms debounce
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (debounceTimeout) clearTimeout(debounceTimeout);
    };
  }, [handleLoadMoreMessages]);

  // Handle search
  const handleSearch = useCallback(
    async (query: string) => {
      setSearchQuery(query);
      if (!accessToken) return;

      setIsLoading(true);
      try {
        if (!query.trim()) {
          setFilteredConversations(conversations);
          setIsLoading(false);
          return;
        }
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/messages?search=${encodeURIComponent(
            query
          )}&page=1&limit=${CONVERSATION_PAGE_SIZE}`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );
        if (!response.ok) throw new Error('Failed to search conversations');
        const { conversations: data, total } = await response.json();
        setFilteredConversations(data);
        setTotalConversations(total);
      } catch (error) {
        // console.error('Error searching conversations:', error);
        setError('Failed to search conversations');
        setTimeout(() => setError(null), 3000);
      } finally {
        setIsLoading(false);
      }
    },
    [accessToken, conversations]
  );

  const debouncedSearch = useCallback(debounce(handleSearch, 300), [handleSearch]);

  // Load thêm conversations
  const handleLoadMoreConversations = useCallback(async () => {
    if (isLoading || conversations.length >= totalConversations) return;
    setIsLoading(true);
    await fetchAllConversations(conversationPage + 1, true);
    setConversationPage(prev => prev + 1);
  }, [fetchAllConversations, conversationPage, conversations.length, totalConversations, isLoading]);


  useEffect(() => {
    const handleUnreadCleared = ({ conversationId }: { conversationId: string }) => {
      setConversations(prev =>
        prev.map(conv =>
          conv.id === conversationId
            ? { ...conv, unread_count: 0 }
            : conv
        )
      );
    };
    socket.on('unreadCleared', handleUnreadCleared);
    return () => {
      socket.off('unreadCleared', handleUnreadCleared);
    };
  }, [currentConversationId]);

  // Realtime messages
  useEffect(() => {
    const newMessageHandler = async (msg: Message) => {
      if (msg.conversation_id === currentConversationId) {
        setMessages(prev => {
          const msgs = prev[msg.conversation_id] || [];
          const pendingIdx = msgs.findIndex(
            m =>
              m.id.startsWith('temp-') &&
              m.sender_id === msg.sender_id &&
              m.content === msg.content &&
              (
                // Cả hai đều không có image_urls hoặc đều là mảng rỗng
                (!m.image_urls && !msg.image_urls) ||
                (Array.isArray(m.image_urls) && Array.isArray(msg.image_urls) && m.image_urls.length === 0 && msg.image_urls.length === 0) ||
                // Hoặc mọi url đều giống nhau về số lượng và giá trị
                ((m.image_urls || []).length === (msg.image_urls || []).length &&
                  (m.image_urls || []).every(url => (msg.image_urls || []).includes(url)))
              )
          );
          if (pendingIdx !== -1) {
            const newMsgs = [...msgs];
            newMsgs[pendingIdx] = msg;
            return { ...prev, [msg.conversation_id]: newMsgs };
          } else if (msgs.some(m => m.id === msg.id)) {
            return prev;
          } else {
            return { ...prev, [msg.conversation_id]: [...msgs, msg] };
          }
        });
      }

      const updateConversations = async () => {
        const exists = conversations.some(c => c.id === msg.conversation_id);
        if (exists) {
          setConversations(prev => {
            const updated = prev.map(conv =>
              conv.id === msg.conversation_id
                ? {
                    ...conv,
                    last_message: msg.content || ((msg.image_urls && msg.image_urls.length > 0) ? '[Hình ảnh]' : ''),
                    last_message_at: msg.created_at,
                    unread_count: msg.conversation_id !== currentConversationId ? conv.unread_count + 1 : 0,
                    updated_at: msg.created_at,
                  }
                : conv
            );
            // Đưa hội thoại có tin nhắn mới lên đầu
            const idx = updated.findIndex(conv => conv.id === msg.conversation_id);
            if (idx > 0) {
              const [moved] = updated.splice(idx, 1);
              updated.unshift(moved);
              // Hiệu ứng GSAP: fade + slide
              const node = conversationRefs.current[msg.conversation_id];
              if (node) {
                gsap.fromTo(node, { opacity: 0, y: -30 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' });
                // Tự động cuộn lên đầu
                const parentNode = node.parentElement?.parentElement;
                if (parentNode && parentNode instanceof HTMLElement) {
                  parentNode.scrollTo({ top: 0, behavior: 'smooth' });
                }
              }
            }
            return updated;
          });
        } else {
          const newConversation = await fetchConversation(msg.conversation_id);
          if (newConversation) {
            setConversations(prev => [...prev, newConversation]);
          }
        }
      };
      updateConversations();
    };

    socket.on('newMessage', newMessageHandler);
    return () => {
      socket.off('newMessage', newMessageHandler);
    };
  }, [accessToken, conversations, currentConversationId]);


  // Fetch messages when conversation changes
  useEffect(() => {
    if (currentConversationId) fetchMessages(currentConversationId, 1);
  }, [currentConversationId, fetchMessages]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || !currentConversationId) return;

    const currentMsgs = messages[currentConversationId] || [];
    const prevLen = previousMessageLengthRef.current;
    const newLen = currentMsgs.length;

    if (firstLoadRef.current) {
      // Lần đầu load thì scroll xuống cuối
      container.scrollTop = container.scrollHeight;
      firstLoadRef.current = false;
    } else if (newLen > prevLen && !isLoadingMoreRef.current) {
      // Có tin nhắn mới thật sự (không phải load cũ)
      container.scrollTop = container.scrollHeight;
    }

    previousMessageLengthRef.current = newLen;
  }, [messages, currentConversationId]);



  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    if (currentConversationId && user?.id) {
      socket.emit('typing', { conversationId: currentConversationId, userId: user.id });
      if (typingTimeout.current) clearTimeout(typingTimeout.current);
      typingTimeout.current = setTimeout(() => {
        socket.emit('stopTyping', { conversationId: currentConversationId, userId: user.id });
      }, 1000);
    }
  };

  const handleSelectConversation = useCallback((id: string) => {
    setCurrentConversationId(id);
    setReplyingTo(null);
    setPendingImageUrls([]);
    if (isMobile) setSidebarOpen(false);
  }, [isMobile, setCurrentConversationId]);

  const handleSendMessage = useCallback(
    async (content: string, imageUrls?: string[]) => {
      if ((!content.trim() && (!imageUrls || imageUrls.length === 0)) || !currentConversationId || !accessToken || !user) return;
      // 1. Tạo tin nhắn tạm thời (pending)
      const tempId = 'temp-' + Date.now();
      const optimisticMsg: Message = {
        id: tempId,
        sender_id: user.id,
        content,
        image_urls: imageUrls,
        created_at: new Date().toISOString(),
        status: 'pending' as any,
        conversation_id: currentConversationId,
        type: imageUrls && imageUrls.length > 0 ? 'image' : 'text',
        read_by_count: 1,
        sender_name: `${user.first_name} ${user.last_name}`,
        sender_avatar: user.avatar_url,
      };
      setMessages(prev => ({
        ...prev,
        [currentConversationId]: [...(prev[currentConversationId] || []), optimisticMsg]
      }));

      setReplyingTo(null);
      setPendingImageUrls([]);
      if (content) setText('');

      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/messages/${currentConversationId}`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
              content, 
              imageUrls,
              type: imageUrls && imageUrls.length > 0 ? 'image' : 'text',
              replyToMessageId: replyingTo?.id
            })
          }
        );
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to send message');
        }

        // Cập nhật last_message cho conversation ngay khi gửi thành công
        setConversations(prev =>
          prev.map(conv =>
            conv.id === currentConversationId
              ? {
                  ...conv,
                  last_message: content || (imageUrls && imageUrls.length > 0 ? '[Hình ảnh]' : ''),
                  last_message_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                }
              : conv
          )
        );
      } catch (error) {
        // Nếu lỗi, xóa tin nhắn pending
        setMessages(prev => ({
          ...prev,
          [currentConversationId]: (prev[currentConversationId] || []).filter(msg => msg.id !== tempId)
        }));
        setError(error instanceof Error ? error.message : 'Failed to send message');
        setTimeout(() => setError(null), 3000);
      }
    },
    [currentConversationId, accessToken, replyingTo, user]
  );

  const handleKeyPress = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(text, pendingImageUrls);
    }
  }, [handleSendMessage, text, pendingImageUrls]);

  const startNewConversation = useCallback(async (members: string[], type: string) => {
    if (!accessToken || !user) return;
    
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            members,
            type
          })
        }
      );
      
      if (!response.ok) {
        throw new Error(`Failed to create conversation: ${response.status}`);
      }
      
      const { conversation } = await response.json();
      const otherUserId = members.find(id => id !== user?.id);
      
      setCurrentConversationId(conversation.id);
      setReplyingTo(null);
      setPendingImageUrls([]);
      setShowNewModal(false);
      
      setConversations(prev => {
        // Kiểm tra xem hội thoại đã tồn tại chưa
        if (prev.some(c => c.id === conversation.id)) return prev;
        
        return [
          ...prev,
          {
            id: conversation.id,
            name: conversation.name,
            avatar_group: conversation.avatar_group,
            type: conversation.type,
            other_user: conversation.other_user || {
              id: otherUserId,
              name: 'New User',
              avatar: '/default-avatar.png',
            },
            last_message: conversation.last_message || '',
            last_message_at: conversation.last_message_at || new Date().toISOString(),
            unread_count: conversation.unread_count || 0,
            updated_at: conversation.updated_at || new Date().toISOString(),
          }
        ];
      });
    } catch (error) {
      // console.error('Lỗi tạo cuộc hội thoại:', error);
      // Hiển thị thông báo lỗi cho người dùng
      showToast("Không tạo được hội thoại", "error");
    }
  }, [accessToken, setCurrentConversationId, user?.id]); // Thêm currentUser.id vào dependencies

  const handleReply = useCallback((message: Message) => {
    setReplyingTo(message);
  }, []);

  const cancelReply = useCallback(() => {
    setReplyingTo(null);
  }, []);

  const cancelImage = useCallback((urlToRemove: string) => {
    setPendingImageUrls(prev => prev.filter(url => url !== urlToRemove));
  }, []);

  const handleCopyLink = useCallback(() => {
    if (currentConversationId) {
      navigator.clipboard.writeText(`${window.location.origin}/messages/${currentConversationId}`);
    }
  }, [currentConversationId]);

  useEffect(() => {
    firstLoadRef.current = true;
    previousMessageLengthRef.current = 0;
  }, [currentConversationId]);

  // Fetch data
  useEffect(() => {
    if (accessToken) fetchAllConversations(1);
  }, [accessToken, fetchAllConversations]);


  const currentMessages = currentConversationId ? messages[currentConversationId] || [] : [];
  const currentConversation = useMemo(() => 
    currentConversationId ? conversations.find(c => c.id === currentConversationId) : null
  , [currentConversationId, conversations]);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen(prev => !prev);
  }, []);

  return (
    <div className="flex h-full w-full bg-gray-100 text-gray-800 font-sans">
      {error && (
        <div className="fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-fade-in">
          {error}
        </div>
      )}
      
      {isLoading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded-lg shadow-lg flex flex-col items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <p className="mt-2 text-sm">Loading conversations...</p>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <div 
        className={clsx(
          'w-full md:w-80 bg-white border-r border-gray-200 flex flex-col transition-transform duration-300 h-full',
          isMobile && !sidebarOpen && 'hidden md:flex',
          isMobile && sidebarOpen ? 'absolute z-20' : 'relative'
        )}
      >
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-indigo-600">Chats</h2>
          <button
            onClick={() => setShowNewModal(true)}
            className="w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center hover:bg-indigo-700 transition-all"
            aria-label="New conversation"
          >
            <MaterialIcon icon="edit" color='white'/>
          </button>
        </div>
        
        <div className="p-3 sticky top-0 bg-white z-10">
          <SearchInput onSearch={debouncedSearch} />
        </div>
        
        <ConversationList 
          conversations={conversations}
          currentId={currentConversationId}
          onSelect={handleSelectConversation}
          onlineUsers={onlineUsers}
          loading={isLoading}
          searchQuery={searchQuery}
          onLoadMore={handleLoadMoreConversations}
          conversationRefs={conversationRefs}
        />
      </div>

      {/* Chat Area */}
      <div 
        className={clsx(
          'flex-1 flex flex-col bg-white h-full',
          isMobile && sidebarOpen ? 'hidden md:flex' : 'flex'
        )}
      >
        {currentConversation ? (
          <>
            <div className="flex items-center justify-between p-3 border-b border-gray-200">
              <div className="flex items-center">
                {isMobile && (
                  <button
                    onClick={toggleSidebar}
                    className="mr-3 text-gray-800 hover:text-indigo-600 transition-colors"
                    aria-label="Open sidebar"
                  >
                    <MaterialIcon icon="menu" />
                  </button>
                )}
                <div className="flex items-center">
                  <div className="relative mr-3 cursor-pointer"
                    onClick={() => {
                      if (currentConversation.type === 'direct' && currentConversation.other_user && currentConversation.other_user.id) {
                        router.push(`/profile/${currentConversation.other_user.id}`);
                      }
                    }}
                  >
                    <img
                      src={currentConversation.other_user && currentConversation.other_user.avatar ? currentConversation.other_user.avatar : '/default-avatar.png'}
                      alt={currentConversation.other_user && currentConversation.other_user.name ? currentConversation.other_user.name : 'User'}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <span className={clsx(
                      "absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white",
                      currentConversation.other_user && onlineUsers.has(currentConversation.other_user.id)
                        ? 'bg-green-500'
                        : 'bg-gray-400'
                    )}></span>
                  </div>
                  <div>
                    <div className="font-semibold text-sm flex items-center gap-2 cursor-pointer"
                      onClick={() => {
                        if (currentConversation.type === 'direct' && currentConversation.other_user && currentConversation.other_user.id) {
                          router.push(`/profile/${currentConversation.other_user.id}`);
                        }
                      }}
                    >
                      {currentConversation.type === 'direct'
                        ? (currentConversation.other_user?.name || 'Người dùng')
                        : currentConversation.name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {currentConversation.other_user && onlineUsers.has(currentConversation.other_user.id)
                        ? 'Online'
                        : 'Offline'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div 
              ref={scrollContainerRef}
              className="flex-1 overflow-y-auto bg-gray-50 p-4"
            >
              <MessageList 
                messages={currentMessages}
                userId={user?.id || ''}
                onReply={handleReply}
                currentConversationId={currentConversationId || ''}
              />
              <div ref={messagesEndRef} />
            </div>
            
            {typingUsers.size > 0 && Array.from(typingUsers).filter(id => id !== user?.id).length > 0 && (
              <div className="left-6 bottom-20 text-xs text-gray-500 flex items-center gap-2 z-10">
                <span>
                  {Array.from(typingUsers)
                    .filter(id => id !== user?.id)
                    .length === 1
                    ? 'Đang nhập...'
                    : 'Mọi người đang nhâp...'}
                </span>
                <span className="flex space-x-1">
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                </span>
              </div>
            )}

            <MessageInput 
              text={text}
              replyingTo={replyingTo}
              pendingImageUrls={pendingImageUrls}
              isUploading={isUploading}
              showImageUpload={showImageUpload}
              onTextChange={handleInputChange}
              onKeyPress={handleKeyPress}
              onSend={() => handleSendMessage(text, pendingImageUrls)}
              onCancelReply={cancelReply}
              onCancelImage={cancelImage}
              onImageToggle={() => setShowImageUpload(!showImageUpload)}
              isMobile={isMobile}
            />
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500 p-4">
            <MaterialIcon icon="forum" className="text-6xl text-gray-300 mb-4" />
            <h3 className="text-xl font-medium mb-2">Không có cuộc hội thoại nào được chọn</h3>
            <p className="text-center max-w-md">
              Hãy chọn một cuộc họi thoại để nhắn tin
            </p>
            <button
              onClick={() => setShowNewModal(true)}
              className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Bắt đầu cuộc hội thoại mới
            </button>
          </div>
        )}
      </div>

      {/* Modals */}
      <NewMessageModal 
        isOpen={showNewModal}
        onlineUsers={onlineUsers}
        onClose={() => setShowNewModal(false)}
        onSelect={startNewConversation}
      />
      
      <ImageUploadModal 
        isOpen={showImageUpload}
        isUploading={isUploading}
        uploadProgress={uploadProgress.percent}
        onClose={() => setShowImageUpload(false)}
        onUpload={async (files: FileList) => {
          await uploadFiles(files);
        }}
      />
    </div>
  );
};

export default MessagePage;