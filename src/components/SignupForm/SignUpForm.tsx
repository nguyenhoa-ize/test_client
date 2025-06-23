// Import hook cần thiết
import { useState } from "react";
import Toast from "../Toast";
import { useUser } from "@/contexts/UserContext";

interface SignUpFormProps {
  onSuccess?: () => void;
}

// Component SignUpForm xử lý form đăng ký
const SignUpForm = ({ onSuccess }: SignUpFormProps) => {
  // State để quản lý dữ liệu form
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  });

  // State quản lý trạng thái và nội dung của Toast thông báo
  const [toast, setToast] = useState<{
    show: boolean;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
  }>({
    show: false,
    message: '',
    type: 'info'
  });

  const { signup } = useUser();

  // Hàm hiển thị Toast với nội dung và loại thông báo tương ứng
  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 3000); // Tự động ẩn Toast sau 3 giây
  };

  // Hàm đóng Toast thủ công
  const closeToast = () => {
    setToast(prev => ({ ...prev, show: false }));
  };

  // State để lưu trữ thông báo lỗi
  const [error, setError] = useState("");

  // Hàm xử lý thay đổi giá trị input
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Hàm xử lý submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validate input
    if (!form.firstName || !form.lastName || !form.email || !form.password) {
      return setError("Vui lòng điền đầy đủ thông tin.");
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      return setError("Địa chỉ email không hợp lệ.");
    }
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(form.password)) {
      return setError("Mật khẩu cần ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường và số.");
    }

    try {
      const check = await signup(
        form.email,
        form.password,
        form.firstName.trim(),
        form.lastName.trim()
      );
      console.log("Đăng ký thành công:", check);

      showToast("Đăng ký thành công!", "success");
      setForm({ firstName: '', lastName: '', email: '', password: '' });
      setTimeout(() => onSuccess?.(), 1500);
    } catch (error: any) {
      const errorMessage = error.message || "Đã xảy ra lỗi trong quá trình đăng ký.";
      console.error("Lỗi đăng kýwwww:", errorMessage);
      setError(errorMessage);
      showToast(errorMessage, "error");
    }
  };

  return (
    <>
      {/* Form đăng ký với các trường họ, tên, email và password */}
      <form className="w-full flex flex-col gap-5" onSubmit={handleSubmit}>
        {/* Trường họ và tên */}
        <div className="w-full flex flex-col md:flex-row gap-4 box-border">
          <div className="w-full flex flex-col gap-1">
            <label htmlFor="firstName" className="font-semibold text-black text-base">First name</label>
            <input
              type="text"
              name="firstName"
              id="firstName"
              placeholder="Nguyen"
              className="w-full min-w-0 px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 text-black font-medium bg-white placeholder:text-gray-400"
              value={form.firstName}
              onChange={handleChange}
              autoComplete="given-name"
            />
          </div>
          <div className="w-full flex flex-col gap-1">
            <label htmlFor="lastName" className="font-semibold text-black text-base">Last name</label>
            <input
              type="text"
              name="lastName"
              id="lastName"
              placeholder="Van A"
              className="w-full min-w-0 px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 text-black font-medium bg-white placeholder:text-gray-400"
              value={form.lastName}
              onChange={handleChange}
              autoComplete="family-name"
            />
          </div>
        </div>
        {/* Trường email */}
        <div className="flex flex-col gap-1">
          <label htmlFor="email" className="font-semibold text-black text-base">Email address</label>
          <input
            type="email"
            name="email"
            id="email"
            placeholder="abc@gmail.com"
            className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 text-black font-medium bg-white placeholder:text-gray-400"
            value={form.email}
            onChange={handleChange}
            autoComplete="email"
          />
        </div>
        {/* Trường password */}
        <div className="flex flex-col gap-1">
          <label htmlFor="password" className="font-semibold text-black text-base">Password</label>
          <input
            type="password"
            name="password"
            id="password"
            placeholder="12345678"
            className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 text-black font-medium bg-white placeholder:text-gray-400"
            value={form.password}
            onChange={handleChange}
            autoComplete="new-password"
          />
        </div>
        {/* Hiển thị lỗi nếu có */}
        {error && <div className="text-red-500 text-sm text-center">{error}</div>}
        {/* Nút submit */}
        <button
          type="submit"
          className="w-full py-3 mt-2 bg-black text-white font-bold rounded-full hover:bg-blue-700 transition-all text-lg shadow"
        >
          Sign up
        </button>
      </form>

      {/* Hiển thị Toast thông báo nếu có */}
        {toast.show && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={closeToast}
          />
        )}
    </>
  );
};

export default SignUpForm;