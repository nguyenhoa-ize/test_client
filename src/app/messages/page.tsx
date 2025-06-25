'use client';

import { useParams } from 'next/navigation';
import Messages from '../../components/Messages';
import Header from '../../components/Header';

const MessageDetailPage = () => {
  const params = useParams<{ conversationId: string }>();
  const conversationId = params?.conversationId;

  return (
    <div className="h-screen w-full flex flex-col bg-gray-100 overflow-hidden">
      {/* Header cố định trên cùng */}
      <div className="flex-shrink-0 bg-white shadow-md z-50">
        <Header />
      </div>
      {/* Nội dung chat */}
      <div className="flex-1 flex overflow-hidden">
        <Messages />
      </div>
    </div>
  );
};

export default MessageDetailPage;