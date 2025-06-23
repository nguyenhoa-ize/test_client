import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import gsap from "gsap";
import { useUser } from "@/contexts/UserContext";
import axios from "axios";
import Link from "next/link";

interface User {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url: string | null;
    email: string;
    followed_at: string;
    is_following: boolean;
}

interface FollowListModalProps {
    userId: string;
    type: "followers" | "following";
    isOpen: boolean;
    onClose: () => void;
    onUpdateFollowStats?: () => void;
}

export default function FollowListModal({
    userId,
    type,
    isOpen,
    onClose,
    onUpdateFollowStats,
}: FollowListModalProps) {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const modalRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const { user: currentUser, accessToken } = useUser();
    const [openMenuUserId, setOpenMenuUserId] = useState<string | null>(null);
    const [confirmUnfollowId, setConfirmUnfollowId] = useState<string | null>(
        null
    );
    const menuRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
    const [menuDirection, setMenuDirection] = useState<{
        [key: string]: "down" | "up";
    }>({});

    useEffect(() => {
        if (isOpen) {
            gsap.to(modalRef.current, {
                backgroundColor: "rgba(0, 0, 0, 0.5)",
                duration: 0.2,
            });
            gsap.fromTo(
                contentRef.current,
                { y: 20, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.3, ease: "power2.out" }
            );
        }
    }, [isOpen]);

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const response = await axios.get(
                    `/api/users/${userId}/${type}`,
                    {
                        baseURL:
                            process.env.NEXT_PUBLIC_API_URL ||
                            "http://localhost:5000",
                        headers: { Authorization: `Bearer ${accessToken}` },
                    }
                );
                setUsers(response.data);
            } catch (error) {
                console.error("Error fetching users:", error);
            } finally {
                setLoading(false);
            }
        };

        if (isOpen) {
            fetchUsers();
        }
    }, [userId, type, isOpen, accessToken]);

    useEffect(() => {
        if (openMenuUserId && menuRefs.current[openMenuUserId]) {
            const direction = menuDirection[openMenuUserId] || "down";
            gsap.fromTo(
                menuRefs.current[openMenuUserId],
                { y: direction === "up" ? 10 : -10, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.25, ease: "power2.out" }
            );
        }
    }, [openMenuUserId, menuDirection]);

    const handleFollow = async (targetUserId: string) => {
        try {
            const endpoint = `/api/users/${targetUserId}/follow`;
            const method = users.find((u) => u.id === targetUserId)
                ?.is_following
                ? "DELETE"
                : "POST";

            await axios({
                method,
                url: endpoint,
                baseURL:
                    process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000",
                headers: { Authorization: `Bearer ${accessToken}` },
            });

            setUsers((prevUsers) =>
                prevUsers.map((user) =>
                    user.id === targetUserId
                        ? { ...user, is_following: !user.is_following }
                        : user
                )
            );
        } catch (error) {
            console.error("Error following/unfollowing user:", error);
        }
    };

    const handleUnfollow = async (targetUserId: string) => {
        setConfirmUnfollowId(null);
        try {
            await axios({
                method: "DELETE",
                url: `/api/users/${targetUserId}/follow`,
                baseURL:
                    process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000",
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            setUsers((prevUsers) =>
                prevUsers.map((user) =>
                    user.id === targetUserId
                        ? { ...user, is_following: false }
                        : user
                )
            );
        } catch (error) {
            console.error("Error unfollowing user:", error);
        }
    };

    const handleClose = () => {
        gsap.to(modalRef.current, {
            backgroundColor: "rgba(0, 0, 0, 0)",
            duration: 0.2,
        });
        gsap.to(contentRef.current, {
            y: 20,
            opacity: 0,
            duration: 0.2,
            onComplete: () => {
                if (onUpdateFollowStats) onUpdateFollowStats();
                onClose();
            },
        });
    };

    const handleOpenMenu = (userId: string) => {
        setOpenMenuUserId((prev) => (prev === userId ? null : userId));
        if (openMenuUserId !== userId) {
            setTimeout(() => {
                const btn = document.getElementById(`follow-btn-${userId}`);
                const modal = document.querySelector(".max-w-lg");
                if (btn && modal) {
                    const btnRect = btn.getBoundingClientRect();
                    const modalRect = modal.getBoundingClientRect();
                    const spaceBelow = modalRect.bottom - btnRect.bottom;
                    if (spaceBelow >= 90) {
                        setMenuDirection((prev) => ({
                            ...prev,
                            [userId]: "down",
                        }));
                    } else {
                        const modalEl = modal as HTMLElement;
                        const scrollAmount =
                            btnRect.bottom - (modalRect.bottom - 120);
                        if (
                            scrollAmount > 0 &&
                            modalEl.scrollTop + modalEl.clientHeight <
                                modalEl.scrollHeight
                        ) {
                            modalEl.scrollBy({
                                top: scrollAmount,
                                behavior: "smooth",
                            });
                            setMenuDirection((prev) => ({
                                ...prev,
                                [userId]: "down",
                            }));
                        } else {
                            setMenuDirection((prev) => ({
                                ...prev,
                                [userId]: "up",
                            }));
                        }
                    }
                }
            }, 10);
        }
    };

    // Xác định user cuối cùng trong danh sách
    const isLastUser = (userId: string) => {
        if (users.length === 0) return false;
        return users[users.length - 1].id === userId;
    };

    if (!isOpen) return null;

    return (
        <div
            ref={modalRef}
            className="fixed inset-0 bg-black bg-opacity-0 z-50 flex items-center justify-center"
            onClick={handleClose}
        >
            <div
                ref={contentRef}
                className={`bg-white rounded-2xl w-full max-w-lg shadow-xl transition-all duration-200 ${
                    openMenuUserId && isLastUser(openMenuUserId)
                        ? "min-h-[260px]"
                        : ""
                }`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between p-6 border-b">
                    <h3 className="text-xl font-semibold text-slate-900">
                        {type === "followers"
                            ? "Người theo dõi"
                            : "Đang theo dõi"}
                    </h3>
                    <button
                        onClick={handleClose}
                        className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                    >
                        <span className="material-symbols-outlined text-slate-500">
                            close
                        </span>
                    </button>
                </div>

                <div className="p-6 max-h-[60vh] overflow-y-auto">
                    {loading ? (
                        Array.from({ length: 3 }).map((_, i) => (
                            <div
                                key={i}
                                className="flex items-center gap-4 mb-6 animate-pulse"
                            >
                                <div className="w-12 h-12 bg-slate-200 rounded-full" />
                                <div className="flex-1">
                                    <div className="h-4 w-32 bg-slate-200 rounded mb-2" />
                                    <div className="h-3 w-24 bg-slate-200 rounded" />
                                </div>
                                <div className="w-24 h-8 bg-slate-200 rounded-full" />
                            </div>
                        ))
                    ) : users.length === 0 ? (
                        <div className="text-center py-8 text-slate-500">
                            {type === "followers"
                                ? "Chưa có người theo dõi nào"
                                : "Chưa theo dõi ai"}
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {users.map((user) => (
                                <div
                                    key={user.id}
                                    className={`flex items-center gap-4 relative group transition-all duration-200 ${
                                        openMenuUserId === user.id
                                            ? "mb-12"
                                            : ""
                                    }`}
                                >
                                    <Link
                                        href={
                                            user.id === currentUser?.id
                                                ? "/profile"
                                                : `/profile/${user.id}`
                                        }
                                        className="flex items-center gap-4 flex-1 group"
                                    >
                                        <div className="w-12 h-12 rounded-full bg-slate-100 overflow-hidden relative">
                                            {user.avatar_url ? (
                                                <Image
                                                    src={user.avatar_url}
                                                    alt={`${user.first_name} ${user.last_name}`}
                                                    fill
                                                    className="object-cover rounded-full"
                                                    sizes="48px"
                                                />
                                            ) : (
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <span className="material-symbols-outlined text-slate-300 text-[28px]">
                                                        person
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <h4 className="font-medium text-slate-900 group-hover:text-indigo-600 transition-colors">
                                                {user.first_name}{" "}
                                                {user.last_name}
                                            </h4>
                                            <p className="text-sm text-slate-500">
                                                @{user.email.split("@")[0]}
                                            </p>
                                        </div>
                                    </Link>

                                    {user.id !== currentUser?.id && (
                                        <div className="relative z-10">
                                            {user.is_following ? (
                                                <>
                                                    <button
                                                        id={`follow-btn-${user.id}`}
                                                        aria-label="Mở menu hủy theo dõi"
                                                        onClick={() =>
                                                            handleOpenMenu(
                                                                user.id
                                                            )
                                                        }
                                                        className="px-4 py-2 rounded-full text-sm font-medium transition-all bg-slate-100 text-slate-600 hover:bg-slate-200 flex items-center gap-1 min-w-[110px] justify-center"
                                                    >
                                                        <span className="material-symbols-outlined text-base">
                                                            check
                                                        </span>
                                                        Đang theo dõi
                                                        <span className="material-symbols-outlined text-base ml-1">
                                                            expand_more
                                                        </span>
                                                    </button>

                                                    {openMenuUserId ===
                                                        user.id && (
                                                        <div
                                                            ref={(el) =>
                                                                (menuRefs.current[
                                                                    user.id
                                                                ] = el)
                                                            }
                                                            className={`absolute ${
                                                                menuDirection[
                                                                    user.id
                                                                ] === "up"
                                                                    ? "bottom-full mb-3"
                                                                    : "top-full mt-3"
                                                            } right-0 z-50 bg-white border rounded-xl shadow-xl min-w-[160px] overflow-auto max-h-40`}
                                                        >
                                                            <button
                                                                className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 rounded-t-xl flex items-center gap-2"
                                                                onClick={() => {
                                                                    setConfirmUnfollowId(
                                                                        user.id
                                                                    );
                                                                    setOpenMenuUserId(
                                                                        null
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

                                                    {confirmUnfollowId ===
                                                        user.id && (
                                                        <div
                                                            className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
                                                            onClick={() =>
                                                                setConfirmUnfollowId(
                                                                    null
                                                                )
                                                            }
                                                        >
                                                            <div
                                                                className="bg-white rounded-xl shadow-xl p-6 w-full max-w-xs text-center animate-fadeIn"
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
                                                                        dõi{" "}
                                                                        {
                                                                            user.first_name
                                                                        }{" "}
                                                                        {
                                                                            user.last_name
                                                                        }
                                                                        ?
                                                                    </h4>
                                                                    <p className="text-slate-500 text-sm">
                                                                        Bạn sẽ
                                                                        không
                                                                        nhận
                                                                        được cập
                                                                        nhật từ
                                                                        người
                                                                        này nữa.
                                                                    </p>
                                                                </div>
                                                                <div className="flex gap-2 mt-4">
                                                                    <button
                                                                        className="flex-1 px-4 py-2 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200"
                                                                        onClick={() =>
                                                                            setConfirmUnfollowId(
                                                                                null
                                                                            )
                                                                        }
                                                                    >
                                                                        Hủy
                                                                    </button>
                                                                    <button
                                                                        className="flex-1 px-4 py-2 rounded-full bg-red-500 text-white hover:bg-red-600"
                                                                        onClick={() =>
                                                                            handleUnfollow(
                                                                                user.id
                                                                            )
                                                                        }
                                                                    >
                                                                        Xác nhận
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </>
                                            ) : (
                                                <button
                                                    onClick={() =>
                                                        handleFollow(user.id)
                                                    }
                                                    className="px-4 py-2 rounded-full text-sm font-medium transition-all bg-indigo-50 text-indigo-600 hover:bg-indigo-100 flex items-center gap-1 min-w-[110px] justify-center"
                                                    style={{ height: "40px" }}
                                                >
                                                    <span className="material-symbols-outlined text-base">
                                                        person_add
                                                    </span>
                                                    Theo dõi
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
