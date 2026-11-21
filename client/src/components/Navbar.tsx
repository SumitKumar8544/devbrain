import React from 'react';
import type { User } from '../types';
import { FocusTimer } from './FocusTimer';
import { useTheme } from '../context/ThemeContext';
import {
  Brain,
  Search,
  Plus,
  Sparkles,
  Settings,
  BarChart3,
  LogOut,
  X,
  Camera,
  FileText,
  Command,
  Sun,
  Moon
} from 'lucide-react';

interface NavbarProps {
  user: User | null;
  onLogout: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onNewNote: () => void;
  onToggleCopilot: () => void;
  isCopilotOpen: boolean;
  onOpenSettings: () => void;
  onToggleStats: () => void;
  showStats: boolean;
  totalNotes: number;
  onOpenCommandPalette?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  onLogout,
  searchQuery,
  onSearchChange,
  onNewNote,
  onToggleCopilot,
  isCopilotOpen,
  onOpenSettings,
  onToggleStats,
  showStats,
  onOpenCommandPalette,
}) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 lg:px-6 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        
        {/* Brand Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 text-white font-bold">
            <Brain className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xl tracking-tight text-white bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                DevBrain
              </span>
              <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-cyan-950 text-cyan-400 border border-cyan-800/60 rounded">
                VAULT
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
              {user ? `${user.name}'s Knowledge Vault` : 'Personal Study & Document Notebook'}
            </p>
          </div>
        </div>

        {/* Global Search Bar with Command Palette Trigger */}
        <div className="flex-1 max-w-md relative hidden md:block">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search notes, tags, PDFs, code..."
            className="w-full pl-9 pr-16 py-1.5 bg-slate-100/80 dark:bg-slate-950/70 text-slate-900 dark:text-slate-100 text-sm rounded-full border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all placeholder:text-slate-400"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            {onOpenCommandPalette && (
              <button
                onClick={onOpenCommandPalette}
                className="flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-[10px] text-slate-500 dark:text-slate-400 hover:text-sky-500 dark:hover:text-cyan-300 font-mono transition-colors shadow-2xs"
                title="Open Command Palette (Ctrl+K)"
              >
                <span>⌘K</span>
              </button>
            )}
          </div>
        </div>

        {/* Actions Group */}
        <div className="flex items-center gap-2">
          {/* Deep Focus Revision Sprint Timer */}
          <FocusTimer />

          {/* Stats Toggle */}
          <button
            onClick={onToggleStats}
            title="Knowledge Vault Analytics"
            className={`p-2 rounded-xl border transition-all ${
              showStats
                ? 'bg-sky-500/15 border-sky-500/40 text-sky-600 dark:text-cyan-300 shadow-xs'
                : 'bg-white/80 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
          </button>

          {/* AI Copilot Toggle */}
          <button
            onClick={onToggleCopilot}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-xs ${
              isCopilotOpen
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-purple-400 shadow-md shadow-purple-500/20'
                : 'bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-300 border-purple-200 dark:border-purple-900/60 hover:bg-purple-100 dark:hover:bg-purple-900/50'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-500 dark:text-purple-400" />
            <span className="hidden sm:inline">AI Copilot</span>
          </button>

          {/* New Note Button */}
          <button
            onClick={onNewNote}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-sky-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Note</span>
          </button>

          {/* Theme Switch: Dark / Bright (Light) Mode */}
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to Bright Mode' : 'Switch to Dark Mode'}
            className="p-2 rounded-xl bg-white/80 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-amber-500 hover:border-slate-300 dark:hover:border-slate-700 transition-all flex items-center justify-center shadow-xs"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400 hover:scale-110 transition-transform" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-500 hover:scale-110 transition-transform" />
            )}
          </button>

          {/* Account & Data Preferences */}
          <button
            onClick={onOpenSettings}
            title="Account & Data Preferences"
            className="p-2 rounded-xl bg-white/80 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-xs"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* User Profile & Logout */}
          {user && (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-sky-400 to-indigo-500 text-white flex items-center justify-center text-xs font-bold shadow-xs">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="hidden xl:flex flex-col text-left">
                <span className="text-xs font-bold text-slate-800 dark:text-white leading-tight truncate max-w-[110px]">
                  {user.name}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[110px]">
                  {user.role || 'Learner'}
                </span>
              </div>
              <button
                onClick={onLogout}
                title="Log out of Vault"
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

      </div>

      {/* Mobile Search Bar */}
      <div className="mt-2.5 md:hidden">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search notes, photos, PDFs, links..."
            className="w-full pl-9 pr-8 py-1.5 bg-slate-950 text-slate-200 text-xs rounded-lg border border-slate-800 focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>
    </header>
  );
};
