import React, { useState, useEffect } from "react";
import { useUser } from "../contexts/UserContext";
import ReportPostModal from "./ReportPostModal";
import axios from "axios";
import LikeListModal from "./LikeListModal";
import {
    fetchForbiddenWords,
    filterForbiddenWords,
} from "../lib/forbiddenWords";
import { formatDate } from "../lib/dateUtils";
import Image from "next/image";
import Link from "next/link";
import SharePostModal from "./SharePostModal";
import SkeletonPost from "./SkeletonPost";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useImageModalStore } from "@/store/useImageModalStore";
import { PostType, SharedPostType } from "@/types/Post";

// Định nghĩa interface cho props của Post
interface PostProps {
    post: PostType;
    onOpenDetail?: (post: PostType) => void;
    onPostCreated?: (newPost: PostType) => void;
    theme?: string;
    className?: string;
    hideActions?: boolean;
}

// Thêm hàm tối ưu URL Cloudinary với các parameters phù hợp
const optimizeCloudinaryUrl = (url: string) => {
    if (!url.includes("cloudinary.com")) return url;

    // Thêm các parameters tối ưu cho Cloudinary
    return url.replace(
        "/upload/",
        "/upload/w_auto,c_limit,q_auto,f_auto,dpr_auto/"
    );
};

// Thêm một low-quality image placeholder cho loading state
const shimmer = (w: number, h: number) => `
  <svg width="${w}" height="${h}" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
    <defs>
      <linearGradient id="g">
        <stop stop-color="#f6f7f8" offset="0%" />
        <stop stop-color="#edeef1" offset="20%" />
        <stop stop-color="#f6f7f8" offset="40%" />
        <stop stop-color="#f6f7f8" offset="100%" />
      </linearGradient>
    </defs>
    <rect width="${w}" height="${h}" fill="#f6f7f8" />
    <rect id="r" width="${w}" height="${h}" fill="url(#g)" />
    <animate xlink:href="#r" attributeName="x" from="-${w}" to="${w}" dur="1s" repeatCount="indefinite" />
  </svg>
`;

const toBase64 = (str: string) =>
    typeof window === "undefined"
        ? Buffer.from(str).toString("base64")
        : window.btoa(str);

const Post = (props: PostProps) => {
    const { post, onOpenDetail, onPostCreated, theme, hideActions, className } =
        props;

    const {
        id,
        user_id: userId,
        first_name,
        last_name,
        created_at: date,
        content,
        like_count: likes,
        comment_count: comments,
        shares,
        images,
        avatar_url: avatar,
        feeling,
        location,
        is_approved,
        is_liked,
        shared_post_id,
        shared_post,
    } = post;

    const { user: currentUser } = useUser();
    const { openModal } = useImageModalStore();

    const [showReport, setShowReport] = useState(false);
    const [liked, setLiked] = useState(is_liked || false);
    const [likeCount, setLikeCount] = useState(likes);
    const [showLikeList, setShowLikeList] = useState(false);
    const [commentCount, setCommentCount] = useState(comments);
    const [shareCount, setShareCount] = useState(shares);
    const [filteredContent, setFilteredContent] = useState(content);
    const [showShareModal, setShowShareModal] = useState(false);
    const [sharedPost, setSharedPost] = useState<SharedPostType | null>(
        shared_post || null
    );
    const [loadingShared, setLoadingShared] = useState(false);
    const [showFullContent, setShowFullContent] = useState(false);
    const [showFullSharedContent, setShowFullSharedContent] = useState(false);

    const parseImages = (
        imgData: string | string[] | undefined | null
    ): string[] => {
        if (!imgData) return [];
        if (Array.isArray(imgData)) return imgData;
        if (typeof imgData === "string") {
            try {
                const parsed = JSON.parse(imgData);
                return Array.isArray(parsed) ? parsed : [];
            } catch {
                console.warn(
                    "Could not parse images, it might be a single URL or malformed JSON:",
                    imgData
                );
                // Trả về một mảng rỗng nếu không phải JSON hợp lệ
                return [];
            }
        }
        // Trả về một mảng rỗng cho các kiểu dữ liệu không mong muốn khác
        return [];
    };
    
    useEffect(() => {
        setLiked(is_liked || false);
        setLikeCount(likes);
        setCommentCount(comments);
    }, [is_liked, likes, comments]);

    // Kiểm tra user đã like chưa và cập nhật danh sách like, đồng thời lấy lại số lượng comment mới nhất
    useEffect(() => {
        if (currentUser?.id) {
            axios.get('/api/likes/is-liked', {
                params: { post_id: id, user_id: currentUser.id },
                baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000',
            }).then(res => {
                setLiked(res.data.liked);
                if (res.data.likeCount !== undefined) {
                    setLikeCount(res.data.likeCount);
                }
                // Nếu muốn dùng likeList, cần khai báo thêm state
                // if (res.data.likeList) setLikeList(res.data.likeList);
            });
        }
        // Lấy lại số lượng comment mới nhất từ server khi có comment mới (onCommentAdded)
        // Nếu có prop onCommentAdded thì truyền callback để CommentsSection gọi khi thêm comment thành công
    }, [currentUser?.id, id]);

    // Hàm callback để cập nhật lại số lượng comment khi có comment mới (tăng ngay trên FE)
    const handleCommentAdded = (inc = 1) => {
        setCommentCount((prev) => Number(prev) + inc);
    };

    useEffect(() => {
        let ignore = false;
        async function filterContent() {
            const words = await fetchForbiddenWords();
            if (!ignore) {
                setFilteredContent(filterForbiddenWords(content, words));
            }
        }
        filterContent();

        if (shared_post_id && !sharedPost) {
            setLoadingShared(true);
            axios
                .get(
                    `${process.env.NEXT_PUBLIC_API_URL}/api/posts/${shared_post_id}`
                )
                .then((res) => {
                    if (!ignore) setSharedPost(res.data);
                })
                .catch(() => {
                    if (!ignore) setSharedPost(null);
                })
                .finally(() => {
                    if (!ignore) setLoadingShared(false);
                });
        }

        return () => {
            ignore = true;
        };
    }, [shared_post_id, content, sharedPost]);

    const handleLike = async () => {
        if (!currentUser?.id) {
            toast.info("Bạn cần đăng nhập để thực hiện chức năng này!");
            return;
        }
        setLiked(!liked);
        setLikeCount((prev) => (liked ? Number(prev) - 1 : Number(prev) + 1));
        try {
            await axios.post(
                `/api/likes/${liked ? "unlike" : "like"}`,
                { post_id: id, user_id: currentUser.id },
                {
                    baseURL:
                        process.env.NEXT_PUBLIC_API_URL ||
                        "http://localhost:5000",
                }
            );
        } catch (error) {
            console.error("Error handling like:", error);
            // Revert optimistic update on error
            setLiked(liked);
            setLikeCount(likes);
        }
    };

    const handleActionClick = (e: React.MouseEvent, action: () => void) => {
        e.stopPropagation();
        if (!currentUser) {
            toast.info("Bạn cần đăng nhập để thực hiện chức năng này!");
            return;
        }
        action();
    };

    const handleCommentClick = () => {
        if (onOpenDetail) onOpenDetail(post);
    };

    const handleShareClick = () => setShowShareModal(true);

    const handleReportClick = () => setShowReport(true);

    const handleImageClick = (e: React.MouseEvent, imageUrl: string) => {
        e.stopPropagation();
        if (
            imageUrl &&
            typeof imageUrl === "string" &&
            imageUrl.startsWith("http")
        ) {
            openModal(imageUrl);
        } else {
            console.warn("Invalid image URL:", imageUrl);
            toast.error("Không thể mở hình ảnh do lỗi định dạng!");
        }
    };

    const name = `${first_name || ""} ${last_name || ""}`.trim();

    const renderContent = (
        text: string,
        isFull: boolean,
        setFull: (show: boolean) => void
    ) => {
        if (text.length > 300 && !isFull) {
            return (
                <>
                    {text.slice(0, 300)}
                    <button
                        className="ml-1 text-indigo-600 hover:underline font-medium focus:outline-none"
                        onClick={(e) => {
                            e.stopPropagation();
                            setFull(true);
                        }}
                    >
                        ... Xem thêm
                    </button>
                </>
            );
        }
        return text;
    };

    const PostHeader = ({
        postUserId,
        avatar,
        postName,
        postDate,
        isShareHeader = false,
        sharedByName,
        feeling,
        location,
    }: {
        postUserId: string;
        avatar?: string;
        postName: string;
        postDate: string;
        isShareHeader?: boolean;
        sharedByName?: string;
        feeling?: { icon: string; label: string } | null;
        location?: string | null;
    }) => (
        <div className="flex items-center gap-3 mb-4">
            <Link
                href={
                    postUserId === currentUser?.id
                        ? "/profile"
                        : `/profile/${postUserId}`
                }
                className="w-12 h-12 rounded-full bg-slate-100 flex-shrink-0 flex items-center justify-center overflow-hidden group hover:ring-2 hover:ring-indigo-600 hover:ring-offset-2 transition-all"
                onClick={(e) => e.stopPropagation()}
            >
                {avatar ? (
                    <Image
                        src={optimizeCloudinaryUrl(avatar)}
                        alt={postName}
                        width={48}
                        height={48}
                        className="object-cover w-full h-full transition-transform group-hover:scale-110"
                        placeholder="blur"
                        blurDataURL={`data:image/svg+xml;base64,${toBase64(
                            shimmer(48, 48)
                        )}`}
                    />
                ) : (
                    <span className="material-symbols-outlined text-slate-400">
                        person
                    </span>
                )}
            </Link>
            <div className="flex-grow">
                <p className="text-slate-900">
                    <Link
                        href={
                            postUserId === currentUser?.id
                                ? "/profile"
                                : `/profile/${postUserId}`
                        }
                        className="font-medium hover:text-indigo-600 transition-colors"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {postName}
                    </Link>
                    {feeling && !isShareHeader && (
                        <span className="font-normal text-slate-600">
                            {" "}
                            — đang cảm thấy {feeling.icon} {feeling.label}
                        </span>
                    )}
                    {isShareHeader && (
                        <span className="text-gray-500 font-normal">
                            {" "}
                            đã chia sẻ bài viết của{" "}
                            <span className="font-semibold">
                                {sharedByName}
                            </span>
                        </span>
                    )}
                </p>
                <div className="flex items-center text-sm text-slate-500 gap-1.5 flex-wrap">
                    <span>{formatDate(postDate)}</span>
                    {location && (
                        <>
                            <span>·</span>
                            <span className="flex items-center gap-0.5">
                                <span className="material-symbols-outlined text-base">
                                    location_on
                                </span>
                                {location}
                            </span>
                        </>
                    )}
                </div>
            </div>
        </div>
    );

    const PostImages = ({
        images,
        onImgClick,
    }: {
        images?: string[];
        onImgClick: (e: React.MouseEvent, url: string) => void;
    }) => {
        const validImages =
            images?.filter(
                (img) =>
                    img && typeof img === "string" && img.startsWith("http")
            ) || [];
        if (validImages.length === 0) return null;

        return (
            <div
                className={`grid ${
                    validImages.length > 1 ? "grid-cols-2" : "grid-cols-1"
                } gap-2`}
            >
                {validImages.map((img, index) => (
                    <div
                        key={index}
                        className="aspect-video bg-slate-100 rounded-xl flex items-center justify-center group cursor-pointer hover:shadow-lg transition-all duration-200 overflow-hidden"
                        onClick={(e) => onImgClick(e, img)}
                    >
                        <Image
                            src={optimizeCloudinaryUrl(img)}
                            alt={`Post image ${index + 1}`}
                            width={500}
                            height={300}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                            placeholder="blur"
                            blurDataURL={`data:image/svg+xml;base64,${toBase64(
                                shimmer(500, 300)
                            )}`}
                            sizes="(max-width: 768px) 100vw, 500px"
                        />
                    </div>
                ))}
            </div>
        );
    };

    const PostActions = () => (
        <div className="flex items-center justify-between text-sm border-t border-slate-100 pt-4 mt-4">
            <button
                onClick={(e) => handleActionClick(e, handleLike)}
                className="flex-1 flex items-center justify-center gap-1 py-2 text-slate-600 hover:text-rose-500 transition-all duration-200 rounded-lg hover:bg-slate-50"
            >
                <span className="w-7 h-7 flex items-center justify-center mr-1">
                    <Image
                        src={liked ? "/heart_fill.svg" : "/heart.svg"}
                        alt={liked ? "liked" : "like"}
                        width={24}
                        height={24}
                    />
                </span>
                <span
                    className="cursor-pointer hover:underline"
                    onClick={(e) =>
                        handleActionClick(e, () => setShowLikeList(true))
                    }
                >
                    {likeCount}
                </span>
            </button>
            <button
                onClick={(e) => handleActionClick(e, handleCommentClick)}
                className="flex-1 flex items-center justify-center gap-1 py-2 text-slate-600 hover:text-indigo-500 transition-all duration-200 rounded-lg hover:bg-slate-50"
            >
                <span className="material-symbols-outlined">chat_bubble</span>
                <span>{commentCount}</span>
            </button>
            <button
                onClick={(e) => handleActionClick(e, handleShareClick)}
                className="flex-1 flex items-center justify-center gap-1 py-2 text-slate-600 hover:text-emerald-500 transition-all duration-200 rounded-lg hover:bg-slate-50"
            >
                <span className="material-symbols-outlined">share</span>
                <span>{shareCount}</span>
            </button>
        </div>
    );

    return (
        <div
            className={`bg-white rounded-2xl p-6 shadow-sm w-full max-w-3xl transform transition-all duration-200 hover:shadow-md relative ${
                className || ""
            }`.trim()}
            onClick={() => onOpenDetail && onOpenDetail(post)}
        >
            {is_approved === false && (
                <div className="absolute top-8 left-1/2 transform -translate-x-1/2 bg-yellow-300 text-yellow-800 px-4 py-1 rounded-full text-xs font-semibold animate-pulse shadow-md">
                    Đang chờ duyệt
                </div>
            )}
            <button
                className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors z-10"
                onClick={(e) => handleActionClick(e, handleReportClick)}
            >
                <span className="material-symbols-outlined text-gray-500">
                    more_horiz
                </span>
            </button>

            {loadingShared && <SkeletonPost />}

            {sharedPost ? (
                <div>
                    <PostHeader
                        postUserId={userId}
                        avatar={avatar}
                        postName={name}
                        postDate={date}
                        isShareHeader
                        sharedByName={`${sharedPost.first_name || ""} ${
                            sharedPost.last_name || ""
                        }`.trim()}
                    />
                    {content && (
                        <p className="mb-2 text-slate-900 whitespace-pre-wrap break-words">
                            {renderContent(
                                content,
                                showFullContent,
                                setShowFullContent
                            )}
                        </p>
                    )}
                    <div className="bg-gray-50 border rounded-lg p-4 mt-2 hover:bg-gray-100 transition">
                        <PostHeader
                            postUserId={sharedPost.user_id}
                            avatar={sharedPost.avatar_url}
                            postName={`${sharedPost.first_name || ""} ${
                                sharedPost.last_name || ""
                            }`.trim()}
                            postDate={
                                sharedPost.created_at || sharedPost.date || ""
                            }
                        />
                        {sharedPost.content && (
                            <p className="mb-2 text-slate-900 whitespace-pre-wrap break-words">
                                {renderContent(
                                    sharedPost.content,
                                    showFullSharedContent,
                                    setShowFullSharedContent
                                )}
                            </p>
                        )}
                        <PostImages
                            images={parseImages(sharedPost.images)}
                            onImgClick={handleImageClick}
                        />
                    </div>
                </div>
            ) : (
                <>
                    <PostHeader
                        postUserId={userId}
                        avatar={avatar}
                        postName={name}
                        postDate={date}
                        feeling={feeling}
                        location={location}
                    />
                    <div className="space-y-4">
                        <p className="text-slate-900 whitespace-pre-wrap break-words">
                            {renderContent(
                                filteredContent,
                                showFullContent,
                                setShowFullContent
                            )}
                        </p>
                        <PostImages
                            images={parseImages(images)}
                            onImgClick={handleImageClick}
                        />
                    </div>
                </>
            )}

            {!hideActions && <PostActions />}

            {showReport && currentUser?.id && (
                <ReportPostModal
                    postId={id}
                    reporterId={currentUser.id}
                    onClose={() => setShowReport(false)}
                />
            )}
            {showLikeList && (
                <LikeListModal
                    postId={id}
                    onClose={() => setShowLikeList(false)}
                />
            )}
            {showShareModal && (
                <SharePostModal
                    isOpen={showShareModal}
                    onClose={() => setShowShareModal(false)}
                    post={{ id, name, content, images }}
                    onShared={(newPost) => {
                        setShowShareModal(false);
                        setShareCount((s) => s + 1);
                        if (onPostCreated) onPostCreated(newPost);
                    }}
                    typePost={theme === "reflective" ? "negative" : "positive"}
                />
            )}
            <ToastContainer
                position="bottom-right"
                autoClose={3000}
                hideProgressBar
                newestOnTop
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
            />
        </div>
    );
};

export default Post;
