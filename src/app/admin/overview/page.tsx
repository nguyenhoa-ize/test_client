'use client';

import type { ReactElement } from 'react';
import { FiFlag, FiUserPlus } from 'react-icons/fi';
import { HiOutlineDocumentText } from 'react-icons/hi';
import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine,
  PieChart, Pie, Cell,
  LineChart, Line
} from 'recharts';
import AdminLayout from '@/components/AdminLayout';
import AdminGuard from '@/components/AdminGuard';
import { socket } from '@/socket';

type Summary = {
  reports_today: number;
  reports_yesterday: number;
  posts_this_week: number;
  posts_last_week: number;
  new_users_today: number;
  new_users_yesterday: number;
};

export default function AdminPage(): ReactElement {
  const handleOpenAuth = (tab: 'login' | 'signup') => {
    console.log(`Mở tab ${tab}`);
  };

  const [summary, setSummary] = useState<Summary | null>(null);
  const [selectedYear, setSelectedYear] = useState(2025);
  const [monthlyUsers, setMonthlyUsers] = useState<{ month: string; total: number }[]>([]);
  const [visitRange, setVisitRange] = useState('7');
  const [dailyVisits, setDailyVisits] = useState<{ date: string; total: number }[]>([]);
  const [sentimentRange, setSentimentRange] = useState('month');
  const [postSentiment, setPostSentiment] = useState<{ type: string; count: number }[]>([]);

  const COLORS = ['#6366F1', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316', '#22C55E', '#0EA5E9', '#E11D48'];

  // Các hàm fetch riêng biệt để có thể gọi lại khi realtime
  const fetchSummary = () => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/dashboard/summary`)
      .then(res => res.json())
      .then(data => setSummary(data))
      .catch(err => console.error('Lỗi khi lấy dữ liệu thống kê:', err));
  };
  const fetchMonthlyUsers = () => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/dashboard/monthly-users?year=${selectedYear}`)
      .then((res) => res.json())
      .then((data) =>
        setMonthlyUsers(data.map((item: any) => ({ month: item.month, total: Number(item.total) })))
      );
  };
  const fetchDailyVisits = () => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/dashboard/daily-visits?range=${visitRange}`)
      .then(res => res.json())
      .then(data => setDailyVisits(data));
  };
  const fetchPostSentiment = () => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/dashboard/post-sentiment?range=${sentimentRange}`)
      .then(res => res.json())
      .then(data => setPostSentiment(data))
      .catch(err => console.error('Lỗi khi lấy biểu đồ cảm xúc:', err));
  };

  // Gọi fetch khi mount và khi các filter thay đổi
  useEffect(() => { fetchSummary(); }, []);
  useEffect(() => { fetchMonthlyUsers(); }, [selectedYear]);
  useEffect(() => { fetchDailyVisits(); }, [visitRange]);
  useEffect(() => { fetchPostSentiment(); }, [sentimentRange]);

  // Lắng nghe socket để realtime cập nhật
  useEffect(() => {
    const fetchAll = () => {
      fetchSummary();
      fetchMonthlyUsers();
      fetchDailyVisits();
      fetchPostSentiment();
    };
    socket.on('newReport', fetchAll);
    socket.on('newUser', fetchAll);
    socket.on('newPost', fetchAll);
    return () => {
      socket.off('newReport', fetchAll);
      socket.off('newUser', fetchAll);
      socket.off('newPost', fetchAll);
    };
  }, []);

  const getGrowthPercent = (current: number, previous: number): string => {
    if (previous === 0) return current === 0 ? '0%' : '+100%';
    const percent = ((current - previous) / previous) * 100;
    const sign = percent >= 0 ? '+' : '';
    return `${sign}${percent.toFixed(1)}%`;
  };

  const average = monthlyUsers.reduce((sum, item) => sum + item.total, 0) / (monthlyUsers.length || 1);
  const renderCustomizedLabel = ({ percent }: { percent: number }) => `${(percent * 100).toFixed(0)}%`;

  return (
    <AdminGuard>
      <AdminLayout onOpenAuth={handleOpenAuth}>
        <main className="flex-1 bg-white">
          <div className="p-4 sm:p-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6">Tổng quan hệ thống</h1>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6">
              {/* Báo cáo */}
              <div className="p-4 sm:p-6 border rounded-xl bg-white">
                <div className="flex justify-between mb-2">
                  <p className="text-sm sm:text-base font-medium text-gray-900">Báo cáo vi phạm hôm nay</p>
                  <FiFlag className="w-5 h-5 sm:w-6 sm:h-6 text-gray-800" />
                </div>
                <p className="text-xl sm:text-2xl font-bold">{summary?.reports_today ?? '...'}</p>
                <p className={`text-sm ${summary && summary.reports_today < summary.reports_yesterday ? 'text-red-500' : 'text-green-600'}`}>
                  {summary ? getGrowthPercent(summary.reports_today, summary.reports_yesterday) : '...'} so với hôm qua
                </p>
              </div>

              {/* Bài đăng */}
              <div className="p-4 sm:p-6 border rounded-xl bg-white">
                <div className="flex justify-between mb-2">
                  <p className="text-sm sm:text-base font-medium text-gray-900">Bài đăng trong tuần</p>
                  <HiOutlineDocumentText className="w-5 h-5 sm:w-6 sm:h-6 text-gray-800" />
                </div>
                <p className="text-xl sm:text-2xl font-bold">{summary?.posts_this_week ?? '...'}</p>
                <p className={`text-sm ${summary && summary.posts_this_week < summary.posts_last_week ? 'text-red-500' : 'text-green-600'}`}>
                  {summary ? getGrowthPercent(summary.posts_this_week, summary.posts_last_week) : '...'} so với tuần trước
                </p>
              </div>

              {/* Người dùng */}
              <div className="p-4 sm:p-6 border rounded-xl bg-white">
                <div className="flex justify-between mb-2">
                  <p className="text-sm sm:text-base font-medium text-gray-900">Người dùng mới hôm nay</p>
                  <FiUserPlus className="w-5 h-5 sm:w-6 sm:h-6 text-gray-800" />
                </div>
                <p className="text-xl sm:text-2xl font-bold">{summary?.new_users_today ?? '...'}</p>
                <p className={`text-sm ${summary && summary.new_users_today < summary.new_users_yesterday ? 'text-red-500' : 'text-green-600'}`}>
                  {summary ? getGrowthPercent(summary.new_users_today, summary.new_users_yesterday) : '...'} so với hôm qua
                </p>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              {/* Bar Chart */}
              <div className="col-span-1 lg:col-span-2 p-4 sm:p-6 border rounded-xl bg-white">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                  <h3 className="text-lg font-semibold">📈 Tài khoản mới theo tháng</h3>
                  <div>
                    <label className="mr-2 text-sm">Chọn năm:</label>
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(Number(e.target.value))}
                      className="p-2 border rounded-md text-sm"
                    >
                      <option value={2025}>2025</option>
                      <option value={2026}>2026</option>
                    </select>
                  </div>
                </div>
                <div className="min-h-72">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={monthlyUsers}>
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <ReferenceLine y={average} stroke="#EF4444" strokeDasharray="4 2" />
                      <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                        {monthlyUsers.map((_, index) => (
                          <Cell key={index} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Pie Chart */}
              <div className="p-4 sm:p-6 border rounded-xl bg-white">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-4">
                  <h3 className="text-lg font-semibold">💬 Cảm xúc bài viết</h3>
                  <select
                    value={sentimentRange}
                    onChange={(e) => setSentimentRange(e.target.value)}
                    className="p-2 border rounded text-sm"
                  >
                    <option value="week">7 ngày gần nhất</option>
                    <option value="month">Tháng này</option>
                  </select>
                </div>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={postSentiment} dataKey="count" nameKey="type" outerRadius={80} label={renderCustomizedLabel}>
                      {postSentiment.map((entry, index) => (
                        <Cell key={index} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Line Chart */}
              <div className="p-4 sm:p-6 border rounded-xl bg-white">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-4">
                  <h3 className="text-lg font-semibold">📊 Lượt truy cập</h3>
                  <select
                    value={visitRange}
                    onChange={(e) => setVisitRange(e.target.value)}
                    className="p-2 border rounded text-sm"
                  >
                    <option value="7">7 ngày</option>
                    <option value="30">30 ngày</option>
                    <option value="all">Toàn bộ</option>
                  </select>
                </div>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={dailyVisits}>
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="total" stroke="#10B981" strokeWidth={3} dot={{ r: 4, stroke: '#10B981', fill: '#fff' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </main>
      </AdminLayout>
    </AdminGuard>
  );
}
