import React from 'react';
import type { User } from '../types';
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
  FileText
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
}) => {
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

        {/* Global Search Bar */}
        <div className="flex-1 max-w-md relative hidden md:block">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search all notes, photos, PDFs, links, topics..."
            className="w-full pl-9 pr-8 py-1.5 bg-slate-950/70 text-slate-200 text-sm rounded-lg border border-slate-800 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all placeholder:text-slate-500"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Actions Group */}
        <div className="flex items-center gap-2">
          {/* Stats Toggle */}
          <button
            onClick={onToggleStats}
            title="Knowledge Vault Analytics"
            className={`p-2 rounded-lg border transition-all ${
              showStats
                ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
                : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
          </button>

          {/* AI Copilot Toggle */}
          <button
            onClick={onToggleCopilot}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
              isCopilotOpen
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-purple-400 shadow-md shadow-purple-500/20'
                : 'bg-slate-950/80 text-purple-300 border-purple-900/60 hover:border-purple-600 hover:bg-purple-950/40'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>AI Copilot</span>
          </button>

          {/* New Note Button */}
          <button
            onClick={onNewNote}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-semibold shadow-md shadow-cyan-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Note</span>
          </button>

          {/* Account & Data Preferences */}
          <button
            onClick={onOpenSettings}
            title="Account & Data Preferences"
            className="p-2 rounded-lg bg-slate-950/60 border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700 transition-all"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* User Profile & Logout */}
          {user && (
            <div className="flex items-center gap-1.5 pl-2 border-l border-slate-800">
              <div className="hidden xl:flex flex-col text-right">
                <span className="text-xs font-bold text-white leading-tight truncate max-w-[120px]">
                  {user.name}
                </span>
                <span className="text-[10px] text-slate-400 truncate max-w-[120px]">
                  {user.role || 'Learner'}
                </span>
              </div>
              <button
                onClick={onLogout}
                title="Log out of Vault"
                className="p-2 rounded-lg bg-slate-950/60 border border-slate-800 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 transition-all"
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
