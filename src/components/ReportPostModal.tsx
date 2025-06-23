import React, { useState, useEffect, useRef } from "react";
import gsap from "gsap";

interface ReportPostModalProps {
  postId: string;
  reporterId: string;
  onClose: () => void;
}

const REPORT_REASONS = [
  "Vấn đề liên quan đến người dưới 18 tuổi",
  "Bắt nạt, quấy rối hoặc lăng mạ/lạm dụng/ngược đãi",
  "Tự tử hoặc tự gây thương tích",
  "Nội dung mang tính bạo lực, thù ghét hoặc gây phiền toái",
  "Bán hoặc quảng cáo mặt hàng bị hạn chế",
  "Nội dung người lớn",
  "Thông tin sai sự thật, lừa đảo hoặc gian lận",
  "Quyền sở hữu trí tuệ",
  "Tôi không muốn xem nội dung này",
];

export default function ReportPostModal({ postId, reporterId, onClose }: ReportPostModalProps) {
  const [selectedReason, setSelectedReason] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const modalRef = useRef<HTMLFormElement>(null);
  const successModalRef = useRef<HTMLDivElement>(null);
  const radioRefs = useRef<(HTMLLabelElement | null)[]>([]);

  // GSAP Animation for modal entrance
  useEffect(() => {
    if (modalRef.current) {
      gsap.fromTo(
        modalRef.current,
        { opacity: 0, scale: 0.95, y: 20 },
        { opacity: 1, scale: 1, y: 0, duration: 0.4, ease: "power3.out" }
      );
    }
  }, []);

  // GSAP Animation for radio buttons
  useEffect(() => {
    if (radioRefs.current.length > 0) {
      gsap.fromTo(
        radioRefs.current,
        { opacity: 0, x: -20 },
        { opacity: 1, x: 0, duration: 0.3, stagger: 0.05, ease: "power2.out" }
      );
    }
  }, []);

  // GSAP Animation for success modal
  useEffect(() => {
    if (success && successModalRef.current) {
      gsap.fromTo(
        successModalRef.current,
        { opacity: 0, scale: 0.95, y: 20 },
        { opacity: 1, scale: 1, y: 0, duration: 0.4, ease: "power3.out" }
      );
    }
  }, [success]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedReason) {
      setError("Vui lòng chọn lý do báo cáo.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          post_id: postId,
          reporter_id: reporterId,
          reason: selectedReason,
          description,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi báo cáo");
      setSuccess(true);
      gsap.to(modalRef.current, {
        opacity: 0,
        scale: 0.95,
        y: 20,
        duration: 0.4,
        ease: "power3.in",
        onComplete: onClose,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Lỗi không xác định");
      setLoading(false);
    }
  };

  const handleRadioHover = (index: number) => {
    if (radioRefs.current[index]) {
      gsap.to(radioRefs.current[index], {
        scale: 1.02,
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
        duration: 0.2,
        ease: "power2.out",
      });
    }
  };

  const handleRadioLeave = (index: number) => {
    if (radioRefs.current[index]) {
      gsap.to(radioRefs.current[index], {
        scale: 1,
        boxShadow: "none",
        duration: 0.2,
        ease: "power2.in",
      });
    }
  };

  if (success) {
    return (
      <div
        className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50"
        onClick={onClose}
      >
        <div
          ref={successModalRef}
          className="bg-white rounded-2xl p-4 sm:p-6 w-full max-w-sm sm:max-w-md text-center shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 text-gray-800">
            Báo cáo thành công!
          </h2>
          <p className="text-sm sm:text-base text-gray-600">
            Cảm ơn bạn đã giúp chúng tôi xây dựng cộng đồng an toàn hơn.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50"
      onClick={onClose}
    >
      <form
        ref={modalRef}
        className="bg-white rounded-2xl p-4 sm:p-6 w-full max-w-sm sm:max-w-md shadow-lg"
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-3 sm:mb-4">
          <h2 className="text-lg sm:text-xl font-bold text-gray-800">Báo cáo bài viết</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 text-xl sm:text-2xl hover:text-gray-700 transition-colors duration-200"
          >
            ×
          </button>
        </div>
        <div className="mb-2 text-sm sm:text-base font-semibold text-gray-800">
          Tại sao bạn báo cáo bài viết này?
        </div>
        <div className="mb-4 text-xs sm:text-sm text-gray-500">
          Nếu bạn nhận thấy ai đó đang gặp nguy hiểm, đừng chần chừ mà hãy tìm ngay sự giúp đỡ trước khi báo cáo với chúng tôi.
        </div>
        <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
          {REPORT_REASONS.map((reason, index) => (
            <label
              key={reason}
              ref={(el) => { radioRefs.current[index] = el; }}
              className={`block p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                selectedReason === reason
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-gray-200 hover:bg-gray-50 text-gray-700"
              }`}
              onMouseEnter={() => handleRadioHover(index)}
              onMouseLeave={() => handleRadioLeave(index)}
            >
              <input
                type="radio"
                name="reason"
                value={reason}
                checked={selectedReason === reason}
                onChange={() => setSelectedReason(reason)}
                className="mr-2 accent-blue-500"
              />
              <span className="text-sm sm:text-base">{reason}</span>
            </label>
          ))}
        </div>
        <textarea
          className="w-full border border-gray-200 rounded-lg p-3 mb-3 text-sm sm:text-base text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
          placeholder="Mô tả chi tiết (không bắt buộc)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />
        {error && (
          <div className="text-red-500 text-sm mb-3">{error}</div>
        )}
        <button
          type="submit"
          className="w-full bg-gradient-to-r from-blue-500 to-blue-700 text-white py-2 sm:py-3 rounded-lg font-semibold text-sm sm:text-base shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={loading}
          onMouseEnter={(e) =>
            gsap.to(e.currentTarget, {
              scale: 1.02,
              duration: 0.2,
              ease: "power2.out",
            })
          }
          onMouseLeave={(e) =>
            gsap.to(e.currentTarget, {
              scale: 1,
              duration: 0.2,
              ease: "power2.in",
            })
          }
        >
          {loading ? "Đang gửi..." : "Gửi báo cáo"}
        </button>
      </form>
    </div>
  );
} 