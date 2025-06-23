import { FC, ChangeEvent, KeyboardEvent, useEffect, useState, useRef } from 'react';
import clsx from 'clsx';
import { MaterialIcon } from './MaterialIcon';
import { Message } from '@/types/chat';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';

interface MessageInputProps {
  text: string;
  replyingTo: Message | null;
  pendingImageUrls: string[];
  isUploading: boolean;
  showImageUpload: boolean;
  isMobile?: boolean;
  onTextChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyPress: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
  onSend: () => void;
  onCancelReply: () => void;
  onCancelImage: (url: string) => void;
  onImageToggle: () => void;
}

export const MessageInput: FC<MessageInputProps> = ({
  text,
  replyingTo,
  pendingImageUrls,
  isUploading,
  showImageUpload,
  isMobile,
  onTextChange,
  onKeyPress,
  onSend,
  onCancelReply,
  onCancelImage,
  onImageToggle
}) => {
  const disableSend = (!text.trim() && pendingImageUrls.length === 0) || isUploading;
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  // Handle clicks outside to close emoji picker
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle emoji selection
  const handleEmojiSelect = (emojiData: EmojiClickData) => {
    onTextChange({
      target: { value: text + emojiData.emoji },
    } as ChangeEvent<HTMLTextAreaElement>);
  };

  return (
    <div className="flex flex-col gap-3 p-4 border-t border-gray-200 bg-white">
      {/* Reply Section */}
      {replyingTo && (
        <div className="flex items-center justify-between bg-indigo-50 border border-indigo-200 p-3 rounded-lg shadow-sm">
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-indigo-700">
              Trả lời {replyingTo.sender_name}
            </div>
            <div className="text-xs text-indigo-500 truncate">
              {replyingTo.content || '📷 Hình ảnh'}
            </div>
          </div>
          <button
            onClick={onCancelReply}
            className="text-indigo-400 hover:text-indigo-600 p-1 ml-2"
            aria-label="Hủy trả lời"
          >
            <MaterialIcon icon="close" />
          </button>
        </div>
      )}

      {/* Pending Images */}
      {pendingImageUrls.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
          {pendingImageUrls.map((url) => (
            <div key={url} className="relative group">
              <img
                src={url}
                alt="Pending"
                className="w-full h-20 object-cover rounded-lg border border-gray-300 shadow"
              />
              <button
                onClick={() => onCancelImage(url)}
                className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Hủy ảnh"
              >
                <MaterialIcon icon="close" className="text-sm" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input Actions */}
      <div className="flex items-center gap-2">
        {/* Emoji */}
        <div className="relative" ref={emojiPickerRef}>
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-amber-100 transition flex-shrink-0" /* Added flex-shrink-0 */
            aria-label="Biểu cảm"
          >
            <MaterialIcon icon="emoji_emotions" />
          </button>
          {showEmojiPicker && (
            <div className={clsx(
              "absolute bottom-full mb-2 z-10",
              isMobile ? "left-0" : "right-0"
            )}>
              <div className="w-[min(90vw,350px)]">
                <EmojiPicker
                  onEmojiClick={handleEmojiSelect}
                  height={400}
                  width="100%"
                />
              </div>
            </div>
          )}
        </div>

        {/* Image Upload */}
        <button
          onClick={onImageToggle}
          className={clsx(
            'w-10 h-10 rounded-full flex items-center justify-center transition-colors flex-shrink-0',
            isUploading
              ? 'bg-gray-200 cursor-not-allowed'
              : showImageUpload || pendingImageUrls.length > 0
              ? 'bg-indigo-600 text-white hover:bg-indigo-700'
              : 'bg-gray-100 hover:bg-indigo-100'
          )}
          aria-label="Đính kèm ảnh"
          disabled={isUploading}
        >
          <MaterialIcon icon="photo_camera" />
        </button>

        {/* Textarea */}
        <div className="flex-1 relative self-stretch">
          <textarea
            value={text}
            onChange={onTextChange}
            onKeyPress={onKeyPress}
            placeholder="Nhập tin nhắn..."
            className="w-full h-full resize-none max-h-20 text-sm bg-gray-100 rounded-xl px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            rows={1}
            onClick={() => setShowEmojiPicker(false)}
          />
          <div className="absolute inset-0 invisible h-min whitespace-pre-wrap px-4 py-3 pr-12 text-sm">
            {text || 'Nhập tin nhắn...'}
          </div>
        </div>

        <button
          onClick={onSend}
          disabled={disableSend}
          className={clsx(
            'w-10 h-10 rounded-full flex items-center justify-center transition-colors flex-shrink-0', /* Added flex-shrink-0 */
            disableSend
              ? 'bg-gray-300 text-white cursor-not-allowed'
              : 'bg-indigo-600 text-white hover:bg-indigo-700'
          )}
          aria-label="Gửi tin nhắn"
        >
          <MaterialIcon icon="send" color='white' />
        </button>
      </div>
    </div>
  );
};
