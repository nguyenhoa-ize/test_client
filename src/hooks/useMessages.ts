import { useState, useEffect, useCallback, useRef } from 'react';
import { useUser } from '@/contexts/UserContext';
import { Message } from '@/types/chat';
import { socket } from '@/socket';

interface SendMessagePayload {
  content: string;
  imageUrl?: string;
  replyToMessageId?: string;
}

interface UseMessagesReturn {
  messages: Message[];
  isLoading: boolean;
  isLoadingMore: boolean;
  fetchMore: () => void;
  sendMessage: (payload: SendMessagePayload) => void;
}

export const useMessages = (conversationId: string | null): UseMessagesReturn => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { user, accessToken } = useUser();

  const fetchMessages = useCallback(async (pageNum: number, limit: number = 50) => {
    if (!accessToken || !conversationId) return;
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/messages/${conversationId}?page=${pageNum}&limit=${limit}`,
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      );
      if (!response.ok) throw new Error('Failed to fetch messages');
      const data: Message[] = await response.json();
      setMessages(prev => pageNum === 1 ? data : [...data, ...prev]);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  }, [accessToken, conversationId]);

  // Load from cache and fetch
  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      return;
    }
    setIsLoading(true);
    const cachedMessages = localStorage.getItem(`messages_${conversationId}`);
    if (cachedMessages) {
      setMessages(JSON.parse(cachedMessages));
    }
    setPage(1);
    fetchMessages(1).finally(() => setIsLoading(false));
  }, [conversationId, fetchMessages]);

  // Save to cache
  useEffect(() => {
    if (conversationId && messages.length) {
      localStorage.setItem(
        `messages_${conversationId}`,
        JSON.stringify(messages.slice(-50))
      );
    }
  }, [messages, conversationId]);

  // Infinite scroll
  useEffect(() => {
    const handleScroll = async () => {
      if (
        scrollContainerRef.current &&
        scrollContainerRef.current.scrollTop === 0 &&
        !isLoadingMore &&
        conversationId
      ) {
        setIsLoadingMore(true);
        await fetchMessages(page + 1);
        setPage(prev => prev + 1);
        setIsLoadingMore(false);
      }
    };
    const container = scrollContainerRef.current;
    container?.addEventListener('scroll', handleScroll);
    return () => container?.removeEventListener('scroll', handleScroll);
  }, [page, isLoadingMore, conversationId, fetchMessages]);

  // Auto scroll
  useEffect(() => {
    if (scrollContainerRef.current && page === 1) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [messages, page]);

  // WebSocket messages
  useEffect(() => {
    if (!conversationId) return;
    const handleNewMessage = (msg: Message) => {
      if (msg.conversation_id === conversationId) {
        setMessages(prev => {
          if (prev.some(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }
    };
    socket.on('newMessage', handleNewMessage);
    return () => {
        socket.off('newMessage', handleNewMessage);
    }
  }, [conversationId]);

  const sendMessage = useCallback(async ({ content, imageUrl, replyToMessageId }: SendMessagePayload) => {
    if (!conversationId || !accessToken || !user || (!content.trim() && !imageUrl)) return;

    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: Message = {
      id: tempId,
      sender_id: user.id,
      content,
      image_url: imageUrl,
      created_at: new Date().toISOString(),
      status: 'pending' as any,
      conversation_id: conversationId,
      type: imageUrl ? 'image' : 'text',
      read_by_count: 1,
      sender_name: `${user.first_name} ${user.last_name}`,
      sender_avatar: user.avatar_url,
      reply_to_message_id: replyToMessageId
    };

    setMessages(prev => [...prev, optimisticMsg]);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/messages/${conversationId}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            content, 
            imageUrl,
            type: imageUrl ? 'image' : 'text',
            replyToMessageId
          })
        }
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send message');
      }
    } catch (error) {
      setMessages(prev => prev.filter(msg => msg.id !== tempId));
      console.error('Error sending message:', error);
    }
  }, [conversationId, accessToken, user]);

  return {
    messages,
    isLoading,
    isLoadingMore,
    fetchMore: () => setPage(prev => prev + 1),
    sendMessage
  };
};