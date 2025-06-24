"use client";

import {
    createContext,
    useContext,
    useEffect,
    useState,
    ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { jwtDecode } from "jwt-decode";
import { socket } from "@/socket";

interface UserData {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    avatar_url: string;
    created_at?: string;
    role?: string;
    bio?: string;
    cover_url?: string;
}

interface UserContextType {
    user: UserData | null;
    accessToken: string | null;
    loading: boolean;
    currentConversationId: string | null;
    setUserData: (user: UserData, token: string) => void;
    setCurrentConversationId: (id: string | null) => void;
    signup: (
        email: string,
        password: string,
        firstName: string,
        lastName: string
    ) => void;
    login: (email: string, password: string) => void;
    logout: (reason?: string) => Promise<void>;
    fetchUser: (token: string) => Promise<void>;
}

export const UserContext = createContext<UserContextType>({
    user: null,
    accessToken: null,
    loading: true,
    currentConversationId: null,
    setUserData: () => {},
    setCurrentConversationId: () => {},
    login: async () => {},
    signup: async () => {},
    logout: async () => {},
    fetchUser: async () => {},
});

export function UserContextProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<UserData | null>(null);
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentConversationId, setCurrentConversationIdState] = useState<
        string | null
    >(null);
    const router = useRouter();

    // Hàm để lấy thông tin người dùng từ server
    const fetchUser = async (token: string) => {
        try {
            const userRes = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/api/auth/me`,
                {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            if (!userRes.ok) {
                throw new Error("Không thể xác minh tài khoản.");
            }

            const userData = await userRes.json();
            setUser(userData.user);
        } catch (err) {
            console.error("Lỗi khi fetch thông tin người dùng:", err);
        }
    };

    const refreshAccessToken = async (): Promise<boolean> => {
        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/api/auth/refresh-token`,
                {
                    method: "POST",
                    credentials: "include",
                }
            );

            if (!res.ok) {
                return false;
            }

            const data = await res.json();
            setAccessToken(data.accessToken);
            sessionStorage.setItem("accessToken", data.accessToken);

            // Sau khi refresh token, fetch lại thông tin người dùng
            await fetchUser(data.accessToken);
            return true;
        } catch (err) {
            console.error("Lỗi khi refreshAccessToken:", err);
            await logout();
            return false;
        }
    };

    const setCurrentConversationId = (id: string | null) => {
        setCurrentConversationIdState(id);
        if (id) {
            sessionStorage.setItem("currentConversationId", id);
        } else {
            sessionStorage.removeItem("currentConversationId");
        }
    };

    useEffect(() => {
        const initialize = async () => {
            let storedToken = sessionStorage.getItem("accessToken");
            let storedUser = sessionStorage.getItem("user");
            let storedCurrentConversationId = sessionStorage.getItem(
                "currentConversationId"
            );
            if (storedUser) {
                try {
                    const parsedUser = JSON.parse(storedUser);
                    setUser(parsedUser);
                } catch {}
            }
            if (storedToken) {
                setAccessToken(storedToken);
                try {
                    const decoded: { exp: number } = jwtDecode(storedToken);
                    const now = Date.now() / 1000;
                    if (decoded.exp > now) {
                        // Nếu đã có user từ storage thì xác thực lại ở background
                        fetchUser(storedToken).then(() => setLoading(false));
                        return;
                    } else {
                        // Token hết hạn, thử refresh
                        await refreshAccessToken();
                    }
                } catch (err) {
                    await refreshAccessToken(); // auto-refresh
                }
            } else {
                await refreshAccessToken();
            }
            if (storedCurrentConversationId) {
                setCurrentConversationId(storedCurrentConversationId);
            }
            setLoading(false); // Đặt loading thành false sau khi hoàn tất kiểm tra và fetch
        };
        initialize();
    }, []); // Chỉ chạy một lần khi component mount

    // Khi user thay đổi, connect/disconnect socket
    useEffect(() => {
        if (user && !socket.connected) {
            socket.connect();
        }
        if (!user && socket.connected) {
            socket.disconnect();
        }
    }, [user]);

    // Emit userOnline khi socket connect và có user
    useEffect(() => {
        if (!user?.id) return;
        const handleConnect = () => {
            socket.emit("register", user.id);
        };
        socket.on("connect", handleConnect);
        if (socket.connected) handleConnect();
        return () => {
            socket.off("connect", handleConnect);
        };
    }, [user]);

    const signup = async (
        email: string,
        password: string,
        firstName: string,
        lastName: string
    ) => {
        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/api/auth/signup`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        email,
                        password,
                        firstName,
                        lastName,
                    }),
                }
            );

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(
                    errorData.error ||
                        "Đăng ký không thành công. Vui lòng kiểm tra lại thông tin."
                );
            }

            const data = await res.json();
            setUserData(data.user, data.accessToken);
            if (!socket.connected) socket.connect();
            return;
        } catch (error) {
            console.error("Lỗi khi đăng ký:", error);
            throw error;
        }
    };

    const login = async (email: string, password: string) => {
        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/api/auth/login`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ email, password }),
                    credentials: "include",
                }
            );

            if (!res.ok) {
                const errorData = await res.json();
                if (res.status === 401) {
                    // Xử lý khi refresh token cũng hết hạn
                }
                throw new Error(
                    errorData.error ||
                        "Đăng nhập không thành công. Vui lòng kiểm tra lại thông tin."
                );
            }

            const data = await res.json();
            setUserData(data.user, data.accessToken);
            if (!socket.connected) socket.connect();
            router.push("/");
            return;
        } catch (error: any) {
            console.error("Lỗi khi đăng nhập:", error);
            throw error;
        }
    };

    const setUserData = (userData: UserData, token: string) => {
        setUser(userData);
        setAccessToken(token);
        sessionStorage.setItem("user", JSON.stringify(userData));
        sessionStorage.setItem("accessToken", token);
    };

    const logout = async () => {
        try {
            await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/logout`, {
                method: "POST",
                credentials: "include", // Gửi cookie httpOnly
            });
        } catch (error) {
            console.error("Logout API call failed, proceeding locally", error);
        } finally {
            setUser(null);
            setAccessToken(null);
            sessionStorage.removeItem("user");
            sessionStorage.removeItem("accessToken");
            if (socket.connected) socket.disconnect();

            router.push(`/`);
        }
    };

    return (
        <UserContext.Provider
            value={{
                user,
                accessToken,
                loading,
                currentConversationId,
                setUserData,
                setCurrentConversationId,
                signup,
                login,
                logout,
                fetchUser,
            }}
        >
            {children}
        </UserContext.Provider>
    );
}

export const useUser = () => useContext(UserContext);
