import React, { useState, useRef, useLayoutEffect } from "react";
import CommentsSection from "./CommentsSection";
import { useUser } from "../contexts/UserContext";
import gsap from "gsap";
import Image from "next/image";
import { formatDate } from "../lib/dateUtils";
import { PostType } from "@/types/Post";

interface PostDetailPopupProps {
    post: PostType;
    onClose: () => void;
    onCommentAdded?: (inc?: number) => void; // sửa để nhận tham số
}

const PostDetailPopup = ({
    post,
    onClose,
    onCommentAdded,
}: PostDetailPopupProps) => {
    const [selectedImg, setSelectedImg] = useState(0);
    const { user } = useUser();
    const popupRef = useRef<HTMLDivElement>(null);
    const imgRef = useRef<HTMLImageElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const commentsRef = useRef<HTMLDivElement>(null);
    const [showFullContent, setShowFullContent] = useState(false);
    const [showFullSharedContent, setShowFullSharedContent] = useState(false);

    useLayoutEffect(() => {
        if (popupRef.current) {
            gsap.fromTo(
                popupRef.current,
                { scale: 0.9, opacity: 0, y: 50 },
                {
                    scale: 1,
                    opacity: 1,
                    y: 0,
                    duration: 0.6,
                    ease: "power3.out",
                }
            );
        }
        if (imgRef.current) {
            gsap.fromTo(
                imgRef.current,
                { opacity: 0, y: 30 },
                {
                    opacity: 1,
                    y: 0,
                    duration: 0.5,
                    delay: 0.2,
                    ease: "power2.out",
                }
            );
        }
        if (contentRef.current) {
            gsap.fromTo(
                contentRef.current,
                { opacity: 0, y: 20 },
                {
                    opacity: 1,
                    y: 0,
                    duration: 0.5,
                    delay: 0.3,
                    ease: "power2.out",
                }
            );
        }
        if (commentsRef.current) {
            gsap.fromTo(
                commentsRef.current,
                { opacity: 0, y: 20 },
                {
                    opacity: 1,
                    y: 0,
                    duration: 0.5,
                    delay: 0.4,
                    ease: "power2.out",
                }
            );
        }
        return () => {
            if (popupRef.current) {
                gsap.to(popupRef.current, {
                    scale: 0.9,
                    opacity: 0,
                    y: 50,
                    duration: 0.3,
                    ease: "power3.in",
                });
            }
        };
    }, []);

    const handleCollapseContent = () => {
        if (showFullContent) setShowFullContent(false);
    };

    const handleCollapseSharedContent = (e: React.MouseEvent) => {
        if (showFullSharedContent) setShowFullSharedContent(false);
        e.stopPropagation();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
                className="absolute inset-0 bg-black/30 backdrop-blur-sm"
                onClick={onClose}
            />
            <div
                className="relative bg-white rounded-2xl max-w-2xl w-full shadow-2xl z-10 flex flex-col"
                style={{ maxHeight: "90vh" }}
            >
                {/* Tiêu đề cố định trên cùng modal, không scroll */}
                <div
                    style={{
                        position: "relative",
                        zIndex: 30,
                        background: "rgba(255,255,255,0.97)",
                        backdropFilter: "blur(2px)",
                        borderBottom: "1px solid #eee",
                        borderTopLeftRadius: "1rem",
                        borderTopRightRadius: "1rem",
                        height: 64,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: 0,
                    }}
                >
                    <h2 className="text-center font-bold text-xl text-gray-900 tracking-tight w-full">
                        Bài viết của {post.first_name} {post.last_name}
                    </h2>
                    <button
                        className="absolute top-1/2 right-6 -translate-y-1/2 text-2xl text-gray-600 hover:text-gray-900 transition-transform hover:scale-110"
                        onClick={onClose}
                        aria-label="Đóng"
                        style={{ zIndex: 40 }}
                    >
                        ×
                    </button>
                </div>
                {/* Nội dung scrollable */}
                <div
                    ref={popupRef}
                    className="flex-1 overflow-y-auto p-6"
                    style={{ maxHeight: "calc(90vh - 64px)" }}
                >
                    {/* Header */}
                    <div className="flex items-center mb-6">
                        <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden mr-4 shadow-sm">
                            {post.avatar_url ? (
                                <Image
                                    src={post.avatar_url}
                                    alt={
                                        `${post.first_name} ${post.last_name}` ||
                                        "avatar"
                                    }
                                    width={48}
                                    height={48}
                                    className="object-cover w-12 h-12"
                                />
                            ) : (
                                <span className="material-symbols-outlined text-3xl text-gray-400">
                                    person
                                </span>
                            )}
                        </div>
                        <div>
                            <h3 className="text-gray-900 font-semibold text-lg">
                                {post.first_name} {post.last_name}
                            </h3>
                            <p className="text-gray-500 text-sm">
                                {formatDate(post.created_at)}
                            </p>
                        </div>
                    </div>
                    {/* Nội dung & ảnh */}
                    {post.images && post.images.length > 0 && (
                        <div className="mb-6">
                            <img
                                ref={imgRef}
                                src={post.images[selectedImg]}
                                alt="post-large"
                                className="max-h-[450px] w-full rounded-xl mb-3 object-contain cursor-pointer transition-transform hover:scale-105"
                                onClick={() =>
                                    post.images &&
                                    window.open(
                                        post.images[selectedImg],
                                        "_blank"
                                    )
                                }
                            />
                            {post.images.length > 1 && (
                                <div className="flex gap-3 mt-3 overflow-x-auto pb-2">
                                    {post.images.map((img, idx) => (
                                        <img
                                            key={idx}
                                            src={img}
                                            alt={`thumb-${idx}`}
                                            className={`w-20 h-20 object-cover rounded-lg border-2 transition-all ${
                                                selectedImg === idx
                                                    ? "border-blue-500"
                                                    : "border-transparent hover:border-blue-300"
                                            }`}
                                            onClick={() => setSelectedImg(idx)}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                    {/* Shared post */}
                    {post.shared_post && (
                        <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 mb-6 shadow-sm">
                            <div className="flex items-center gap-3 mb-3">
                                {post.shared_post.avatar_url ? (
                                    <Image
                                        src={post.shared_post.avatar_url}
                                        alt={
                                            `${post.shared_post.first_name} ${post.shared_post.last_name}` ||
                                            "avatar"
                                        }
                                        width={32}
                                        height={32}
                                        className="w-8 h-8 rounded-full object-cover"
                                    />
                                ) : (
                                    <span className="material-symbols-outlined text-2xl text-gray-400">
                                        person
                                    </span>
                                )}
                                <div>
                                    <span className="font-semibold text-gray-800">
                                        {post.shared_post.first_name}{" "}
                                        {post.shared_post.last_name}
                                    </span>
                                    <span className="text-gray-500 text-xs ml-2">
                                        {formatDate(
                                            post.shared_post.created_at ||
                                                post.shared_post.date ||
                                                ""
                                        )}
                                    </span>
                                </div>
                            </div>
                            <div
                                className="text-gray-900 whitespace-pre-wrap break-words"
                                onClick={
                                    showFullSharedContent
                                        ? handleCollapseSharedContent
                                        : undefined
                                }
                                style={
                                    showFullSharedContent
                                        ? { cursor: "pointer" }
                                        : {}
                                }
                            >
                                {post.shared_post.content &&
                                post.shared_post.content.length > 300 &&
                                !showFullSharedContent ? (
                                    <>
                                        {post.shared_post.content.slice(0, 300)}
                                        <button
                                            className="ml-1 text-blue-600 hover:text-blue-800 font-medium transition-colors bg-gradient-to-r from-blue-50 to-transparent rounded px-1"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setShowFullSharedContent(true);
                                            }}
                                        >
                                            ... Xem thêm
                                        </button>
                                    </>
                                ) : (
                                    post.shared_post.content
                                )}
                            </div>
                            {post.shared_post.images &&
                                post.shared_post.images.length > 0 && (
                                    <div
                                        className={`grid ${
                                            post.shared_post.images.length > 1
                                                ? "grid-cols-2"
                                                : "grid-cols-1"
                                        } gap-3 mt-3`}
                                    >
                                        {post.shared_post.images.map(
                                            (img, idx) => (
                                                <Image
                                                    key={idx}
                                                    src={img}
                                                    alt={`post-img-${idx}`}
                                                    width={500}
                                                    height={300}
                                                    className="object-cover w-full h-48 rounded-lg transition-transform hover:scale-105"
                                                />
                                            )
                                        )}
                                    </div>
                                )}
                        </div>
                    )}
                    <div className="mb-6" ref={contentRef}>
                        <p
                            className="text-gray-800 text-base font-medium break-words"
                            onClick={
                                showFullContent
                                    ? handleCollapseContent
                                    : undefined
                            }
                            style={showFullContent ? { cursor: "pointer" } : {}}
                        >
                            {post.content &&
                            post.content.length > 300 &&
                            !showFullContent ? (
                                <>
                                    {post.content.slice(0, 300)}
                                    <button
                                        className="ml-1 text-blue-600 hover:text-blue-800 font-medium transition-colors bg-gradient-to-r from-blue-50 to-transparent rounded px-1"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setShowFullContent(true);
                                        }}
                                    >
                                        ... Xem thêm
                                    </button>
                                </>
                            ) : (
                                post.content
                            )}
                        </p>
                    </div>
                    {/* Khu vực bình luận */}
                    <div className="border-t pt-6" ref={commentsRef}>
                        <CommentsSection
                            postId={post.id}
                            currentUser={user}
                            onCommentAdded={onCommentAdded}
                        />
                    </div>
                </div>
            </div>
            <style jsx global>{`
                .popup-content {
                    animation: popup-zoom-in 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                    transform-origin: center;
                }
                @keyframes popup-zoom-in {
                    0% {
                        opacity: 0;
                        transform: scale(0.9) translateY(50px);
                    }
                    100% {
                        opacity: 1;
                        transform: scale(1) translateY(0);
                    }
                }
                .popup-overlay {
                    animation: fadein-overlay 0.3s ease-out;
                }
                @keyframes fadein-overlay {
                    from {
                        opacity: 0;
                    }
                    to {
                        opacity: 0.3;
                    }
                }
            `}</style>
        </div>
    );
};

export default PostDetailPopup;
