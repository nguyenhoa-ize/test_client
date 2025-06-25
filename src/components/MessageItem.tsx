import { FC, useRef, memo, useState, useEffect } from 'react';
import clsx from 'clsx';
import gsap from 'gsap';
import FsLightbox from 'fslightbox-react';
import { MaterialIcon } from './MaterialIcon';
import { Message } from '@/types/chat';

interface MessageItemProps {
  message: Message;
  userId: string;
  onReply: (message: Message) => void;
  showDate: boolean;
  scrollToMessage?: (messageId: string) => void;
}

const MessageItemComponent: FC<MessageItemProps> = ({
  message,
  userId,
  onReply,
  showDate,
  scrollToMessage,
}) => {
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [toggler, setToggler] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);

  const images = message.image_urls || [];
  const hasImages = images.length > 0;

  const openLightbox = (index: number) => {
    setActiveImageIndex(index);
    setToggler(!toggler);
  };

  const isOwn = message.sender_id === userId;

  const handleReplyClick = () => {
    if (message.reply_to_message_id && scrollToMessage) {
      scrollToMessage(message.reply_to_message_id);
    }
  };

  const isLongMessage = message.content && (message.content.length > 300 || message.content.split('\n').length > 6);
  const previewContent = message.content
    ? message.content.split('\n').slice(0, 6).join('\n').slice(0, 300)
    : '';

  useEffect(() => {
    if (containerRef.current) {
      gsap.fromTo(
        containerRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }
      );
    }
  }, []);

  return (
    <div
      id={`message-${message.id}`}
      className={clsx(
        'flex px-4 py-2 group',
        isOwn ? 'justify-end' : 'justify-start'
      )}
    >
      {/* Avatar nếu không phải tin của mình */}
      {!isOwn && (
        <div className="w-9 h-9 mr-2 flex-shrink-0">
          <img
            src={message.sender_avatar || '/default-avatar.png'}
            alt="Avatar"
            className="w-full h-full rounded-full object-cover border border-gray-300"
          />
        </div>
      )}

      {/* Vùng chứa toàn bộ nội dung tin nhắn */}
      <div className="relative flex max-w-[90vw] sm:max-w-[80%]">
        {/* Nút reply - luôn hiển thị nhưng ẩn cho đến khi hover */}
        <button
          onClick={() => onReply(message)}
          title="Trả lời"
          className={clsx(
            'absolute top-1/2 z-20 opacity-0 group-hover:opacity-100 transition-all duration-200 transform -translate-y-1/2',
            isOwn
              ? '-left-10 hover:-translate-x-1'
              : '-right-10 hover:translate-x-1',
            'bg-white border border-gray-200 shadow rounded-full p-1.5 w-8 h-8 flex items-center justify-center',
            'hover:bg-gray-100 focus:outline-none'
          )}
        >
          <MaterialIcon icon="reply" className="text-sm text-gray-600" />
        </button>

        <div className="flex flex-col w-full">
          {/* Quote trả lời */}
          {message.reply_to_message_id && message.reply_to_sender_name && (
            <div
              className={clsx(
                'mb-2 border-l-4 pl-3 py-2 rounded-lg cursor-pointer transition-colors text-gray-900',
                isOwn
                  ? 'border-[#D0E8FF] bg-[#E6F4FF] hover:bg-[#D0E8FF]'
                  : 'border-[#C9D6DF] bg-[#F0F4F8] hover:bg-[#E2E8F0]'
              )}
              onClick={handleReplyClick}
              role="button"
              tabIndex={0}
              title="Xem tin nhắn gốc"
            >
              <div className="font-semibold text-sm truncate">{message.reply_to_sender_name}</div>
              <div className="text-xs line-clamp-2">
                {message.reply_to_content || (message.reply_to_type === 'image' ? '📷 Hình ảnh' : 'Không có nội dung')}
              </div>
            </div>
          )}

          {/* Tin nhắn hình ảnh */}
          {hasImages && (
            <>
              <div
                className={clsx('grid max-w-md gap-1 rounded-lg overflow-hidden', {
                  'grid-cols-1': images.length === 1,
                  'grid-cols-2 grid-rows-2 aspect-square': images.length > 1,
                })}
              >
                {images.slice(0, 4).map((url, index) => (
                  <figure
                    key={url}
                    className={clsx(
                      'relative cursor-pointer group',
                      {
                        'col-span-2 row-span-2': images.length === 1,
                        'col-span-1 row-span-2': images.length === 2 && index === 0,
                        'col-span-1 row-span-2': images.length === 3 && index === 0,
                        'col-span-1 row-span-1': images.length >= 2,
                      }
                    )}
                    onClick={() => openLightbox(index)}
                    role="button"
                    tabIndex={0}
                  >
                    <img
                      src={url}
                      alt={`Sent content ${index + 1}`}
                      loading="lazy"
                      className="w-full h-full object-cover border border-gray-200 group-hover:opacity-80 transition-opacity"
                    />
                    {images.length > 4 && index === 3 && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <span className="text-white text-2xl font-bold">+{images.length - 4}</span>
                      </div>
                    )}
                  </figure>
                ))}
              </div>
              <FsLightbox
                toggler={toggler}
                sources={images}
                slide={activeImageIndex + 1}
                key={message.id}
                type="image"
              />
            </>
          )}

          {/* Khung tin nhắn văn bản - chỉ hiển thị nếu có nội dung */}
          {message.content && (
            <div
              className={clsx(
                'px-2 py-1 sm:px-4 sm:py-2 rounded-2xl whitespace-pre-wrap break-all shadow-sm text-gray-900 mt-1',
                isOwn
                  ? 'bg-[#CCE5FF] rounded-br-sm self-end hover:bg-[#B3D8FF]'
                  : 'bg-[#F1F5F9] rounded-bl-sm self-start hover:bg-[#E2E8F0]'
              )}
            >
              <div className={clsx('relative transition-all duration-300', expanded ? 'max-h-full' : 'max-h-48 overflow-hidden')}
              >
                {expanded || !isLongMessage ? (
                  message.content
                ) : (
                  <>
                    {previewContent}
                    {previewContent.length < message.content.length && '...'}
                  </>
                )}
                {/* Gradient mờ ở cuối khi chưa mở rộng */}
                {isLongMessage && !expanded && (
                  <div className="pointer-events-none absolute bottom-0 left-0 w-full h-10 bg-gradient-to-t from-white/90 to-transparent" />
                )}
              </div>
              {isLongMessage && (
                <div className="flex justify-center mt-2">
                  {!expanded ? (
                    <button
                      className="flex items-center gap-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-full px-3 py-1 shadow-sm transition-all duration-200 focus:outline-none"
                      onClick={() => setExpanded(true)}
                    >
                      <span>Xem thêm</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                    </button>
                  ) : (
                    <button
                      className="flex items-center gap-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-full px-3 py-1 shadow-sm transition-all duration-200 focus:outline-none"
                      onClick={() => setExpanded(false)}
                    >
                      <span>Thu gọn</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Thời gian */}
          {showDate && (
            <div
              className={clsx(
                'text-xs mt-1 text-gray-700',
                isOwn ? 'text-right' : 'text-left'
              )}
            >
              {new Date(message.created_at).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const MessageItem = memo(MessageItemComponent);