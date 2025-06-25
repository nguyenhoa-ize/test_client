'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import type { ReactElement } from 'react';
import { FiSearch, FiEdit2, FiLock, FiUnlock } from 'react-icons/fi';
import AdminLayout from '@/components/AdminLayout';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import AdminGuard from '@/components/AdminGuard';
import { FixedSizeList as List } from 'react-window';
import { Fragment } from 'react';
import { Listbox, Transition } from '@headlessui/react';
import { HiSelector } from 'react-icons/hi';
import LoadingSpinner from '@/components/LoadingSpinner';

type User = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  user_info?: {
    is_active: boolean;
    created_at: string;
  };
  posts_count: number;
};

const roles = ['user', 'admin'];
const statusOptions = [
  { value: 'all', label: 'Tất cả trạng thái' },
  { value: 'active', label: 'Hoạt động' },
  { value: 'locked', label: 'Đã khóa' },
];

const roleFilterOptions = [
  { value: 'all', label: 'Tất cả vai trò' },
  { value: 'user', label: 'User' },
  { value: 'admin', label: 'Admin' },
];

const PAGE_SIZE_INITIAL = 10;
const PAGE_SIZE_MORE = 3;

function CustomDropdown({ value, onChange, options, widthClass }: { value: string, onChange: (val: string) => void, options: string[] | { value: string, label: string }[], widthClass?: string }) {
  const getLabel = (val: string) => {
    if (typeof options[0] === 'string') return val.charAt(0).toUpperCase() + val.slice(1);
    const found = (options as { value: string, label: string }[]).find(opt => opt.value === val);
    return found ? found.label : val;
  };
  return (
    <div className={`${widthClass || 'w-32'} text-sm font-medium text-gray-700`}>
      <Listbox value={value} onChange={onChange}>
        <div className="relative">
          <Listbox.Button className="relative w-full cursor-pointer rounded-xl border border-gray-300 bg-white py-2 pl-3 pr-10 text-left shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition">
            <span className="block truncate capitalize">{getLabel(value)}</span>
            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
              <HiSelector className="h-5 w-5 text-gray-400" />
            </span>
          </Listbox.Button>
          <Transition
            as={Fragment}
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <Listbox.Options className="absolute z-20 mt-2 max-h-60 w-full overflow-auto rounded-xl bg-white py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm">
              {(options as any[]).map((opt) => {
                const val = typeof opt === 'string' ? opt : opt.value;
                const label = typeof opt === 'string' ? opt.charAt(0).toUpperCase() + opt.slice(1) : opt.label;
                return (
                  <Listbox.Option
                    key={val}
                    className={({ active }) =>
                      `relative cursor-pointer select-none py-2 px-4 rounded-lg mx-1 ${
                        active ? 'bg-indigo-100 text-indigo-700' : 'text-gray-900'
                      }`
                    }
                    value={val}
                  >
                    {label}
                  </Listbox.Option>
                );
              })}
            </Listbox.Options>
          </Transition>
        </div>
      </Listbox>
    </div>
  );
}

export default function UserManagementPage(): ReactElement {
  const [users, setUsers] = useState<User[]>([]);
  const [searchText, setSearchText] = useState('');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [emptyReason, setEmptyReason] = useState<'search' | 'filter' | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'locked'>('all');
  const [roleFilter, setRoleFilter] = useState<'all' | 'user' | 'admin'>('all');
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1200
  );
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);
  const mobileListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const truncateIfNeeded = (text: string, width: number): string => {
    if (text == null || typeof text !== 'string') {
      return '';
    }
    const trimmedText = text.trim();
    const processedWords = trimmedText.split(/\s+/).map(word => {
        if (word.length > 7) {
            return word.substring(0, 7); // Truncate long words
        }
        return word;
    });
    // Sử dụng width truyền vào
    const wordLimit = (width >= 620 && width <= 1500) ? 2 : 5;
    if (processedWords.length > wordLimit) {
        return processedWords.slice(0, wordLimit).join(' ') + '...';
    }
    const finalResult = processedWords.join(' ');
    if (finalResult.length < trimmedText.length) {
        return finalResult + '...';
    }
    return finalResult;
  };

  const fetchUsers = async (reset = false) => {
    if (loading) return;
    setLoading(true);
    try {
      const pageSize = reset ? PAGE_SIZE_INITIAL : PAGE_SIZE_MORE;
      const params = new URLSearchParams({
        offset: reset ? '0' : offset.toString(),
        limit: pageSize.toString(),
        search: searchText.trim() || '',
      });
      const res = await fetch(`http://localhost:5000/api/users?${params.toString()}`);
      const data = await res.json();
      console.log('API data:', data);
      let filtered = data.users || [];
      if (statusFilter === 'active') filtered = filtered.filter((u: User) => u.user_info?.is_active);
      else if (statusFilter === 'locked') filtered = filtered.filter((u: User) => !u.user_info?.is_active);
      if (roleFilter !== 'all') filtered = filtered.filter((u: User) => u.role === roleFilter);
      if (reset) {
        setUsers(filtered);
        setOffset(pageSize);
      } else {
        setUsers(prev => {
          const all = [...prev, ...filtered];
          const unique = Array.from(new Map(all.map(u => [u.id, u])).values());
          return unique;
        });
        setOffset(prev => prev + pageSize);
      }
      setHasMore(filtered.length === pageSize);
    } catch (err) {
      console.error('Lỗi khi tải danh sách:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setOffset(0);
    setHasMore(true);
    fetchUsers(true);
    // eslint-disable-next-line
  }, [statusFilter, roleFilter]);

  useEffect(() => {
    // Debounce tìm kiếm realtime
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    debounceTimeout.current = setTimeout(() => {
      setOffset(0);
      setHasMore(true);
      fetchUsers(true);
    }, 300);
    return () => {
      if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
      return undefined;
    };
    // eslint-disable-next-line
  }, [searchText]);

  const handleSearch = () => {
    setOffset(0);
    setHasMore(true);
    fetchUsers(true);
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) fetchUsers(false);
  };

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      await fetch(`http://localhost:5000/api/users/${userId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentStatus }),
      });
      toast.success(`Tài khoản đã được ${currentStatus ? 'khóa' : 'mở khóa'} thành công!`);
      fetchUsers();
    } catch (err) {
      console.error('Lỗi khi cập nhật trạng thái:', err);
      toast.error('Đã xảy ra lỗi khi cập nhật trạng thái tài khoản.');
    }
  };

  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleOpenAuth = (tab: 'login' | 'signup') => {
    console.log(`Mở tab ${tab}`);
  };

  const updateUserRole = async (userId: string, newRole: string) => {
    // Lưu lại role cũ để rollback nếu cần
    const oldRole = users.find(u => u.id === userId)?.role ?? newRole;
    // 1. Cập nhật UI ngay lập tức
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
    try {
      // 2. Gửi request lên backend
      const res = await fetch(`http://localhost:5000/api/users/${userId}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      if (!res.ok) throw new Error('Lỗi cập nhật backend');
      toast.success('Cập nhật phân quyền thành công!');
    } catch (err) {
      // 3. Nếu lỗi, rollback lại UI hoặc thông báo lỗi
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: oldRole } : u));
      toast.error('Đã xảy ra lỗi khi cập nhật phân quyền.');
    }
  };

  useEffect(() => {
    const ref = mobileListRef.current;
    if (!ref) return;
    const handleScroll = () => {
      if (loading || !hasMore) return;
      if (ref.scrollHeight - ref.scrollTop - ref.clientHeight < 100) {
        handleLoadMore();
      }
    };
    ref.addEventListener('scroll', handleScroll);
    return () => ref.removeEventListener('scroll', handleScroll);
  }, [loading, hasMore]);

  return (
    <AdminGuard>
      <AdminLayout onOpenAuth={handleOpenAuth}>
        <main className="p-4 sm:p-6">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 text-gray-900">Quản lý người dùng</h1>
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 mb-4 sm:mb-6 items-stretch sm:items-center">
              <div className="relative flex-1 w-full sm:w-auto">
                <FiSearch
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 cursor-pointer"
                  onClick={handleSearch}
                  style={{ zIndex: 2 }}
                  title="Tìm kiếm"
                />
                <input
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Tìm kiếm người dùng..."
                  className="pl-10 pr-4 py-2 bg-[#F5F0E5] rounded-xl text-gray-800 w-full outline-none text-sm sm:text-base"
                />
              </div>
              {/* Dropdown filter cho desktop */}
              <div className="hidden sm:flex flex-row gap-4 ml-auto">
                <CustomDropdown value={statusFilter} onChange={v => setStatusFilter(v as 'all' | 'active' | 'locked')} options={statusOptions} widthClass="w-48" />
                <CustomDropdown value={roleFilter} onChange={v => setRoleFilter(v as 'all' | 'user' | 'admin')} options={roleFilterOptions} widthClass="w-48" />
              </div>
            </div>
            {/* Dropdown filter cho mobile */}
            <div className="block sm:hidden" ref={mobileListRef} style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              <div className="flex flex-col gap-2 mb-2">
                <CustomDropdown value={statusFilter} onChange={v => setStatusFilter(v as 'all' | 'active' | 'locked')} options={statusOptions} widthClass="w-full" />
                <CustomDropdown value={roleFilter} onChange={v => setRoleFilter(v as 'all' | 'user' | 'admin')} options={roleFilterOptions} widthClass="w-full" />
              </div>
              {users.length === 0 ? (
                <div className="p-6 text-center text-gray-500 bg-white rounded-xl border">
                  {emptyReason === 'search'
                    ? 'Không có kết quả nào phù hợp với từ khóa tìm kiếm.'
                    : 'Không có người dùng nào phù hợp với bộ lọc hiện tại.'}
                </div>
              ) : (
                <>
                  {users.map((user) => (
                    <div key={user.id} className="bg-white border rounded-xl p-4 mb-4 shadow-sm hover:shadow-md transition relative">
                      <div className="flex flex-col gap-2">
                        <p className="text-gray-600 text-sm">
                          <span className="font-medium">Tên người dùng:</span>{' '}
                          <span className="text-gray-700">
                            {truncateIfNeeded(`${user.first_name} ${user.last_name}`, windowWidth)}
                          </span>
                        </p>
                        <p className="text-gray-600 text-sm">
                          <span className="font-medium">Email:</span>{' '}
                          <span className="text-gray-700 truncate max-w-[140px] whitespace-nowrap overflow-hidden inline-block align-middle" title={user.email}>{user.email}</span>
                        </p>
                        <p className="text-gray-600 text-sm">
                          <span className="font-medium">Trạng thái:</span>{' '}
                          <span
                            className={`px-2 py-1 rounded-full text-xs ${
                              user.user_info?.is_active ? 'bg-[#AECBEB] text-gray-900' : 'bg-[#F0F2F5] text-gray-500'
                            }`}
                          >
                            {user.user_info?.is_active ? 'Hoạt động' : 'Đã khóa'}
                          </span>
                        </p>
                        <p className="text-gray-600 text-sm">
                          <span className="font-medium">Bài đăng:</span>{' '}
                          <span className="text-gray-700">{user.posts_count}</span>
                        </p>
                        <div className="flex gap-2 mt-2">
                          <button className="text-blue-500 hover:text-blue-600" onClick={() => setEditingUser(user)}>
                            <FiEdit2 size={18} />
                          </button>
                          <button
                            onClick={() => toggleUserStatus(user.id, user.user_info?.is_active ?? false)}
                            className="text-red-500 hover:text-red-600"
                          >
                            {user.user_info?.is_active ? <FiLock size={18} /> : <FiUnlock size={18} />}
                          </button>
                        </div>
                      </div>
                      {/* Dropdown role ở góc phải phía dưới */}
                      <div className="absolute bottom-3 right-3 z-10">
                        <CustomDropdown value={user.role} onChange={role => updateUserRole(user.id, role)} options={roles} />
                      </div>
                    </div>
                  ))}
                  {/* Infinite scroll: spinner sẽ hiện khi loading */}
                  {loading && hasMore && (
                    <div className="flex justify-center py-2"><LoadingSpinner size={24} color="#ea580c" /></div>
                  )}
                </>
              )}
            </div>
            {/* LazyColumn cho desktop */}
            <div className="hidden sm:block border border-[#DBE0E5] rounded-xl bg-white">
              {/* Header */}
              <div className="flex w-full text-sm font-semibold bg-white border-b border-[#DBE0E5] sticky top-0 z-10 items-center">
                <div className="p-3 flex-1 text-gray-800 flex justify-center items-center text-center whitespace-nowrap">Tên người dùng</div>
                <div className="p-3 flex-1 text-gray-800 flex justify-center items-center text-center">Email</div>
                <div className="p-3 flex-1 text-gray-800 flex justify-center items-center text-center">Trạng thái</div>
                <div className="p-3 flex-1 text-gray-800 flex justify-center items-center text-center">Bài đăng</div>
                <div className="p-3 flex-1 text-gray-800 flex justify-center items-center text-center">Phân quyền</div>
                <div className="p-3 flex-1 text-gray-800 flex justify-center items-center text-center">Hành động</div>
              </div>
              {/* Nội dung bảng */}
              {loading && users.length === 0 ? (
                <div className="p-6 text-center text-gray-500 bg-white">
                  <span className="inline-flex items-center justify-center">
                    <svg className="animate-spin h-5 w-5 text-blue-500 mr-2" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                    Đang tải dữ liệu...
                  </span>
                </div>
              ) : users.length === 0 ? (
                <div className="p-6 text-center text-gray-500 bg-white">
                  Không có người dùng nào phù hợp với bộ lọc hiện tại.
                </div>
              ) : (
                <>
                  <List
                    height={420}
                    itemCount={users.length}
                    itemSize={56}
                    width="100%"
                    itemKey={index => users[index].id}
                    onScroll={({ scrollOffset, scrollDirection }) => {
                      const bottomThreshold = users.length * 56 - 500;
                      if (scrollOffset > bottomThreshold && scrollDirection === 'forward') {
                        handleLoadMore();
                      }
                    }}
                  >
                    {({ index, style }) => {
                      const user = users[index];
                      return (
                        <div
                          key={user.id}
                          style={style}
                          className="flex w-full text-sm bg-white border-b border-[#E5E8EB] hover:bg-gray-50 transition items-center"
                        >
                          <div className="p-3 flex-1 min-w-0 flex justify-center items-center text-center" title={user.first_name + ' ' + user.last_name}>{truncateIfNeeded(user.first_name + ' ' + user.last_name, windowWidth)}</div>
                          <div className="p-3 flex-1 min-w-0 flex justify-center items-center text-center truncate max-w-xs whitespace-nowrap overflow-hidden" title={user.email}>
                            {user.email}
                          </div>
                          <div className="p-3 flex-1 flex justify-center items-center text-center">
                            <span
                              className={`px-3 py-1 rounded-2xl text-xs font-medium whitespace-nowrap ${
                                user.user_info
                                  ? user.user_info.is_active
                                    ? 'bg-[#AECBEB] text-gray-900'
                                    : 'bg-[#F0F2F5] text-gray-500'
                                  : 'bg-gray-200 text-gray-400'
                              }`}
                            >
                              {user.user_info
                                ? user.user_info.is_active
                                  ? 'Hoạt động'
                                  : 'Đã khóa'
                                : 'Không rõ'}
                            </span>
                          </div>
                          <div className="p-3 flex-1 flex justify-center items-center text-center">{user.posts_count}</div>
                          <div className="p-3 flex-1 flex justify-center items-center text-center">
                            <div className="text-gray-600 text-sm flex items-center gap-1">
                              <CustomDropdown value={user.role} onChange={role => updateUserRole(user.id, role)} options={roles} />
                            </div>
                          </div>
                          <div className="p-3 flex-1 flex gap-2 justify-center items-center text-center">
                            <button className="text-blue-500 hover:text-blue-600" onClick={() => setEditingUser(user)}>
                              <FiEdit2 />
                            </button>
                            <button
                              onClick={() => toggleUserStatus(user.id, user.user_info?.is_active ?? false)}
                              className="text-red-500 hover:text-red-600"
                            >
                              {user.user_info?.is_active ? <FiLock /> : <FiUnlock />}
                            </button>
                          </div>
                        </div>
                      );
                    }}
                  </List>
                  {/* Khi đang load thêm ở cuối danh sách */}
                  {loading && users.length > 0 && (
                    <div className="flex justify-center py-2"><LoadingSpinner size={24} color="#ea580c" /></div>
                  )}
                  {!hasMore && users.length > 0 && (
                    <div className="text-center py-2 text-gray-400 text-sm">Đã hiển thị hết danh sách</div>
                  )}
                </>
              )}
            </div>
            <ToastContainer position="top-right" autoClose={4000} aria-label="Thông báo hệ thống" />
            {/* Modal chỉnh sửa người dùng */}
            {editingUser && (
              <div
                className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
                onClick={() => setEditingUser(null)}
              >
                <div
                  className="bg-white rounded-2xl shadow-xl p-4 sm:p-6 max-w-sm w-full animate-fadeIn"
                  onClick={(e) => e.stopPropagation()}
                >
                  <h2 className="text-lg sm:text-xl font-bold mb-4 sm:mb-6 text-center text-gray-800">
                    Chỉnh sửa người dùng
                  </h2>
                  <div className="space-y-3 sm:space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                      <span className="font-medium text-sm sm:text-base text-gray-700">Họ:</span>
                      <input
                        type="text"
                        className="w-full sm:w-2/3 p-2 border rounded-xl text-sm sm:text-base"
                        value={editingUser.first_name}
                        onChange={(e) => setEditingUser({ ...editingUser, first_name: e.target.value })}
                      />
                    </div>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                      <span className="font-medium text-sm sm:text-base text-gray-700">Tên:</span>
                      <input
                        type="text"
                        className="w-full sm:w-2/3 p-2 border rounded-xl text-sm sm:text-base"
                        value={editingUser.last_name}
                        onChange={(e) => setEditingUser({ ...editingUser, last_name: e.target.value })}
                      />
                    </div>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                      <span className="font-medium text-sm sm:text-base text-gray-700">Email:</span>
                      <input
                        type="email"
                        className="w-full sm:w-2/3 p-2 border rounded-xl text-sm sm:text-base"
                        value={editingUser.email}
                        onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end mt-4 sm:mt-6 gap-2">
                    <button
                      className="px-3 sm:px-4 py-2 bg-gray-200 text-gray-800 rounded-xl hover:bg-gray-300 text-sm sm:text-base"
                      onClick={() => setEditingUser(null)}
                    >
                      Đóng
                    </button>
                    <button
                      className="px-3 sm:px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 text-sm sm:text-base"
                      onClick={async () => {
                        if (!editingUser.first_name.trim() || !editingUser.last_name.trim() || !editingUser.email.trim()) {
                          toast.error('Vui lòng nhập đầy đủ họ, tên và email!');
                          return;
                        }
                        if (!isValidEmail(editingUser.email)) {
                          toast.error('Email không đúng định dạng!');
                          return;
                        }
                        await fetch(`http://localhost:5000/api/users/${editingUser.id}`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            first_name: editingUser.first_name,
                            last_name: editingUser.last_name,
                            email: editingUser.email,
                          }),
                        });
                        toast.success('Đã lưu thông tin chỉnh sửa thành công!');
                        setEditingUser(null);
                        fetchUsers();
                      }}
                    >
                      Lưu thay đổi
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </AdminLayout>
    </AdminGuard>
  );
}