"use client";

import React, {
    useContext,
    useEffect,
    useRef,
    useState,
    useCallback,
    useMemo,
    use as useUnwrap,
} from "react";
import MainLayout from "@/components/MainLayout";
import Image from "next/image";
import { UserContext } from "@/contexts/UserContext";
import gsap from "gsap";
import Post from "@/components/Post";
import axios from "axios";
import FollowListModal from "@/components/FollowListModal";
import { useClickAway } from "react-use";
import { socket } from "@/socket";
import ImageModal from "@/components/ImageModal";
import { useImageModalStore } from "@/store/useImageModalStore";
import { useRouter } from "next/navigation";
import { PostType } from "@/types/Post";

interface Tab {
    id: string;
    label: string;
    icon: string;
}

interface ProfileUser {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    avatar_url: string | null;
    created_at?: string;
    bio?: string;
    cover_url?: string | null;
}

const tabs: Tab[] = [
    { id: "posts", label: "Bài viết", icon: "article" },
    { id: "media", label: "Ảnh/Video", icon: "photo_library" },
    { id: "about", label: "Giới thiệu", icon: "person" },
];

const POSTS_PER_PAGE = 5;

// Custom hook để xử lý API calls
const useAPI = () => {
    const { accessToken, logout } = useContext(UserContext);
    const baseURL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

    const axiosInstance = useMemo(() => {
        if (!baseURL) {
            console.error("NEXT_PUBLIC_API_URL is not defined in .env");
            return axios.create();
        }
        const instance = axios.create({ baseURL });
        instance.interceptors.response.use(
            (response) => response,
            async (error) => {
                if (
                    axios.isAxiosError(error) &&
                    error.response?.status === 401
                ) {
                    console.warn("401 Unauthorized, logging out");
                    await logout("Phiên đăng nhập đã hết hạn");
                }
                return Promise.reject(error);
            }
        );
        return instance;
    }, [baseURL, logout]);

    const apiCall = useCallback(
        async (endpoint: string, options: Record<string, unknown> = {}) => {
            if (!baseURL) {
                throw new Error("Missing API URL configuration");
            }
            try {
                const headers =
                    typeof options.headers === "object" &&
                    options.headers !== null
                        ? options.headers
                        : {};
                const response = await axiosInstance({
                    ...options,
                    url: endpoint,
                    headers: {
                        ...headers,
                        Authorization: `Bearer ${accessToken}`,
                    },
                });
                return response.data;
            } catch (error: unknown) {
                if (axios.isAxiosError(error)) {
                    console.error(`API Error (${endpoint}):`, error);
                    throw error;
                }
                throw error;
            }
        },
        [axiosInstance, accessToken, baseURL]
    );

    return { apiCall };
};

export default function UserProfilePage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const unwrappedParams = useUnwrap(params);
    const { id: userId } = unwrappedParams;

    const { openModal } = useImageModalStore();
    const { apiCall } = useAPI();
    const { user: currentUser, accessToken, logout } = useContext(UserContext);
    const router = useRouter();

    const [activeTab, setActiveTab] = useState<string>("posts");
    const [userPosts, setUserPosts] = useState<PostType[]>([]);
    const [profileLoading, setProfileLoading] = useState(true);
    const [postsLoading, setPostsLoading] = useState(true);
    const [followLoading, setFollowLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [userMedia, setUserMedia] = useState<string[]>([]);
    const [profileUser, setProfileUser] = useState<ProfileUser | null>(null);
    const [followersCount, setFollowersCount] = useState(0);
    const [followingCount, setFollowingCount] = useState(0);
    const [showFollowList, setShowFollowList] = useState<
        "followers" | "following" | null
    >(null);
    const [isFollowing, setIsFollowing] = useState(false);
    const [totalPosts, setTotalPosts] = useState<number | null>(null);
    const [openFollowMenu, setOpenFollowMenu] = useState(false);
    const [confirmUnfollow, setConfirmUnfollow] = useState(false);
    const [retryTrigger, setRetryTrigger] = useState(0);

    const profileRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const followMenuRef = useRef<HTMLDivElement>(null);
    const followBtnRef = useRef<HTMLButtonElement>(null);
    const followMenuBoxRef = useRef<HTMLDivElement>(null);
    const unfollowModalBoxRef = useRef<HTMLDivElement>(null);
    useClickAway(followMenuRef, () => setOpenFollowMenu(false));

    useEffect(() => {
        if (currentUser && currentUser.id === userId) {
            router.replace("/profile");
        }
    }, [currentUser, userId, router]);

    // Reset state when profile user changes
    useEffect(() => {
        setProfileUser(null);
        setUserPosts([]);
        setActiveTab("posts");
        setPage(0);
        setHasMore(true);
        setError(null);
        setProfileLoading(true);
        setPostsLoading(true);
        window.scrollTo({ top: 0, behavior: "instant" });
    }, [userId]);

    // Fetch user profile data
    useEffect(() => {
        if (!userId || !accessToken) {
            if (!accessToken) setError("Vui lòng đăng nhập để xem trang này.");
            return;
        }

        const fetchUser = async () => {
            setProfileLoading(true);
            try {
                const [userResponse, followStats] = await Promise.all([
                    apiCall(`/api/users/${userId}`),
                    apiCall(`/api/users/${userId}/follow-stats`),
                ]);
                setProfileUser(userResponse);
                setFollowersCount(followStats.followers_count || 0);
                setFollowingCount(followStats.following_count || 0);
                setIsFollowing(!!followStats.is_following);

                try {
                    const postStats = await apiCall(
                        `/api/users/${userId}/post-stats`
                    );
                    setTotalPosts(postStats.total_posts ?? null);
                } catch {
                    setTotalPosts(null);
                }
                setError(null);
            } catch (error: unknown) {
                if (axios.isAxiosError(error)) {
                    const status = error.response?.status;
                    const message =
                        error.response?.data?.error || "Đã có lỗi xảy ra";
                    if (status === 401) {
                        setError("Phiên đăng nhập đã hết hạn");
                        logout("Phiên đăng nhập đã hết hạn");
                    } else if (status === 404) {
                        setError("Không tìm thấy người dùng");
                    } else if (status === 403) {
                        setError("Bạn không có quyền truy cập trang này");
                    } else {
                        setError(message);
                    }
                } else {
                    setError("Đã có lỗi không xác định xảy ra");
                }
                setProfileUser(null);
            } finally {
                setProfileLoading(false);
            }
        };

        fetchUser();
    }, [userId, accessToken, apiCall, logout, retryTrigger]);

    const fetchUserMedia = useCallback(async () => {
        if (!userId) return;
        try {
            const posts: PostType[] = await apiCall(
                `/api/posts/user/${userId}`,
                {
                    params: { filter: "media", limit: 1000, offset: 0 },
                    headers: { "Cache-Control": "no-cache" },
                }
            );
            const mediaUrls = Array.isArray(posts)
                ? posts.reduce(
                      (acc, post) => acc.concat(post.images || []),
                      [] as string[]
                  )
                : [];
            setUserMedia(mediaUrls);
        } catch {
            console.error("Could not fetch user media.");
        }
    }, [apiCall, userId]);

    useEffect(() => {
        if (userId && accessToken) {
            fetchUserMedia();
        }
    }, [userId, accessToken, fetchUserMedia]);

    const fetchUserPosts = useCallback(
        async (pageIndex: number) => {
            if (!userId) return;

            const offset = pageIndex * POSTS_PER_PAGE;
            if (pageIndex > 0) {
                setLoadingMore(true);
            } else {
                setPostsLoading(true);
            }

            try {
                const params: Record<string, unknown> = {
                    limit: POSTS_PER_PAGE,
                    offset,
                    viewer_id: currentUser?.id,
                };

                if (activeTab === "media") {
                    params.filter = "media";
                }

                const posts = await apiCall(`/api/posts/user/${userId}`, {
                    params,
                    headers: { "Cache-Control": "no-cache" },
                });

                const formattedPosts = Array.isArray(posts)
                    ? posts.map((post) => ({
                          ...post,
                          images: post.images
                              ? typeof post.images === "string"
                                  ? JSON.parse(post.images)
                                  : post.images
                              : [],
                          feeling: post.feeling
                              ? typeof post.feeling === "string"
                                  ? JSON.parse(post.feeling)
                                  : post.feeling
                              : undefined,
                      }))
                    : [];

                if (pageIndex === 0) {
                    setUserPosts(formattedPosts);
                } else {
                    setUserPosts((prev) => [...prev, ...formattedPosts]);
                }

                setHasMore(formattedPosts.length === POSTS_PER_PAGE);
                setError(null);

                if (
                    activeTab === "posts" &&
                    pageIndex === 0 &&
                    totalPosts === null
                ) {
                    try {
                        const stats = await apiCall(
                            `/api/users/${userId}/post-stats`
                        );
                        setTotalPosts(
                            stats.total_posts ?? formattedPosts.length
                        );
                    } catch (error) {
                        console.warn("Could not fetch total posts:", error);
                        setTotalPosts(formattedPosts.length);
                    }
                }
            } catch (error: unknown) {
                if (axios.isAxiosError(error)) {
                    setError(
                        error.response?.data?.error ||
                            "Đã có lỗi xảy ra khi tải bài viết"
                    );
                } else {
                    setError("Đã có lỗi không xác định xảy ra");
                }
            } finally {
                setPostsLoading(false);
                setLoadingMore(false);
            }
        },
        [apiCall, userId, activeTab, currentUser?.id, totalPosts]
    );

    // Initial posts fetch & on tab change
    useEffect(() => {
        if (userId && accessToken) {
            setPage(0);
            setUserPosts([]);
            setHasMore(true);
            fetchUserPosts(0);
        }
    }, [userId, activeTab, accessToken, fetchUserPosts, retryTrigger]);

    // Infinite scroll page change
    useEffect(() => {
        if (page > 0) {
            fetchUserPosts(page);
        }
    }, [page, fetchUserPosts]);

    // Socket listeners for real-time updates
    useEffect(() => {
        if (!userId) return;

        const handlePostApproved = (data: { post: PostType }) => {
            if (data.post.user_id === userId) {
                setUserPosts((prevPosts) => [data.post, ...prevPosts]);
                setTotalPosts((prev) => (prev !== null ? prev + 1 : 1));
                fetchUserMedia();
            }
        };

        const handlePostDeleted = (data: { postId: string }) => {
            setUserPosts((prevPosts) => {
                const postExists = prevPosts.some((p) => p.id === data.postId);
                if (postExists) {
                    setTotalPosts((prev) =>
                        prev !== null && prev > 0 ? prev - 1 : 0
                    );
                    fetchUserMedia();
                }
                return prevPosts.filter((p) => p.id !== data.postId);
            });
        };

        socket.on("postApproved", handlePostApproved);
        socket.on("postDeleted", handlePostDeleted);

        return () => {
            socket.off("postApproved", handlePostApproved);
            socket.off("postDeleted", handlePostDeleted);
        };
    }, [userId, fetchUserMedia]);

    // Infinite Scroll logic using IntersectionObserver
    const observerRef = useRef<IntersectionObserver | null>(null);
    const loadMoreRef = useCallback(
        (node: HTMLDivElement) => {
            if (postsLoading || loadingMore) return;
            if (observerRef.current) observerRef.current.disconnect();
            observerRef.current = new IntersectionObserver((entries) => {
                if (entries[0].isIntersecting && hasMore) {
                    setPage((prev) => prev + 1);
                }
            });
            if (node) observerRef.current.observe(node);
        },
        [hasMore, postsLoading, loadingMore]
    );

    // GSAP animations
    useEffect(() => {
        if (!profileLoading && profileUser) {
            const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
            if (profileRef.current) {
                tl.from(profileRef.current, {
                    y: 30,
                    opacity: 0,
                    duration: 0.8,
                });
            }
            const statElements = document.querySelectorAll(".stat-item");
            if (statElements.length) {
                tl.from(
                    statElements,
                    { y: 20, opacity: 0, stagger: 0.1, duration: 0.5 },
                    "-=0.4"
                );
            }
        }
    }, [profileLoading, profileUser]);

    useEffect(() => {
        // Chỉ animate khi dữ liệu tab đã sẵn sàng
        const shouldAnimate =
            (activeTab === "posts" && !postsLoading && userPosts.length > 0) ||
            (activeTab === "media" &&
                !profileLoading &&
                userMedia.length > 0) ||
            (activeTab === "about" && !profileLoading && profileUser != null);
        if (shouldAnimate && contentRef.current?.children) {
            gsap.fromTo(
                contentRef.current.children,
                { y: 15, opacity: 0 },
                {
                    y: 0,
                    opacity: 1,
                    stagger: 0.05,
                    duration: 0.4,
                    ease: "power2.out",
                }
            );
        }
    }, [
        activeTab,
        userPosts,
        userMedia,
        profileUser,
        postsLoading,
        profileLoading,
    ]);

    const playFollowButtonAnimation = () => {
        if (followBtnRef.current) {
            gsap.fromTo(
                followBtnRef.current,
                { scale: 0.85, opacity: 0.5 },
                { scale: 1, opacity: 1, duration: 0.4, ease: "back.out(1.7)" }
            );
        }
    };

    useEffect(() => {
        if (openFollowMenu && followMenuBoxRef.current) {
            gsap.fromTo(
                followMenuBoxRef.current,
                { y: -10, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.3, ease: "power2.out" }
            );
        }
    }, [openFollowMenu]);

    const fetchFollowStats = useCallback(async () => {
        if (!userId) return;
        try {
            const followStats = await apiCall(
                `/api/users/${userId}/follow-stats`
            );
            setFollowersCount(followStats.followers_count || 0);
            setFollowingCount(followStats.following_count || 0);
            setIsFollowing(!!followStats.is_following);
        } catch {
            console.error("Error fetching follow stats");
        }
    }, [apiCall, userId]);

    const handleFollow = async () => {
        if (!profileUser) return;
        setFollowLoading(true);
        try {
            await apiCall(`/api/users/${profileUser.id}/follow`, {
                method: "POST",
            });
            await fetchFollowStats();
            playFollowButtonAnimation();
        } catch (error) {
            console.error("Error following:", error);
        } finally {
            setFollowLoading(false);
        }
    };

    const handleUnfollow = async () => {
        if (!profileUser) return;
        setConfirmUnfollow(false);
        setFollowLoading(true);
        try {
            await apiCall(`/api/users/${profileUser.id}/follow`, {
                method: "DELETE",
            });
            await fetchFollowStats();
            playFollowButtonAnimation();
        } catch (error) {
            console.error("Error unfollowing:", error);
        } finally {
            setFollowLoading(false);
        }
    };

    useEffect(() => {
        if (confirmUnfollow && unfollowModalBoxRef.current) {
            gsap.fromTo(
                unfollowModalBoxRef.current,
                { scale: 0.85, opacity: 0 },
                { scale: 1, opacity: 1, duration: 0.35, ease: "back.out(1.7)" }
            );
        }
    }, [confirmUnfollow]);

    const handleRetry = () => {
        setError(null);
        setRetryTrigger((v) => v + 1);
    };

    if (currentUser?.id === userId) {
        return null;
    }

    if (profileLoading && !profileUser) {
        return (
            <MainLayout>
                <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                    <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                </div>
            </MainLayout>
        );
    }

    if (error && !profileUser) {
        return (
            <MainLayout>
                <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                    <div className="text-center">
                        <p className="text-red-500 mb-4">{error}</p>
                        <button
                            onClick={handleRetry}
                            className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100"
                        >
                            Thử lại
                        </button>
                    </div>
                </div>
            </MainLayout>
        );
    }

    if (!profileUser) {
        return (
            <MainLayout>
                <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                    <div className="text-center">
                        <p className="text-slate-500">
                            Không tìm thấy người dùng.
                        </p>
                    </div>
                </div>
            </MainLayout>
        );
    }

    return (
        <MainLayout>
            <div className="min-h-screen bg-slate-50">
                <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div
                        ref={profileRef}
                        className="bg-white rounded-2xl shadow-sm overflow-hidden"
                    >
                        <div className="relative h-64">
                            {profileUser?.cover_url ? (
                                <Image
                                    src={profileUser.cover_url}
                                    alt="Cover"
                                    fill
                                    className="object-cover w-full h-full"
                                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                    priority
                                />
                            ) : (
                                <div className="w-full h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500">
                                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.2)_0%,rgba(0,0,0,0)_70%)]" />
                                </div>
                            )}
                        </div>
                        <div className="px-6 pb-6">
                            <div className="flex justify-between items-end -mt-16">
                                <div className="relative">
                                    {profileUser?.avatar_url ? (
                                        <div className="w-32 h-32 rounded-full border-4 border-white shadow-lg overflow-hidden flex items-center justify-center bg-white">
                                            <Image
                                                src={profileUser.avatar_url}
                                                alt="Profile"
                                                fill
                                                className="object-cover"
                                                sizes="128px"
                                            />
                                        </div>
                                    ) : (
                                        <div className="w-32 h-32 rounded-full shadow-lg overflow-hidden flex items-center justify-center bg-slate-100">
                                            <span className="material-symbols-outlined text-[64px] text-slate-300">
                                                person
                                            </span>
                                        </div>
                                    )}
                                </div>
                                {currentUser?.id !== userId && (
                                    <div>
                                        {isFollowing ? (
                                            <div
                                                className="relative"
                                                ref={followMenuRef}
                                            >
                                                <button
                                                    ref={followBtnRef}
                                                    className="px-4 py-2 rounded-full font-medium flex items-center gap-2 text-sm bg-gradient-to-r from-green-400 to-blue-500 text-white"
                                                    onClick={() =>
                                                        setOpenFollowMenu(
                                                            (v) => !v
                                                        )
                                                    }
                                                    disabled={
                                                        followLoading ||
                                                        postsLoading
                                                    }
                                                >
                                                    <span className="material-symbols-outlined text-[20px]">
                                                        check
                                                    </span>
                                                    Đang theo dõi
                                                    <span className="material-symbols-outlined text-[18px] ml-1">
                                                        expand_more
                                                    </span>
                                                </button>
                                                {openFollowMenu && (
                                                    <div
                                                        ref={followMenuBoxRef}
                                                        className="absolute right-0 top-12 z-10 bg-white border rounded-xl shadow-lg min-w-[180px]"
                                                    >
                                                        <button
                                                            className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 rounded-t-xl flex items-center gap-2"
                                                            onClick={() => {
                                                                setConfirmUnfollow(
                                                                    true
                                                                );
                                                                setOpenFollowMenu(
                                                                    false
                                                                );
                                                            }}
                                                        >
                                                            <span className="material-symbols-outlined text-base">
                                                                person_remove
                                                            </span>
                                                            Hủy theo dõi
                                                        </button>
                                                    </div>
                                                )}
                                                {confirmUnfollow && (
                                                    <div
                                                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
                                                        onClick={() => {
                                                            if (
                                                                unfollowModalBoxRef.current
                                                            ) {
                                                                gsap.to(
                                                                    unfollowModalBoxRef.current,
                                                                    {
                                                                        scale: 0.85,
                                                                        opacity: 0,
                                                                        duration: 0.25,
                                                                        ease: "power1.in",
                                                                        onComplete:
                                                                            () =>
                                                                                setConfirmUnfollow(
                                                                                    false
                                                                                ),
                                                                    }
                                                                );
                                                            } else {
                                                                setConfirmUnfollow(
                                                                    false
                                                                );
                                                            }
                                                        }}
                                                    >
                                                        <div
                                                            ref={
                                                                unfollowModalBoxRef
                                                            }
                                                            className="bg-white rounded-xl shadow-xl p-6 w-full max-w-xs text-center"
                                                            onClick={(e) =>
                                                                e.stopPropagation()
                                                            }
                                                        >
                                                            <div className="mb-4">
                                                                <span className="material-symbols-outlined text-4xl text-red-500 mb-2">
                                                                    person_remove
                                                                </span>
                                                                <h4 className="font-semibold text-lg mb-2">
                                                                    Hủy theo
                                                                    dõi?
                                                                </h4>
                                                                <p className="text-slate-500 text-sm">
                                                                    Bạn sẽ không
                                                                    nhận được
                                                                    cập nhật từ
                                                                    người này
                                                                    nữa.
                                                                </p>
                                                            </div>
                                                            <div className="flex gap-2 mt-4">
                                                                <button
                                                                    className="flex-1 px-4 py-2 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200"
                                                                    onClick={() => {
                                                                        if (
                                                                            unfollowModalBoxRef.current
                                                                        ) {
                                                                            gsap.to(
                                                                                unfollowModalBoxRef.current,
                                                                                {
                                                                                    scale: 0.85,
                                                                                    opacity: 0,
                                                                                    duration: 0.25,
                                                                                    ease: "power1.in",
                                                                                    onComplete:
                                                                                        () =>
                                                                                            setConfirmUnfollow(
                                                                                                false
                                                                                            ),
                                                                                }
                                                                            );
                                                                        } else {
                                                                            setConfirmUnfollow(
                                                                                false
                                                                            );
                                                                        }
                                                                    }}
                                                                >
                                                                    Hủy
                                                                </button>
                                                                <button
                                                                    ref={
                                                                        followBtnRef
                                                                    }
                                                                    className="flex-1 px-4 py-2 rounded-full bg-red-500 text-white hover:bg-red-600"
                                                                    onClick={
                                                                        handleUnfollow
                                                                    }
                                                                    disabled={
                                                                        followLoading
                                                                    }
                                                                >
                                                                    {followLoading
                                                                        ? "Đang xử lý..."
                                                                        : "Xác nhận"}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <button
                                                ref={followBtnRef}
                                                className="px-4 py-2 rounded-full font-medium flex items-center gap-2 text-sm bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
                                                onClick={handleFollow}
                                                disabled={
                                                    followLoading ||
                                                    postsLoading
                                                }
                                            >
                                                <span className="material-symbols-outlined text-[20px]">
                                                    person_add
                                                </span>
                                                {followLoading
                                                    ? "Đang xử lý..."
                                                    : "Theo dõi"}
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div className="mt-6">
                                <h1 className="text-2xl font-semibold text-slate-900">
                                    {profileUser
                                        ? `${profileUser.first_name} ${profileUser.last_name}`
                                        : "Loading..."}
                                </h1>
                                <p className="text-slate-600 mt-2 text-base min-h-[24px] italic">
                                    {profileUser?.bio?.trim() ? (
                                        profileUser.bio
                                    ) : (
                                        <span className="text-slate-400">
                                            Chưa có tiểu sử
                                        </span>
                                    )}
                                </p>
                                <p className="text-slate-500 mt-1">
                                    {profileUser?.email
                                        ? `@${profileUser.email.split("@")[0]}`
                                        : "@user"}
                                </p>
                            </div>
                            {/* Stats Grid */}
                            <div className="mt-6 grid grid-cols-4 gap-4">
                                <div className="stat-item rounded-xl bg-slate-50 p-4 text-center">
                                    <div className="text-2xl font-semibold text-slate-900">
                                        {totalPosts !== null
                                            ? totalPosts
                                            : "..."}
                                    </div>
                                    <div className="text-sm text-slate-500">
                                        Bài viết
                                    </div>
                                </div>
                                <div
                                    className="stat-item rounded-xl bg-slate-50 p-4 text-center cursor-pointer hover:bg-indigo-100 transition-colors"
                                    onClick={() =>
                                        setShowFollowList("followers")
                                    }
                                >
                                    <div className="text-2xl font-semibold text-slate-900">
                                        {followersCount}
                                    </div>
                                    <div className="text-sm text-slate-500">
                                        Người theo dõi
                                    </div>
                                </div>
                                <div
                                    className="stat-item rounded-xl bg-slate-50 p-4 text-center cursor-pointer hover:bg-indigo-100 transition-colors"
                                    onClick={() =>
                                        setShowFollowList("following")
                                    }
                                >
                                    <div className="text-2xl font-semibold text-slate-900">
                                        {followingCount}
                                    </div>
                                    <div className="text-sm text-slate-500">
                                        Đang theo dõi
                                    </div>
                                </div>
                                <div className="stat-item rounded-xl bg-slate-50 p-4 text-center">
                                    <div className="text-2xl font-semibold text-slate-900">
                                        {userMedia.length}
                                    </div>
                                    <div className="text-sm text-slate-500">
                                        Ảnh/Video
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    {/* Navigation Tabs */}
                    <div className="mt-6 flex gap-2">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`
                  flex items-center gap-2 px-6 py-3 rounded-xl font-medium text-sm transition-all
                  ${
                      activeTab === tab.id
                          ? "bg-white text-indigo-600 shadow-sm"
                          : "text-slate-600 hover:bg-white/60"
                  }
                `}
                            >
                                <span className="material-symbols-outlined text-[20px]">
                                    {tab.icon}
                                </span>
                                {tab.label}
                            </button>
                        ))}
                    </div>
                    {/* Tab Content */}
                    <div className="mt-6" ref={contentRef}>
                        {activeTab === "posts" && (
                            <div className="space-y-6 flex flex-col items-center w-full">
                                {error && !postsLoading ? (
                                    <div className="text-center py-8 bg-white rounded-2xl w-full">
                                        <p className="text-red-500 mb-4">
                                            {error}
                                        </p>
                                        <button
                                            onClick={handleRetry}
                                            className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100"
                                        >
                                            Thử lại
                                        </button>
                                    </div>
                                ) : postsLoading ? (
                                    Array.from({ length: 3 }).map((_, i) => (
                                        <div
                                            key={i}
                                            className="bg-white rounded-2xl p-6 shadow-sm animate-pulse w-full"
                                        >
                                            <div className="flex items-center gap-3 mb-4">
                                                <div className="w-12 h-12 rounded-full bg-slate-200" />
                                                <div className="flex-1">
                                                    <div className="h-4 w-24 bg-slate-200 rounded mb-2" />
                                                    <div className="h-3 w-16 bg-slate-200 rounded" />
                                                </div>
                                            </div>
                                            <div className="h-20 bg-slate-200 rounded mb-4" />
                                            <div className="flex gap-4">
                                                <div className="h-4 w-12 bg-slate-200 rounded" />
                                                <div className="h-4 w-12 bg-slate-200 rounded" />
                                                <div className="h-4 w-12 bg-slate-200 rounded" />
                                            </div>
                                        </div>
                                    ))
                                ) : userPosts.length === 0 ? (
                                    <div className="text-center py-8 bg-white rounded-2xl w-full">
                                        <p className="text-slate-500">
                                            Chưa có bài viết nào
                                        </p>
                                    </div>
                                ) : (
                                    <>
                                        {userPosts.map((post) => (
                                            <Post key={post.id} post={post} />
                                        ))}
                                        {hasMore && !loadingMore && (
                                            <div
                                                ref={loadMoreRef}
                                                className="h-10 w-full"
                                            />
                                        )}
                                        {loadingMore && (
                                            <div className="py-4 text-center">
                                                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        )}
                        {activeTab === "media" && (
                            <div className="bg-white rounded-xl p-6 shadow-sm">
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                    {userMedia.length === 0 ? (
                                        <div className="col-span-full text-center py-8">
                                            <span className="flex items-center justify-center h-full material-symbols-outlined text-slate-400 text-3xl">
                                                photo_library
                                            </span>
                                            <p className="text-slate-500">
                                                Chưa có ảnh hoặc video nào
                                            </p>
                                        </div>
                                    ) : (
                                        userMedia.map((url, index) => (
                                            <div
                                                key={index}
                                                className="aspect-square bg-slate-100 rounded-lg overflow-hidden relative group cursor-pointer"
                                                onClick={() => openModal(url)}
                                            >
                                                <Image
                                                    src={url}
                                                    alt={`Media ${index + 1}`}
                                                    fill
                                                    className="object-cover transition-transform group-hover:scale-110"
                                                    sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                                                />
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                        {activeTab === "about" && (
                            <div className="bg-white rounded-xl p-6 shadow-sm">
                                <div className="space-y-6">
                                    <div>
                                        <h3 className="text-lg font-medium text-slate-900 mb-4">
                                            Giới thiệu
                                        </h3>
                                        <div className="space-y-4">
                                            {profileUser?.bio && (
                                                <div className="flex items-start gap-3 text-slate-600">
                                                    <span className="material-symbols-outlined text-slate-400 mt-0.5">
                                                        notes
                                                    </span>
                                                    <p>{profileUser.bio}</p>
                                                </div>
                                            )}
                                            <div className="flex items-center gap-3 text-slate-600">
                                                <span className="material-symbols-outlined text-slate-400">
                                                    mail
                                                </span>
                                                <span>
                                                    {profileUser?.email ||
                                                        "Chưa cập nhật email"}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3 text-slate-600">
                                                <span className="material-symbols-outlined text-slate-400">
                                                    calendar_today
                                                </span>
                                                <span>
                                                    Tham gia từ{" "}
                                                    {profileUser?.created_at
                                                        ? new Date(
                                                              profileUser.created_at
                                                          ).toLocaleDateString(
                                                              "vi-VN",
                                                              {
                                                                  day: "2-digit",
                                                                  month: "2-digit",
                                                                  year: "numeric",
                                                              }
                                                          )
                                                        : "Không rõ"}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {showFollowList && (
                <FollowListModal
                    userId={userId}
                    type={showFollowList}
                    isOpen={true}
                    onClose={() => setShowFollowList(null)}
                    onUpdateFollowStats={fetchFollowStats}
                />
            )}
            <ImageModal />
        </MainLayout>
    );
}
