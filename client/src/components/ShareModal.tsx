import React, { useState } from 'react';
import type { Note } from '../types';
import { api } from '../services/api';
import {
  X,
  Share2,
  Copy,
  Check,
  Globe,
  Lock,
  Download,
  Printer,
  FileText,
  ExternalLink
} from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  note: Note;
  onNoteUpdated: (updatedNote: Note) => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  note,
  onNoteUpdated,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMarkdown, setCopiedMarkdown] = useState(false);
  const [toggling, setToggling] = useState(false);

  if (!isOpen) return null;

  const shareUrl = note.share_id
    ? `${window.location.origin}/?share=${note.share_id}`
    : '';

  const handleToggleShare = async () => {
    setToggling(true);
    try {
      const res = await api.toggleShare(note.id);
      const updatedNote: Note = {
        ...note,
        is_public: res.is_public,
        share_id: res.share_id,
      };
      onNoteUpdated(updatedNote);
    } catch (err: any) {
      alert(`Failed to update sharing: ${err.message}`);
    } finally {
      setToggling(false);
    }
  };

  const handleCopyLink = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleDownloadMarkdown = () => {
    let md = `# ${note.title}\n\n`;
    if (note.subject_name) md += `**Category:** ${note.subject_name}  \n`;
    md += `**Status:** ${note.status} | **Difficulty:** ${note.difficulty}  \n`;
    if (note.tags?.length) md += `**Tags:** #${note.tags.join(' #')}  \n\n`;
    if (note.summary) md += `> **Key Takeaway:** ${note.summary}\n\n`;
    md += `## Notes\n\n${note.content || ''}\n\n`;

    if (note.attachments?.length) {
      md += `## Attached Photos & Documents\n\n`;
      note.attachments.forEach((att) => {
        md += `- [${att.name}](${window.location.origin}${att.url})\n`;
      });
      md += '\n';
    }

    if (note.resource_links?.length) {
      md += `## Reference Links\n\n`;
      note.resource_links.forEach((l) => {
        md += `- [${l.title}](${l.url}) (${l.type})${l.description ? `: ${l.description}` : ''}\n`;
      });
      md += '\n';
    }

    if (note.flashcards?.length) {
      md += `## Flashcards & Quiz\n\n`;
      note.flashcards.forEach((f, i) => {
        md += `### Q${i + 1}: ${f.question}\n**Answer:** ${f.answer}\n\n`;
      });
    }

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${note.title.replace(/[^a-z0-9_-]/gi, '_')}.md`;
    a.click();
    URL.revokeObjectURL(url);
    setCopiedMarkdown(true);
    setTimeout(() => setCopiedMarkdown(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-950 text-cyan-400 border border-cyan-800/60">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Share & Export Note</h3>
              <p className="text-xs text-slate-400 truncate max-w-[240px]">
                {note.title}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Public Link Toggle Card */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {note.is_public ? (
                  <div className="p-1.5 rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-800/60">
                    <Globe className="w-4 h-4" />
                  </div>
                ) : (
                  <div className="p-1.5 rounded-lg bg-slate-800 text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                )}
                <div>
                  <h4 className="text-xs font-bold text-white">
                    {note.is_public ? 'Public Web Link Active' : 'Private Note (Restricted)'}
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    {note.is_public
                      ? 'Anyone with the link can view this note.'
                      : 'Only you can view and edit this note.'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                disabled={toggling}
                onClick={handleToggleShare}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-md ${
                  note.is_public
                    ? 'bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-rose-300'
                    : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white'
                }`}
              >
                {toggling ? 'Updating...' : note.is_public ? 'Make Private' : 'Enable Link'}
              </button>
            </div>

            {/* Link Box when public */}
            {note.is_public === 1 && (
              <div className="space-y-2 pt-2 border-t border-slate-800/80">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={shareUrl}
                    className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-xs font-mono select-all focus:outline-none"
                  />
                  <button
                    onClick={handleCopyLink}
                    className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-cyan-500/20"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-white" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
                  <span>✨ Read-only view with photos, PDFs & flashcards</span>
                  <a
                    href={shareUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-cyan-400 hover:underline flex items-center gap-0.5 font-medium"
                  >
                    <span>Preview Link</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Quick Export Options */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">
              Offline Export & Print Options
            </h4>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleDownloadMarkdown}
                className="p-3 rounded-2xl bg-slate-950 hover:bg-slate-850 border border-slate-800 hover:border-cyan-500/40 transition-all text-left group"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <FileText className="w-4 h-4 text-cyan-400" />
                  {copiedMarkdown ? (
                    <span className="text-[10px] text-emerald-400 font-bold">Downloaded!</span>
                  ) : (
                    <Download className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-300" />
                  )}
                </div>
                <h5 className="text-xs font-bold text-white group-hover:text-cyan-300">
                  Export Markdown
                </h5>
                <p className="text-[10px] text-slate-400">
                  Save as raw .md file for Obsidian / Notion
                </p>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="p-3 rounded-2xl bg-slate-950 hover:bg-slate-850 border border-slate-800 hover:border-purple-500/40 transition-all text-left group"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <Printer className="w-4 h-4 text-purple-400" />
                  <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-purple-300" />
                </div>
                <h5 className="text-xs font-bold text-white group-hover:text-purple-300">
                  Print to PDF
                </h5>
                <p className="text-[10px] text-slate-400">
                  Formatted sheet for printing or PDF save
                </p>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-950/80 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
