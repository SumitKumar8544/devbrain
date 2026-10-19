import React from 'react';
import type { Subject, Note } from '../types';
import {
  BookOpen,
  Star,
  Target,
  GraduationCap,
  CheckCircle2,
  FolderPlus,
  Hash,
  Bookmark,
  Trash2
} from 'lucide-react';

interface SidebarProps {
  subjects: Subject[];
  activeSubjectId: string | null;
  onSelectSubject: (id: string | null) => void;
  activeFilter: string;
  onSelectFilter: (filter: string) => void;
  activeTag: string | null;
  onSelectTag: (tag: string | null) => void;
  notes: Note[];
  onAddSubject: () => void;
  onDeleteSubject?: (id: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  subjects,
  activeSubjectId,
  onSelectSubject,
  activeFilter,
  onSelectFilter,
  activeTag,
  onSelectTag,
  notes,
  onAddSubject,
  onDeleteSubject,
}) => {
  const allTags = Array.from(
    new Set(notes.flatMap((n) => n.tags || []))
  ).filter(Boolean);

  const filterCounts = {
    all: notes.length,
    starred: notes.filter((n) => n.starred === 1).length,
    interview: notes.filter((n) => n.status === 'Interview Ready').length,
    exam: notes.filter((n) => n.status === 'Exam Ready').length,
    mastered: notes.filter((n) => n.status === 'Mastered').length,
  };

  return (
    <aside className="w-64 bg-slate-900/60 border-r border-slate-800/80 p-4 flex flex-col h-[calc(100vh-61px)] overflow-y-auto">
      {/* Quick Filters */}
      <div className="mb-6">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 px-2">
          Vault Views
        </h3>
        <nav className="space-y-1">
          <button
            onClick={() => {
              onSelectFilter('all');
              onSelectSubject(null);
            }}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeFilter === 'all' && activeSubjectId === null
                ? 'bg-cyan-500/15 text-cyan-300 font-semibold border border-cyan-500/30'
                : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-cyan-400" />
              <span>All Notes & Documents</span>
            </div>
            <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-400">
              {filterCounts.all}
            </span>
          </button>

          <button
            onClick={() => {
              onSelectFilter('starred');
              onSelectSubject(null);
            }}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeFilter === 'starred'
                ? 'bg-amber-500/15 text-amber-300 font-semibold border border-amber-500/30'
                : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-400 fill-amber-400/30" />
              <span>Starred & Favorites</span>
            </div>
            <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-400">
              {filterCounts.starred}
            </span>
          </button>

          <button
            onClick={() => {
              onSelectFilter('exam');
              onSelectSubject(null);
            }}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeFilter === 'exam'
                ? 'bg-purple-500/15 text-purple-300 font-semibold border border-purple-500/30'
                : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-purple-400" />
              <span>Exam / Test Prep</span>
            </div>
            <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-400">
              {filterCounts.exam}
            </span>
          </button>

          <button
            onClick={() => {
              onSelectFilter('interview');
              onSelectSubject(null);
            }}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeFilter === 'interview'
                ? 'bg-emerald-500/15 text-emerald-300 font-semibold border border-emerald-500/30'
                : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-emerald-400" />
              <span>Quick Reference</span>
            </div>
            <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-400">
              {filterCounts.interview}
            </span>
          </button>

          <button
            onClick={() => {
              onSelectFilter('mastered');
              onSelectSubject(null);
            }}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeFilter === 'mastered'
                ? 'bg-blue-500/15 text-blue-300 font-semibold border border-blue-500/30'
                : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-400" />
              <span>Mastered Topics</span>
            </div>
            <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-400">
              {filterCounts.mastered}
            </span>
          </button>
        </nav>
      </div>

      {/* Notebooks / Subjects List */}
      <div className="mb-6 flex-1">
        <div className="flex items-center justify-between mb-2 px-2">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Notebooks & Subjects
          </h3>
          <button
            onClick={onAddSubject}
            title="Add Custom Notebook"
            className="text-slate-400 hover:text-cyan-400 transition-colors p-1"
          >
            <FolderPlus className="w-4 h-4" />
          </button>
        </div>

        {subjects.length === 0 ? (
          <div className="px-2 py-4 rounded-lg bg-slate-950/40 border border-slate-800/60 text-center">
            <p className="text-[11px] text-slate-400 mb-2">No notebooks created yet.</p>
            <button
              onClick={onAddSubject}
              className="text-xs text-cyan-400 hover:underline font-semibold"
            >
              + Create Category
            </button>
          </div>
        ) : (
          <div className="space-y-1">
            {subjects.map((sub) => {
              const isSelected = activeSubjectId === sub.id;
              return (
                <div
                  key={sub.id}
                  onClick={() => {
                    onSelectSubject(sub.id);
                    onSelectFilter('all');
                  }}
                  className={`w-full text-left px-2.5 py-2 rounded-lg text-xs transition-all flex items-center justify-between group cursor-pointer ${
                    isSelected
                      ? 'bg-slate-800 text-white font-semibold shadow-inner'
                      : 'text-slate-300 hover:bg-slate-800/40 hover:text-white'
                  }`}
                  style={{
                    borderLeft: isSelected ? `3px solid ${sub.color || '#38bdf8'}` : '3px solid transparent',
                  }}
                >
                  <div className="flex items-center gap-2 min-w-0 pr-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: sub.color || '#38bdf8' }}
                    />
                    <div className="truncate">
                      <p className="truncate font-medium">{sub.name}</p>
                      {sub.category && (
                        <span className="text-[10px] text-slate-400 block truncate">
                          {sub.category}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800/80 text-slate-400 group-hover:text-slate-300">
                      {sub.note_count || 0}
                    </span>

                    {onDeleteSubject && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(`Delete notebook category "${sub.name}"? Any notes in this notebook will remain safe and become Uncategorized.`)) {
                            onDeleteSubject(sub.id);
                          }
                        }}
                        title={`Delete "${sub.name}" notebook`}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-rose-950/80 text-slate-500 hover:text-rose-400 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Tags Filter */}
      {allTags.length > 0 && (
        <div className="pt-4 border-t border-slate-800/80">
          <div className="flex items-center justify-between mb-2 px-1">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Keywords & Tags
            </h3>
            {activeTag && (
              <button
                onClick={() => onSelectTag(null)}
                className="text-[10px] text-cyan-400 hover:underline"
              >
                Clear
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1 max-h-36 overflow-y-auto pr-1">
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => onSelectTag(activeTag === tag ? null : tag)}
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] transition-all ${
                  activeTag === tag
                    ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 font-medium'
                    : 'bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <Hash className="w-2.5 h-2.5 opacity-60" />
                <span>{tag}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
};
