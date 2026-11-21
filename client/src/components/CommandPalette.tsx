import React, { useState, useEffect, useRef } from 'react';
import type { Note, Subject } from '../types';
import { useTheme } from '../context/ThemeContext';
import {
  Search,
  BookOpen,
  FileText,
  Plus,
  Sparkles,
  Settings,
  Download,
  PenTool,
  Star,
  Flame,
  ArrowRight,
  Sun,
  Moon
} from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  notes: Note[];
  subjects: Subject[];
  onSelectNote: (note: Note) => void;
  onSelectSubject: (subjectId: string | null) => void;
  onCreateNote: () => void;
  onOpenCopilot: () => void;
  onOpenSettings: () => void;
  onOpenCanvas: () => void;
  onExportVault: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  notes,
  subjects,
  onSelectNote,
  onSelectSubject,
  onCreateNote,
  onOpenCopilot,
  onOpenSettings,
  onOpenCanvas,
  onExportVault,
}) => {
  const { theme, toggleTheme } = useTheme();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Filter items based on query
  const trimmed = query.trim().toLowerCase();

  const matchingNotes = notes
    .filter(
      (n) =>
        n.title.toLowerCase().includes(trimmed) ||
        (n.summary && n.summary.toLowerCase().includes(trimmed)) ||
        (n.tags && n.tags.some((t) => t.toLowerCase().includes(trimmed)))
    )
    .slice(0, 6);

  const matchingSubjects = subjects
    .filter(
      (s) =>
        s.name.toLowerCase().includes(trimmed) ||
        (s.code && s.code.toLowerCase().includes(trimmed))
    )
    .slice(0, 4);

  const actions = [
    {
      id: 'create_note',
      title: 'Create New Study Note',
      category: 'Actions',
      icon: Plus,
      color: 'text-cyan-400',
      action: () => {
        onClose();
        onCreateNote();
      },
    },
    {
      id: 'open_copilot',
      title: 'Ask AI Study Copilot',
      category: 'Actions',
      icon: Sparkles,
      color: 'text-purple-400',
      action: () => {
        onClose();
        onOpenCopilot();
      },
    },
    {
      id: 'open_canvas',
      title: 'Open Whiteboard & Diagram Sketchpad',
      category: 'Actions',
      icon: PenTool,
      color: 'text-emerald-400',
      action: () => {
        onClose();
        onOpenCanvas();
      },
    },
    {
      id: 'export_vault',
      title: 'Backup Knowledge Vault (JSON)',
      category: 'Actions',
      icon: Download,
      color: 'text-amber-400',
      action: () => {
        onClose();
        onExportVault();
      },
    },
    {
      id: 'toggle_theme',
      title: theme === 'dark' ? 'Switch to Bright Mode (Light Theme)' : 'Switch to Dark Mode (Dark Theme)',
      category: 'Preferences',
      icon: theme === 'dark' ? Sun : Moon,
      color: theme === 'dark' ? 'text-amber-400' : 'text-indigo-400',
      action: () => {
        onClose();
        toggleTheme();
      },
    },
    {
      id: 'settings',
      title: 'Vault Settings & Cloud Status',
      category: 'Actions',
      icon: Settings,
      color: 'text-slate-400',
      action: () => {
        onClose();
        onOpenSettings();
      },
    },
  ].filter((a) => a.title.toLowerCase().includes(trimmed));

  // Flatten searchable entries for keyboard navigation
  const allItems: { type: 'action' | 'note' | 'subject'; data: any }[] = [
    ...actions.map((a) => ({ type: 'action' as const, data: a })),
    ...matchingNotes.map((n) => ({ type: 'note' as const, data: n })),
    ...matchingSubjects.map((s) => ({ type: 'subject' as const, data: s })),
  ];

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (allItems.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + allItems.length) % (allItems.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = allItems[selectedIndex];
      if (item) {
        if (item.type === 'action') {
          item.data.action();
        } else if (item.type === 'note') {
          onClose();
          onSelectNote(item.data);
        } else if (item.type === 'subject') {
          onClose();
          onSelectSubject(item.data.id);
        }
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl shadow-cyan-950/40 overflow-hidden flex flex-col max-h-[75vh]"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-800 bg-slate-900/90">
          <Search className="w-5 h-5 text-cyan-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a note, subject, or command (e.g. 'tree', 'new note', 'sql')..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-400 focus:outline-none"
          />
          <kbd className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] text-slate-400 font-mono">
            ESC
          </kbd>
        </div>

        {/* Results Container */}
        <div className="flex-1 overflow-y-auto p-2 divide-y divide-slate-800/40 space-y-2">
          {/* Actions section */}
          {actions.length > 0 && (
            <div>
              <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Quick Commands
              </div>
              {actions.map((act) => {
                const globalIdx = allItems.findIndex((it) => it.type === 'action' && it.data.id === act.id);
                const isSelected = globalIdx === selectedIndex;
                const IconComponent = act.icon;
                return (
                  <div
                    key={act.id}
                    onClick={() => act.action()}
                    onMouseEnter={() => setSelectedIndex(globalIdx)}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer text-xs transition-colors ${
                      isSelected ? 'bg-cyan-500/15 text-cyan-200 border border-cyan-500/30' : 'text-slate-300 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <IconComponent className={`w-4 h-4 ${act.color}`} />
                      <span className="font-medium text-slate-200">{act.title}</span>
                    </div>
                    <ArrowRight className={`w-3.5 h-3.5 text-slate-500 ${isSelected ? 'text-cyan-400' : ''}`} />
                  </div>
                );
              })}
            </div>
          )}

          {/* Notes section */}
          {matchingNotes.length > 0 && (
            <div className="pt-2">
              <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Study Notes ({matchingNotes.length})
              </div>
              {matchingNotes.map((n) => {
                const globalIdx = allItems.findIndex((it) => it.type === 'note' && it.data.id === n.id);
                const isSelected = globalIdx === selectedIndex;
                return (
                  <div
                    key={n.id}
                    onClick={() => {
                      onClose();
                      onSelectNote(n);
                    }}
                    onMouseEnter={() => setSelectedIndex(globalIdx)}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer text-xs transition-colors ${
                      isSelected ? 'bg-cyan-500/15 text-cyan-200 border border-cyan-500/30' : 'text-slate-300 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <div className="truncate">
                        <span className="font-semibold text-slate-200 truncate block">{n.title}</span>
                        {n.summary && <span className="text-[11px] text-slate-400 truncate block">{n.summary}</span>}
                      </div>
                    </div>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 flex-shrink-0">
                      {n.difficulty || 'Note'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Subjects section */}
          {matchingSubjects.length > 0 && (
            <div className="pt-2">
              <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Notebooks & Subjects ({matchingSubjects.length})
              </div>
              {matchingSubjects.map((sub) => {
                const globalIdx = allItems.findIndex((it) => it.type === 'subject' && it.data.id === sub.id);
                const isSelected = globalIdx === selectedIndex;
                return (
                  <div
                    key={sub.id}
                    onClick={() => {
                      onClose();
                      onSelectSubject(sub.id);
                    }}
                    onMouseEnter={() => setSelectedIndex(globalIdx)}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer text-xs transition-colors ${
                      isSelected ? 'bg-cyan-500/15 text-cyan-200 border border-cyan-500/30' : 'text-slate-300 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <BookOpen className="w-4 h-4 text-cyan-400" />
                      <span className="font-semibold text-slate-200">{sub.name}</span>
                      {sub.code && <span className="text-[10px] text-slate-500 font-mono">({sub.code})</span>}
                    </div>
                    <span className="text-[10px] text-slate-400">Filter View</span>
                  </div>
                );
              })}
            </div>
          )}

          {allItems.length === 0 && (
            <div className="py-12 text-center text-slate-500 text-xs">
              No matching notes, commands, or subjects found for "{query}".
            </div>
          )}
        </div>

        {/* Footer info bar */}
        <div className="px-4 py-2 border-t border-slate-800/80 bg-slate-950 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-3">
            <span><kbd className="px-1 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]">↑↓</kbd> Navigate</span>
            <span><kbd className="px-1 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]">Enter</kbd> Select</span>
          </div>
          <span>DevBrain Fast Command Navigator</span>
        </div>
      </div>
    </div>
  );
};
