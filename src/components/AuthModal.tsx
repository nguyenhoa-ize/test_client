"use client";

// Import các hook và component cần thiết cho modal xác thực
import { useState, useEffect, useRef } from "react";
import SignUpForm from "./SignupForm/SignUpForm";
import LoginForm from "./LoginForm/LoginForm";
import Toast from "./Toast";
import { signInWithGoogle, signInWithFacebook } from "../lib/firebaseAuth";
import { FcGoogle } from "react-icons/fc";
import { FaFacebookF } from "react-icons/fa";
import React from "react";
import { useUser } from "@/contexts/UserContext";
import { gsap } from 'gsap';
import axios from "axios";

// Định nghĩa kiểu props cho AuthModal: quản lý đóng modal, tab mặc định và callback thành công
interface AuthModalProps {
  onClose: () => void;
  defaultTab?: 'login' | 'signup';
  onSuccess?: () => void;
}

// Component AuthModal: Hiển thị modal xác thực (đăng nhập/đăng ký) với hiệu ứng động và các phương thức đăng nhập
const AuthModal = ({ onClose, defaultTab = 'signup', onSuccess }: AuthModalProps) => {
  // State quản lý tab hiện tại ('signup' hoặc 'login')
  const [tab, setTab] = useState<'signup' | 'login'>(defaultTab);
  // State quản lý Toast thông báo
  const [toast, setToast] = useState<{message: string; type: 'success' | 'error'} | null>(null);
  // Hook để lấy thông tin người dùng từ context
  const { setUserData } = useUser();

  // Ref cho các phần tử phục vụ hiệu ứng GSAP
  const overlayRef = useRef(null);
  const modalRef = useRef(null);
  const formRef = useRef(null);
  const signupBtnRef = useRef<HTMLButtonElement>(null);
  const loginBtnRef = useRef<HTMLButtonElement>(null);

  // Hiệu ứng xuất hiện modal khi mount
  useEffect(() => {
    gsap.fromTo(overlayRef.current, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: 'power2.out' });
    gsap.fromTo(modalRef.current, { opacity: 0, y: -50, scale: 0.9 }, { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: 'back.out(1.7)', delay: 0.1 });
    gsap.fromTo(formRef.current, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out', delay: 0.4 });
  }, []);

  // Cập nhật tab khi prop defaultTab thay đổi
  useEffect(() => {
    setTab(defaultTab);
  }, [defaultTab]);

  // Hiệu ứng chuyển tab giữa đăng ký và đăng nhập
  useEffect(() => {
    const activeRef = tab === 'signup' ? signupBtnRef : loginBtnRef;
    const inactiveRef = tab === 'signup' ? loginBtnRef : signupBtnRef;
    gsap.to(activeRef.current, {
      backgroundColor: '#8CA9D5',
      color: 'black',
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
      duration: 0.3,
      ease: 'power2.out'
    });
    gsap.to(inactiveRef.current, {
      backgroundColor: '#E5E7EB',
      color: 'rgba(0, 0, 0, 0.7)',
      boxShadow: 'none',
      duration: 0.3,
      ease: 'power2.out'
    });
    gsap.fromTo(formRef.current, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: 'power2.out' });
  }, [tab]);

  // Xử lý đăng nhập bằng Google
  const handleGoogleLogin = async () => {
    try {
      const userCredential = await signInWithGoogle();
      
      if (userCredential.user) {
        const idToken = await userCredential.user.getIdToken();
        // Gửi token lên server để xác thực và lấy thông tin người dùng
        if (!idToken) {
          throw new Error("Không thể lấy ID token từ người dùng.");
        }

        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/google-login`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
          credentials: "include",
        });
        // Lưu thông tin người dùng vào localStorage (hoặc có thể gửi lên server)
        if( !res.ok) {
          throw new Error("Lỗi khi lưu thông tin người dùng.");
        }
        const data = await res.json();
        // Kiểm tra xem có dữ liệu người dùng trả về không
        if (!data || !data.user) {
          throw new Error("Không có dữ liệu người dùng trả về từ server.");
        }
        
        // Lưu thông tin người dùng vào context hoặc state
        setUserData(data.user, data.accessToken);
        
        
        // Hiển thị thông báo thành công
        setToast({ message: `Đăng nhập thành công! Chào mừng, ${userCredential.user.displayName || 'người dùng'}!`, type: "success" });
        onSuccess?.();
      } else {
        throw new Error("Không thể lấy thông tin người dùng sau khi đăng nhập.");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Đăng nhập với Google thất bại!";
      setToast({ message: errorMessage, type: "error" });
    }
  };

  // Xử lý đăng nhập bằng Facebook
  const handleFacebookLogin = async () => {
    try {
      await signInWithFacebook();
      setToast({ message: "Đăng nhập với Facebook thành công!", type: "success" });
      onSuccess?.();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Đăng nhập với Facebook thất bại!";
      setToast({ message: errorMessage, type: "error" });
    }
  };

  // Callback khi đăng nhập thành công qua form
  const handleLoginSuccess = () => {
    setToast({ message: "Đăng nhập thành công!", type: "success" });
    onSuccess?.();
  };

  // Log trạng thái Toast để debug (có thể xóa khi production)
  useEffect(() => {
    console.log('Toast state in AuthModal:', toast);
  }, [toast]);

  // Hiệu ứng hover cho các nút tab
  const handleTabHover = (isSignup: boolean, isHover: boolean) => {
    const targetRef = isSignup ? signupBtnRef : loginBtnRef;
    const isActive = (isSignup && tab === 'signup') || (!isSignup && tab === 'login');
    if (targetRef.current) {
      gsap.to(targetRef.current, {
        scale: isHover ? 1.02 : 1,
        backgroundColor: isActive 
          ? (isHover ? '#7B96C2' : '#8CA9D5')
          : (isHover ? '#EBEDF0' : '#E5E7EB'),
        boxShadow: isHover 
          ? isActive
            ? '0 4px 6px -1px rgba(0, 0, 0, 0.1)' 
            : '0 1px 2px rgba(0, 0, 0, 0.05)'
          : isActive 
            ? '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
            : 'none',
        duration: 0.3,
        ease: 'power2.out'
      });
    }
  };

  return (
    <>
      {/* Overlay nền mờ cho modal xác thực */}
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20" ref={overlayRef}>
        {/* Hộp nội dung modal xác thực */}
        <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl p-10 mx-2 sm:mx-4 md:mx-8 lg:mx-0" ref={modalRef}>
          {/* Nút đóng modal */}
          <button
            className="absolute top-4 right-4 text-2xl text-black hover:scale-110 transition"
            onClick={onClose}
            aria-label="Đóng"
          >
            ×
          </button>
          {/* Tabs chuyển đổi giữa đăng ký và đăng nhập */}
          <div className="flex mb-10 gap-0">
            <button
              ref={signupBtnRef}
              className={`flex-1 py-3 rounded-l-xl text-lg font-bold transition-all focus:outline-none focus:ring-2 focus:ring-blue-200 ${
                tab === 'signup' ? 'bg-[#8CA9D5] text-black shadow' : 'bg-gray-200 text-black/70'
              }`}
              onClick={() => setTab('signup')}
              onMouseEnter={() => handleTabHover(true, true)}
              onMouseLeave={() => handleTabHover(true, false)}
            >
              Sign up
            </button>
            <button
              ref={loginBtnRef}
              className={`flex-1 py-3 rounded-r-xl text-lg font-bold transition-all focus:outline-none focus:ring-2 focus:ring-blue-200 ${
                tab === 'login' ? 'bg-[#8CA9D5] text-black shadow' : 'bg-gray-200 text-black/70'
              }`}
              onClick={() => setTab('login')}
              onMouseEnter={() => handleTabHover(false, true)}
              onMouseLeave={() => handleTabHover(false, false)}
            >
              Log in
            </button>
          </div>
          {/* Hiển thị form đăng ký hoặc đăng nhập tùy theo tab */}
          <div ref={formRef}>
            {tab === 'signup' ? 
              <SignUpForm onSuccess={handleLoginSuccess} /> : 
              <LoginForm onSuccess={handleLoginSuccess} />
            }
            {/* Phân cách bằng chữ OR */}
            <div className="flex items-center gap-2 my-2">
              <div className="flex-1 h-px bg-gray-300" />
              <span className="text-gray-500 text-base font-semibold mb-3 mt-3">OR</span>
              <div className="flex-1 h-px bg-gray-300" />
            </div>
            {/* Nút đăng nhập với Google */}
            <button
              onClick={handleGoogleLogin}
              className="w-full flex items-center gap-3 border border-gray-300 rounded-full py-3 text-base mb-2 hover:bg-gray-100 transition justify-center mb-5"
            >
              <FcGoogle className="text-xl" />
              <span className="text-black">Log in with Google</span>
            </button>
            {/* Nút đăng nhập với Facebook */}
            <button
              onClick={handleFacebookLogin}
              className="w-full flex items-center gap-3 border border-gray-300 rounded-full py-3 text-base mb-2 hover:bg-gray-100 transition justify-center"
            >
              <FaFacebookF className="text-blue-600 text-xl" />
              <span className="text-black">Log in with Facebook</span>
            </button>
          </div>
        </div>
      </div>

      {/* Toast thông báo trạng thái xác thực */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </>
  );
};

export default AuthModal;