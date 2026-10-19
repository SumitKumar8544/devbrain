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
  Globe
} from 'lucide-react';

interface NoteCardProps {
  note: Note;
  onSelect: (note: Note) => void;
  onToggleStar: (id: string, e: React.MouseEvent) => void;
  onQuickAI: (note: Note, e: React.MouseEvent) => void;
}

export const NoteCard: React.FC<NoteCardProps> = ({
  note,
  onSelect,
  onToggleStar,
  onQuickAI,
}) => {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Mastered': return 'bg-blue-950/70 text-blue-300 border-blue-800/60';
      case 'Interview Ready': return 'bg-emerald-950/70 text-emerald-300 border-emerald-800/60';
      case 'Exam Ready': return 'bg-purple-950/70 text-purple-300 border-purple-800/60';
      case 'Revising': return 'bg-amber-950/70 text-amber-300 border-amber-800/60';
      default: return 'bg-slate-800/80 text-slate-400 border-slate-700/60';
    }
  };

  const imageAttachments = note.attachments?.filter(a => a.type === 'image') || [];
  const pdfAttachments = note.attachments?.filter(a => a.type === 'pdf' || a.type === 'document') || [];

  return (
    <div
      onClick={() => onSelect(note)}
      className={`group relative bg-slate-900/70 hover:bg-slate-850/90 border ${
        note.pinned ? 'border-amber-500/40 shadow-sm shadow-amber-500/10' : 'border-slate-800 hover:border-slate-700/90'
      } rounded-2xl p-4 cursor-pointer transition-all duration-200 hover:shadow-xl hover:shadow-cyan-950/20 hover:-translate-y-0.5 flex flex-col justify-between overflow-hidden`}
    >
      <div>
        {/* Photo thumbnail banner if note has images */}
        {imageAttachments.length > 0 && (
          <div className="w-full h-32 -mx-4 -mt-4 mb-3 bg-slate-950 overflow-hidden relative border-b border-slate-800">
            <img
              src={imageAttachments[0].url}
              alt={note.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
            />
            {imageAttachments.length > 1 && (
              <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-sm text-[10px] text-white font-medium flex items-center gap-1">
                <Camera className="w-3 h-3" />
                <span>+{imageAttachments.length - 1} photos</span>
              </span>
            )}
          </div>
        )}

        {/* Top Badges & Star */}
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            {note.pinned === 1 && (
              <span className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/40 text-amber-400">
                <Pin className="w-2.5 h-2.5 fill-amber-400" />
                <span>Pinned</span>
              </span>
            )}

            {note.is_public === 1 && (
              <span className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/40 text-emerald-400" title="Public Shareable Link active">
                <Globe className="w-2.5 h-2.5" />
                <span>Public</span>
              </span>
            )}

            {note.subject_name && (
              <span
                className="text-[10px] font-semibold px-2 py-0.5 rounded-md border"
                style={{
                  backgroundColor: `${note.subject_color || '#38bdf8'}15`,
                  borderColor: `${note.subject_color || '#38bdf8'}40`,
                  color: note.subject_color || '#38bdf8'
                }}
              >
                {note.subject_name}
              </span>
            )}

            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${getStatusBadge(note.status)}`}>
              {note.status}
            </span>
          </div>

          <button
            onClick={(e) => onToggleStar(note.id, e)}
            title={note.starred ? 'Starred' : 'Add to Starred'}
            className="p-1 rounded-md text-slate-500 hover:text-amber-400 hover:bg-slate-800/60 transition-colors"
          >
            <Star
              className={`w-4 h-4 ${
                note.starred ? 'text-amber-400 fill-amber-400' : 'text-slate-500'
              }`}
            />
          </button>
        </div>

        {/* Title */}
        <h3 className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors line-clamp-1 mb-1.5">
          {note.title}
        </h3>

        {/* Summary */}
        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-3">
          {note.summary || (note.content ? note.content.slice(0, 140).replace(/[#*`_]/g, '') : 'No summary provided.')}
        </p>

        {/* Tags */}
        {note.tags && note.tags.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap mb-3">
            {note.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800/70 text-slate-300 border border-slate-700/50"
              >
                #{tag}
              </span>
            ))}
            {note.tags.length > 3 && (
              <span className="text-[10px] text-slate-500">+{note.tags.length - 3}</span>
            )}
          </div>
        )}
      </div>

      {/* Footer Meta & Stats */}
      <div className="pt-3 border-t border-slate-800/70 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2.5 flex-wrap">
          {imageAttachments.length > 0 && (
            <span className="flex items-center gap-1 text-[11px] text-cyan-400" title={`${imageAttachments.length} Photos`}>
              <Camera className="w-3.5 h-3.5" />
              <span>{imageAttachments.length}</span>
            </span>
          )}

          {pdfAttachments.length > 0 && (
            <span className="flex items-center gap-1 text-[11px] text-rose-400" title={`${pdfAttachments.length} PDF Documents`}>
              <FileText className="w-3.5 h-3.5" />
              <span>{pdfAttachments.length}</span>
            </span>
          )}

          {note.resource_links && note.resource_links.length > 0 && (
            <span className="flex items-center gap-1 text-[11px] text-indigo-400" title={`${note.resource_links.length} Links`}>
              <Link2 className="w-3.5 h-3.5" />
              <span>{note.resource_links.length}</span>
            </span>
          )}

          {note.code_snippets && note.code_snippets.length > 0 && (
            <span className="flex items-center gap-1 text-[11px] text-slate-400" title={`${note.code_snippets.length} Code / Formulas`}>
              <Code className="w-3.5 h-3.5 text-slate-400" />
              <span>{note.code_snippets.length}</span>
            </span>
          )}

          {note.flashcards && note.flashcards.length > 0 && (
            <span className="flex items-center gap-1 text-[11px] text-purple-400" title={`${note.flashcards.length} Flashcards`}>
              <HelpCircle className="w-3.5 h-3.5" />
              <span>{note.flashcards.length}</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={(e) => onQuickAI(note, e)}
            title="Ask AI to explain this note"
            className="p-1 rounded text-purple-400 hover:text-purple-300 hover:bg-purple-950/50 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
          </button>
          
          <span className="text-slate-500 group-hover:text-slate-300 group-hover:translate-x-0.5 transition-all">
            <ChevronRight className="w-4 h-4" />
          </span>
        </div>
      </div>
    </div>
  );
};
