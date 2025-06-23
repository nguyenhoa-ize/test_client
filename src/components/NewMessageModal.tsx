import { FC, useState, useEffect, useCallback, useRef } from 'react';
import { MaterialIcon } from './MaterialIcon';
import { useUser } from '../contexts/UserContext';
import { useInfiniteQuery } from '@tanstack/react-query';
import { debounce } from 'lodash';

interface User {
  id: string;
  name: string;
  avatar: string;
  is_followed: boolean;
  is_following: boolean;
}

interface ApiResponse {
  users: User[];
  total: number;
}

interface NewMessageModalProps {
  isOpen: boolean;
  onlineUsers: Set<string>;
  onClose: () => void;
  onSelect: (members: string[], type: string) => void;
}

const LIMIT = 10;

const fetchUsers = async ({
  pageParam = 0,
  queryKey,
  accessToken,
  currentUserId,
}: {
  pageParam?: number;
  queryKey: [string, string];
  accessToken: string;
  currentUserId: string;
}): Promise<ApiResponse> => {
  const [, searchQuery] = queryKey;
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/users/search?q=${encodeURIComponent(
      searchQuery
    )}&limit=${LIMIT}&offset=${pageParam}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  if (!response.ok) throw new Error('Failed to fetch users');
  return response.json();
};

export const NewMessageModal: FC<NewMessageModalProps> = ({
  isOpen,
  onlineUsers,
  onClose,
  onSelect,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const { accessToken, user } = useUser();
  const observer = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  // Debounced search query update
  const debouncedSetSearchQuery = useCallback(
    debounce((value: string) => setSearchQuery(value), 300),
    []
  );

  // Handle null accessToken and user.id
  const isQueryEnabled =
    isOpen && accessToken !== null && accessToken !== undefined && user?.id !== null && user?.id !== undefined;

  // React Query for fetching users
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isLoading,
    isFetchingNextPage,
    error,
  } = useInfiniteQuery<ApiResponse, Error>({
    queryKey: ['users', searchQuery] as const,
    queryFn: ({ pageParam, queryKey }) =>
      fetchUsers({
        pageParam: pageParam as number | undefined,
        queryKey: queryKey as [string, string],
        accessToken: accessToken!,
        currentUserId: user!.id,
      }),
    getNextPageParam: (lastPage: ApiResponse, pages: ApiResponse[]) => {
      const nextOffset = pages.length * LIMIT;
      return nextOffset < lastPage.total ? nextOffset : undefined;
    },
    initialPageParam: 0, // Added required initialPageParam
    enabled: isQueryEnabled,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000, // Garbage collection time for cache
  });

  // Flatten users from pages
  const users = data?.pages.flatMap((page) => page.users) ?? [];

  // Infinite scroll observer
  useEffect(() => {
    if (isLoading || isFetchingNextPage || !hasNextPage) return;

    observer.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          fetchNextPage();
        }
      },
      { threshold: 1.0 }
    );

    if (loadMoreRef.current) observer.current.observe(loadMoreRef.current);

    return () => {
      if (observer.current) observer.current.disconnect();
    };
  }, [isLoading, isFetchingNextPage, hasNextPage, fetchNextPage]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-lg w-full max-w-md mx-4 shadow-xl animate-scale-in">
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-indigo-600">New Message</h3>
          <button
            onClick={onClose}
            className="text-xl text-gray-500 hover:text-indigo-600 transition-colors"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="p-4 max-h-[50vh] overflow-y-auto">
          <div className="relative mb-4">
            <input
              type="text"
              placeholder="Search users..."
              onChange={(e) => debouncedSetSearchQuery(e.target.value)}
              className="w-full rounded-lg pl-10 pr-4 py-2 text-sm bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
            <MaterialIcon
              icon="search"
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500"
            />
          </div>

          {error && (
            <div className="text-red-500 text-sm mb-2">{error.message}</div>
          )}

          <div className="space-y-2">
            {isLoading ? (
              // Skeleton UI
              Array.from({ length: 5 }).map((_, index) => (
                <div
                  key={`skeleton-${index}`}
                  className="flex items-center p-3 rounded-lg animate-pulse"
                >
                  <div className="mr-3">
                    <div className="w-10 h-10 rounded-full bg-gray-200"></div>
                  </div>
                  <div className="flex-1">
                    <div className="h-4 w-3/4 bg-gray-200 rounded mb-2"></div>
                    <div className="h-3 w-1/2 bg-gray-200 rounded"></div>
                  </div>
                </div>
              ))
            ) : (
              users.map((user) => (
                <div
                  key={user.id}
                  onClick={() => {
                    onSelect([user.id], 'direct');
                    onClose();
                  }}
                  className="flex items-center p-3 rounded-lg hover:bg-indigo-50 cursor-pointer transition-colors"
                >
                  <div className="relative mr-3">
                    <img
                      src={user.avatar || '/default-avatar.png'}
                      alt={user.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    {onlineUsers.has(user.id) && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 border-2 border-white"></span>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-sm">{user.name}</div>
                    <div className="text-xs text-gray-500">
                      {onlineUsers.has(user.id) ? 'Online' : 'Offline'}
                      {user.is_followed && ' • Followed'}
                      {user.is_following && ' • Following'}
                    </div>
                  </div>
                </div>
              ))
            )}
            {isFetchingNextPage && (
              // Skeleton UI for loading more
              Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={`skeleton-more-${index}`}
                  className="flex items-center p-3 rounded-lg animate-pulse"
                >
                  <div className="mr-3">
                    <div className="w-10 h-10 rounded-full bg-gray-200"></div>
                  </div>
                  <div className="flex-1">
                    <div className="h-4 w-3/4 bg-gray-200 rounded mb-2"></div>
                    <div className="h-3 w-1/2 bg-gray-200 rounded"></div>
                  </div>
                </div>
              ))
            )}
            {!isLoading && hasNextPage && <div ref={loadMoreRef} />}
            {!isLoading && !hasNextPage && users.length === 0 && (
              <div className="text-center text-sm text-gray-500">
                No users found
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};