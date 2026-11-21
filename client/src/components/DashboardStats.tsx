import React from 'react';
import { VaultStats } from '../types';
import {
  BookOpen,
  Target,
  CheckCircle2,
  Star,
  Award,
  Zap,
  GraduationCap,
  Sparkles,
  TrendingUp,
  X
} from 'lucide-react';

interface DashboardStatsProps {
  stats: VaultStats | null;
  onClose: () => void;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({ stats, onClose }) => {
  if (!stats) return null;

  const masteredPercent = stats.totalNotes > 0
    ? Math.round((stats.masteredNotes / stats.totalNotes) * 100)
    : 0;

  const interviewPercent = stats.totalNotes > 0
    ? Math.round((stats.interviewReady / stats.totalNotes) * 100)
    : 0;

  return (
    <div className="bg-white/80 dark:bg-slate-900/70 backdrop-blur-2xl border border-white/80 dark:border-white/10 rounded-3xl p-6 sm:p-7 mb-8 shadow-xl shadow-sky-500/5 transition-all">
      <div className="flex items-center justify-between mb-6 border-b border-slate-200/80 dark:border-slate-800/80 pb-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-sky-400 via-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-sky-500/25">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Personal Study & Knowledge Metrics</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-300 border border-sky-400/30">
                LIVE
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Knowledge retention, test readiness, and subject mastery analytics
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white px-3 py-1.5 rounded-xl bg-slate-100/80 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shadow-2xs"
        >
          <X className="w-3.5 h-3.5" />
          <span>Close</span>
        </button>
      </div>

      {/* Top Metric Cards with Frosted Depth */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-950/50 backdrop-blur-md border border-white/80 dark:border-white/10 shadow-sm relative overflow-hidden group hover:-translate-y-0.5 transition-all">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-2 font-medium">
            <span>Total Vault Notes</span>
            <div className="w-7 h-7 rounded-lg bg-sky-500/10 text-sky-500 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">{stats.totalNotes}</div>
          <div className="text-[11px] font-semibold text-sky-600 dark:text-sky-400 mt-1.5 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            <span>Across {stats.totalSubjects} Notebooks</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-950/50 backdrop-blur-md border border-white/80 dark:border-white/10 shadow-sm relative overflow-hidden group hover:-translate-y-0.5 transition-all">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-2 font-medium">
            <span>Exam & Test Ready</span>
            <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center">
              <GraduationCap className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">{stats.interviewReady}</div>
          <div className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 mt-1.5">
            {interviewPercent}% of total notes
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-950/50 backdrop-blur-md border border-white/80 dark:border-white/10 shadow-sm relative overflow-hidden group hover:-translate-y-0.5 transition-all">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-2 font-medium">
            <span>Mastered Topics</span>
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">{stats.masteredNotes}</div>
          <div className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 mt-1.5">
            {masteredPercent}% fully grasped
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-950/50 backdrop-blur-md border border-white/80 dark:border-white/10 shadow-sm relative overflow-hidden group hover:-translate-y-0.5 transition-all">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-2 font-medium">
            <span>Starred Favorites</span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Star className="w-4 h-4 fill-amber-500" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">{stats.starredNotes}</div>
          <div className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 mt-1.5">
            Priority revision material
          </div>
        </div>
      </div>

      {/* Subject Distribution */}
      <div>
        <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
          <span>Study Materials by Category / Notebook</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {stats.subjects.map((sub) => {
            const pct = stats.totalNotes > 0
              ? Math.round((sub.note_count / stats.totalNotes) * 100)
              : 0;

            return (
              <div
                key={sub.id}
                className="p-3.5 rounded-2xl bg-white/60 dark:bg-slate-950/40 backdrop-blur-md border border-white/80 dark:border-white/10 shadow-2xs hover:bg-white dark:hover:bg-slate-950/60 transition-all"
              >
                <div className="flex items-center justify-between text-xs font-semibold mb-2">
                  <div className="flex items-center gap-2 truncate">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: sub.color || '#38bdf8' }}
                    />
                    <span className="truncate text-slate-800 dark:text-slate-200">{sub.name}</span>
                  </div>
                  <span className="text-[11px] font-bold text-sky-600 dark:text-cyan-400 ml-2">
                    {sub.note_count} {sub.note_count === 1 ? 'note' : 'notes'}
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-900 rounded-full h-2 overflow-hidden shadow-inner">
                  <div
                    className="h-2 rounded-full transition-all duration-700 shadow-sm"
                    style={{
                      width: `${Math.max(pct, 6)}%`,
                      backgroundColor: sub.color || '#38bdf8',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
