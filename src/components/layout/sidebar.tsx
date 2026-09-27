/**
 * src/components/layout/sidebar.tsx
 *
 * Sidebar component – persistent navigation panel with collapse/expand,
 * active route highlighting, and user profile section.
 * 
 * ✅ تم تحسين الأداء، إدارة المسارات، ومنع تداخل طبقات الـ DOM.
 */

import React, { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderKanban,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import { useUIStore } from '@/stores/ui-store';
import { APP_ROUTES } from '@/constants';

// ============================================================
// Props Interface
// ============================================================

export interface SidebarProps {
  /** Whether the sidebar is in collapsed state (icons only). */
  collapsed: boolean;
  /** Callback to toggle collapsed state. */
  onToggleCollapse: () => void;
}

// ============================================================
// Navigation Items Interface & Configuration
// ============================================================

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
}

const navItems = [
  { href: APP_ROUTES.home, label: 'Dashboard', icon: LayoutDashboard },
  { href: APP_ROUTES.projects, label: 'Projects', icon: FolderKanban },
  { href: APP_ROUTES.analyses, label: 'Analysis', icon: BarChart3 }, // <-- التعديل هنا: استخدام APP_ROUTES.analyses بدلاً من '/analysis'
  { href: APP_ROUTES.settings, label: 'Settings', icon: Settings },
];

// ============================================================
// Component Implementation
// ============================================================

const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggleCollapse }) => {
  const location = useLocation();
  const pathname = location.pathname;

  const user = useAuthStore((state) => state.user);
  const theme = useUIStore((state) => state.theme);
  const isDark = theme === 'dark';

  // Helper to check active route with precise segment matching
  const isActive = (href: string) => {
    if (href === APP_ROUTES.home) {
      return pathname === href;
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  // Memoized user initials calculation for performance optimization
  const initials = useMemo(() => {
    if (!user?.name) return '?';
    return user.name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }, [user?.name]);

  return (
    <aside
      className={cn(
        'flex flex-col h-full bg-black/40 backdrop-blur-xl border-r border-white/10 transition-all duration-300 relative select-none z-30',
        isDark ? 'text-white' : 'text-gray-900',
        collapsed ? 'w-16' : 'w-64'
      )}
      aria-label="Main navigation"
    >
      {/* Brand / Logo Section */}
      <div className="flex items-center h-16 px-4 border-b border-white/5 shrink-0">
        <div
          className={cn(
            'text-xl font-bold text-primary transition-all duration-300 overflow-hidden whitespace-nowrap',
            collapsed ? 'opacity-0 w-0 pointer-events-none' : 'opacity-100 w-auto'
          )}
        >
          ArchSentinel
        </div>
        <div
          className={cn(
            'text-xl font-bold text-primary transition-all duration-300 mx-auto overflow-hidden whitespace-nowrap',
            collapsed ? 'opacity-100 w-auto' : 'opacity-0 w-0 pointer-events-none'
          )}
        >
          AS
        </div>
      </div>

      {/* Navigation Links List */}
      <nav className="flex-1 py-4 space-y-1.5 overflow-y-auto overflow-x-hidden px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group relative',
                'focus:outline-none focus:ring-2 focus:ring-primary/50',
                active
                  ? 'bg-primary/20 text-primary border border-primary/30 shadow-sm shadow-primary/10'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              )}
              aria-current={active ? 'page' : undefined}
              title={collapsed ? item.label : undefined}
            >
              <Icon
                className={cn(
                  'w-5 h-5 shrink-0 transition-transform duration-200 group-hover:scale-110',
                  active ? 'text-primary' : 'text-gray-400 group-hover:text-white'
                )}
              />
              <span
                className={cn(
                  'text-sm font-medium transition-all duration-300 whitespace-nowrap overflow-hidden',
                  collapsed ? 'opacity-0 w-0 pointer-events-none' : 'opacity-100 w-auto'
                )}
              >
                {item.label}
              </span>

              {/* Tooltip hint when collapsed for better UX */}
              {collapsed && (
                <div className="absolute left-full ml-2 px-2.5 py-1 bg-gray-900 text-white text-xs rounded-md shadow-md opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap border border-white/10">
                  {item.label}
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User Profile Section */}
      <div className="border-t border-white/5 p-3 shrink-0">
        <div
          className={cn(
            'flex items-center gap-3 p-2 rounded-xl bg-white/5 border border-white/5',
            collapsed ? 'justify-center' : 'justify-start'
          )}
        >
          <div className="w-9 h-9 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center text-xs font-bold text-primary shrink-0 shadow-inner">
            {initials}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0 overflow-hidden">
              <p className="text-xs font-semibold truncate text-white">{user?.name || 'مستخدم نظام'}</p>
              <p className="text-[10px] text-gray-400 truncate">{user?.email || 'user@archsentinel.com'}</p>
            </div>
          )}
        </div>
      </div>

      {/* Collapse / Expand Toggle Button */}
      <button
        onClick={onToggleCollapse}
        className={cn(
          'absolute -right-3 top-20 w-6 h-6 rounded-full bg-primary/20 border border-primary/40',
          'flex items-center justify-center text-primary shadow-lg',
          'hover:bg-primary hover:text-black transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-primary z-40'
        )}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? (
          <ChevronRight className="w-3.5 h-3.5" />
        ) : (
          <ChevronLeft className="w-3.5 h-3.5" />
        )}
      </button>
    </aside>
  );
};

// ============================================================
// Exports
// ============================================================

export default React.memo(Sidebar);