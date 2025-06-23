'use client';

import React, { useState, ReactNode } from 'react';
import Header from './Header';
import { useUser } from '@/contexts/UserContext';
import AuthModal from './AuthModal';

interface MainLayoutProps {
  children: ReactNode;
  className?: string;
}

export default function MainLayout({ children, className = '' }: MainLayoutProps) {
  const { user } = useUser();
  const [showAuth, setShowAuth] = useState(false);
  const [authTab, setAuthTab] = useState<'login' | 'signup'>('login');

  // Handler mở modal xác thực
  const handleOpenAuth = (tab: 'login' | 'signup') => {
    if (!user) {
      setAuthTab(tab);
      setShowAuth(true);
    }
  };

  // Handler đóng modal xác thực sau khi đăng nhập/đăng ký thành công
  const handleAuthSuccess = () => {
    setShowAuth(false);
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br from-[#E1ECF7] to-[#AECBEB] ${className}`}>
      {/* Header với position fixed để luôn hiển thị trên cùng */}
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', zIndex: 50 }}>
        <Header onOpenAuth={handleOpenAuth} />
      </div>

      {/* Auth Modal */}
      {showAuth && !user && (
        <AuthModal 
          onClose={() => setShowAuth(false)} 
          defaultTab={authTab} 
          onSuccess={handleAuthSuccess}
        />
      )}

      {/* Main content với margin-top để không bị Header che */}
      <div style={{ marginTop: 80 }}>
        {children}
      </div>
    </div>
  );
}
