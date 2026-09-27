'use client';

/**
 * src/components/layout/header.tsx
 *
 * Header component – fixed top bar with logo, page title, theme toggle,
 * user menu, notifications, and mobile menu toggle.
 * 
 * ✅ يستخدم React Router (useNavigate) بدلاً من Next.js (useRouter)
 * ✅ متوافق مع Vite + React Router v6 وخالٍ تماماً من تعارضات CSS classes
 */

import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Menu,
  Search,
  Sun,
  Moon,
  Bell,
  User,
  Settings,
  LogOut,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import { useUIStore } from '@/stores/ui-store';
import { APP_ROUTES } from '@/constants';
import { logout as logoutService } from '@/services/auth.service';

export interface HeaderProps {
  pageTitle?: string;
  onMenuToggle: () => void;
}

const Header: React.FC<HeaderProps> = ({ pageTitle, onMenuToggle }) => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const theme = useUIStore((state) => state.theme);
  const toggleTheme = useUIStore((state) => state.toggleTheme);

  // Dropdown state
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sync theme with document element
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  const handleLogout = async () => {
    try {
      await logoutService();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed', error);
    }
  };

  const isDark = theme === 'dark';
  const userInitials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?';

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-40 h-16 flex items-center px-4 border-b border-white/10',
        isDark ? 'bg-[#080C14]/80 backdrop-blur-lg' : 'bg-white/80 backdrop-blur-lg'
      )}
    >
      {/* Left: Menu button + Logo / Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="p-2 rounded-lg hover:bg-white/5 transition-colors lg:hidden"
          aria-label="Toggle sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-bold text-primary">ArchSentinel</span>
          {pageTitle && (
            <span className="text-sm text-gray-400 hidden sm:inline">/ {pageTitle}</span>
          )}
        </div>
      </div>

      {/* Center: Search bar (optional) - تم حل تضارب hidden و flex */}
      <div className="flex-1 justify-center mx-4 hidden md:flex">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search..."
            className="w-full pl-10 pr-4 py-2 bg-black/20 border border-white/10 rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2 ml-auto">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg hover:bg-white/5 transition-colors"
          aria-label="Toggle theme"
        >
          {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        {/* Notifications */}
        <button
          className="p-2 rounded-lg hover:bg-white/5 transition-colors relative"
          aria-label="Notifications"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        {/* User menu */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 p-1 rounded-lg hover:bg-white/5 transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="User menu"
            aria-expanded={dropdownOpen}
          >
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-semibold text-primary">
              {userInitials}
            </div>
            <ChevronDown
              className={cn('w-4 h-4 transition-transform', dropdownOpen && 'rotate-180')}
            />
          </button>

          {/* Dropdown */}
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-black/90 backdrop-blur-lg border border-white/10 rounded-lg shadow-xl overflow-hidden z-50">
              <div className="px-4 py-3 border-b border-white/5">
                <p className="text-sm font-medium">{user?.name || 'User'}</p>
                <p className="text-xs text-gray-400">{user?.email || ''}</p>
              </div>
              <ul className="py-1">
                <li>
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      navigate('/profile');
                    }}
                    className="flex items-center gap-3 w-full px-4 py-2 text-sm hover:bg-white/5 transition-colors"
                  >
                    <User className="w-4 h-4" /> Profile
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      navigate(APP_ROUTES.settings);
                    }}
                    className="flex items-center gap-3 w-full px-4 py-2 text-sm hover:bg-white/5 transition-colors"
                  >
                    <Settings className="w-4 h-4" /> Settings
                  </button>
                </li>
                <li className="border-t border-white/5">
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      handleLogout();
                    }}
                    className="flex items-center gap-3 w-full px-4 py-2 text-sm text-red-400 hover:bg-white/5 transition-colors"
                  >
                    <LogOut className="w-4 h-4" /> Logout
                  </button>
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default React.memo(Header);