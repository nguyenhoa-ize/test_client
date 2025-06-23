"use client";

import React, {
    useEffect,
    useRef,
    useState,
    useCallback,
    useContext,
    useMemo,
} from "react";
import MainLayout from "@/components/MainLayout";
import Image from "next/image";
import { UserContext } from "@/contexts/UserContext";
import gsap from "gsap";
import Post from "@/components/Post";
import axios from "axios";
import FollowListModal from "@/components/FollowListModal";
import { socket } from "@/socket";
import EditProfileModal from "@/components/EditProfileModal";
import ImageModal from "@/components/ImageModal";
import { useImageModalStore } from "@/store/useImageModalStore";
import { useRouter } from "next/navigation";
import { PostType } from "@/types/Post";

interface Tab {
    id: string;
    label: string;
    icon: string;
}

const tabs: Tab[] = [
    { id: "posts", label: "Bài viết", icon: "article" },
    { id: "media", label: "Ảnh/Video", icon: "photo_library" },
    { id: "about", label: "Giới thiệu", icon: "person" },
];

const POSTS_PER_PAGE = 5;

const useAPI = () => {
    const { accessToken, logout } = useContext(UserContext);
    const baseURL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

    const axiosInstance = useMemo(() => {
        const instance = axios.create({ baseURL });
        instance.interceptors.response.use(
            (response) => response,
            async (error) => {
                if (
                    axios.isAxiosError(error) &&
                    error.response?.status === 401
                ) {
                    await logout("Phiên đăng nhập đã hết hạn");
                }
                return Promise.reject(error);
            }
        );
        return instance;
    }, [baseURL, logout]);

    const apiCall = useCallback(
        async (endpoint: string, options: Record<string, unknown> = {}) => {
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
                }
                throw error;
            }
        },
        [axiosInstance, accessToken]
    );

    return { apiCall };
};

export default function ProfilePage() {
    const {
        user,
        accessToken,
        loading: userLoading,
        fetchUser,
    } = useContext(UserContext);
    const { openModal } = useImageModalStore();
    const { apiCall } = useAPI();
    const router = useRouter();

    const [activeTab, setActiveTab] = useState<string>("posts");
    const [userPosts, setUserPosts] = useState<PostType[]>([]);
    const [userMedia, setUserMedia] = useState<string[]>([]);
    const [postsLoading, setPostsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);

    const [totalPosts, setTotalPosts] = useState(0);
    const [followersCount, setFollowersCount] = useState(0);
    const [followingCount, setFollowingCount] = useState(0);

    const [showFollowList, setShowFollowList] = useState<
        "followers" | "following" | null
    >(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [retryTrigger, setRetryTrigger] = useState(0);

    const profileRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!userLoading && !user) {
            router.replace("/login");
        }
    }, [user, userLoading, router]);

    const fetchProfileStats = useCallback(async () => {
        if (!user?.id) return;
        try {
            const [postStats, followStats] = await Promise.all([
                apiCall(`/api/users/${user.id}/post-stats`),
                apiCall(`/api/users/${user.id}/follow-stats`),
            ]);
            setTotalPosts(postStats.total_posts || 0);
            setFollowersCount(followStats.followers_count || 0);
            setFollowingCount(followStats.following_count || 0);
        } catch (error) {
            console.error("Failed to fetch profile stats", error);
        }
    }, [apiCall, user?.id]);

    const fetchUserMedia = useCallback(async () => {
        if (!user?.id) return;
        try {
            const posts = await apiCall(`/api/posts/user/${user.id}`, {
                params: { filter: "media", limit: 1000, offset: 0 },
            });
            const formattedMedia = Array.isArray(posts)
                ? posts.reduce((acc, post) => {
                      let images = post.images;
                      if (typeof images === "string") {
                          try {
                              images = JSON.parse(images);
                          } catch {
                              images = [];
                          }
                      }
                      if (Array.isArray(images)) {
                          return acc.concat(
                              images.filter(
                                  (img) =>
                                      typeof img === "string" &&
                                      (img.startsWith("http://") ||
                                          img.startsWith("https://") ||
                                          img.startsWith("/"))
                              )
                          );
                      }
                      return acc;
                  }, [] as string[])
                : [];
            setUserMedia(formattedMedia);
        } catch {
            console.error("Could not fetch user media.");
        }
    }, [apiCall, user?.id]);

    const fetchUserPosts = useCallback(async () => {
        if (!user?.id) return;

        setPostsLoading(true);

        const offset = page * POSTS_PER_PAGE;
        if (page > 0) setLoadingMore(true);

        try {
            const posts: PostType[] = await apiCall(
                `/api/posts/user/${user.id}`,
                {
                    params: {
                        limit: POSTS_PER_PAGE,
                        offset,
                        viewer_id: user.id,
                    },
                }
            );
            setUserPosts((prev) => (page === 0 ? posts : [...prev, ...posts]));
            setHasMore(posts.length === POSTS_PER_PAGE);
            setError(null);
        } catch {
            setError("Không thể tải bài viết. Vui lòng thử lại.");
        } finally {
            setPostsLoading(false);
            setLoadingMore(false);
        }
    }, [apiCall, user?.id, page]);

    // Initial data fetch
    useEffect(() => {
        if (user?.id) {
            fetchProfileStats();
            fetchUserMedia();
        }
    }, [user?.id, fetchProfileStats, fetchUserMedia, retryTrigger]);

    // Fetch posts on tab change or retry
    useEffect(() => {
        if (user?.id && activeTab === "posts") {
            setPage(0);
            setUserPosts([]);
            setHasMore(true);
        }
    }, [user?.id, activeTab, retryTrigger]);

    // Infinite scroll page change
    useEffect(() => {
        if (user?.id && activeTab === "posts") {
            fetchUserPosts();
        }
    }, [page, fetchUserPosts, activeTab]);

    // Socket listeners
    useEffect(() => {
        if (!user?.id) return;

        const handlePostUpdate = () => {
            setRetryTrigger((v) => v + 1); // Refetch all stats and posts
            fetchUserPosts();
        };

        socket.on("postApproved", handlePostUpdate);
        socket.on("postDeleted", handlePostUpdate);

        return () => {
            socket.off("postApproved", handlePostUpdate);
            socket.off("postDeleted", handlePostUpdate);
        };
    }, [user?.id, fetchUserPosts]);

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

    useEffect(() => {
        if (profileRef.current && !userLoading) {
            gsap.fromTo(
                profileRef.current,
                { y: 20, opacity: 0 },
                {
                    y: 0,
                    opacity: 1,
                    duration: 0.8,
                    ease: "power3.out",
                }
            );
        }
    }, [userLoading]);

    useEffect(() => {
        if (
            !postsLoading &&
            userPosts.length > 0 &&
            contentRef.current?.children
        ) {
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
    }, [activeTab, userPosts, postsLoading]);

    const handleRetry = () => {
        setError(null);
        setRetryTrigger((v) => v + 1);
    };

    const onUpdateProfileSuccess = async () => {
        setShowEditModal(false);
        if (accessToken) {
            await fetchUser(accessToken); // fetchUser from UserContext
        }
        setRetryTrigger((v) => v + 1);
    };

    if (userLoading || !user) {
        return (
            <MainLayout>
                <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                    <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
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
                            {user?.cover_url ? (
                                <Image
                                    src={user.cover_url}
                                    alt="Cover"
                                    fill
                                    className="object-cover w-full h-full"
                                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                    priority
                                />
                            ) : (
                                <div className="w-full h-full bg-gradient-to-r from-gray-300 via-gray-200 to-gray-300" />
                            )}
                        </div>
                        <div className="px-6 pb-6">
                            <div className="flex justify-between items-end -mt-16">
                                <div className="relative">
                                    <div className="w-32 h-32 rounded-full border-4 border-white shadow-lg overflow-hidden flex items-center justify-center bg-white">
                                        {user?.avatar_url ? (
                                            <Image
                                                src={user.avatar_url}
                                                alt="Profile"
                                                fill
                                                className="object-cover rounded-full"
                                                style={{
                                                    borderRadius: "9999px",
                                                    objectFit: "cover",
                                                }}
                                                sizes="128px"
                                            />
                                        ) : (
                                            <span className="material-symbols-outlined text-[64px] text-slate-300">
                                                person
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <button
                                    className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-full transition-colors flex items-center gap-2 text-sm font-medium"
                                    onClick={() => setShowEditModal(true)}
                                >
                                    <span className="material-symbols-outlined text-[20px]">
                                        edit
                                    </span>
                                    Chỉnh sửa
                                </button>
                            </div>

                            <div className="mt-6">
                                <h1 className="text-2xl font-semibold text-slate-900">
                                    {`${user.first_name} ${user.last_name}`}
                                </h1>
                                <p className="text-slate-600 mt-2 text-base min-h-[24px] italic">
                                    {user?.bio?.trim() ? (
                                        user.bio
                                    ) : (
                                        <span className="text-slate-400">
                                            Chưa có tiểu sử
                                        </span>
                                    )}
                                </p>
                                <p className="text-slate-500 mt-1">
                                    @{user.email.split("@")[0]}
                                </p>
                            </div>

                            <div className="mt-6 grid grid-cols-4 gap-4">
                                <div className="stat-item rounded-xl bg-slate-50 p-4 text-center">
                                    <div className="text-2xl font-semibold text-slate-900">
                                        {totalPosts}
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

                    <div className="mt-6" ref={contentRef}>
                        {activeTab === "posts" && (
                            <div className="space-y-6 flex flex-col items-center w-full">
                                {error ? (
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
                                        userMedia
                                            .filter(
                                                (url) =>
                                                    typeof url === "string" &&
                                                    (url.startsWith(
                                                        "http://"
                                                    ) ||
                                                        url.startsWith(
                                                            "https://"
                                                        ) ||
                                                        url.startsWith("/"))
                                            )
                                            .map((url, index) => (
                                                <div
                                                    key={index}
                                                    className="aspect-square bg-slate-100 rounded-lg overflow-hidden relative group cursor-pointer"
                                                    onClick={() =>
                                                        openModal(url)
                                                    }
                                                >
                                                    <Image
                                                        src={url}
                                                        alt={`Media ${
                                                            index + 1
                                                        }`}
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
                                            {user?.bio && (
                                                <div className="flex items-start gap-3 text-slate-600">
                                                    <span className="material-symbols-outlined text-slate-400 mt-0.5">
                                                        notes
                                                    </span>
                                                    <p>{user.bio}</p>
                                                </div>
                                            )}
                                            <div className="flex items-center gap-3 text-slate-600">
                                                <span className="material-symbols-outlined text-slate-400">
                                                    mail
                                                </span>
                                                <span>{user.email}</span>
                                            </div>
                                            <div className="flex items-center gap-3 text-slate-600">
                                                <span className="material-symbols-outlined text-slate-400">
                                                    calendar_today
                                                </span>
                                                <span>
                                                    Tham gia từ{" "}
                                                    {user?.created_at
                                                        ? new Date(
                                                              user.created_at
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

            <ImageModal />

            {showFollowList && user?.id && (
                <FollowListModal
                    userId={user.id}
                    type={showFollowList}
                    isOpen={true}
                    onClose={() => setShowFollowList(null)}
                    onUpdateFollowStats={fetchProfileStats}
                />
            )}

            {showEditModal && user && accessToken && (
                <EditProfileModal
                    user={user}
                    accessToken={accessToken}
                    onClose={() => setShowEditModal(false)}
                    onSuccess={onUpdateProfileSuccess}
                />
            )}
        </MainLayout>
    );
}
