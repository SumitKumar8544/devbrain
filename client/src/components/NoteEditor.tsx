import React, { useState, useRef } from 'react';
import type { Note, Subject, Difficulty, NoteStatus, CodeSnippet, ResourceLink, Flashcard, Attachment } from '../types';
import { api } from '../services/api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Save,
  X,
  Plus,
  Trash2,
  Code,
  Link2,
  HelpCircle,
  Eye,
  Edit,
  Camera,
  FileText,
  Upload,
  BookOpen,
  Image as ImageIcon,
  ExternalLink,
  Files,
  Mic,
  MicOff
} from 'lucide-react';

interface NoteEditorProps {
  initialNote?: Note | null;
  subjects: Subject[];
  onSave: (noteData: Partial<Note>) => void;
  onCancel: () => void;
}

export const NoteEditor: React.FC<NoteEditorProps> = ({
  initialNote,
  subjects,
  onSave,
  onCancel,
}) => {
  const [title, setTitle] = useState(initialNote?.title || '');
  const [subjectId, setSubjectId] = useState(initialNote?.subject_id || (subjects[0]?.id || ''));
  const [difficulty, setDifficulty] = useState<Difficulty>(initialNote?.difficulty || 'Intermediate');
  const [status, setStatus] = useState<NoteStatus>(initialNote?.status || 'Draft');
  const [summary, setSummary] = useState(initialNote?.summary || '');
  const [content, setContent] = useState(initialNote?.content || '');
  const [tags, setTags] = useState<string[]>(initialNote?.tags || []);
  const [tagInput, setTagInput] = useState('');

  const [attachments, setAttachments] = useState<Attachment[]>(initialNote?.attachments || []);
  const [codeSnippets, setCodeSnippets] = useState<CodeSnippet[]>(initialNote?.code_snippets || []);
  const [resourceLinks, setResourceLinks] = useState<ResourceLink[]>(initialNote?.resource_links || []);
  const [flashcards, setFlashcards] = useState<Flashcard[]>(initialNote?.flashcards || []);

  const [uploading, setUploading] = useState(false);
  const [uploadCount, setUploadCount] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [editorTab, setEditorTab] = useState<'write' | 'preview'>('write');
  const [activeSection, setActiveSection] = useState<'content' | 'attachments' | 'links' | 'code' | 'flashcards'>('content');

  // Speech-to-Text Voice Dictation State
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Tag Handling
  const handleAddTag = () => {
    const trimmed = tagInput.trim().replace(/^#/, '');
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (t: string) => {
    setTags(tags.filter((item) => item !== t));
  };

  // Multiple Files Upload Handling
  const handleFilesSelected = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    setUploadCount(files.length);

    try {
      const uploadedList = await api.uploadFiles(files);
      setAttachments((prev) => [...prev, ...uploadedList]);
    } catch (err: any) {
      alert(`Upload error: ${err.message}`);
    } finally {
      setUploading(false);
      setUploadCount(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  // Code Snippet Helpers
  const addSnippet = () => {
    setCodeSnippets([
      ...codeSnippets,
      { language: 'python', title: 'Example / Solution', code: '// Paste or write code here\n' },
    ]);
  };

  const updateSnippet = (index: number, field: keyof CodeSnippet, value: string) => {
    const updated = [...codeSnippets];
    updated[index] = { ...updated[index], [field]: value };
    setCodeSnippets(updated);
  };

  const removeSnippet = (index: number) => {
    setCodeSnippets(codeSnippets.filter((_, i) => i !== index));
  };

  // Resource Link Helpers
  const addLink = () => {
    setResourceLinks([
      ...resourceLinks,
      { title: '', url: '', type: 'Article', description: '' },
    ]);
  };

  const updateLink = (index: number, field: keyof ResourceLink, value: string) => {
    const updated = [...resourceLinks];
    updated[index] = { ...updated[index], [field]: value };
    setResourceLinks(updated);
  };

  const removeLink = (index: number) => {
    setResourceLinks(resourceLinks.filter((_, i) => i !== index));
  };

  // Flashcards Helpers
  const addFlashcard = () => {
    setFlashcards([...flashcards, { question: '', answer: '' }]);
  };

  const updateFlashcard = (index: number, field: keyof Flashcard, value: string) => {
    const updated = [...flashcards];
    updated[index] = { ...updated[index], [field]: value };
    setFlashcards(updated);
  };

  const removeFlashcard = (index: number) => {
    setFlashcards(flashcards.filter((_, i) => i !== index));
  };

  const insertText = (before: string, after: string = '') => {
    setContent((prev) => `${prev}\n${before}${after}`);
  };

  const toggleListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. Please try Google Chrome or Microsoft Edge.');
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.error(e);
        }
      }
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            transcript += event.results[i][0].transcript + ' ';
          }
        }
        if (transcript.trim()) {
          setContent((prev) => (prev ? `${prev} ${transcript.trim()}` : transcript.trim()));
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.error('Failed to start speech recognition:', err);
      setIsListening(false);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${Math.round(bytes / 1024)} KB`;
  };

  const handleSave = () => {
    if (!title.trim()) {
      alert('Please enter a note title');
      return;
    }

    onSave({
      title: title.trim(),
      subject_id: subjectId || null,
      difficulty,
      status,
      summary: summary.trim(),
      content,
      tags,
      attachments,
      code_snippets: codeSnippets,
      resource_links: resourceLinks,
      flashcards,
    });
  };

  const imageAttachments = attachments.filter((a) => a.type === 'image');
  const docAttachments = attachments.filter((a) => a.type !== 'image');

  return (
    <div className="max-w-4xl mx-auto pb-20">
      {/* Editor Header */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-extrabold text-white">
            {initialNote ? 'Edit Note' : 'Create New Note'}
          </h2>
          <p className="text-xs text-slate-400">
            Save knowledge from handwritten photos, PDF documents, links, and text
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onCancel}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 text-xs font-semibold transition-all"
          >
            <X className="w-4 h-4" />
            <span>Cancel</span>
          </button>

          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold shadow-md shadow-cyan-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <Save className="w-4 h-4" />
            <span>Save Note</span>
          </button>
        </div>
      </div>

      {/* Primary Details Card */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 mb-6 space-y-4">
        {/* Title */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Note Title *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Physics Wave Optics / Cellular Respiration / Dynamic Programming / World War II Notes"
            className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-base font-semibold focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
          />
        </div>

        {/* Category, Difficulty, Status */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Notebook / Category
            </label>
            <select
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
            >
              <option value="">(General / Uncategorized)</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Difficulty / Level
            </label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as Difficulty)}
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
            >
              <option value="Beginner">Beginner / Basic</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as NoteStatus)}
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
            >
              <option value="Draft">Draft</option>
              <option value="Revising">Needs Review</option>
              <option value="Exam Ready">Exam Ready</option>
              <option value="Interview Ready">Reference Ready</option>
              <option value="Mastered">Mastered</option>
            </select>
          </div>
        </div>

        {/* Executive Summary */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Key Idea / Quick Summary
          </label>
          <input
            type="text"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="A short summary of what this note is about..."
            className="w-full px-3.5 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* Tags */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Tags & Topics
          </label>
          <div className="flex items-center gap-2 mb-2">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddTag();
                }
              }}
              placeholder="Type tag and press Enter (e.g. Physics, Formula, Diagram)"
              className="flex-1 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
            />
            <button
              type="button"
              onClick={handleAddTag}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all"
            >
              Add
            </button>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {tags.map((t) => (
              <span
                key={t}
                className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-md bg-cyan-950/60 text-cyan-300 border border-cyan-800/60"
              >
                #{t}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(t)}
                  className="hover:text-rose-400"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Section Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 mb-4 pb-2 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveSection('content')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
            activeSection === 'content'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Written Notes</span>
        </button>

        <button
          onClick={() => setActiveSection('attachments')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
            activeSection === 'attachments'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Files className="w-3.5 h-3.5" />
          <span>Photos & Documents ({attachments.length})</span>
        </button>

        <button
          onClick={() => setActiveSection('links')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
            activeSection === 'links'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Link2 className="w-3.5 h-3.5" />
          <span>Links & Bookmarks ({resourceLinks.length})</span>
        </button>

        <button
          onClick={() => setActiveSection('code')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
            activeSection === 'code'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Code className="w-3.5 h-3.5" />
          <span>Code / Formulas ({codeSnippets.length})</span>
        </button>

        <button
          onClick={() => setActiveSection('flashcards')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
            activeSection === 'flashcards'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Flashcards ({flashcards.length})</span>
        </button>
      </div>

      {/* Section 1: Written Notes */}
      {activeSection === 'content' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden p-4">
          <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
            <div className="flex items-center gap-1 flex-wrap">
              <button
                type="button"
                onClick={() => insertText('## Section Heading')}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono"
              >
                H2
              </button>
              <button
                type="button"
                onClick={() => insertText('### Subheading')}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono"
              >
                H3
              </button>
              <button
                type="button"
                onClick={() => insertText('**Important Concept**')}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
              >
                B
              </button>
              <button
                type="button"
                onClick={() => insertText('- [ ] Checklist item')}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
              >
                List
              </button>
              <button
                type="button"
                onClick={() => insertText('> [!NOTE]\n> Key takeaway from lecture or reading')}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
              >
                Callout
              </button>

              {/* Voice Dictation (Speech-to-Text) Button */}
              <button
                type="button"
                onClick={toggleListening}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition-all ml-1 ${
                  isListening
                    ? 'bg-rose-500/20 border border-rose-500/60 text-rose-300 animate-pulse'
                    : 'bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-800/40'
                }`}
                title={isListening ? 'Click to stop voice dictation' : 'Speech-to-Text: Speak to dictate notes hands-free'}
              >
                {isListening ? (
                  <>
                    <MicOff className="w-3.5 h-3.5 text-rose-400" />
                    <span>Listening...</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Dictate</span>
                  </>
                )}
              </button>
            </div>

            <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setEditorTab('write')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded ${
                  editorTab === 'write' ? 'bg-slate-800 text-white font-semibold' : 'text-slate-400'
                }`}
              >
                <Edit className="w-3.5 h-3.5" />
                <span>Write</span>
              </button>
              <button
                type="button"
                onClick={() => setEditorTab('preview')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded ${
                  editorTab === 'preview' ? 'bg-slate-800 text-white font-semibold' : 'text-slate-400'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Preview</span>
              </button>
            </div>
          </div>

          {editorTab === 'write' ? (
            <textarea
              rows={16}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your notes, explanations, summaries, or questions here..."
              className="w-full p-4 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-sm font-sans leading-relaxed focus:outline-none focus:border-cyan-500 resize-y"
            />
          ) : (
            <div className="min-h-[360px] p-6 rounded-xl bg-slate-950 border border-slate-800 prose prose-invert max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {content || '*No content written yet. Switch to Write tab to add notes.*'}
              </ReactMarkdown>
            </div>
          )}
        </div>
      )}

      {/* Section 2: Photos & Documents Upload & Gallery */}
      {activeSection === 'attachments' && (
        <div className="space-y-6">
          {/* Drag & Drop Upload Zone */}
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
            className={`p-8 rounded-2xl border-2 border-dashed text-center transition-all ${
              isDragging
                ? 'bg-cyan-950/40 border-cyan-400 shadow-xl shadow-cyan-950/50 scale-[1.01]'
                : 'bg-slate-900/80 border-slate-800 hover:border-cyan-500/50'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => e.target.files && handleFilesSelected(e.target.files)}
              multiple
              accept="image/*,.pdf,.doc,.docx,.txt,.csv,.ppt,.pptx,.xlsx,.xls,.zip"
              className="hidden"
            />

            <div className="flex flex-col items-center justify-center">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 border border-cyan-500/40 text-cyan-400 flex items-center justify-center mb-3">
                <Upload className="w-7 h-7" />
              </div>

              <h4 className="text-base font-bold text-white mb-1">
                Upload Multiple Photos, PDFs & Documents
              </h4>
              <p className="text-xs text-slate-400 max-w-md mb-5 leading-relaxed">
                Drag & drop or select multiple files at once. Supports <strong>photos (JPG, PNG), PDF documents, Word docs, worksheets, whiteboard photos, and study sheets</strong>.
              </p>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold shadow-lg shadow-cyan-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  <span>
                    {uploading ? `Uploading ${uploadCount} files...` : 'Browse & Upload Multiple Files'}
                  </span>
                </button>
              </div>

              {uploading && (
                <div className="mt-4 flex items-center gap-2 text-xs text-cyan-300">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                  <span>Saving files to your local vault storage...</span>
                </div>
              )}
            </div>
          </div>

          {/* 1. Photos & Images Grid */}
          {imageAttachments.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-cyan-400" />
                  <span>Photos & Images ({imageAttachments.length})</span>
                </h4>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {imageAttachments.map((att, idx) => (
                  <div
                    key={att.id || idx}
                    className="relative group bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-md p-2 flex flex-col justify-between"
                  >
                    <div className="w-full h-32 bg-slate-900 rounded-lg overflow-hidden relative mb-2">
                      <img
                        src={att.url}
                        alt={att.name}
                        loading="eager"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="truncate mr-1">
                        <p className="text-xs text-slate-200 truncate font-medium" title={att.name}>
                          {att.name}
                        </p>
                        <span className="text-[10px] text-slate-500">
                          {formatFileSize(att.size)}
                        </span>
                      </div>
                      <div className="flex items-center gap-0.5">
                        <a
                          href={att.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 rounded text-slate-400 hover:text-cyan-400"
                          title="View Full"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                        <button
                          type="button"
                          onClick={() => removeAttachment(attachments.indexOf(att))}
                          className="p-1 rounded text-slate-400 hover:text-rose-400"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2. Documents & PDFs List */}
          {docAttachments.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-rose-400" />
                  <span>PDFs & Documents ({docAttachments.length})</span>
                </h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {docAttachments.map((att, idx) => (
                  <div
                    key={att.id || idx}
                    className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3 shadow-sm hover:border-slate-700 transition-all"
                  >
                    <div className="flex items-center gap-3 truncate">
                      <div className="p-2 rounded-lg bg-rose-950 text-rose-400 border border-rose-800/60 flex-shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="truncate">
                        <p className="text-xs font-bold text-slate-200 truncate" title={att.name}>
                          {att.name}
                        </p>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                          <span className="uppercase font-semibold text-rose-400">
                            {att.type}
                          </span>
                          {att.size && <span>• {formatFileSize(att.size)}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      <a
                        href={att.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-900 transition-colors"
                        title="Open Document"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                      <button
                        type="button"
                        onClick={() => removeAttachment(attachments.indexOf(att))}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-900 transition-colors"
                        title="Remove"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {attachments.length === 0 && !uploading && (
            <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/60 text-center text-xs text-slate-400">
              No photos or documents attached yet. Click the button above to upload files.
            </div>
          )}
        </div>
      )}

      {/* Section 3: Resource Links & Bookmarks */}
      {activeSection === 'links' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Web Links, YouTube Videos & Reference URLs
            </h3>
            <button
              type="button"
              onClick={addLink}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Important Link</span>
            </button>
          </div>

          {resourceLinks.length === 0 ? (
            <div className="p-8 rounded-xl bg-slate-900/40 border border-slate-800 text-center text-slate-400 text-xs">
              No web links saved yet. Paste links to YouTube lectures, articles, Wikipedia pages, or tools.
            </div>
          ) : (
            resourceLinks.map((link, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <select
                    value={link.type}
                    onChange={(e) => updateLink(idx, 'type', e.target.value as any)}
                    className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
                  >
                    <option value="Article">Article / Webpage</option>
                    <option value="YouTube">YouTube Video</option>
                    <option value="Documentation">Documentation / Paper</option>
                    <option value="LeetCode">Problem / Exercise</option>
                    <option value="GitHub">GitHub / Code</option>
                    <option value="Other">Other</option>
                  </select>

                  <input
                    type="text"
                    value={link.title}
                    onChange={(e) => updateLink(idx, 'title', e.target.value)}
                    placeholder="Link Title (e.g. Khan Academy / YouTube Lecture)"
                    className="flex-1 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs font-semibold focus:outline-none focus:border-cyan-500"
                  />

                  <button
                    type="button"
                    onClick={() => removeLink(idx)}
                    className="p-1.5 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <input
                  type="url"
                  value={link.url}
                  onChange={(e) => updateLink(idx, 'url', e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs font-mono focus:outline-none focus:border-cyan-500"
                />

                <input
                  type="text"
                  value={link.description || ''}
                  onChange={(e) => updateLink(idx, 'description', e.target.value)}
                  placeholder="Why is this link important or what does it cover?"
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>
            ))
          )}
        </div>
      )}

      {/* Section 4: Code / Formulas */}
      {activeSection === 'code' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Code Snippets & Formula Blocks
            </h3>
            <button
              type="button"
              onClick={addSnippet}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Snippet</span>
            </button>
          </div>

          {codeSnippets.length === 0 ? (
            <div className="p-8 rounded-xl bg-slate-900/40 border border-slate-800 text-center text-slate-400 text-xs">
              No code snippets or formulas added yet.
            </div>
          ) : (
            codeSnippets.map((snippet, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <input
                    type="text"
                    value={snippet.title}
                    onChange={(e) => updateSnippet(idx, 'title', e.target.value)}
                    placeholder="Snippet Title"
                    className="flex-1 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs font-semibold focus:outline-none focus:border-cyan-500"
                  />
                  <select
                    value={snippet.language}
                    onChange={(e) => updateSnippet(idx, 'language', e.target.value)}
                    className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs font-mono uppercase focus:outline-none focus:border-cyan-500"
                  >
                    <option value="python">Python</option>
                    <option value="cpp">C++</option>
                    <option value="java">Java</option>
                    <option value="javascript">JavaScript</option>
                    <option value="sql">SQL</option>
                    <option value="text">Formula / Text</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => removeSnippet(idx)}
                    className="p-1.5 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <textarea
                  rows={8}
                  value={snippet.code}
                  onChange={(e) => updateSnippet(idx, 'code', e.target.value)}
                  placeholder="Code or formula..."
                  className="w-full p-3 rounded-lg bg-slate-950 border border-slate-800 text-cyan-200 font-mono text-xs leading-relaxed focus:outline-none focus:border-cyan-500"
                />
              </div>
            ))
          )}
        </div>
      )}

      {/* Section 5: Flashcards */}
      {activeSection === 'flashcards' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Recall Flashcards (Question & Answer)
            </h3>
            <button
              type="button"
              onClick={addFlashcard}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Flashcard</span>
            </button>
          </div>

          {flashcards.length === 0 ? (
            <div className="p-8 rounded-xl bg-slate-900/40 border border-slate-800 text-center text-slate-400 text-xs">
              No flashcards added yet. Add Q&A pairs for quick revision.
            </div>
          ) : (
            flashcards.map((card, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-cyan-400">Card #{idx + 1}</span>
                  <button
                    type="button"
                    onClick={() => removeFlashcard(idx)}
                    className="p-1 rounded text-slate-400 hover:text-rose-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <input
                  type="text"
                  value={card.question}
                  onChange={(e) => updateFlashcard(idx, 'question', e.target.value)}
                  placeholder="Question / Prompt"
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs font-semibold focus:outline-none focus:border-cyan-500"
                />
                <textarea
                  rows={2}
                  value={card.answer}
                  onChange={(e) => updateFlashcard(idx, 'answer', e.target.value)}
                  placeholder="Answer / Key takeaway..."
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
