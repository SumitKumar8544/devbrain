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
    <aside className="w-64 bg-white/60 dark:bg-slate-900/50 backdrop-blur-xl border-r border-white/60 dark:border-white/10 p-4 flex flex-col h-[calc(100vh-61px)] overflow-y-auto transition-colors">
      {/* Quick Filters */}
      <div className="mb-6">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2 px-2">
          Vault Views
        </h3>
        <nav className="space-y-1">
          <button
            onClick={() => {
              onSelectFilter('all');
              onSelectSubject(null);
            }}
            className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium transition-all ${
              activeFilter === 'all' && activeSubjectId === null
                ? 'bg-sky-500/15 text-sky-600 dark:text-sky-300 font-semibold border border-sky-500/30 shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-lg bg-sky-500/10 text-sky-500 flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-3.5 h-3.5" />
              </div>
              <span>All Notes & Documents</span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              {filterCounts.all}
            </span>
          </button>

          <button
            onClick={() => {
              onSelectFilter('starred');
              onSelectSubject(null);
            }}
            className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium transition-all ${
              activeFilter === 'starred'
                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-300 font-semibold border border-amber-500/30 shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center flex-shrink-0">
                <Star className="w-3.5 h-3.5 fill-amber-500" />
              </div>
              <span>Starred & Favorites</span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              {filterCounts.starred}
            </span>
          </button>

          <button
            onClick={() => {
              onSelectFilter('exam');
              onSelectSubject(null);
            }}
            className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium transition-all ${
              activeFilter === 'exam'
                ? 'bg-purple-500/15 text-purple-600 dark:text-purple-300 font-semibold border border-purple-500/30 shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center flex-shrink-0">
                <GraduationCap className="w-3.5 h-3.5" />
              </div>
              <span>Exam / Test Prep</span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              {filterCounts.exam}
            </span>
          </button>

          <button
            onClick={() => {
              onSelectFilter('interview');
              onSelectSubject(null);
            }}
            className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium transition-all ${
              activeFilter === 'interview'
                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 font-semibold border border-emerald-500/30 shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center flex-shrink-0">
                <Target className="w-3.5 h-3.5" />
              </div>
              <span>Quick Reference</span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              {filterCounts.interview}
            </span>
          </button>

          <button
            onClick={() => {
              onSelectFilter('mastered');
              onSelectSubject(null);
            }}
            className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium transition-all ${
              activeFilter === 'mastered'
                ? 'bg-blue-500/15 text-blue-600 dark:text-blue-300 font-semibold border border-blue-500/30 shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
              <span>Mastered Topics</span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              {filterCounts.mastered}
            </span>
          </button>
        </nav>
      </div>

      {/* Notebooks / Subjects List */}
      <div className="mb-6 flex-1">
        <div className="flex items-center justify-between mb-2.5 px-2">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Notebooks & Subjects
          </h3>
          <button
            onClick={onAddSubject}
            title="Add Custom Notebook"
            className="w-5 h-5 rounded-md hover:bg-sky-500/10 text-slate-400 hover:text-sky-500 transition-colors flex items-center justify-center"
          >
            <FolderPlus className="w-3.5 h-3.5" />
          </button>
        </div>

        {subjects.length === 0 ? (
          <div
            onClick={onAddSubject}
            className="p-3.5 rounded-xl border border-dashed border-sky-400/40 bg-white/40 dark:bg-sky-500/5 backdrop-blur-sm hover:bg-white/70 dark:hover:bg-sky-500/10 transition-all text-center cursor-pointer group shadow-xs"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-sky-400 to-blue-600 text-white flex items-center justify-center mx-auto mb-2 shadow-xs group-hover:scale-105 transition-transform">
              <FolderPlus className="w-4 h-4" />
            </div>
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-sky-500 transition-colors">
              + New Notebook
            </p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
              Organize by course or semester
            </p>
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
        <div className="pt-4 border-t border-slate-200/80 dark:border-slate-800/80">
          <div className="flex items-center justify-between mb-2 px-1">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Keywords & Tags
            </h3>
            {activeTag && (
              <button
                onClick={() => onSelectTag(null)}
                className="text-[10px] text-sky-600 dark:text-cyan-400 hover:underline font-semibold"
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
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] transition-all font-medium ${
                  activeTag === tag
                    ? 'bg-sky-500/20 text-sky-600 dark:text-cyan-300 border border-sky-500/40 font-semibold shadow-xs'
                    : 'bg-white/80 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-slate-700/60 hover:bg-white dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200 shadow-2xs'
                }`}
              >
                <Hash className="w-2.5 h-2.5 opacity-60" />
                <span>{tag}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Quick Keyboard Shortcuts Footer */}
      <div className="mt-auto pt-4 border-t border-slate-200/80 dark:border-slate-800/80">
        <div className="p-3 rounded-xl bg-white/70 dark:bg-slate-900/50 backdrop-blur-md border border-white/80 dark:border-white/10 shadow-sm">
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-2 font-semibold">
            <span>Quick Shortcuts</span>
            <kbd className="px-1.5 py-0.5 rounded-md bg-white/90 dark:bg-slate-800 text-[10px] font-mono text-sky-600 dark:text-sky-400 border border-slate-200 dark:border-slate-700 shadow-2xs">⌘K</kbd>
          </div>
          <div className="space-y-1.5 text-[11px] text-slate-600 dark:text-slate-400">
            <div className="flex items-center justify-between">
              <span>Fast Navigator</span>
              <kbd className="px-1.5 py-0.5 rounded-md bg-white/90 dark:bg-slate-800 text-[10px] font-mono border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 shadow-2xs">Ctrl + K</kbd>
            </div>
            <div className="flex items-center justify-between">
              <span>New Note</span>
              <kbd className="px-1.5 py-0.5 rounded-md bg-white/90 dark:bg-slate-800 text-[10px] font-mono border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 shadow-2xs">Ctrl + N</kbd>
            </div>
            <div className="flex items-center justify-between">
              <span>AI Copilot</span>
              <kbd className="px-1.5 py-0.5 rounded-md bg-white/90 dark:bg-slate-800 text-[10px] font-mono border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 shadow-2xs">Ctrl + J</kbd>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};
