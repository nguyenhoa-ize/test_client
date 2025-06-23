'use client';

import React, { useState, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import axios from 'axios';
import Toast from '@/components/Toast';
import { Eye, EyeOff } from 'lucide-react';
import { gsap } from 'gsap';

function ResetPasswordPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' | 'info' | 'warning'; description?: string; duration?: number }>({ show: false, message: '', type: 'info' });
  const cardRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (cardRef.current) {
      gsap.fromTo(
        cardRef.current,
        { opacity: 0, y: 40, scale: 0.96 },
        { opacity: 1, y: 0, scale: 1, duration: 0.7, ease: 'power3.out' }
      );
    }
  }, []);

  const showToast = (
    message: string,
    type: 'success' | 'error' | 'info' | 'warning',
    description?: string,
    duration?: number
  ) => {
    setToast({ show: true, message, type, description, duration });
    setTimeout(() => setToast({ show: false, message: '', type: 'info' }), duration || (type === 'error' ? 5000 : 3000));
  };
  const closeToast = () => setToast(prev => ({ ...prev, show: false }));

  const validatePassword = (pw: string) => {
    if (pw.length < 8) return 'Mật khẩu phải có ít nhất 8 ký tự.';
    if (!/[A-Z]/.test(pw)) return 'Mật khẩu cần ít nhất 1 chữ hoa.';
    if (!/[a-z]/.test(pw)) return 'Mật khẩu cần ít nhất 1 chữ thường.';
    if (!/[0-9]/.test(pw)) return 'Mật khẩu cần ít nhất 1 số.';
    return '';
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    const pwError = validatePassword(newPassword);
    if (pwError) {
      showToast('Mật khẩu chưa đủ mạnh', 'warning', pwError, 4000);
      return;
    }
    setLoading(true);
    try {
      let seconds = 5;
      showToast(
        'Mật khẩu đã được đặt lại thành công!',
        'success',
        `Bạn sẽ được chuyển về trang chủ sau ${seconds} giây...`,
        5000
      );
      const interval = setInterval(() => {
        seconds--;
        showToast(
          'Mật khẩu đã được đặt lại thành công!',
          'success',
          `Bạn sẽ được chuyển về trang chủ sau ${seconds} giây...`,
          5000
        );
        if (seconds <= 0) {
          clearInterval(interval);
          router.push('/');
        }
      }, 1000);
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/reset-password`, {
        token,
        newPassword,
      });
    } catch {
      showToast('Token không hợp lệ hoặc đã hết hạn.', 'error', 'Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn. Vui lòng thử lại quy trình quên mật khẩu.', 6000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 to-slate-50">
      <div className="w-full min-h-screen flex items-center justify-center">
        <div ref={cardRef} className="bg-white rounded-3xl shadow-2xl px-8 py-10 max-w-md w-full flex flex-col items-center gap-5 relative animate-fadeIn">
          <h2 className="text-2xl font-bold text-slate-800 mb-1 text-center">Đặt lại mật khẩu</h2>
          <p className="text-base text-slate-500 mb-2 text-center">Nhập mật khẩu mới mạnh để bảo vệ tài khoản của bạn.</p>
          <form className="w-full flex flex-col gap-3" onSubmit={handleReset} autoComplete="off" aria-label="Đặt lại mật khẩu">
            <label htmlFor="newPassword" className="text-base font-medium text-slate-700 mb-1">Mật khẩu mới</label>
            <div className="relative">
              <input
                id="newPassword"
                name="newPassword"
                className="w-full px-4 py-3 pr-12 border border-slate-300 rounded-xl text-base text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 placeholder:text-slate-400"
                type={showPassword ? 'text' : 'password'}
                placeholder="Nhập mật khẩu mới"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                aria-required="true"
                aria-label="Mật khẩu mới"
                autoFocus
              />
              <button
                type="button"
                className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                onClick={() => setShowPassword((prev) => !prev)}
                tabIndex={0}
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showPassword ? <EyeOff size={22} /> : <Eye size={22} />}
              </button>
            </div>
            <ul className="text-xs text-slate-400 mt-1 ml-1 space-y-0.5">
              <li className={/\d/.test(newPassword) ? 'text-green-600' : ''}>• Có ít nhất 1 số</li>
              <li className={/[A-Z]/.test(newPassword) ? 'text-green-600' : ''}>• Có ít nhất 1 chữ hoa</li>
              <li className={/[a-z]/.test(newPassword) ? 'text-green-600' : ''}>• Có ít nhất 1 chữ thường</li>
              <li className={newPassword.length >= 8 ? 'text-green-600' : ''}>• Tối thiểu 8 ký tự</li>
            </ul>
            <button
              type="submit"
              className="w-full py-3 mt-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-xl hover:from-emerald-600 hover:to-green-500 transition-all text-lg shadow disabled:opacity-70 disabled:cursor-not-allowed"
              disabled={loading}
              aria-busy={loading}
            >
              {loading ? 'Đang đặt lại...' : 'Đặt lại'}
            </button>
          </form>
        </div>
      </div>
      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={closeToast}
          description={toast.description}
          duration={toast.duration}
        />
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordPageInner />
    </Suspense>
  );
}
