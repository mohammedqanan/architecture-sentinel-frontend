/**
 * src/components/layout/main-layout.tsx
 *
 * Main Layout component – provides the primary structural wrapper for authenticated pages.
 * Includes a collapsible sidebar, fixed header, main content area, and optional 3D background.
 */

import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores/ui-store';
import Sidebar from './sidebar';
import Header from './header';
import TopologyView from '@/components/3d/topology-view';
import { ErrorBoundary } from '@/components/ui/error-boundary';

export interface MainLayoutProps {
  children: React.ReactNode;
  className?: string;
  show3DBackground?: boolean;
  pageTitle?: string;
}

const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  className,
  show3DBackground = false,
  pageTitle,
}) => {
  const location = useLocation();
  const pathname = location.pathname;

  const theme = useUIStore((state) => state.theme);
  const sidebarCollapsed = useUIStore((state) => state.sidebarCollapsed);
  const toggleSidebar = useUIStore((state) => state.toggleSidebar);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const isDark = theme === 'dark';
  const bgClass = isDark ? 'bg-[#080C14] text-white' : 'bg-gray-100 text-gray-900';

  const sidebarWidth = sidebarCollapsed ? 'w-16' : 'w-64';
  const sidebarTransition = 'transition-all duration-300 ease-in-out';
  const contentMargin = sidebarCollapsed ? 'ml-16' : 'ml-64';

  return (
    <div className={cn('min-h-screen flex flex-col', bgClass, className)}>
      <Header
        pageTitle={pageTitle}
        onMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
      />

      <div className="flex flex-1 pt-16">
        <aside
          className={cn(
            'fixed left-0 top-16 h-[calc(100vh-4rem)] z-30',
            'bg-black/30 backdrop-blur-lg border-r border-white/10',
            sidebarTransition,
            sidebarWidth,
            'lg:relative lg:top-0 lg:h-full lg:translate-x-0',
            mobileMenuOpen ? 'translate-x-0' : '-translate-x-full',
            'lg:translate-x-0'
          )}
          role="navigation"
          aria-label="Main navigation"
        >
          <Sidebar
            collapsed={sidebarCollapsed}
            onToggleCollapse={toggleSidebar}
          />
        </aside>

        <main
          className={cn(
            'flex-1 p-4 lg:p-6',
            sidebarTransition,
            'lg:' + contentMargin,
            'w-full'
          )}
        >
          {show3DBackground && (
            <ErrorBoundary fallbackMessage="3D visualization unavailable">
              <div className="fixed inset-0 -z-10 pointer-events-none opacity-30">
                <TopologyView nodes={[]} edges={[]} />
              </div>
            </ErrorBoundary>
          )}

          {children}
        </main>
      </div>

      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}
    </div>
  );
};

export default React.memo(MainLayout);