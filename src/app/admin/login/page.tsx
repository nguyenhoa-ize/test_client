'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import { FiMail, FiLock } from 'react-icons/fi';
import Image from 'next/image';

export default function AdminLoginPage() {
  const { login } = useUser();
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(form.email)) {
        setError("Email không hợp lệ");
        return;
      }
      await login(form.email, form.password);
      // Kiểm tra lại role sau khi login
      const userStr = sessionStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;
      if (user && user.role === 'admin') {
        router.replace('/admin/overview');
      } else {
        setError('Tài khoản không có quyền admin!');
      }
    } catch (err: any) {
      setError(err.message || 'Đăng nhập thất bại!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#e0eafc] to-[#cfdef3] px-2">
      <div className="w-full max-w-md bg-white/90 rounded-3xl shadow-2xl p-8 md:p-10 flex flex-col gap-8 border border-[#e3e9f7] backdrop-blur-md">
        <div className="flex flex-col items-center gap-2">
          <Image src="/logo.png" alt="Admin Logo" width={60} height={60} className="rounded-full shadow-md mb-2" />
          <h2 className="text-3xl font-extrabold text-[#2d3a4e] tracking-tight text-center">Đăng nhập Quản trị</h2>
          <p className="text-gray-500 text-sm text-center">Chào mừng bạn đến với trang quản trị Solace</p>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="relative">
            <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8CA9D5] text-xl" />
            <input
              type="email"
              name="email"
              placeholder="Email admin"
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-[#d1d5db] focus:border-[#8CA9D5] focus:ring-2 focus:ring-[#AECBEB] bg-white text-gray-900 font-medium shadow-sm transition-all duration-200 placeholder:text-gray-400 outline-none"
              value={form.email}
              onChange={handleChange}
              required
              autoFocus
            />
          </div>
          <div className="relative">
            <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8CA9D5] text-xl" />
            <input
              type="password"
              name="password"
              placeholder="Mật khẩu"
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-[#d1d5db] focus:border-[#8CA9D5] focus:ring-2 focus:ring-[#AECBEB] bg-white text-gray-900 font-medium shadow-sm transition-all duration-200 placeholder:text-gray-400 outline-none"
              value={form.password}
              onChange={handleChange}
              required
            />
          </div>
          {error && <div className="text-red-500 text-center font-semibold animate-pulse">{error}</div>}
          <button
            type="submit"
            className="w-full py-3 mt-2 font-bold rounded-xl text-lg shadow-md bg-gradient-to-r from-[#8CA9D5] to-[#AECBEB] text-white hover:from-[#AECBEB] hover:to-[#8CA9D5] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#8CA9D5] focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>
      </div>
    </div>
  );
} 