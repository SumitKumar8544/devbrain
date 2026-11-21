import React from 'react';
import type { Note } from '../types';
import {
  Star,
  Code,
  Link2,
  HelpCircle,
  Sparkles,
  ChevronRight,
  Camera,
  FileText,
  Pin,
  Globe,
  Clock,
  BookOpen
} from 'lucide-react';

interface NoteCardProps {
  note: Note;
  onSelect: (note: Note) => void;
  onToggleStar: (id: string, e: React.MouseEvent) => void;
  onQuickAI: (note: Note, e: React.MouseEvent) => void;
}

const formatRelativeTime = (dateStr?: string) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diffSec < 60) return 'Just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 172800) return 'Yesterday';
  if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

export const NoteCard: React.FC<NoteCardProps> = ({
  note,
  onSelect,
  onToggleStar,
  onQuickAI,
}) => {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Mastered':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-300 border-blue-500/25';
      case 'Interview Ready':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/25';
      case 'Exam Ready':
        return 'bg-purple-500/10 text-purple-600 dark:text-purple-300 border-purple-500/25';
      case 'Revising':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-300 border-amber-500/25';
      default:
        return 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20';
    }
  };

  const imageAttachments = note.attachments?.filter(a => a.type === 'image') || [];
  const pdfAttachments = note.attachments?.filter(a => a.type === 'pdf' || a.type === 'document') || [];

  // Estimated reading time
  const wordCount = (note.content || '').trim().split(/\s+/).filter(Boolean).length;
  const readTime = Math.max(1, Math.ceil(wordCount / 160));

  // Humanized excerpt
  const cleanContent = (note.content || '')
    .replace(/[#*`_\[\]()>-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const displaySummary = note.summary || (cleanContent.length > 0 ? cleanContent.slice(0, 135) + '...' : 'Interactive study note with revision key points & resources.');

  const accentColor = note.subject_color || (note.pinned ? '#f59e0b' : '#38bdf8');

  return (
    <div
      onClick={() => onSelect(note)}
      className={`group relative bg-white/80 dark:bg-slate-900/65 backdrop-blur-xl border ${
        note.pinned
          ? 'border-amber-400/60 dark:border-amber-500/40 shadow-md shadow-amber-500/10'
          : 'border-white/80 dark:border-white/10 hover:border-sky-400/60 dark:hover:border-sky-400/50'
      } rounded-2xl p-4.5 cursor-pointer transition-all duration-300 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.35)] hover:shadow-[0_20px_40px_rgb(14,165,233,0.16)] hover:-translate-y-1.5 flex flex-col justify-between overflow-hidden`}
    >
      {/* Subtle Specular Glow in top right */}
      <div className="pointer-events-none absolute -top-20 -right-20 w-44 h-44 bg-gradient-to-br from-white/60 to-transparent dark:from-white/5 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-500" />

      {/* Decorative top color accent bar */}
      <div
        className="absolute top-0 left-0 right-0 h-1 transition-all group-hover:h-1.5"
        style={{
          background: `linear-gradient(to right, ${accentColor}, ${accentColor}88)`
        }}
      />

      <div>
        {/* Photo thumbnail banner if note has images */}
        {imageAttachments.length > 0 && (
          <div className="w-full h-32 -mx-4.5 -mt-4 mb-3.5 bg-slate-100 dark:bg-slate-950 overflow-hidden relative border-b border-slate-200/80 dark:border-slate-800">
            <img
              src={imageAttachments[0].url}
              alt={note.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            {imageAttachments.length > 1 && (
              <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md text-[10px] text-white font-medium flex items-center gap-1 shadow-sm">
                <Camera className="w-3 h-3 text-cyan-300" />
                <span>+{imageAttachments.length - 1} photos</span>
              </span>
            )}
          </div>
        )}

        {/* Top Badges & Star */}
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            {note.pinned === 1 && (
              <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/35 text-amber-600 dark:text-amber-400 shadow-xs">
                <Pin className="w-2.5 h-2.5 fill-amber-500 dark:fill-amber-400" />
                <span>Pinned</span>
              </span>
            )}

            {note.is_public === 1 && (
              <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/35 text-emerald-600 dark:text-emerald-400 shadow-xs" title="Public Shareable Link active">
                <Globe className="w-2.5 h-2.5" />
                <span>Public</span>
              </span>
            )}

            {note.subject_name && (
              <span
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full border shadow-xs"
                style={{
                  backgroundColor: `${note.subject_color || '#0284c7'}15`,
                  borderColor: `${note.subject_color || '#0284c7'}35`,
                  color: note.subject_color || '#0284c7'
                }}
              >
                {note.subject_name}
              </span>
            )}

            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shadow-xs ${getStatusBadge(note.status)}`}>
              {note.status}
            </span>
          </div>

          <button
            onClick={(e) => onToggleStar(note.id, e)}
            title={note.starred ? 'Starred' : 'Add to Starred'}
            className="p-1 rounded-full text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
          >
            <Star
              className={`w-4 h-4 transition-transform ${
                note.starred ? 'text-amber-400 fill-amber-400 scale-110' : 'text-slate-400 hover:scale-110'
              }`}
            />
          </button>
        </div>

        {/* Title */}
        <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-sky-600 dark:group-hover:text-cyan-300 transition-colors line-clamp-1 mb-1.5">
          {note.title}
        </h3>

        {/* Humanized Summary */}
        <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed mb-3">
          {displaySummary}
        </p>

        {/* Tags */}
        {note.tags && note.tags.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap mb-3.5">
            {note.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/60"
              >
                #{tag}
              </span>
            ))}
            {note.tags.length > 3 && (
              <span className="text-[10px] text-slate-400 font-medium">+{note.tags.length - 3}</span>
            )}
          </div>
        )}
      </div>

      {/* Footer Meta & Stats */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-2 flex-wrap">
          {pdfAttachments.length > 0 && (
            <span className="flex items-center gap-1 text-[11px] font-semibold px-1.5 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200/80 dark:border-rose-900/40" title={`${pdfAttachments.length} PDF Documents`}>
              <FileText className="w-3 h-3" />
              <span>{pdfAttachments.length} {pdfAttachments.length === 1 ? 'PDF' : 'PDFs'}</span>
            </span>
          )}

          {imageAttachments.length > 0 && (
            <span className="flex items-center gap-1 text-[11px] font-semibold px-1.5 py-0.5 rounded-md bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 border border-sky-200/80 dark:border-sky-900/40" title={`${imageAttachments.length} Photos`}>
              <Camera className="w-3 h-3" />
              <span>{imageAttachments.length}</span>
            </span>
          )}

          {note.code_snippets && note.code_snippets.length > 0 && (
            <span className="flex items-center gap-1 text-[11px] font-semibold px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/60" title={`${note.code_snippets.length} Code / Formulas`}>
              <Code className="w-3 h-3 text-indigo-500 dark:text-indigo-400" />
              <span>{note.code_snippets.length}</span>
            </span>
          )}

          {note.flashcards && note.flashcards.length > 0 && (
            <span className="flex items-center gap-1 text-[11px] font-semibold px-1.5 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border border-purple-200/80 dark:border-purple-900/40" title={`${note.flashcards.length} Flashcards`}>
              <HelpCircle className="w-3 h-3" />
              <span>{note.flashcards.length}</span>
            </span>
          )}

          <span className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
            <Clock className="w-2.5 h-2.5" />
            <span>{readTime}m read</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          {formatRelativeTime(note.updated_at || note.created_at) && (
            <span className="text-[10px] text-slate-400 font-medium tracking-tight">
              {formatRelativeTime(note.updated_at || note.created_at)}
            </span>
          )}

          <button
            onClick={(e) => onQuickAI(note, e)}
            title="Ask AI Copilot to explain or summarize"
            className="p-1 rounded-md text-purple-500 hover:text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/50 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
          </button>
          
          <span className="text-slate-400 group-hover:text-sky-500 group-hover:translate-x-0.5 transition-all">
            <ChevronRight className="w-4 h-4" />
          </span>
        </div>
      </div>
    </div>
  );
};
