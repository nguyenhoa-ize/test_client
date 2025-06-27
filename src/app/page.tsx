"use client";

// Import các component và hook cần thiết cho trang chủ
import { useState, useEffect, useCallback, useContext, useMemo, useRef } from "react";
import Tabs from "@/components/Tabs";
import InputSection from "@/components/InputSection";
import Post from "@/components/Post";
import LeftSidebar from "@/components/LeftSidebar";
import RightSidebar from "@/components/RightSidebar";
import PostDetailPopup from "@/components/PostDetailPopup";
import { UserContext } from "@/contexts/UserContext";
import CreatePostModal from "@/components/CreatePostModal";
import ImageModal from "@/components/ImageModal";
import axios from "axios";
import type { PostType } from "@/types/Post";
import { socket } from "@/socket";
import SkeletonPost from "@/components/SkeletonPost";
import { ForbiddenWordsProvider } from "@/contexts/ForbiddenWordsContext";
import MainLayout from "@/components/MainLayout";

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
                const response = await axiosInstance({
                    ...options,
                    url: endpoint,
                    headers: {
                        ...(options.headers || {}),
                        Authorization: `Bearer ${accessToken}`,
                    },
                });
                return response.data;
            } catch (error: unknown) {
                console.error(`API Error (${endpoint}):`, error);
                throw error;
            }
        },
        [axiosInstance, accessToken]
    );

    return { apiCall };
};

// Component Home: Trang chính của ứng dụng mạng xã hội Solace
export default function Home() {
    const { user } = useContext(UserContext);
    const { apiCall } = useAPI();

    const [activeTab, setActiveTab] = useState(0);
    const [openPost, setOpenPost] = useState<PostType | null>(null);
    const [showCreatePost, setShowCreatePost] = useState(false);
    const [posts, setPosts] = useState<PostType[]>([]);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchPosts = useCallback(
        async (pageIndex: number, isRefresh = false) => {
            if (pageIndex > 0) setLoadingMore(true);
            else setLoading(true);

            setError(null);

            try {
                const fetchedPosts = await apiCall(`/api/posts`, {
                    params: {
                        limit: POSTS_PER_PAGE,
                        offset: pageIndex * POSTS_PER_PAGE,
                        type: activeTab === 0 ? "positive" : "negative",
                        viewer_id: user?.id,
                    },
                });

                setPosts((prev) => {
                    const all = pageIndex === 0 || isRefresh ? fetchedPosts : [...prev, ...fetchedPosts];
                    const seen = new Set();
                    const unique = [];
                    for (const p of all) {
                        if (!seen.has(p.id)) {
                            unique.push(p);
                            seen.add(p.id);
                        }
                    }
                    return unique;
                });
                setHasMore(fetchedPosts.length === POSTS_PER_PAGE);
            } catch {
                setError("Không thể tải bài viết. Vui lòng thử lại.");
            } finally {
                setLoading(false);
                setLoadingMore(false);
            }
        },
        [apiCall, activeTab, user?.id]
    );

    // Initial fetch and tab change handler
    useEffect(() => {
        setPage(0);
        setPosts([]);
        setHasMore(true);
        fetchPosts(0, true);
    }, [activeTab, fetchPosts]);

    // Infinite scroll page change
    useEffect(() => {
        if (page > 0) {
            fetchPosts(page);
        }
    }, [page, fetchPosts]);

    const handlePostCreated = (newPost: PostType) => {
        const typePost = activeTab === 0 ? "positive" : "negative";
        if (newPost.type_post === typePost) {
            const completedPost = {
                ...newPost,
                first_name: newPost.first_name || user?.first_name || "",
                last_name: newPost.last_name || user?.last_name || "",
                avatar_url: newPost.avatar_url || user?.avatar_url || "",
            };
            setPosts((prev) => [completedPost, ...prev]);
        }
    };

    const handleOpenPostDetail = async (postData: PostType) => {
        // Nếu là bài shared mà thiếu dữ liệu shared_post, thì fetch bài gốc
        if (postData.shared_post_id && !postData.shared_post) {
            try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/posts/${postData.shared_post_id}`);
                const sharedPost = await res.json();
                setOpenPost({ ...postData, shared_post: sharedPost });
            } catch {
                setOpenPost(postData); // fallback nếu lỗi
            }
        } else {
            setOpenPost(postData);
        }
    };

    useEffect(() => {
        const handlePostApproved = (data: { post: PostType }) => {
            const typePost = activeTab === 0 ? "positive" : "negative";
            if (data.post.type_post === typePost) {
                setPosts((prevPosts) => [
                    data.post,
                    ...prevPosts.filter((p) => p.id !== data.post.id)
                ]);
            }
        };

        const handlePostDeleted = (data: { postId: string }) => {
            setPosts((prevPosts) =>
                prevPosts.filter((p) => p.id !== data.postId)
            );
        };

        socket.on("postApproved", handlePostApproved);
        socket.on("postDeleted", handlePostDeleted);

        return () => {
            socket.off("postApproved", handlePostApproved);
            socket.off("postDeleted", handlePostDeleted);
        };
    }, [activeTab]);

    const observerRef = useRef<IntersectionObserver | null>(null);

    const loadMoreRef = useCallback(
        (node: HTMLDivElement) => {
            if (observerRef.current) {
                observerRef.current.disconnect();
            }
            if (node) {
                observerRef.current = new IntersectionObserver(
                    (entries) => {
                        if (entries[0].isIntersecting && hasMore && !loading) {
                            setPage((prev) => prev + 1);
                        }
                    },
                    { threshold: 1.0 }
                );
                observerRef.current.observe(node);
            }
        },
        [hasMore, loading]
    );

    const theme = activeTab === 1 ? "reflective" : "inspiring";
    const bgClass = activeTab === 0 ? "bg-slate-50" : "bg-[#F8F9FA]";

    const handleCommentAdded = (postId: string, inc = 1) => {
        setPosts(prev =>
            prev.map(post =>
                post.id === postId
                    ? { ...post, comment_count: Number(post.comment_count || 0) + Number(inc) }
                    : post
            )
        );
    };

    return (
        <MainLayout theme={theme}>
            <div className={`min-h-screen w-full ${bgClass}`}>

                <div className="pt-[3rem]">
                    <div className="flex justify-center w-full">
                        <div className="hidden lg:block w-[280px] flex-shrink-0">
                            <div className="fixed top-[5.5rem] left-0 z-20 w-[280px] h-full">
                                <LeftSidebar theme={theme} />
                            </div>
                        </div>

                        <main className="w-full max-w-[700px] flex-shrink-0 px-4">
                            <div className="w-full">
                                <Tabs onTabChange={setActiveTab} />
                            </div>

                            <div className="w-full mt-6">
                                <InputSection
                                    onOpenModal={() => setShowCreatePost(true)}
                                    theme={theme}
                                />
                            </div>

                            <div className="w-full pt-6 pb-20 flex flex-col space-y-6">
                                {loading && posts.length === 0 ? (
                                    <>
                                        <SkeletonPost />
                                        <SkeletonPost />
                                        <SkeletonPost />
                                    </>
                                ) : error ? (
                                    <div className="text-center py-8 bg-white rounded-2xl w-full">
                                        <p className="text-red-500 mb-4">{error}</p>
                                        <button
                                            onClick={() => fetchPosts(0, true)}
                                            className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100"
                                        >
                                            Thử lại
                                        </button>
                                    </div>
                                ) : (
                                    posts.map((post) => (
                                        <Post
                                            key={post.id}
                                            theme={theme}
                                            post={post}
                                            onOpenDetail={handleOpenPostDetail}
                                        />
                                    ))
                                )}
                                {loadingMore && <SkeletonPost />}
                                <div ref={loadMoreRef} className="h-1" />
                            </div>
                        </main>

                        <div className="hidden lg:block w-[280px] flex-shrink-0">
                            <div className="fixed top-[5.5rem] right-0 z-20 w-[280px] h-full">
                                <RightSidebar theme={theme} />
                            </div>
                        </div>
                    </div>
                </div>

                {openPost && (
                    <PostDetailPopup
                        post={openPost}
                        onClose={() => setOpenPost(null)}
                        onCommentAdded={() => handleCommentAdded(openPost.id)}
                    />
                )}
                {showCreatePost && (
                    <ForbiddenWordsProvider>
                        <CreatePostModal
                            onClose={() => setShowCreatePost(false)}
                            onPostCreated={handlePostCreated}
                            theme={theme}
                            defaultTypePost={
                                activeTab === 0 ? "positive" : "negative"
                            }
                        />
                    </ForbiddenWordsProvider>
                )}
                <ImageModal />
            </div>
        </MainLayout>
    );
}
