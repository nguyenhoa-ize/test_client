"use client";

import React, { useRef, useEffect, useState } from 'react';
import { gsap } from 'gsap';

// Định nghĩa kiểu props cho Toast
interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  onClose: () => void;
  description?: string;
  retry?: () => void;
  duration?: number; // ms
}

// Component Toast: Hiển thị thông báo trạng thái với hiệu ứng động và màu sắc theo loại thông báo
const Toast: React.FC<ToastProps> = ({ message, type, onClose, description, retry, duration }) => {
  const [isClosing, setIsClosing] = useState(false);
  const toastRef = useRef<HTMLDivElement>(null);
  const closeTimeout = useRef<NodeJS.Timeout | null>(null);

  // Hiệu ứng xuất hiện khi Toast được mount
  useEffect(() => {
    if (toastRef.current) {
      gsap.fromTo(
        toastRef.current,
        { opacity: 0, y: 30, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: 'power3.out' }
      );
    }
    // Tự động đóng Toast sau 3 giây
    closeTimeout.current = setTimeout(() => setIsClosing(true), duration || (type === 'error' ? 5000 : 3000));
    return () => {
      if (closeTimeout.current) clearTimeout(closeTimeout.current);
    };
  }, [duration, type]);

  // Hiệu ứng biến mất khi Toast đóng
  useEffect(() => {
    if (isClosing && toastRef.current) {
      gsap.to(toastRef.current, {
        opacity: 0,
        y: -24,
        scale: 0.92,
        duration: 0.35,
        ease: 'power2.in',
        onComplete: onClose,
      });
    }
  }, [isClosing, onClose]);

  // Cấu hình màu sắc, icon, border cho từng loại Toast
  const toastConfig = {
    success: {
      bgColor: 'bg-green-50',
      icon: (
        <svg className="w-7 h-7 text-green-500 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
      ),
      borderColor: 'border-green-400',
      textColor: 'text-green-800'
    },
    error: {
      bgColor: 'bg-red-50',
      icon: (
        <svg className="w-7 h-7 text-red-500 animate-shake" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
      ),
      borderColor: 'border-red-400',
      textColor: 'text-red-800'
    },
    warning: {
      bgColor: 'bg-yellow-50',
      icon: (
        <svg className="w-7 h-7 text-yellow-500 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12A9 9 0 113 12a9 9 0 0118 0z" /></svg>
      ),
      borderColor: 'border-yellow-400',
      textColor: 'text-yellow-800'
    },
    info: {
      bgColor: 'bg-blue-50',
      icon: (
        <svg className="w-7 h-7 text-blue-500 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01" /></svg>
      ),
      borderColor: 'border-blue-400',
      textColor: 'text-blue-800'
    }
  };

  const config = toastConfig[type];

  return (
    <div
      ref={toastRef}
      className={`fixed top-6 left-1/2 -translate-x-1/2 z-[9999] min-w-[320px] max-w-[95vw]`}
      role="alert"
      aria-live="assertive"
    >
      <div
        className={`flex items-start gap-4 px-6 py-5 rounded-xl shadow-xl ${config.bgColor} border ${config.borderColor} backdrop-blur-sm bg-opacity-95`}
      >
        <div className="pt-1">{config.icon}</div>
        <div className="flex-1 min-w-0">
          <p className={`font-semibold text-base ${config.textColor}`}>{message}</p>
          {description && <p className="text-sm text-slate-500 mt-1 whitespace-pre-line">{description}</p>}
        </div>
        {retry && (
          <button onClick={retry} className="ml-2 px-3 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium text-sm transition" aria-label="Thử lại">Thử lại</button>
        )}
        <button
          onClick={() => setIsClosing(true)}
          className="ml-2 text-black/60 hover:text-black transition-colors text-xl"
          aria-label="Đóng thông báo"
        >
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>
    </div>
  );
};

export type { ToastProps };
export default Toast;
