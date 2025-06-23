// Import các type và font từ Next.js
import type { Metadata } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import "./globals.css";
import { UserContextProvider } from "@/contexts/UserContext";
import VisitTracker from '@/components/VisitTracker'; 
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ReactQueryProvider from "./providers/ReactQueryProvider";
import { ForbiddenWordsProvider } from "@/contexts/ForbiddenWordsContext";



// Cấu hình font Be Vietnam Pro với các trọng lượng và hỗ trợ tiếng Việt
const beVietnamPro = Be_Vietnam_Pro({
  weight: ["400", "500", "600", "700"], /* Các trọng lượng font */
  subsets: ["latin", "vietnamese"], /* Hỗ trợ Latin và tiếng Việt */
  variable: "--font-be-vietnam-pro", /* Biến CSS cho font */
  display: "swap", /* Tối ưu hiển thị font */
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Định nghĩa metadata cho ứng dụng
export const metadata: Metadata = {
  title: "Solace", /* Tiêu đề trang */
  description: "A social platform for sharing joyful moments", /* Mô tả trang */
};

// Component RootLayout bao bọc toàn bộ ứng dụng
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // HTML root với ngôn ngữ tiếng Anh
    <html lang="en" className="mdl-js">
      <head>
        {/* Thêm Google Material Symbols để sử dụng icon */}
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=optional"
          rel="stylesheet"
        />
      </head>
      {/* Body áp dụng font và tối ưu chống răng cưa */}
      <body
        className={`${beVietnamPro.variable} font-be-vietnam antialiased`}
        suppressHydrationWarning
      >
        <VisitTracker /> {/*  Gọi API visits khi user mở web */}
        
        <UserContextProvider>
          <ForbiddenWordsProvider> {/* Bọc provider ở đây */}
            <ReactQueryProvider>
              {children}
            </ReactQueryProvider>
          </ForbiddenWordsProvider>
        </UserContextProvider>
      </body>
    </html>
  );
}