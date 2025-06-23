"use client";

// Import các component và hook cần thiết
import LeftSidebar from "../../components/LeftSidebar";
import Header from "../../components/Header";
import { useRouter } from "next/navigation";
import React, { useState, useRef, useEffect } from "react";
import AuthModal from "../../components/AuthModal";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// Component FAQPage hiển thị trang câu hỏi thường gặp
const FAQPage = () => {
  // Khởi tạo router để điều hướng
  const router = useRouter();
  // State để kiểm soát hiển thị modal đăng nhập/đăng ký
  const [showAuth, setShowAuth] = useState(false);
  // State để xác định tab mặc định của modal (login hoặc signup)
  const [authTab, setAuthTab] = useState<'login' | 'signup'>('login');
  // State để theo dõi câu hỏi đang được mở
  const [activeQuestion, setActiveQuestion] = useState<number | null>(null);
  const faqRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Animate FAQ cards on mount and on scroll
  useEffect(() => {
    faqRefs.current.forEach((faqCard, i) => {
      if (faqCard) {
        gsap.fromTo(
          faqCard,
          { opacity: 0, scale: 0.9 },
          {
            opacity: 1,
            scale: 1,
            duration: 0.9,
            ease: "back.out(1.7)",
            delay: i * 0.1,
            scrollTrigger: {
              trigger: faqCard,
              start: "top 90%",
              toggleActions: "play none none none",
            },
          }
        );
      }
    });

    // Background animation - more subtle
    gsap.to(".bg-circle-faq-1", { y: 15, x: 15, duration: 6, repeat: -1, yoyo: true, ease: "sine.inOut" });
    gsap.to(".bg-circle-faq-2", { y: -20, x: -20, duration: 7, repeat: -1, yoyo: true, ease: "sine.inOut" });

  }, []);

  // Hàm mở modal với tab được chỉ định
  const handleOpenAuth = (tab: 'login' | 'signup') => {
    setAuthTab(tab);
    setShowAuth(true);
  };

  // Dữ liệu FAQ được lưu trữ dưới dạng mảng các object
  const faqData = [
    {
      question: "Solace là gì?",
      answer: "Solace là nền tảng mạng xã hội giúp bạn chia sẻ cảm xúc, câu chuyện cá nhân, lan tỏa năng lượng tích cực và đồng cảm với cộng đồng. Bạn có thể đăng tải những khoảnh khắc vui, buồn, truyền cảm hứng hoặc tìm kiếm sự đồng cảm từ người khác.",
      icon: "favorite"
    },
    {
      question: "Tôi có thể sử dụng Solace miễn phí không?",
      answer: "Hoàn toàn miễn phí! Bạn chỉ cần đăng ký tài khoản để bắt đầu chia sẻ và kết nối với cộng đồng.",
      icon: "card_giftcard"
    },
    {
      question: "Solace bảo vệ quyền riêng tư của tôi như thế nào?",
      answer: "Chúng tôi cam kết bảo mật thông tin cá nhân của bạn. Bạn có thể chia sẻ ẩn danh, kiểm soát ai có thể xem bài viết và luôn có quyền xóa dữ liệu bất cứ lúc nào.",
      icon: "security"
    },
    {
      question: "Làm sao để tìm kiếm hoặc kết bạn với người khác?",
      answer: "Bạn có thể sử dụng thanh tìm kiếm để tìm bạn bè, chủ đề hoặc bài viết. Hệ thống gợi ý bạn bè dựa trên sở thích và hoạt động của bạn.",
      icon: "group_add"
    },
    {
      question: "Tôi gặp sự cố hoặc muốn góp ý, liên hệ ở đâu?",
      answer: "Bạn có thể gửi phản hồi qua mục \"Liên hệ\" trên website hoặc email trực tiếp cho đội ngũ hỗ trợ của Solace. Chúng tôi luôn lắng nghe và phản hồi nhanh chóng.",
      icon: "support_agent"
    },
    {
      question: "Tôi có thể chia sẻ những nội dung gì?",
      answer: "Bạn có thể chia sẻ cảm xúc, câu chuyện cá nhân, hình ảnh, video, hoặc những điều truyền cảm hứng, khó khăn trong cuộc sống. Chúng tôi khuyến khích nội dung tích cực, đồng cảm và tôn trọng lẫn nhau.",
      icon: "diversity_3"
    }
  ];

  return (
    // Container chính với gradient background
    <div className="min-h-screen flex flex-col w-full bg-slate-50 overflow-hidden relative font-sans text-gray-800">
      {/* Background animated circles */}
      {/* <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-100/50 rounded-full mix-blend-multiply filter blur-3xl opacity-60 animate-blob bg-circle-faq-1" aria-hidden="true" />
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-purple-100/50 rounded-full mix-blend-multiply filter blur-3xl opacity-60 animate-blob animation-delay-2000 bg-circle-faq-2" aria-hidden="true" /> */}

      {/* Header component với khả năng mở modal đăng nhập/đăng ký */}
      <Header onOpenAuth={handleOpenAuth} />
      {/* Modal xác thực (đăng nhập/đăng ký) */}
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} defaultTab={authTab} />}
      {/* Layout chính với sidebar và nội dung */}
      <div className="flex flex-1 w-full mt-4 items-start">
        {/* Sidebar trái hiển thị các icon điều hướng */}
        <LeftSidebar />
        {/* Nội dung chính của trang */}
        <main className="flex-1 flex flex-col items-center px-4 md:px-12 pb-16">
          <div className="w-full max-w-3xl relative z-10">
            {/* Nút điều hướng quay về trang chủ */}
            <nav className="mb-10">
              <button
                onClick={() => router.push("/")}
                className="inline-flex items-center gap-2 text-blue-700 hover:text-blue-900 font-medium transition-all hover:-translate-x-1 bg-white/70 backdrop-blur-md px-4 py-2 rounded-full shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                aria-label="Về trang chủ"
              >
                <span className="material-symbols-outlined text-base">arrow_back</span>
                Trang chủ
              </button>
            </nav>

            {/* Tiêu đề chính của trang */}
            <header className="mb-14 text-center pt-6">
              <h1 className="text-6xl font-extrabold text-gray-900 mb-3 tracking-tight leading-tight drop-shadow-sm">
                Câu hỏi thường gặp
                <span className="text-blue-600"> FAQ</span>
              </h1>
              <p className="text-xl text-gray-700 font-normal max-w-xl mx-auto leading-relaxed">
                Tất cả những điều bạn cần biết về Solace – từ tính năng đến quyền riêng tư.
              </p>
            </header>

            {/* FAQ Accordion hiển thị danh sách câu hỏi và câu trả lời */}
            <section className="space-y-6">
              {faqData.map((faq, idx) => (
                <div
                  key={faq.question}
                  ref={el => { faqRefs.current[idx] = el; }}
                  className={`
                    bg-white/75 backdrop-blur-md rounded-2xl shadow-sm transition-all duration-200
                    hover:shadow-md
                  `}
                  tabIndex={0}
                  aria-labelledby={`faq-question-${idx}`}
                >
                  <button
                    onClick={() => setActiveQuestion(activeQuestion === idx ? null : idx)}
                    className="w-full px-6 py-5 flex items-center justify-between text-left group hover:bg-white/90 rounded-t-2xl transition-all focus:outline-none"
                    aria-expanded={activeQuestion === idx}
                    aria-controls={`faq-answer-${idx}`}
                  >
                    <div className="flex items-center gap-4">
                      <span className="material-symbols-outlined text-blue-500 text-3xl flex-shrink-0 group-hover:scale-105 transition-transform duration-200">{faq.icon}</span>
                      <h2 id={`faq-question-${idx}`} className="text-lg font-semibold text-gray-800 leading-snug">{faq.question}</h2>
                    </div>
                    <span
                      className={`material-symbols-outlined text-gray-500 transition-transform duration-300 expand-icon ${activeQuestion === idx ? 'rotate-180' : ''}`}
                      aria-hidden="true"
                    >
                      expand_more
                    </span>
                  </button>
                  <div
                    id={`faq-answer-${idx}`}
                    className={`faq-answer overflow-hidden transition-all duration-300 ease-in-out ${activeQuestion === idx ? 'max-h-96 opacity-100 px-6 pb-5' : 'max-h-0 opacity-0 px-6'}`}
                    aria-labelledby={`faq-question-${idx}`}
                    aria-hidden={activeQuestion !== idx}
                  >
                    <p className="text-gray-700 leading-relaxed">{faq.answer}</p>
                  </div>
                </div>
              ))}
            </section>

            {/* Footer với thông tin liên hệ */}
            <footer className="mt-16 text-center">
              <div className="inline-flex flex-col sm:flex-row items-center gap-5 sm:gap-6 px-7 py-4 bg-white/70 backdrop-blur-md rounded-full shadow-md">
                <a href="mailto:support@solace.com" className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors font-medium text-sm">
                  <span className="material-symbols-outlined text-base">mail</span>
                  <span>support@solace.com</span>
                </a>
                <div className="hidden sm:block h-5 w-px bg-gray-300"></div>
                <a href="#" className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors font-medium text-sm">
                  <span className="material-symbols-outlined text-base">chat</span>
                  <span>Trò chuyện trực tiếp</span>
                </a>
              </div>
              <p className="text-xs text-gray-500 mt-5">© 2024 Solace. All rights reserved.</p>
            </footer>
          </div>
        </main>
      </div>
    </div>
  );
};

export default FAQPage;