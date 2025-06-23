"use client";

// Import các component và hook cần thiết
import Header from "../../components/Header";
import LeftSidebar from "../../components/LeftSidebar";
import { useRouter } from "next/navigation";
import React, { useRef, useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// Move aboutSections outside the component for scope
const aboutSections: {
  icon: string;
  title: string;
  content: React.ReactNode;
}[] = [
  {
    icon: "flag",
    title: "Sứ mệnh của chúng tôi",
    content: (
      <p className="text-gray-700 leading-relaxed">
        Solace là nền tảng xã hội nơi mọi người có thể chia sẻ cảm xúc, câu chuyện cá nhân, lan tỏa năng lượng tích cực và đồng cảm. Chúng tôi hướng tới xây dựng một cộng đồng an toàn, thân thiện, nơi mọi người được lắng nghe và thấu hiểu.
      </p>
    ),
  },
  {
    icon: "target",
    title: "Mục tiêu cốt lõi",
    content: (
      <ul className="list-disc pl-6 text-gray-700 space-y-1">
        <li>Tạo không gian an toàn để mọi người bộc lộ cảm xúc, hỗ trợ ẩn danh, không lo bị đánh giá.</li>
        <li>Xây dựng cộng đồng đồng cảm, giúp giảm căng thẳng và lan tỏa năng lượng tích cực.</li>
        <li>Nhắm đến người trẻ (Gen Z, Millennials) và thị trường quốc tế.</li>
      </ul>
    ),
  },
  {
    icon: "lightbulb",
    title: "Slogan của Solace",
    content: (
      <p className="italic text-lg font-medium text-gray-800">
        `Share Your Heart, Find Your Peace` <span className="text-gray-500 text-sm">(Trút bỏ nỗi lòng, tìm về bình yên)</span>
      </p>
    ),
  },
  {
    icon: "verified",
    title: "Giá trị cốt lõi",
    content: (
      <ul className="list-disc pl-6 text-gray-700 space-y-1">
        <li>Đồng cảm và tôn trọng sự đa dạng cảm xúc.</li>
        <li>Bảo mật và quyền riêng tư cho người dùng.</li>
        <li>Khuyến khích sự tích cực, truyền cảm hứng.</li>
        <li>Phát triển cộng đồng bền vững, hỗ trợ lẫn nhau.</li>
      </ul>
    ),
  },
  {
    icon: "group",
    title: "Đội ngũ phát triển",
    content: (
      <p className="text-gray-700 leading-relaxed">
        Solace được xây dựng bởi một nhóm bạn trẻ đam mê công nghệ, tâm lý học và mong muốn tạo ra giá trị tích cực cho xã hội. Chúng tôi luôn lắng nghe ý kiến đóng góp để hoàn thiện sản phẩm tốt hơn mỗi ngày.
      </p>
    ),
  },
  {
    icon: "email",
    title: "Liên hệ với chúng tôi",
    content: (
      <p className="text-gray-700">
        Email hỗ trợ: <a href="mailto:support@solace.com" className="text-blue-600 underline hover:text-blue-800 transition-colors">support@solace.com</a>
      </p>
    ),
  },
];

// Component AboutPage hiển thị trang giới thiệu về Solace
const AboutPage = () => {
  // Khởi tạo router để điều hướng
  const router = useRouter();
  const pageRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (heroRef.current) {
      gsap.fromTo(
        heroRef.current,
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.8, ease: "power3.out" }
      );
    }

    sectionRefs.current.forEach((section, i) => {
      if (section) {
        gsap.fromTo(
          section,
          { opacity: 0, scale: 0.9 },
          {
            opacity: 1,
            scale: 1,
            duration: 0.9,
            ease: "back.out(1.7)", // bounce nhẹ nhàng
            delay: i * 0.1,
            scrollTrigger: {
              trigger: section,
              start: "top 90%",
              toggleActions: "play none none none",
            },
          }
        );
      }
    });

    // Background animation - more subtle
    gsap.to(".bg-circle-1", { y: 15, x: 15, duration: 6, repeat: -1, yoyo: true, ease: "sine.inOut" });
    gsap.to(".bg-circle-2", { y: -20, x: -20, duration: 7, repeat: -1, yoyo: true, ease: "sine.inOut" });

  }, []);

  return (
    <div ref={pageRef} className="min-h-screen flex flex-col w-full bg-slate-50 overflow-hidden relative font-sans text-gray-800">
      {/* Background animated circles - more subtle */}
      {/* <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-200/40 rounded-full mix-blend-multiply filter blur-3xl opacity-60 animate-blob bg-circle-1" aria-hidden="true" />
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-pink-200/40 rounded-full mix-blend-multiply filter blur-3xl opacity-60 animate-blob animation-delay-2000 bg-circle-2" aria-hidden="true" /> */}

      <Header />
      <div className="flex flex-1 w-full mt-4 items-start">
        <LeftSidebar />
        <main className="flex-1 flex flex-col items-center px-4 md:px-12 pb-16">
          <div className="w-full max-w-3xl relative z-10">
            {/* Navigation back to homepage */}
            <nav className="mb-10">
              <button
                onClick={() => router.push("/")}
                className="inline-flex items-center gap-2 text-blue-700 hover:text-blue-900 font-medium transition-all hover:-translate-x-1 bg-white/70 backdrop-blur-md px-4 py-2 rounded-full shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                aria-label="Quay về trang chủ"
              >
                <span className="material-symbols-outlined text-base">arrow_back</span>
                Trang chủ
              </button>
            </nav>

            {/* Hero Section - Simplified */}
            <header ref={heroRef} className="mb-14 text-center pt-6">
              <h1 className="text-6xl font-extrabold text-blue-600 mb-3 tracking-tight leading-tight drop-shadow-sm">
                Solace
              </h1>
              <p className="text-xl text-gray-700 font-normal max-w-xl mx-auto leading-relaxed">
                Nơi bạn tìm thấy bình yên, kết nối và sẻ chia.
              </p>
            </header>

            {/* Sections - Minimalist design */}
            <section className="space-y-10">
              {aboutSections.map((section, idx) => (
                <div
                  key={section.title}
                  ref={el => { sectionRefs.current[idx] = el; }}
                  className={`
                    bg-white/75 backdrop-blur-md rounded-2xl p-7 shadow-sm transition-all duration-200
                    hover:shadow-md
                    flex items-start gap-5
                  `}
                  tabIndex={0}
                  aria-labelledby={`about-section-title-${idx}`}
                >
                  <span className="material-symbols-outlined text-blue-500 text-5xl flex-shrink-0 mt-1">
                    {section.icon}
                  </span>
                  <div>
                    <h2 id={`about-section-title-${idx}`} className="text-2xl font-bold mb-2 text-blue-600 leading-snug">
                      {section.title}
                    </h2>
                    <div>{section.content}</div>
                  </div>
                </div>
              ))}
            </section>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AboutPage;