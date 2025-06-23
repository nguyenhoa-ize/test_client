// utils/api.ts
import { useUser } from "@/contexts/UserContext";

export const useApi = () => {
  const { accessToken } = useUser();

  const api = async (
    endpoint: string,
    options: RequestInit = {}
  ): Promise<Response> => {
    const headers = {
      ...options.headers,
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    };

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}${endpoint}`,
      {
        ...options,
        headers,
        credentials: 'include' // để cookie refreshToken được gửi kèm khi cần
      }
    );

    return response;
  };

  return api;
};
