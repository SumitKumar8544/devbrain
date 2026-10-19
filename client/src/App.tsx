import React, { useState, useEffect } from 'react';
import type { Note, Subject, VaultStats, User } from './types';
import { api } from './services/api';
import { AuthScreen } from './components/AuthScreen';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { NoteCard } from './components/NoteCard';
import { NoteDetail } from './components/NoteDetail';
import { NoteEditor } from './components/NoteEditor';
import { AICopilot } from './components/AICopilot';
import { SettingsModal } from './components/SettingsModal';
import { SubjectModal } from './components/SubjectModal';
import { DashboardStats } from './components/DashboardStats';
import { PublicNoteView } from './components/PublicNoteView';
import {
  FolderPlus,
  Plus,
  Filter,
  SearchX,
  BookOpen,
  Camera,
  FileText,
  Link2,
  Sparkles,
  Trash2
} from 'lucide-react';

export function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authChecking, setAuthChecking] = useState(true);

  // Check if viewing a public shared note (?share=sh-...)
  const [publicShareId, setPublicShareId] = useState<string | null>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('share');
    } catch {
      return null;
    }
  });

  const [notes, setNotes] = useState<Note[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [stats, setStats] = useState<VaultStats | null>(null);
  const [loading, setLoading] = useState(false);

  // Filters
  const [activeSubjectId, setActiveSubjectId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('All');

  // Navigation / View state
  const [activeNote, setActiveNote] = useState<Note | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Modals & Drawers
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [copilotAction, setCopilotAction] = useState<{ note: Note; action: string } | null>(null);

  // Check existing session on load
  useEffect(() => {
    api.getMe()
      .then((res) => {
        if (res?.user) {
          setCurrentUser(res.user);
        }
      })
      .catch(() => {
        setCurrentUser(null);
      })
      .finally(() => {
        setAuthChecking(false);
      });
  }, []);

  const loadData = async () => {
    if (!currentUser && !api.getUserId()) return;
    try {
      setLoading(true);
      const [subs, st] = await Promise.all([
        api.getSubjects(),
        api.getStats().catch(() => null),
      ]);
      setSubjects(subs || []);
      setStats(st);

      const fetchedNotes = await api.getNotes({
        subject_id: activeSubjectId || undefined,
        search: searchQuery || undefined,
        tag: activeTag || undefined,
      });
      setNotes(fetchedNotes || []);
    } catch (err) {
      console.error('Error loading vault data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      loadData();
    }
  }, [currentUser, activeSubjectId, searchQuery, activeTag]);

  const handleLogout = () => {
    api.logout();
    setCurrentUser(null);
    setNotes([]);
    setSubjects([]);
    setActiveNote(null);
    setIsEditing(false);
    setIsCreating(false);
  };

  const handleToggleStar = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await api.toggleStar(id);
      setNotes((prev) =>
        prev.map((n) => (n.id === id ? { ...n, starred: res.starred } : n))
      );
      if (activeNote?.id === id) {
        setActiveNote((prev) => (prev ? { ...prev, starred: res.starred } : null));
      }
      api.getStats().then(setStats).catch(console.error);
    } catch (err) {
      console.error('Failed to toggle star:', err);
    }
  };

  const handleSelectNote = (note: Note) => {
    setActiveNote(note);
    setIsEditing(false);
    setIsCreating(false);
  };

  const handleStartCreate = () => {
    setActiveNote(null);
    setIsEditing(false);
    setIsCreating(true);
  };

  const handleStartEdit = (note: Note) => {
    setActiveNote(note);
    setIsCreating(false);
    setIsEditing(true);
  };

  const handleSaveNote = async (data: Partial<Note>) => {
    try {
      if (isCreating) {
        const created = await api.createNote(data);
        setActiveNote(created);
        setIsCreating(false);
      } else if (activeNote) {
        const updated = await api.updateNote(activeNote.id, data);
        setActiveNote(updated);
        setIsEditing(false);
      }
      loadData();
    } catch (err: any) {
      alert(`Error saving note: ${err.message}`);
    }
  };

  const handleDeleteNote = async (id: string) => {
    try {
      await api.deleteNote(id);
      setActiveNote(null);
      setIsEditing(false);
      setIsCreating(false);
      loadData();
    } catch (err: any) {
      alert(`Error deleting note: ${err.message}`);
    }
  };

  const handleInsertToNote = async (contentToAppend: string) => {
    if (!activeNote) return;
    try {
      const updatedContent = `${activeNote.content}\n\n---\n### 🤖 AI Study Notes & Insights:\n${contentToAppend}`;
      const updated = await api.updateNote(activeNote.id, {
        ...activeNote,
        content: updatedContent,
      });
      setActiveNote(updated);
      loadData();
      alert('✅ Copilot insight successfully appended to your note!');
    } catch (err: any) {
      alert(`Failed to append to note: ${err.message}`);
    }
  };

  const handleQuickAI = (note: Note, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveNote(note);
    setIsCopilotOpen(true);
    setCopilotAction({ note, action: 'explain' });
  };

  const handleAskAIAction = (note: Note, action: string) => {
    setActiveNote(note);
    setIsCopilotOpen(true);
    setCopilotAction({ note, action });
  };

  const handleCreateSubject = async (subData: Partial<Subject>) => {
    try {
      await api.createSubject(subData);
      const subs = await api.getSubjects();
      setSubjects(subs);
      api.getStats().then(setStats).catch(console.error);
    } catch (err: any) {
      alert(`Failed to create category: ${err.message}`);
    }
  };

  const handleDeleteSubject = async (id: string) => {
    try {
      await api.deleteSubject(id);
      if (activeSubjectId === id) {
        setActiveSubjectId(null);
      }
      loadData();
    } catch (err: any) {
      alert(`Failed to delete notebook category: ${err.message}`);
    }
  };

  // If a public note share link was clicked, show reader directly (no login required)
  if (publicShareId) {
    return (
      <PublicNoteView
        shareId={publicShareId}
        onGoHome={() => {
          window.history.replaceState({}, '', window.location.pathname);
          setPublicShareId(null);
        }}
      />
    );
  }

  if (authChecking) {
    return (
      <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center text-slate-400 text-xs">
        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping mr-2" />
        <span>Loading DevBrain Vault...</span>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <AuthScreen
        onAuthSuccess={(user) => {
          setCurrentUser(user);
          loadData();
        }}
      />
    );
  }

  const filteredNotes = notes.filter((n) => {
    if (activeFilter === 'starred' && n.starred !== 1) return false;
    if (activeFilter === 'interview' && n.status !== 'Interview Ready') return false;
    if (activeFilter === 'exam' && n.status !== 'Exam Ready') return false;
    if (activeFilter === 'mastered' && n.status !== 'Mastered') return false;
    if (activeFilter === 'revising' && n.status !== 'Revising' && n.status !== 'Draft') return false;
    if (difficultyFilter !== 'All' && n.difficulty !== difficultyFilter) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Top Navbar */}
      <Navbar
        user={currentUser}
        onLogout={handleLogout}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onNewNote={handleStartCreate}
        onToggleCopilot={() => setIsCopilotOpen(!isCopilotOpen)}
        isCopilotOpen={isCopilotOpen}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onToggleStats={() => setShowStats(!showStats)}
        showStats={showStats}
        totalNotes={notes.length}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <div className="hidden md:block flex-shrink-0">
          <Sidebar
            subjects={subjects}
            activeSubjectId={activeSubjectId}
            onSelectSubject={(id) => {
              setActiveSubjectId(id);
              setActiveNote(null);
            }}
            activeFilter={activeFilter}
            onSelectFilter={(f) => {
              setActiveFilter(f);
              setActiveNote(null);
            }}
            activeTag={activeTag}
            onSelectTag={(t) => {
              setActiveTag(t);
              setActiveNote(null);
            }}
            notes={notes}
            onAddSubject={() => setIsSubjectModalOpen(true)}
            onDeleteSubject={handleDeleteSubject}
          />
        </div>

        {/* Central Workspace */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-8 py-6">
          {showStats && (
            <DashboardStats stats={stats} onClose={() => setShowStats(false)} />
          )}

          {/* Mode 1: Creating or Editing Note */}
          {isCreating || isEditing ? (
            <NoteEditor
              initialNote={isEditing ? activeNote : null}
              subjects={subjects}
              onSave={handleSaveNote}
              onCancel={() => {
                setIsCreating(false);
                setIsEditing(false);
              }}
            />
          ) : activeNote ? (
            /* Mode 2: Full Note Detail Study View */
            <NoteDetail
              note={activeNote}
              onBack={() => setActiveNote(null)}
              onEdit={handleStartEdit}
              onDelete={handleDeleteNote}
              onToggleStar={handleToggleStar}
              onAskAIAction={handleAskAIAction}
              onNoteUpdated={(updatedNote) => {
                setActiveNote(updatedNote);
                loadData();
              }}
            />
          ) : notes.length === 0 && subjects.length === 0 && !searchQuery ? (
            /* Mode 3: Fresh Blank Slate Onboarding */
            <div className="max-w-2xl mx-auto py-12 px-4 text-center">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center mx-auto mb-5 text-cyan-400">
                <BookOpen className="w-8 h-8" />
              </div>

              <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-2">
                Welcome to your Knowledge Vault, {currentUser.name}! 🌟
              </h2>
              <p className="text-sm text-slate-400 max-w-lg mx-auto leading-relaxed mb-8">
                Your notebook is completely blank and ready. Capture photos of handwritten notes or whiteboard sketches, upload PDF documents, save essential links, and let AI help you understand any concept!
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto mb-8">
                <button
                  onClick={handleStartCreate}
                  className="p-5 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-blue-500/10 hover:from-cyan-500/20 hover:to-blue-500/20 border border-cyan-500/40 text-left transition-all group shadow-lg hover:scale-[1.02]"
                >
                  <Plus className="w-6 h-6 text-cyan-400 mb-2 group-hover:scale-110 transition-transform" />
                  <h4 className="text-sm font-bold text-white mb-1">Create Your First Note</h4>
                  <p className="text-xs text-slate-400">
                    Upload photos, attach PDFs, paste web links, and write thoughts.
                  </p>
                </button>

                <button
                  onClick={() => setIsSubjectModalOpen(true)}
                  className="p-5 rounded-2xl bg-slate-900/80 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-left transition-all group shadow-lg hover:scale-[1.02]"
                >
                  <FolderPlus className="w-6 h-6 text-purple-400 mb-2 group-hover:scale-110 transition-transform" />
                  <h4 className="text-sm font-bold text-white mb-1">Add a Notebook / Subject</h4>
                  <p className="text-xs text-slate-400">
                    Organize by School, College, Work, Exam, or Personal Learning topics.
                  </p>
                </button>
              </div>

              {/* Supported Media Features */}
              <div className="grid grid-cols-3 gap-3 max-w-lg mx-auto text-center">
                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 text-slate-300">
                  <Camera className="w-4 h-4 text-cyan-400 mx-auto mb-1" />
                  <span className="text-[11px] font-semibold block">Notebook Photos</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 text-slate-300">
                  <FileText className="w-4 h-4 text-rose-400 mx-auto mb-1" />
                  <span className="text-[11px] font-semibold block">PDF Documents</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 text-slate-300">
                  <Link2 className="w-4 h-4 text-indigo-400 mx-auto mb-1" />
                  <span className="text-[11px] font-semibold block">Important Links</span>
                </div>
              </div>
            </div>
          ) : (
            /* Mode 4: Notes Explorer */
            <div className="max-w-7xl mx-auto space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <h1 className="text-xl sm:text-2xl font-extrabold text-white flex items-center gap-2">
                      {activeSubjectId
                        ? subjects.find((s) => s.id === activeSubjectId)?.name || 'Notebook Notes'
                        : activeFilter === 'starred'
                        ? '⭐ Starred Notes'
                        : activeFilter === 'interview'
                        ? '🎯 Quick Reference'
                        : activeFilter === 'exam'
                        ? '📚 Test & Exam Prep'
                        : activeFilter === 'mastered'
                        ? '🏆 Mastered Topics'
                        : 'All Notes & Documents'}
                    </h1>

                    {activeSubjectId && (
                      <button
                        onClick={() => {
                          const sub = subjects.find((s) => s.id === activeSubjectId);
                          if (
                            window.confirm(
                              `Delete notebook "${sub?.name || 'this notebook'}"? Any notes inside will remain safe and become Uncategorized.`
                            )
                          ) {
                            handleDeleteSubject(activeSubjectId);
                          }
                        }}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/50 text-rose-300 text-xs font-semibold transition-all shadow-sm"
                        title="Delete this notebook category"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Notebook</span>
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Showing {filteredNotes.length} saved notes
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Filter className="w-3.5 h-3.5 text-slate-400" />
                  <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-xs">
                    {(['All', 'Beginner', 'Intermediate', 'Advanced'] as const).map((diff) => (
                      <button
                        key={diff}
                        onClick={() => setDifficultyFilter(diff)}
                        className={`px-2.5 py-1 rounded font-medium transition-all ${
                          difficultyFilter === diff
                            ? 'bg-cyan-500/20 text-cyan-300 font-semibold'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {diff}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {loading ? (
                <div className="py-20 text-center text-slate-400 text-sm flex items-center justify-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                  <span>Loading notes...</span>
                </div>
              ) : filteredNotes.length === 0 ? (
                <div className="py-16 text-center bg-slate-900/40 border border-slate-800/80 rounded-2xl p-8 max-w-lg mx-auto">
                  <SearchX className="w-10 h-10 text-slate-500 mx-auto mb-3" />
                  <h3 className="text-base font-bold text-white mb-1">No notes match your filters</h3>
                  <p className="text-xs text-slate-400 mb-5">
                    {searchQuery
                      ? `No notes match "${searchQuery}".`
                      : 'Create your first note or upload a photo/PDF to get started.'}
                  </p>
                  <button
                    onClick={handleStartCreate}
                    className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg text-xs font-semibold shadow-md hover:scale-[1.02] transition-all"
                  >
                    + Create Note
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredNotes.map((note) => (
                    <NoteCard
                      key={note.id}
                      note={note}
                      onSelect={handleSelectNote}
                      onToggleStar={handleToggleStar}
                      onQuickAI={handleQuickAI}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* AI Copilot Drawer */}
      <AICopilot
        isOpen={isCopilotOpen}
        onClose={() => setIsCopilotOpen(false)}
        activeNote={activeNote}
        onInsertToNote={handleInsertToNote}
        onOpenSettings={() => setIsSettingsOpen(true)}
        initialPromptAction={copilotAction}
        onClearInitialAction={() => setCopilotAction(null)}
      />

      {/* Account & Profile Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onDataImported={loadData}
        user={currentUser}
        onUserUpdated={(updatedUser) => setCurrentUser(updatedUser)}
      />

      {/* Subject Modal */}
      <SubjectModal
        isOpen={isSubjectModalOpen}
        onClose={() => setIsSubjectModalOpen(false)}
        onSave={handleCreateSubject}
      />
    </div>
  );
}

export default App;
