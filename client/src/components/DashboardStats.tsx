import React from 'react';
import { VaultStats } from '../types';
import {
  BookOpen,
  Target,
  CheckCircle2,
  Star,
  Award,
  Zap,
  GraduationCap
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
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 mb-8 shadow-xl">
      <div className="flex items-center justify-between mb-6 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-950 text-cyan-400 border border-cyan-800/60">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-white">
              Personal Study & Knowledge Metrics
            </h2>
            <p className="text-xs text-slate-400">
              Long-term retention, revision readiness, and permanent study vault
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 transition-colors"
        >
          Hide Analytics
        </button>
      </div>

      {/* Top Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1.5">
            <span>Total Saved Notes</span>
            <BookOpen className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-white">{stats.totalNotes}</div>
          <div className="text-[10px] text-cyan-400 mt-1">Across {stats.totalSubjects} Notebooks</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1.5">
            <span>Exam & Test Ready</span>
            <Target className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white">{stats.interviewReady}</div>
          <div className="text-[10px] text-emerald-400 mt-1">{interviewPercent}% of total notes</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1.5">
            <span>Mastered Topics</span>
            <CheckCircle2 className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-black text-white">{stats.masteredNotes}</div>
          <div className="text-[10px] text-blue-400 mt-1">{masteredPercent}% fully grasped</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1.5">
            <span>Starred Favorites</span>
            <Star className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-white">{stats.starredNotes}</div>
          <div className="text-[10px] text-amber-400 mt-1">Quick revision material</div>
        </div>
      </div>

      {/* Subject Distribution */}
      <div>
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
          Study Materials by Category / Notebook
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {stats.subjects.map((sub) => {
            const pct = stats.totalNotes > 0
              ? Math.round((sub.note_count / stats.totalNotes) * 100)
              : 0;

            return (
              <div key={sub.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                <div className="flex items-center justify-between text-xs font-medium mb-1.5">
                  <span className="truncate text-slate-200">{sub.name}</span>
                  <span className="text-[11px] font-bold text-cyan-400 ml-2">{sub.note_count}</span>
                </div>
                <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-1.5 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.max(pct, 5)}%`,
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
