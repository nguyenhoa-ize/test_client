import React, { useEffect, useRef, useCallback, useState } from "react";
import Image from "next/image";
import gsap from "gsap";
import { useImageModalStore } from "@/store/useImageModalStore";

const ImageModal: React.FC = () => {
  const { isOpen, imageUrl, closeModal } = useImageModalStore();
  const backdropRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleClose = useCallback(() => {
    gsap.to([modalRef.current, backdropRef.current], {
      opacity: 0,
      duration: 0.2,
      ease: "power2.in",
      onComplete: () => {
        closeModal();
        setIsLoading(false);
      },
    });
  }, [closeModal]);

  useEffect(() => {
    const tl = gsap.timeline({
      onReverseComplete: () => {
        closeModal();
        setIsLoading(false);
      },
    });

    if (isOpen && imageUrl) {
      setIsLoading(true);
      tl.to(backdropRef.current, {
        backdropFilter: "blur(4px)",
        backgroundColor: "rgba(0, 0, 0, 0.6)",
        duration: 0.2,
        ease: "power2.out",
      }).fromTo(
        modalRef.current,
        { opacity: 0, scale: 0.95 },
        { opacity: 1, scale: 1, duration: 0.2, ease: "power2.out" },
        "-=0.15"
      );
    } else {
      tl.reverse();
    }

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };

    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("keydown", handleEsc);
    };
  }, [isOpen, imageUrl, handleClose]);

  if (!isOpen || !imageUrl) return null;

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
      onClick={handleClose}
      style={{
        backdropFilter: "blur(0px)",
        backgroundColor: "rgba(0, 0, 0, 0)",
      }}
    >
      <button
        className="absolute top-4 right-4 text-white text-3xl hover:text-gray-300 transition-colors z-50 material-symbols-outlined focus:outline-none"
        onClick={handleClose}
        aria-label="Close modal"
      >
        close
      </button>
      <div
        ref={modalRef}
        className="relative w-[90vw] h-[90vh] max-w-4xl max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
        style={{ opacity: 0 }}
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-lg">
            <div className="w-12 h-12 border-4 border-t-transparent border-white rounded-full animate-spin"></div>
          </div>
        )}
        <Image
          src={imageUrl}
          alt="Enlarged Post Image"
          fill
          className="object-contain rounded-lg shadow-2xl"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 90vw"
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false);
            console.error("Failed to load image:", imageUrl);
          }}
          priority
        />
      </div>
    </div>
  );
};

export default React.memo(ImageModal);