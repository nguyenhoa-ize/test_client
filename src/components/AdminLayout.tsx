'use client';

import type { ReactElement } from 'react';
import HeaderAdmin from './HeaderAdmin';
import LeftSidebarAdmin from './LeftSidebarAdmin';

export default function AdminLayout({
  children,
  onOpenAuth,
}: {
  children: React.ReactNode;
  onOpenAuth: (tab: 'login' | 'signup') => void;
}): ReactElement {
  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Desktop layout */}
      <div className="hidden lg:block">
        <div className="flex min-h-screen">
          {/* Sidebar có chiều cao theo nội dung */}
          <LeftSidebarAdmin className="w-64 flex-shrink-0 flex-grow-0 shadow-lg min-h-full" />

          <div className="flex-1 flex flex-col">
            {/* Sticky Header */}
            <HeaderAdmin
              onOpenAuth={onOpenAuth}
              className="sticky top-0 z-40 h-16 shadow-sm"
            />

            {/* Main content */}
            <main className="bg-gray-100 flex-1 overflow-x-visible">
              <div className="p-6">{children}</div>
            </main>
          </div>
        </div>
      </div>

      {/* Mobile & Tablet layout */}
      <div className="block lg:hidden flex flex-col min-h-screen">
        {/* Sticky Header */}
        <HeaderAdmin
          onOpenAuth={onOpenAuth}
          className="sticky top-0 z-40 h-14 shadow-sm"
        />

        <div className="flex flex-1">
          <LeftSidebarAdmin />

          <main className="flex-1 bg-gray-100 overflow-x-hidden">
            <div className="p-2 md:p-4 w-full">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
