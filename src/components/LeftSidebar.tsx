// Import hook cần thiết từ Next.js
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import gsap from "gsap";

// Component LeftSidebar hiển thị thanh điều hướng bên trái
interface LeftSidebarProps {
  theme?: 'inspiring' | 'reflective';
}

const LeftSidebar = ({ theme = 'inspiring' }: LeftSidebarProps) => {
  // Khởi tạo router và pathname để điều hướng và xác định trang hiện tại
  const router = useRouter();
  const pathname = usePathname();
  // Danh sách các icon điều hướng
  const icons = [
    { name: "help", label: "Hỗ trợ", route: "/faq" },
    { name: "info", label: "Giới thiệu", route: "/about" },
  ];

  const sidebarRef = useRef<HTMLDivElement>(null);
  const iconRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    if (!sidebarRef.current) return;

    gsap.fromTo(sidebarRef.current, 
      { x: -100, opacity: 0 }, 
      { x: 0, opacity: 1, duration: 0.8, ease: 'power3.out', delay: 0.2 }
    );

    const validIconRefs = iconRefs.current.filter(ref => ref !== null);
    if (validIconRefs.length > 0) {
      gsap.fromTo(validIconRefs, 
        { scale: 0.5, opacity: 0 }, 
        { scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(1.7)', stagger: 0.15, delay: 0.7 }
      );
    }
  }, []);

  const activeBg = theme === 'reflective' ? 'bg-[#E3D5CA] border-[#8B5E3C]' : 'bg-blue-100 border-blue-700';
  const activeText = theme === 'reflective' ? 'text-[#8B5E3C]' : 'text-blue-700';
  const inactiveText = theme === 'reflective' ? 'text-[#8B5E3C]' : 'text-slate-500';

  return (
    // Container cho sidebar trái
    <div 
      ref={sidebarRef}
      className={`w-24 rounded-r-[50px] flex flex-col items-center mt-8 shadow-lg py-8 ${theme === 'reflective' ? 'bg-[#D5BDAF]' : 'bg-[#AECBEB]'} opacity-0`}
    >
      <div className="flex flex-col gap-8">
        {icons.map((icon, idx) => (
          <button
            key={idx}
            ref={el => { iconRefs.current[idx] = el; }}
            onClick={() => {
                const button = iconRefs.current[idx];
                if (button && pathname !== icon.route) {
                    gsap.to(button, {
                        scale: 0.9,
                        duration: 0.1,
                        yoyo: true,
                        repeat: 1,
                        ease: 'power1.inOut',
                        onComplete: () => router.push(icon.route)
                    });
                } else if (pathname !== icon.route) {
                    router.push(icon.route);
                }
            }}
            className={`w-14 h-14 rounded-full flex items-center justify-center shadow-md border-2
              ${pathname === icon.route
                ? activeBg
                : 'bg-white border-transparent'}
            `}
            aria-label={icon.label}
            onMouseEnter={(e) => {
                if (pathname !== icon.route) {
                    gsap.to(e.currentTarget, { scale: 1.1, y: -5, duration: 0.2, ease: 'power1.out' });
                }
            }}
            onMouseLeave={(e) => {
                if (pathname !== icon.route) {
                    gsap.to(e.currentTarget, { scale: 1, y: 0, duration: 0.2, ease: 'power1.inOut' });
                }
            }}
          >
            <span className={`material-symbols-outlined ${pathname === icon.route ? activeText : inactiveText} text-3xl transition-colors`}>
              {icon.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default LeftSidebar;