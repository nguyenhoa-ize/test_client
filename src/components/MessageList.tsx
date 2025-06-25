import { FC, useMemo } from 'react';
import { Message } from '@/types/chat';
import { MessageItem } from './MessageItem';

interface MessageListProps {
  messages: Message[];
  userId: string;
  onReply: (message: Message) => void;
  currentConversationId: string;
}

export const MessageList: FC<MessageListProps> = ({
  messages,
  userId,
  onReply,
  currentConversationId
}) => {
  const groupedMessages = useMemo(() => {
    const groups: { date: string; messages: Message[] }[] = [];
    
    messages.forEach(msg => {
      const date = new Date(msg.created_at).toDateString();
      const lastGroup = groups[groups.length - 1];
      
      if (lastGroup && lastGroup.date === date) {
        lastGroup.messages.push(msg);
      } else {
        groups.push({ date, messages: [msg] });
      }
    });
    
    return groups;
  }, [messages]);

  const scrollToMessage = (messageId: string) => {
    const element = document.getElementById(`message-${messageId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Optionally highlight the message temporarily
      element.classList.add('bg-yellow-100');
      setTimeout(() => {
        element.classList.remove('bg-yellow-100');
      }, 2000);
    }
  };

  return (
    <div className="space-y-4">
      {groupedMessages.map((group, groupIndex) => (
        <div key={groupIndex} className="space-y-3">
          <div className="relative my-4 text-center">
            <div className="absolute top-1/2 left-0 right-0 h-px bg-gray-200"></div>
            <span className="relative inline-block px-3 py-1 text-xs text-gray-500 bg-white rounded-full">
              {new Date(group.date).toLocaleDateString('vi-VN', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: '2-digit'
              })}
            </span>
          </div>
          
          {group.messages.map((msg, index) => (
            <MessageItem
              key={`${msg.id}-${index}`} // tránh trùng key
              message={msg}
              userId={userId}
              onReply={onReply}
              showDate={index === 0 || 
                new Date(group.messages[index - 1].created_at).toDateString() !== 
                new Date(msg.created_at).toDateString()}
              scrollToMessage={scrollToMessage}
            />
          ))}

        </div>
      ))}
    </div>
  );
};