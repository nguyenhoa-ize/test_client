'use client';

import React, { useRef, useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import Toast from '@/components/Toast';
import { gsap } from 'gsap';
import Image from 'next/image';
import logo from '@/../public/logo.png';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' | 'info' | 'warning'; description?: string; retry?: (() => void); duration?: number }>({ show: false, message: '', type: 'info' });
  const router = useRouter();
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
    retry?: (() => void) | null,
    duration?: number
  ) => {
    setToast({ show: true, message, type, description, retry: retry || undefined, duration });
    setTimeout(() => setToast({ show: false, message: '', type: 'info' }), duration || (type === 'error' ? 5000 : 3000));
  };

  const closeToast = () => setToast(prev => ({ ...prev, show: false }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      showToast('Vui lòng nhập email.', 'warning', 'Bạn cần nhập địa chỉ email để nhận hướng dẫn khôi phục.', null, 3500);
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showToast('Email không hợp lệ.', 'warning', 'Địa chỉ email bạn nhập không đúng định dạng. Vui lòng kiểm tra lại.', null, 3500);
      return;
    }
    setLoading(true);
    try {
      const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/forgot-password`, { email });
      if (response.data?.message) {
        if (response.data.message.includes('Nếu email hợp lệ')) {
          showToast(
            response.data.message,
            'info',
            'Nếu bạn không nhận được email, có thể tài khoản này chưa từng đặt mật khẩu (chỉ đăng nhập bằng Google) hoặc hệ thống email đang gặp sự cố.\n\n- Nếu bạn đăng nhập bằng Google, hãy sử dụng chức năng đổi mật khẩu sau khi đăng nhập.\n- Nếu cần hỗ trợ, vui lòng liên hệ quản trị viên.',
            undefined,
            8000
          );
        } else {
          showToast(
            'Nếu email hợp lệ, bạn sẽ nhận được hướng dẫn khôi phục.',
            'success',
            'Vui lòng kiểm tra hộp thư đến (và cả mục Spam/Quảng cáo). Nếu không nhận được email sau vài phút, hãy thử lại hoặc liên hệ hỗ trợ.',
            undefined,
            6000
          );
        }
        setTimeout(() => router.push('/'), 5000);
      }
    } catch (err: unknown) {
      let errorMessage = 'Đã xảy ra lỗi khi gửi email khôi phục.';
      let description = '';
      let retry: (() => void) | undefined = undefined;
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 400 && err.response?.data?.error?.includes('Không thể gửi email')) {
          errorMessage = 'Không thể gửi email.';
          description = 'Có thể địa chỉ email không tồn tại thật, hoặc hệ thống email đang gặp sự cố. Vui lòng kiểm tra lại email hoặc thử lại sau.';
          retry = retrySubmit;
        } else if (err.response?.status === 500) {
          errorMessage = 'Lỗi hệ thống.';
          description = 'Hệ thống đang gặp sự cố. Vui lòng thử lại sau hoặc liên hệ hỗ trợ.';
          retry = retrySubmit;
        } else if (err.response?.data?.error) {
          errorMessage = err.response.data.error;
          description = 'Vui lòng kiểm tra lại thông tin hoặc thử lại.';
        } else if (err.message === 'Network Error') {
          errorMessage = 'Không thể kết nối đến máy chủ.';
          description = 'Vui lòng kiểm tra kết nối mạng của bạn hoặc thử lại sau.';
          retry = retrySubmit;
        }
      }
      showToast(errorMessage, 'error', description, retry, 6000);
    } finally {
      setLoading(false);
    }
  };

  // Retry submit cho Toast (không nhận tham số)
  const retrySubmit = () => {
    // Tạo event giả để gọi lại handleSubmit
    const event = { preventDefault: () => {} } as React.FormEvent;
    handleSubmit(event);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 to-slate-50">
      <div className="w-full min-h-screen flex items-center justify-center">
        <div ref={cardRef} className="bg-white rounded-3xl shadow-2xl px-8 py-10 max-w-md w-full flex flex-col items-center gap-5 relative animate-fadeIn">
          <div className="flex items-center justify-center mb-2">
            <Image src={logo} alt="Solace Logo" width={56} height={56} className="w-14 h-14 rounded-xl shadow bg-slate-100" priority />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-1 text-center">Quên mật khẩu?</h2>
          <p className="text-base text-slate-500 mb-2 text-center">Nhập email để nhận hướng dẫn khôi phục mật khẩu.</p>
          <form className="w-full flex flex-col gap-3" onSubmit={handleSubmit} autoComplete="off" aria-label="Quên mật khẩu">
            <label htmlFor="email" className="text-base font-medium text-slate-700 mb-1">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              className="w-full px-4 py-3 border border-slate-300 rounded-xl text-base text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 placeholder:text-slate-400"
              placeholder="abc@gmail.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus
              aria-required="true"
              aria-label="Nhập email của bạn"
            />
            <button
              type="submit"
              className="w-full py-3 mt-2 bg-gradient-to-r from-indigo-500 to-blue-600 text-white font-bold rounded-xl hover:from-blue-600 hover:to-indigo-500 transition-all text-lg shadow disabled:opacity-70 disabled:cursor-not-allowed"
              disabled={loading}
              aria-busy={loading}
            >
              {loading ? 'Đang gửi...' : 'Gửi hướng dẫn'}
            </button>
          </form>
          <div className="w-full flex justify-end mt-1">
            <Link href="/" className="text-indigo-500 text-base font-medium hover:underline focus:underline outline-none transition-colors" tabIndex={0} aria-label="Quay lại đăng nhập">← Quay lại đăng nhập</Link>
          </div>
        </div>
      </div>
      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={closeToast}
          description={toast.description}
          retry={toast.retry}
          duration={toast.duration}
        />
      )}
    </div>
  );
}
