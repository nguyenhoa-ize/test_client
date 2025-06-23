import { FC, useRef, useEffect, useCallback } from 'react';
import clsx from 'clsx';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Conversation } from '@/types/chat';
import { MaterialIcon } from './MaterialIcon';
import { Skeleton } from './Skeleton';
import { debounce } from 'lodash';

interface ConversationListProps {
  conversations: Conversation[];
  currentId: string | null;
  onlineUsers: Set<string>;
  onSelect: (id: string) => void;
  onLoadMore: () => void;
  loading: boolean;
  searchQuery?: string;
}

const HighlightText: FC<{ text: string; query: string }> = ({ text, query }) => {
  if (!query) return <span>{text}</span>;
  const parts = text.split(new RegExp(`(${query})`, 'gi'));
  return (
    <span>
      {parts.map((part, index) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={index} className="bg-yellow-200">{part}</mark>
        ) : (
          <span key={index}>{part}</span>
        )
      )}
    </span>
  );
};

export const ConversationList: FC<ConversationListProps> = ({
  conversations,
  currentId,
  onlineUsers,
  onSelect,
  onLoadMore,
  loading,
  searchQuery,
}) => {
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: conversations.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72,
    overscan: 5,
  });

  const debouncedLoadMore = useCallback(debounce(onLoadMore, 200), [onLoadMore]);

  useEffect(() => {
    const scrollElement = parentRef.current;
    if (!scrollElement) return;

    const handleScroll = () => {
      if (
        scrollElement.scrollTop + scrollElement.clientHeight >=
        scrollElement.scrollHeight - 50
      ) {
        debouncedLoadMore();
      }
    };

    scrollElement.addEventListener('scroll', handleScroll);
    return () => scrollElement.removeEventListener('scroll', handleScroll);
  }, [debouncedLoadMore]);

  return (
    <div ref={parentRef} className="flex-1 overflow-y-auto">
      {loading && !conversations.length ? (
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center p-3">
              <Skeleton className="w-10 h-10 rounded-full mr-3" />
              <div className="flex-1">
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : conversations.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <MaterialIcon icon="forum" className="text-4xl mx-auto mb-2" />
          <p>{searchQuery ? 'Không tìm thấy kết quả phù hợp' : 'Chưa có cuộc hội thoại nào'}</p>
        </div>
      ) : (
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {rowVirtualizer.getVirtualItems().map(virtualRow => {
            const conv = conversations[virtualRow.index];
            return (
              <div
                key={conv.id}
                onClick={() => onSelect(conv.id)}
                className={clsx(
                  'flex items-center p-3 cursor-pointer transition-colors absolute top-0 left-0 w-full',
                  currentId === conv.id ? 'bg-indigo-50 border-l-4 border-indigo-600' : 'hover:bg-indigo-50'
                )}
                style={{
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <div className="relative mr-3 w-10 h-10 flex-shrink-0">
                  <img
                    src={conv.other_user?.avatar || '/default-avatar.png'}
                    alt={conv.other_user?.name || 'User'}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <span
                    className={clsx(
                      "absolute",
                      "bottom-0 right-0",
                      "w-3.5 h-3.5 rounded-full border-2 border-white shadow",
                      onlineUsers.has(conv.other_user?.id || '') ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                    )}
                    style={{ zIndex: 2 }}
                    title={onlineUsers.has(conv.other_user?.id || '') ? 'Online' : 'Offline'}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">
                    <HighlightText
                      text={
                        conv.type === 'direct'
                          ? conv.other_user?.name || ''
                          : conv.name || ''
                      }
                      query={searchQuery || ''}
                    />
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    <HighlightText text={conv.last_message || 'Chưa có tin nhắn'} query={searchQuery || ''} />
                  </div>
                </div>
                <div className="ml-auto text-right text-xs text-gray-500">
                  <div>
                    {conv.last_message_at
                      ? new Date(conv.last_message_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : ''}
                  </div>
                  {conv.unread_count > 0 && (
                    <div className="w-5 h-5 text-white bg-pink-500 rounded-full flex items-center justify-center text-[10px] font-bold mt-1">
                      {conv.unread_count}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {loading && conversations.length > 0 && (
            <div className="p-3">
              <Skeleton className="h-12" />
            </div>
          )}
        </div>
      )}
    </div>
  );
};