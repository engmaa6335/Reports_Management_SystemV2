import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Topbar } from './Topbar';
import { Sidebar } from './Sidebar';

export function MainLayout() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // كشف حجم الشاشة
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // فتح/إغلاق Sidebar تلقائياً حسب حجم الشاشة
  useEffect(() => {
    if (!isMobile) {
      setSidebarOpen(true);
    } else {
      setSidebarOpen(false);
    }
  }, [isMobile]);

  // إغلاق Sidebar عند تغيير الصفحة على الموبايل
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [location.pathname, isMobile]);

  const toggleSidebar = () => setSidebarOpen((v) => !v);

  return (
    <>
      {/* 🔒 Topbar — ثابت في الأعلى */}
      <div className="print:hidden">
        <Topbar onToggleSidebar={toggleSidebar} />
      </div>

      {/* Sidebar — ثابتة تحت Topbar */}
      <div className="print:hidden">
        <Sidebar open={sidebarOpen} />
      </div>

      {/* Main Content — يبدأ أسفل Topbar */}
      <main
        className={`
          pt-16 min-h-screen transition-all duration-300
          print:pt-0
          ${
            isMobile
              ? 'px-0'
              : sidebarOpen
              ? 'ps-64 print:ps-0'  // ps = padding-inline-start (يتبع الاتجاه)
              : 'ps-16 print:ps-0'
          }
        `}
      >
        <div className="p-4 sm:p-6 print:p-0">
          <Outlet />
        </div>
      </main>
    </>
  );
}