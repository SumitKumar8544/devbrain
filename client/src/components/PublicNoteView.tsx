import React, { useState, useEffect } from 'react';
import type { Note } from '../types';
import { api } from '../services/api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Brain,
  Share2,
  Copy,
  Check,
  Maximize2,
  Download,
  Printer,
  FileText,
  ExternalLink,
  Code,
  HelpCircle,
  RotateCw,
  Camera,
  FileSpreadsheet,
  File,
  Lock
} from 'lucide-react';

interface PublicNoteViewProps {
  shareId: string;
  onGoHome: () => void;
}

export const PublicNoteView: React.FC<PublicNoteViewProps> = ({
  shareId,
  onGoHome,
}) => {
  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedSnippetIndex, setCopiedSnippetIndex] = useState<number | null>(null);
  const [flippedCardIndex, setFlippedCardIndex] = useState<number | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    api.getPublicNote(shareId)
      .then((data) => {
        setNote(data);
        setError(null);
      })
      .catch((err) => {
        setError(err.message || 'Note not found or sharing has been revoked.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [shareId]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleCopyCode = (code: string, index: number) => {
    navigator.clipboard.writeText(code);
    setCopiedSnippetIndex(index);
    setTimeout(() => setCopiedSnippetIndex(null), 2000);
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${Math.round(bytes / 1024)} KB`;
  };

  const getDocIcon = (filename: string, mime?: string) => {
    const lower = filename.toLowerCase();
    if (lower.endsWith('.pdf') || mime === 'application/pdf') {
      return <FileText className="w-5 h-5 text-rose-400" />;
    }
    if (lower.endsWith('.xlsx') || lower.endsWith('.xls') || lower.endsWith('.csv')) {
      return <FileSpreadsheet className="w-5 h-5 text-emerald-400" />;
    }
    return <File className="w-5 h-5 text-cyan-400" />;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center text-slate-400 text-xs">
        <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping mr-2.5" />
        <span>Loading shared study note...</span>
      </div>
    );
  }

  if (error || !note) {
    return (
      <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center shadow-2xl">
          <div className="w-12 h-12 rounded-2xl bg-rose-950/70 border border-rose-800/60 flex items-center justify-center text-rose-400 mx-auto mb-4">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-white mb-2">Note Not Available</h2>
          <p className="text-xs text-slate-400 mb-6 leading-relaxed">
            {error || 'This shared note is private, has expired, or the link is invalid.'}
          </p>
          <button
            onClick={onGoHome}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-bold shadow-md shadow-cyan-500/20"
          >
            Go to DevBrain Home
          </button>
        </div>
      </div>
    );
  }

  const imageAttachments = note.attachments?.filter(a => a.type === 'image') || [];
  const docAttachments = note.attachments?.filter(a => a.type !== 'image') || [];

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col font-sans">
      {/* Lightbox Modal */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setLightboxImage(null)}
        >
          <img
            src={lightboxImage}
            alt="Full size view"
            className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl"
          />
        </div>
      )}

      {/* Top Reader Navbar */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 sm:px-8 py-3.5">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 cursor-pointer" onClick={onGoHome}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/20">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base tracking-tight text-white">
                  DevBrain
                </span>
                <span className="px-1.5 py-0.2 text-[9px] font-bold bg-cyan-950 text-cyan-400 border border-cyan-800/60 rounded uppercase">
                  Shared Note
                </span>
              </div>
              <p className="text-[10px] text-slate-400">
                Created by {note.author_name || 'a fellow learner'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all"
            >
              {copiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Share Link</span>
                </>
              )}
            </button>

            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all"
              title="Print or Save PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Print / PDF</span>
            </button>

            <button
              onClick={onGoHome}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold shadow-md shadow-cyan-500/20 transition-all"
            >
              Open Vault
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto w-full p-4 sm:p-8 flex-1 space-y-8">
        {/* Note Header Card */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
          <div className="flex items-center gap-2 flex-wrap mb-4">
            {note.subject_name && (
              <span
                className="text-xs font-bold px-3 py-1 rounded-lg border"
                style={{
                  backgroundColor: `${note.subject_color || '#38bdf8'}15`,
                  borderColor: `${note.subject_color || '#38bdf8'}40`,
                  color: note.subject_color || '#38bdf8',
                }}
              >
                {note.subject_name}
              </span>
            )}
            <span className="text-xs font-medium px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700">
              {note.difficulty}
            </span>
            <span className="text-xs font-medium px-2.5 py-1 rounded-lg bg-cyan-950/60 text-cyan-300 border border-cyan-800/60">
              {note.status}
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold text-white mb-4 leading-tight">
            {note.title}
          </h1>

          {note.summary && (
            <div className="p-4 rounded-2xl bg-cyan-950/20 border border-cyan-800/40 text-cyan-200/90 text-sm leading-relaxed mb-4">
              <span className="font-bold text-cyan-400 mr-2">📌 Core Takeaway:</span>
              {note.summary}
            </div>
          )}

          {note.tags && note.tags.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {note.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-2.5 py-0.5 rounded-md bg-slate-800/80 text-slate-400 border border-slate-700/60 font-mono"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Written Notes Markdown */}
        {note.content && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-8">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
              Study Notes & Content
            </h3>
            <div className="prose prose-invert max-w-none prose-headings:text-slate-100 prose-headings:font-bold prose-p:text-slate-300 prose-p:leading-relaxed prose-code:text-cyan-300 prose-code:bg-slate-950 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-pre:bg-slate-950 prose-pre:border prose-pre:border-slate-800">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {note.content}
              </ReactMarkdown>
            </div>
          </div>
        )}

        {/* Photos & Diagrams Gallery */}
        {imageAttachments.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Camera className="w-4 h-4 text-cyan-400" />
              <span>Attached Photos & Diagrams ({imageAttachments.length})</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {imageAttachments.map((att, idx) => (
                <div
                  key={idx}
                  className="group relative bg-slate-950 border border-slate-800 hover:border-cyan-500/50 rounded-2xl overflow-hidden shadow-lg transition-all cursor-pointer"
                  onClick={() => setLightboxImage(att.url)}
                >
                  <div className="w-full h-48 bg-slate-900 relative">
                    <img
                      src={att.url}
                      alt={att.name}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <span className="p-2 rounded-xl bg-black/70 text-white flex items-center gap-1 text-xs">
                        <Maximize2 className="w-3.5 h-3.5" />
                        <span>View Full Screen</span>
                      </span>
                    </div>
                  </div>
                  <div className="p-3 bg-slate-900/90 border-t border-slate-800/80 flex items-center justify-between">
                    <p className="text-xs text-slate-200 font-semibold truncate mr-2" title={att.name}>
                      {att.name}
                    </p>
                    <span className="text-[10px] text-slate-400 flex-shrink-0">
                      {formatFileSize(att.size)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PDF Documents & Files */}
        {docAttachments.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-rose-400" />
              <span>Attached Documents & Files ({docAttachments.length})</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {docAttachments.map((att, idx) => (
                <a
                  key={idx}
                  href={att.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-4 rounded-2xl bg-slate-900/80 hover:bg-slate-850 border border-slate-800 hover:border-cyan-500/40 transition-all flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3 truncate">
                    <div className="p-2.5 rounded-xl bg-slate-800 border border-slate-700/60 flex-shrink-0">
                      {getDocIcon(att.name, att.mimeType)}
                    </div>
                    <div className="truncate">
                      <p className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors truncate">
                        {att.name}
                      </p>
                      <span className="text-[10px] text-slate-400">
                        {att.type === 'pdf' ? 'PDF Document' : 'Document File'} • {formatFileSize(att.size)}
                      </span>
                    </div>
                  </div>
                  <Download className="w-4 h-4 text-slate-500 group-hover:text-cyan-300 flex-shrink-0 ml-2" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Flashcards Practice Mode */}
        {note.flashcards && note.flashcards.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-purple-400" />
              <span>Interactive Memory Flashcards ({note.flashcards.length})</span>
            </h3>
            <p className="text-xs text-slate-400">
              💡 Click any card below to flip and test your understanding!
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {note.flashcards.map((card, idx) => {
                const isFlipped = flippedCardIndex === idx;
                return (
                  <div
                    key={idx}
                    onClick={() => setFlippedCardIndex(isFlipped ? null : idx)}
                    className={`min-h-[160px] p-5 rounded-2xl border cursor-pointer transition-all duration-300 flex flex-col justify-between ${
                      isFlipped
                        ? 'bg-cyan-950/40 border-cyan-500/60 shadow-lg text-cyan-100'
                        : 'bg-slate-900/80 hover:bg-slate-850 border-slate-800 text-white'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                        <span className="font-bold uppercase tracking-wider text-[10px] text-cyan-400">
                          {isFlipped ? 'Answer' : `Card #${idx + 1}`}
                        </span>
                        <span className="flex items-center gap-1 text-[11px] text-slate-400">
                          <RotateCw className="w-3 h-3" />
                          <span>{isFlipped ? 'Show question' : 'Click to flip'}</span>
                        </span>
                      </div>
                      <p className="text-sm font-semibold leading-relaxed">
                        {isFlipped ? card.answer : card.question}
                      </p>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-3 pt-2 border-t border-slate-800">
                      {isFlipped ? '✅ Understood' : '❓ Question prompt'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Code Snippets */}
        {note.code_snippets && note.code_snippets.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Code className="w-4 h-4 text-cyan-400" />
              <span>Code Implementations & Formulas</span>
            </h3>
            {note.code_snippets.map((snip, idx) => (
              <div key={idx} className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800 text-xs">
                  <span className="font-semibold text-slate-200">{snip.title || `Snippet #${idx + 1}`}</span>
                  <button
                    onClick={() => handleCopyCode(snip.code, idx)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs transition-all"
                  >
                    {copiedSnippetIndex === idx ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-4 sm:p-6 overflow-x-auto text-xs text-cyan-200 font-mono leading-relaxed">
                  <code>{snip.code}</code>
                </pre>
              </div>
            ))}
          </div>
        )}

        {/* Reference Links */}
        {note.resource_links && note.resource_links.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Study Links & References
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {note.resource_links.map((link, idx) => (
                <a
                  key={idx}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-4 rounded-2xl bg-slate-900/80 hover:bg-slate-850 border border-slate-800 hover:border-cyan-500/40 transition-all flex items-center justify-between group"
                >
                  <div className="truncate mr-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 inline-block mb-1">
                      {link.type}
                    </span>
                    <h4 className="text-xs font-bold text-white group-hover:text-cyan-300 truncate">
                      {link.title}
                    </h4>
                  </div>
                  <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-cyan-300 flex-shrink-0" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Call to action at bottom */}
        <div className="p-8 rounded-3xl bg-gradient-to-r from-cyan-950/40 via-blue-950/30 to-purple-950/40 border border-cyan-800/40 text-center space-y-3 shadow-xl">
          <Brain className="w-8 h-8 text-cyan-400 mx-auto" />
          <h3 className="text-base font-extrabold text-white">
            DevBrain Knowledge Vault
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Store handwritten whiteboard photos, PDF documents, links, and study notes with an integrated AI copilot.
          </p>
          <button
            onClick={onGoHome}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold shadow-lg shadow-cyan-500/25 transition-all"
          >
            Create Your Own Free Study Notebook
          </button>
        </div>
      </main>
    </div>
  );
};
