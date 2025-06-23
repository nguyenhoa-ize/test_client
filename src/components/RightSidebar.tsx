import { useUser } from "@/contexts/UserContext";
import { useEffect, useState, useRef } from "react";
import { socket } from "@/socket";
import Link from "next/link";
import { useRouter } from "next/navigation";
import gsap from "gsap";

interface Friend {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
}

interface RightSidebarProps {
  theme?: 'inspiring' | 'reflective';
}

const RightSidebar = ({ theme = 'inspiring' }: RightSidebarProps) => {
  const { user, accessToken, setCurrentConversationId } = useUser();
  const router = useRouter();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<any[]>([]);
  const asideRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!asideRef.current) return;
    if (open) {
      gsap.to(asideRef.current, { width: '16rem', opacity: 1, duration: 0.4, ease: 'power3.out' });
    } else {
      gsap.to(asideRef.current, { width: '4rem', opacity: 1, duration: 0.3, ease: 'power2.in' });
    }
  }, [open]);

  // Lấy danh sách bạn bè mutual
  useEffect(() => {
    const fetchFriends = async () => {
      if (!user || !accessToken) return;
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/${user.id}/friends`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        const data = await res.json();
        setFriends(data.friends || []);
      } catch (e) {
        setFriends([]);
      } finally {
        setLoading(false);
      }
    };
    fetchFriends();
  }, [user, accessToken]);

  // Fetch conversations on mount
  useEffect(() => {
    const fetchConvs = async () => {
      if (!accessToken) return;
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/messages?page=1&limit=100`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const data = await res.json();
        setConversations(data.conversations || []);
      } catch {}
    };
    fetchConvs();
  }, [accessToken]);

  useEffect(() => {
    const handleOnline = (users: string[]) => setOnlineUserIds(new Set(users));
    socket.on('onlineUsers', handleOnline);
    return () => { socket.off('onlineUsers', handleOnline); };
  }, []);

  useEffect(() => {
    if (user?.id && socket.connected) {
      socket.emit('register', user.id);
    }
  }, [user?.id]);

  // Sắp xếp: online trước, offline sau
  const sortedFriends = [
    ...friends.filter(f => onlineUserIds.has(f.id)),
    ...friends.filter(f => !onlineUserIds.has(f.id)),
  ];

  return (
    <>
      {/* Sidebar */}
      <aside
        ref={asideRef}
        className={`
          fixed z-20
          top-[5.5rem] right-0
          mt-8
          pt-4
          pb-2
          transition-all duration-300
          w-64
          max-w-xs
          h-auto max-h-[80vh]
          rounded-l-3xl
          flex flex-col items-center
          shadow-2xl
          ${theme === 'reflective' ? 'bg-[#D5BDAF]' : 'bg-[#AECBEB]'}
          backdrop-blur-md border-l border-blue-100
          overflow-x-hidden
        `}
        style={{
          boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.25)",
          overflow: "hidden",
        }}
      >
        {/* Nút toggle ẩn/hiện sidebar */}
        <button
          className={`
            hidden lg:flex
            items-center justify-center
            absolute z-50
            top-2 right-2
            w-8 h-8
            bg-white/90 hover:bg-blue-100 border border-blue-200 shadow-2xl
            rounded-full
            transition-all duration-300
            group
          `}
          style={{
            outline: "none",
            boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.25)",
          }}
          onClick={() => setOpen(o => !o)}
          aria-label={open ? "Ẩn sidebar" : "Hiện sidebar"}
        >
          <span
            className={`material-symbols-outlined text-blue-600 text-2xl transition-transform duration-300 ${open ? "" : "rotate-180"}`}
          >
            chevron_right
          </span>
        </button>
        {open ? (
          <>
            <div className="w-full text-center mb-2 lg:mb-2">
              <h2 className="text-blue-700 font-bold text-xl font-[Inter] mb-1 tracking-wide drop-shadow">Bạn bè ({friends.length})</h2>
              <hr className="border-blue-200 mb-2" />
            </div>
            <div className="flex-1 w-full overflow-y-auto pr-1 custom-scrollbar overflow-x-hidden">
              <div className="flex flex-col w-full gap-2">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 px-2 py-2 animate-pulse">
                      <div className="w-12 h-12 rounded-full bg-white/70" />
                      <div className="flex-1 h-4 bg-white/60 rounded" />
                    </div>
                  ))
                ) : sortedFriends.length === 0 ? (
                  <div className="text-center text-gray-500 py-6">Chưa có bạn bè nào</div>
                ) : (
                  sortedFriends.map((friend) => {
                    const isOnline = onlineUserIds.has(friend.id);
                    return (
                      <div
                        key={friend.id}
                        className="flex items-center gap-3 mx-1 px-2 py-2 rounded-xl bg-white/40 hover:bg-blue-50 transition group shadow-sm hover:shadow-lg cursor-pointer"
                        onClick={async () => {
                          if (friend.id && user?.id && friend.id !== user.id) {
                            // Tìm hội thoại direct với user này
                            const conv = conversations.find(
                              c => c.type === 'direct' &&
                                ((c.other_user?.id === friend.id) || (c.members && c.members.includes(friend.id)))
                            );
                            if (conv) {
                              setCurrentConversationId(conv.id);
                              router.push('/messages');
                            } else {
                              // Nếu chưa có, tạo mới hội thoại direct
                              try {
                                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/messages`, {
                                  method: 'POST',
                                  headers: {
                                    'Authorization': `Bearer ${accessToken}`,
                                    'Content-Type': 'application/json',
                                  },
                                  body: JSON.stringify({ members: [friend.id], type: 'direct' })
                                });
                                const data = await res.json();
                                if (data.conversation?.id) {
                                  setCurrentConversationId(data.conversation.id);
                                  router.push('/messages');
                                }
                              } catch {}
                            }
                          }
                        }}
                      >
                        <div className="relative w-12 h-12 flex-shrink-0 group">
                          <Link href={`/profile/${friend.id}`} className="block w-12 h-12 rounded-full overflow-hidden transition hover:ring-2 hover:ring-blue-400"
                            title={`${friend.first_name} ${friend.last_name}`}
                            onClick={e => e.stopPropagation()}
                          >
                            <img
                              src={friend.avatar_url || "/default-avatar.png"}
                              alt={`${friend.first_name} ${friend.last_name}`}
                              className="w-full h-full object-cover"
                            />
                          </Link>
                          {/* Không render dấu chấm khi sidebar mở */}
                        </div>
                        <div className="flex-1 min-w-0">
                          <Link href={`/profile/${friend.id}`}
                            onClick={e => e.stopPropagation()}
                          >
                            <span
                              className="text-blue-900 font-medium font-[Inter] text-base truncate hover:underline"
                              title={`${friend.first_name} ${friend.last_name}`}
                            >
                              {friend.first_name} {friend.last_name}
                            </span>
                          </Link>
                          <div className="text-xs text-gray-600 mt-0.5 flex items-center gap-1">
                            <span className={`inline-block w-2 h-2 rounded-full ${isOnline ? "bg-green-500 animate-pulse" : "bg-gray-400"}`} />
                            <span className={isOnline ? "text-green-600 font-semibold" : ""}>
                              {isOnline ? "Online" : "Offline"}
                            </span>
                          </div>
      </div>
                </div>
                    );
                  })
                )}
              </div>
            </div>
          </>
        ) : (
          // Thu nhỏ: chỉ avatar + trạng thái
          <div className="flex-1 flex flex-col items-center gap-3 py-4 overflow-y-auto custom-scrollbar overflow-x-hidden">
            {loading ? (
              Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="w-12 h-12 rounded-full bg-white/70 animate-pulse relative" />
              ))
            ) : sortedFriends.length === 0 ? (
              <div className="text-gray-400 text-xs text-center">Không có bạn</div>
            ) : (
              sortedFriends.map((friend) => {
                const isOnline = onlineUserIds.has(friend.id);
                return (
                  <div key={friend.id} className="relative w-12 h-12 flex-shrink-0 group">
                    <Link
                      href={`/profile/${friend.id}`}
                      className="block w-12 h-12 rounded-full overflow-hidden transition hover:ring-2 hover:ring-blue-400"
                      title={`${friend.first_name} ${friend.last_name}`}
                    >
                      <img
                        src={friend.avatar_url || "/default-avatar.png"}
                        alt={friend.first_name}
                        className="w-full h-full object-cover"
                      />
                    </Link>
                    {/* Chỉ render dấu chấm khi sidebar thu nhỏ */}
                    <span
                      className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-4 border-white shadow-md ${onlineUserIds.has(friend.id) ? "bg-green-500 animate-pulse" : "bg-gray-400"}`}
                      style={{ zIndex: 2 }}
                      title={onlineUserIds.has(friend.id) ? "Online" : "Offline"}
                    />
                  </div>
                );
              })
            )}
          </div>
        )}
      </aside>
    </>
  );
};

export default RightSidebar;