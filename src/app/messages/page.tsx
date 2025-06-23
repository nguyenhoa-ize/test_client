'use client';

import { useParams } from 'next/navigation';
import Messages from '../../components/Messages';
import Header from '../../components/Header';

const HEADER_HEIGHT = 80;

const MessageDetailPage = () => {
  const params = useParams<{ conversationId: string }>();
  const conversationId = params?.conversationId;

  return (
    <div className="h-screen w-full flex bg-gray-100 overflow-hidden">
      {/* Header cố định trên cùng */}
      <div
        className="fixed top-0 left-0 w-full bg-white shadow-md z-50"
        style={{ height: HEADER_HEIGHT }}
      >
        <Header />
      </div>
      {/* Nội dung chat, padding-top bằng chiều cao Header */}
      <div className="h-sreen flex-1 flex" style={{ paddingTop: HEADER_HEIGHT }}>
        <Messages />
      </div>
    </div>
  );
};

export default MessageDetailPage;