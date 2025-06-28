'use client';

import React, { useState, ReactNode } from 'react';
import Header from './Header';
import { useUser } from '@/contexts/UserContext';
import AuthModal from './AuthModal';
import ChatBot from './ChatBot';

interface MainLayoutProps {
  children: ReactNode;
  className?: string;
  theme?: 'inspiring' | 'reflective';
}

export default function MainLayout({ children, className = '', theme = 'inspiring' }: MainLayoutProps) {
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
      {/* Header sticky luôn trên cùng */}
      <Header onOpenAuth={handleOpenAuth} theme={theme} />

      {/* Auth Modal */}
      {showAuth && !user && (
        <AuthModal 
          onClose={() => setShowAuth(false)} 
          defaultTab={authTab} 
          onSuccess={handleAuthSuccess}
        />
      )}

      {/* Main content không cần marginTop nữa */}
      {children}

      {<ChatBot />}
    </div>
  );
}
