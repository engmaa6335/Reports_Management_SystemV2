import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Topbar } from './Topbar';
import { Sidebar } from './Sidebar';

export function MainLayout() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // ⭐ كشف حجم الشاشة
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // ⭐ فتح Sidebar تلقائياً على سطح المكتب
  useEffect(() => {
    if (!isMobile) {
      setSidebarOpen(true);
    } else {
      setSidebarOpen(false);
    }
  }, [isMobile]);

  // ⭐ إغلاق Sidebar عند تغيير الصفحة على الموبايل
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [location.pathname, isMobile]);

  const toggleSidebar = () => setSidebarOpen((v) => !v);

  return (
    <div className="min-h-screen bg-bg-secondary">
      {/* 🔒 Topbar — مخفي عند الطباعة */}
      <div className="print:hidden">
        <Topbar onToggleSidebar={toggleSidebar} />
        <Sidebar open={sidebarOpen} />
      </div>

      {/* Main Content */}
      <main
        className={`
          pt-16 min-h-screen transition-all duration-300
          print:pt-0
          ${
            isMobile
              ? 'pr-0'
              : sidebarOpen
              ? 'pr-64 print:pr-0'
              : 'pr-16 print:pr-0'
          }
        `}
      >
        <div className="p-4 sm:p-6 print:p-0">
          <Outlet />
        </div>
      </main>
    </div>
  );
}