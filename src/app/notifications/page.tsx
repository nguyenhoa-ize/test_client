'use client';
import Notifications from '../../components/Notifications';
import Header from '@/components/Header';

export default function NotificationsPage() {
  return (
    <div className="h-screen flex flex-col">
      {/* Header cố định */}
      <div className="fixed top-0 left-0 w-full bg-white shadow-md z-50">
        <Header />
      </div>
      
      {/* Phần nội dung chính - chiếm không gian còn lại */}
      <div className="flex-1 mt-[80px] overflow-hidden">
        <Notifications />
      </div>
    </div>
  );
}