import React, { useState, useEffect, useRef } from 'react';
import type { Note, Attachment } from '../types';
import { api } from '../services/api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  ArrowLeft,
  Edit3,
  Trash2,
  Star,
  Code,
  Link2,
  HelpCircle,
  BookOpen,
  Sparkles,
  Copy,
  Check,
  ExternalLink,
  Camera,
  FileText,
  RotateCw,
  Maximize2,
  Upload,
  Plus,
  File,
  FileSpreadsheet,
  Download,
  X,
  Share2,
  Pin,
  Printer
} from 'lucide-react';
import { ShareModal } from './ShareModal';

interface NoteDetailProps {
  note: Note;
  onBack: () => void;
  onEdit: (note: Note) => void;
  onDelete: (id: string) => void;
  onToggleStar: (id: string, e: React.MouseEvent) => void;
  onAskAIAction: (note: Note, action: string) => void;
  onNoteUpdated?: (note: Note) => void;
}

export const NoteDetail: React.FC<NoteDetailProps> = ({
  note: initialNote,
  onBack,
  onEdit,
  onDelete,
  onToggleStar,
  onAskAIAction,
  onNoteUpdated,
}) => {
  const [note, setNote] = useState<Note>(initialNote);
  const [activeTab, setActiveTab] = useState<'notes' | 'attachments' | 'links' | 'code' | 'flashcards'>('notes');
  const [copiedSnippetIndex, setCopiedSnippetIndex] = useState<number | null>(null);
  const [flippedCardIndex, setFlippedCardIndex] = useState<number | null>(null);
  const [activeCodeIndex, setActiveCodeIndex] = useState<number>(0);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Direct multi-file upload state
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadCount, setUploadCount] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setNote(initialNote);
  }, [initialNote]);

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

  const handleFilesSelected = async (fileList: FileList | File[]) => {
    const filesArray = Array.from(fileList);
    if (filesArray.length === 0) return;

    setUploading(true);
    setUploadCount(filesArray.length);

    try {
      const uploadedAttachments = await api.uploadFiles(filesArray);
      const existing = note.attachments || [];
      const updatedAttachments = [...existing, ...uploadedAttachments];

      const updated = await api.updateNote(note.id, {
        ...note,
        attachments: updatedAttachments,
      });

      setNote(updated);
      if (onNoteUpdated) onNoteUpdated(updated);
    } catch (err: any) {
      console.error('File upload error:', err);
      alert(`Failed to upload files: ${err.message || 'Please check server connection'}`);
    } finally {
      setUploading(false);
      setUploadCount(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteAttachment = async (indexToDelete: number) => {
    const attToDelete = note.attachments[indexToDelete];
    if (!window.confirm(`Delete "${attToDelete?.name || 'this file'}" from this note?`)) {
      return;
    }

    try {
      const updatedAttachments = note.attachments.filter((_, idx) => idx !== indexToDelete);
      const updated = await api.updateNote(note.id, {
        ...note,
        attachments: updatedAttachments,
      });
      setNote(updated);
      if (onNoteUpdated) onNoteUpdated(updated);
    } catch (err: any) {
      alert(`Failed to delete file: ${err.message}`);
    }
  };

  const handleTogglePin = async () => {
    try {
      const res = await api.togglePin(note.id);
      const updated = { ...note, pinned: res.pinned };
      setNote(updated);
      if (onNoteUpdated) onNoteUpdated(updated);
    } catch (err: any) {
      alert(`Failed to pin note: ${err.message}`);
    }
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Mastered': return 'bg-blue-950/70 text-blue-300 border-blue-800/60';
      case 'Interview Ready': return 'bg-emerald-950/70 text-emerald-300 border-emerald-800/60';
      case 'Exam Ready': return 'bg-purple-950/70 text-purple-300 border-purple-800/60';
      case 'Revising': return 'bg-amber-950/70 text-amber-300 border-amber-800/60';
      default: return 'bg-slate-800/80 text-slate-400 border-slate-700/60';
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-16">
      {/* Lightbox Modal for Photos */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setLightboxImage(null)}
        >
          <img
            src={lightboxImage}
            alt="Expanded view"
            className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl"
          />
        </div>
      )}

      {/* Top Bar Navigation & Actions */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-all text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Notes</span>
        </button>

        <div className="flex items-center gap-2">
          {/* Pin Button */}
          <button
            onClick={handleTogglePin}
            className={`p-2 rounded-lg border transition-all ${
              note.pinned
                ? 'bg-amber-500/10 border-amber-500/40 text-amber-400'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-amber-400 hover:bg-slate-800'
            }`}
            title={note.pinned ? 'Pinned to top' : 'Pin note to top'}
          >
            <Pin className={`w-4 h-4 ${note.pinned ? 'fill-amber-400' : ''}`} />
          </button>

          {/* Star Button */}
          <button
            onClick={(e) => onToggleStar(note.id, e)}
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-all"
            title={note.starred ? 'Starred' : 'Add to Starred'}
          >
            <Star className={`w-4 h-4 ${note.starred ? 'text-amber-400 fill-amber-400' : ''}`} />
          </button>

          {/* Share Modal Trigger */}
          <button
            onClick={() => setIsShareModalOpen(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
              note.is_public
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/40'
                : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
            title="Share & Export Note"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>{note.is_public ? 'Shared Link' : 'Share'}</span>
          </button>

          {/* Print / Save to PDF */}
          <button
            onClick={() => window.print()}
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
            title="Print or Save as PDF"
          >
            <Printer className="w-4 h-4" />
          </button>

          {/* Edit */}
          <button
            onClick={() => onEdit(note)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-all text-xs font-semibold"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit</span>
          </button>

          {/* Delete */}
          <button
            onClick={() => {
              if (window.confirm('Are you sure you want to delete this note?')) {
                onDelete(note.id);
              }
            }}
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 transition-all"
            title="Delete Note"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Note Header Info */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 mb-6">
        <div className="flex items-center gap-2 flex-wrap mb-3">
          {note.subject_name && (
            <span
              className="text-xs font-bold px-2.5 py-1 rounded-md border"
              style={{
                backgroundColor: `${note.subject_color || '#38bdf8'}15`,
                borderColor: `${note.subject_color || '#38bdf8'}40`,
                color: note.subject_color || '#38bdf8'
              }}
            >
              {note.subject_name}
            </span>
          )}

          <span className="text-xs font-medium px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
            {note.difficulty}
          </span>

          <span className={`text-xs font-medium px-2 py-0.5 rounded border ${getStatusBadge(note.status)}`}>
            {note.status}
          </span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-3">
          {note.title}
        </h1>

        {note.summary && (
          <div className="p-3.5 rounded-xl bg-cyan-950/20 border border-cyan-800/40 text-cyan-200/90 text-sm leading-relaxed mb-4">
            <span className="font-bold text-cyan-400 mr-2">📌 Key Takeaway:</span>
            {note.summary}
          </div>
        )}

        {/* Tags */}
        {note.tags && note.tags.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {note.tags.map((tag) => (
              <span
                key={tag}
                className="text-xs px-2 py-0.5 rounded bg-slate-800/80 text-slate-300 border border-slate-700"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-800 mb-6 pb-1 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('notes')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'notes'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Notes & Text</span>
        </button>

        <button
          onClick={() => setActiveTab('attachments')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'attachments'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
          }`}
        >
          <Camera className="w-4 h-4" />
          <span>Photos & PDFs</span>
          {note.attachments && note.attachments.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300 text-[10px]">
              {note.attachments.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('links')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'links'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
          }`}
        >
          <Link2 className="w-4 h-4" />
          <span>Links & Bookmarks</span>
          {note.resource_links && note.resource_links.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300 text-[10px]">
              {note.resource_links.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('code')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'code'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
          }`}
        >
          <Code className="w-4 h-4" />
          <span>Code / Formulas</span>
          {note.code_snippets && note.code_snippets.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300 text-[10px]">
              {note.code_snippets.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('flashcards')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'flashcards'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          <span>Flashcards</span>
          {note.flashcards && note.flashcards.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300 text-[10px]">
              {note.flashcards.length}
            </span>
          )}
        </button>
      </div>

      {/* Tab 1: Notes & Markdown */}
      {activeTab === 'notes' && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 sm:p-8">
          <div className="prose prose-invert max-w-none prose-headings:text-slate-100 prose-headings:font-bold prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-p:text-slate-300 prose-p:leading-relaxed prose-li:text-slate-300 prose-code:text-cyan-300 prose-code:bg-slate-950 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-pre:bg-slate-950 prose-pre:border prose-pre:border-slate-800">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {note.content || '*No written notes provided.*'}
            </ReactMarkdown>
          </div>
        </div>
      )}

      {/* Tab 2: Photos, PDFs & Documents Attachment Gallery */}
      {activeTab === 'attachments' && (
        <div className="space-y-6">
          {/* Hidden File Input for Direct Multi-File Upload */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => e.target.files && handleFilesSelected(e.target.files)}
            multiple
            accept="image/*,.pdf,.doc,.docx,.txt,.csv,.ppt,.pptx,.xlsx,.xls,.zip"
            className="hidden"
          />

          {/* Quick Upload Action Bar / Dropzone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              if (e.dataTransfer.files) {
                handleFilesSelected(e.dataTransfer.files);
              }
            }}
            className={`p-6 rounded-2xl border-2 border-dashed transition-all flex flex-col sm:flex-row items-center justify-between gap-4 ${
              isDragging
                ? 'bg-cyan-950/40 border-cyan-400 shadow-xl shadow-cyan-950/50'
                : 'bg-slate-900/60 border-slate-800 hover:border-cyan-500/40'
            }`}
          >
            <div className="flex items-center gap-3.5 text-center sm:text-left">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 flex-shrink-0">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">
                  Add Photos, PDFs & Files to this Note
                </h4>
                <p className="text-xs text-slate-400">
                  Drag & drop multiple whiteboard photos, textbook PDFs, or study sheets here
                </p>
              </div>
            </div>

            <button
              type="button"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold shadow-md shadow-cyan-500/20 flex items-center gap-2 whitespace-nowrap transition-all disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>
                {uploading ? `Uploading ${uploadCount} files...` : '+ Add Multiple Files'}
              </span>
            </button>
          </div>

          {uploading && (
            <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-500/30 flex items-center justify-center gap-2 text-xs text-cyan-300">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span>Saving {uploadCount} file(s) into your vault...</span>
            </div>
          )}

          {(!note.attachments || note.attachments.length === 0) ? (
            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-10 text-center">
              <Camera className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <h4 className="text-sm font-bold text-slate-300 mb-1">No attachments added yet</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
                Attach handwritten notebook snaps, lecture diagrams, question papers, or PDF notes to keep everything in one place forever.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* 1. Photos & Images Grid */}
              {note.attachments.filter(a => a.type === 'image').length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Photos & Diagrams ({note.attachments.filter(a => a.type === 'image').length})</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {note.attachments.map((att, idx) => {
                      if (att.type !== 'image') return null;
                      return (
                        <div
                          key={att.id || idx}
                          className="group relative bg-slate-950 border border-slate-800 hover:border-cyan-500/50 rounded-xl overflow-hidden shadow-lg transition-all flex flex-col justify-between"
                        >
                          <div
                            className="w-full h-44 bg-slate-900 relative cursor-pointer"
                            onClick={() => setLightboxImage(att.url)}
                          >
                            <img
                              src={att.url}
                              alt={att.name}
                              loading="eager"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <span className="p-2 rounded-lg bg-black/70 text-white flex items-center gap-1 text-xs">
                                <Maximize2 className="w-3.5 h-3.5" />
                                <span>View Full Size</span>
                              </span>
                            </div>
                          </div>

                          <div className="p-3 bg-slate-900/90 border-t border-slate-800/80 flex items-center justify-between gap-2">
                            <div className="truncate">
                              <p className="text-xs text-slate-200 font-semibold truncate" title={att.name}>
                                {att.name}
                              </p>
                              <span className="text-[10px] text-slate-400">
                                {formatFileSize(att.size) || 'Image'}
                              </span>
                            </div>

                            <div className="flex items-center gap-1 flex-shrink-0">
                              <a
                                href={att.url}
                                download={att.name}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-cyan-300 hover:bg-slate-700 transition-all"
                                title="Open / Download"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </a>
                              <button
                                type="button"
                                onClick={() => handleDeleteAttachment(idx)}
                                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition-all"
                                title="Remove File"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 2. PDF Documents & Files List */}
              {note.attachments.filter(a => a.type !== 'image').length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-rose-400" />
                    <span>Documents & Files ({note.attachments.filter(a => a.type !== 'image').length})</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {note.attachments.map((att, idx) => {
                      if (att.type === 'image') return null;
                      return (
                        <div
                          key={att.id || idx}
                          className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-cyan-500/40 transition-all flex items-center justify-between gap-3 group"
                        >
                          <div className="flex items-center gap-3 truncate">
                            <div className="p-2.5 rounded-lg bg-slate-800 border border-slate-700/60 flex-shrink-0">
                              {getDocIcon(att.name, att.mimeType)}
                            </div>
                            <div className="truncate">
                              <p className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors truncate" title={att.name}>
                                {att.name}
                              </p>
                              <div className="flex items-center gap-2 text-[10px] text-slate-400">
                                <span>{att.type === 'pdf' ? 'PDF Document' : 'Document File'}</span>
                                {att.size && <span>• {formatFileSize(att.size)}</span>}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 flex-shrink-0">
                            <a
                              href={att.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-cyan-300 hover:bg-slate-700 transition-all"
                              title="Open File"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                            <a
                              href={att.url}
                              download={att.name}
                              className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-emerald-300 hover:bg-slate-700 transition-all"
                              title="Download"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </a>
                            <button
                              type="button"
                              onClick={() => handleDeleteAttachment(idx)}
                              className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition-all"
                              title="Remove File"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Resource Links & Bookmarks */}
      {activeTab === 'links' && (
        <div className="space-y-4">
          {(!note.resource_links || note.resource_links.length === 0) ? (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-10 text-center">
              <Link2 className="w-8 h-8 text-slate-500 mx-auto mb-3" />
              <p className="text-slate-400 text-sm mb-4">No reference links saved for this note.</p>
              <button
                onClick={() => onEdit(note)}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold shadow-md transition-all"
              >
                + Add Links
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {note.resource_links.map((link, idx) => (
                <a
                  key={idx}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group bg-slate-900/70 hover:bg-slate-850 border border-slate-800 hover:border-cyan-500/50 rounded-xl p-4 transition-all duration-200 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                        {link.type}
                      </span>
                      <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 transition-colors" />
                    </div>
                    <h4 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors mb-1">
                      {link.title}
                    </h4>
                    {link.description && (
                      <p className="text-xs text-slate-400 line-clamp-2">
                        {link.description}
                      </p>
                    )}
                  </div>
                  <div className="mt-3 text-[11px] text-slate-500 truncate group-hover:text-slate-400">
                    {link.url}
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Code & Formulas */}
      {activeTab === 'code' && (
        <div className="space-y-4">
          {(!note.code_snippets || note.code_snippets.length === 0) ? (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-10 text-center">
              <Code className="w-8 h-8 text-slate-500 mx-auto mb-3" />
              <p className="text-slate-400 text-sm mb-4">No code snippets or formulas saved for this note.</p>
              <button
                onClick={() => onEdit(note)}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold shadow-md transition-all"
              >
                + Add Code Snippet
              </button>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-3">
                {note.code_snippets.map((snip, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveCodeIndex(idx)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                      activeCodeIndex === idx
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold'
                        : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    {snip.title || `Snippet #${idx + 1}`}
                  </button>
                ))}
              </div>

              {note.code_snippets[activeCodeIndex] && (
                <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
                  <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800">
                    <span className="text-xs text-slate-300 font-semibold">
                      {note.code_snippets[activeCodeIndex].title}
                    </span>
                    <button
                      onClick={() => handleCopyCode(note.code_snippets[activeCodeIndex].code, activeCodeIndex)}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium transition-all"
                    >
                      {copiedSnippetIndex === activeCodeIndex ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="p-4 sm:p-6 overflow-x-auto text-xs sm:text-sm text-cyan-200 font-mono leading-relaxed">
                    <code>{note.code_snippets[activeCodeIndex].code}</code>
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab 5: Recall Flashcards */}
      {activeTab === 'flashcards' && (
        <div className="space-y-4">
          {(!note.flashcards || note.flashcards.length === 0) ? (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-10 text-center">
              <HelpCircle className="w-8 h-8 text-slate-500 mx-auto mb-3" />
              <p className="text-slate-400 text-sm mb-4">No flashcards created for this topic yet.</p>
              <button
                onClick={() => onAskAIAction(note, 'quiz')}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg text-xs font-semibold shadow-md transition-all"
              >
                Generate 3 Flashcards with AI
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-slate-400">
                💡 <span className="font-semibold text-slate-300">Click any card</span> to flip and reveal the answer!
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
                            <span>{isFlipped ? 'Click to show question' : 'Click to flip'}</span>
                          </span>
                        </div>
                        <p className="text-sm font-semibold leading-relaxed">
                          {isFlipped ? card.answer : card.question}
                        </p>
                      </div>

                      <div className="text-[10px] text-slate-400 mt-3 pt-2 border-t border-slate-800">
                        {isFlipped ? '✅ Concept Understood' : '❓ Test your memory'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Persistent AI Study Copilot Quick Action Bar */}
      <div className="mt-10 p-4 rounded-2xl bg-gradient-to-r from-purple-950/40 via-indigo-950/30 to-slate-900 border border-purple-900/40 shadow-xl">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-purple-400 animate-spin" style={{ animationDuration: '4s' }} />
          <h4 className="text-xs font-bold text-purple-300 uppercase tracking-wider">
            AI Copilot: Ask AI About This Note, Photos & Documents
          </h4>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => onAskAIAction(note, 'explain')}
            className="px-3 py-1.5 rounded-lg bg-slate-900/80 hover:bg-purple-900/30 border border-purple-800/40 hover:border-purple-600 text-purple-200 text-xs font-medium transition-all"
          >
            🧠 Explain Concept Simply
          </button>
          <button
            onClick={() => onAskAIAction(note, 'summarize')}
            className="px-3 py-1.5 rounded-lg bg-slate-900/80 hover:bg-purple-900/30 border border-purple-800/40 hover:border-purple-600 text-purple-200 text-xs font-medium transition-all"
          >
            📝 Extract Cheat Sheet
          </button>
          <button
            onClick={() => onAskAIAction(note, 'quiz')}
            className="px-3 py-1.5 rounded-lg bg-slate-900/80 hover:bg-purple-900/30 border border-purple-800/40 hover:border-purple-600 text-purple-200 text-xs font-medium transition-all"
          >
            🧪 Quiz Me (3 Questions)
          </button>
          {note.attachments && note.attachments.length > 0 && (
            <button
              onClick={() => onAskAIAction(note, 'explain')}
              className="px-3 py-1.5 rounded-lg bg-slate-900/80 hover:bg-purple-900/30 border border-purple-800/40 hover:border-purple-600 text-purple-200 text-xs font-medium transition-all"
            >
              📸 Explain Attached Photos/PDF
            </button>
          )}
        </div>
      </div>

      {/* Share & Export Modal */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        note={note}
        onNoteUpdated={(updated) => {
          setNote(updated);
          if (onNoteUpdated) onNoteUpdated(updated);
        }}
      />
    </div>
  );
};
