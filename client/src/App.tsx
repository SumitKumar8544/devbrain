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
import { CommandPalette } from './components/CommandPalette';
import { WhiteboardCanvas } from './components/WhiteboardCanvas';
import { SubscriptionModal } from './components/SubscriptionModal';
import { useToast } from './context/ToastContext';
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
  Trash2,
  LayoutGrid,
  List,
  ArrowUpDown,
  Star,
  Pin,
  Clock,
  Brain,
  Crown,
  AlertTriangle
} from 'lucide-react';

export function App() {
  const { success, error: toastError } = useToast();
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
  const [vaultLoaded, setVaultLoaded] = useState(false);

  // Filters & Sorting
  const [activeSubjectId, setActiveSubjectId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'recent' | 'oldest' | 'title' | 'starred'>('recent');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    try {
      return (localStorage.getItem('devbrain_view_mode') as 'grid' | 'list') || 'grid';
    } catch {
      return 'grid';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('devbrain_view_mode', viewMode);
    } catch {}
  }, [viewMode]);

  // Navigation / View state
  const [activeNote, setActiveNote] = useState<Note | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Modals & Drawers
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isCanvasOpen, setIsCanvasOpen] = useState(false);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  const [subscriptionReason, setSubscriptionReason] = useState<'expired' | 'upgrade' | 'ai_limit'>('upgrade');
  const [copilotAction, setCopilotAction] = useState<{ note: Note; action: string } | null>(null);

  // Global Keyboard Shortcuts (Ctrl+K, Ctrl+N, Ctrl+J)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input or textarea (except for Command Palette)
      const target = e.target as HTMLElement;
      const isInput = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA';

      // Ctrl+K / Cmd+K: Fast Command Palette (always allowed)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
        return;
      }

      if (isInput) return;

      // Ctrl+N / Cmd+N: New Study Note
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setActiveNote(null);
        setIsEditing(false);
        setIsCreating(true);
      }

      // Ctrl+J / Cmd+J: Toggle AI Study Copilot
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        setIsCopilotOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Check existing session on load & pre-fetch initial vault data to prevent flicker & layout shift
  useEffect(() => {
    api.getMe()
      .then(async (res) => {
        if (res?.user) {
          setCurrentUser(res.user);
          try {
            setLoading(true);
            const [subs, st, fetchedNotes] = await Promise.all([
              api.getSubjects(),
              api.getStats().catch(() => null),
              api.getNotes(),
            ]);
            setSubjects(subs || []);
            setStats(st);
            setNotes(fetchedNotes || []);
          } catch (e) {
            console.error('Initial vault load error:', e);
          } finally {
            setLoading(false);
            setVaultLoaded(true);
          }
        }
      })
      .catch(() => {
        setCurrentUser(null);
      })
      .finally(() => {
        setAuthChecking(false);
      });
  }, []);

  // Handle return from Stripe Checkout redirect (?stripe_session_id=...&plan_id=...)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const stripeSessionId = params.get('stripe_session_id');
      const planId = params.get('plan_id');

      if (stripeSessionId) {
        api.verifyStripeSession(stripeSessionId, planId || undefined)
          .then((res) => {
            if (res.success) {
              success('🎉 Pro subscription activated via Stripe Checkout!');
              if (res.user) {
                setCurrentUser(res.user);
              } else {
                api.getMe().then((me) => me?.user && setCurrentUser(me.user));
              }
            }
          })
          .catch((err) => {
            console.error('Stripe verification failed:', err);
            toastError(err.message || 'Failed to verify Stripe payment');
          })
          .finally(() => {
            const url = new URL(window.location.href);
            url.searchParams.delete('stripe_session_id');
            url.searchParams.delete('plan_id');
            window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''));
          });
      }
    } catch (e) {
      console.error('Error parsing stripe session URL params:', e);
    }
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
      setVaultLoaded(true);
    }
  };

  useEffect(() => {
    if (currentUser && vaultLoaded) {
      loadData();
    }
  }, [activeSubjectId, searchQuery, activeTag]);

  const handleLogout = () => {
    api.logout();
    setCurrentUser(null);
    setNotes([]);
    setSubjects([]);
    setVaultLoaded(false);
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
    // If 3-month trial has expired and user is not subscribed, prompt paywall
    if (currentUser?.subscription?.isTrialExpired && !currentUser?.subscription?.isSubscribed) {
      setSubscriptionReason('expired');
      setIsSubscriptionModalOpen(true);
      return;
    }
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
        success('New study note created & saved!');
      } else if (activeNote) {
        const updated = await api.updateNote(activeNote.id, data);
        setActiveNote(updated);
        setIsEditing(false);
        success('Study note updated!');
      }
      loadData();
    } catch (err: any) {
      toastError(`Error saving note: ${err.message}`);
    }
  };

  const handleDeleteNote = async (id: string) => {
    try {
      await api.deleteNote(id);
      setActiveNote(null);
      setIsEditing(false);
      setIsCreating(false);
      loadData();
      success('Note moved to trash / deleted.');
    } catch (err: any) {
      toastError(`Error deleting note: ${err.message}`);
    }
  };

  const handleInsertToNote = async (contentToAppend: string) => {
    if (!activeNote) return;
    try {
      const updatedContent = `${activeNote.content}\n\n---\n### 🧠 Copilot Revision Notes & Key Takeaways:\n${contentToAppend}`;
      const updated = await api.updateNote(activeNote.id, {
        ...activeNote,
        content: updatedContent,
      });
      setActiveNote(updated);
      loadData();
      success('Copilot explanation inserted directly into your note!');
    } catch (err: any) {
      toastError(`Failed to append to note: ${err.message}`);
    }
  };

  const handleQuickAI = (note: Note, e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentUser?.subscription?.isTrialExpired && !currentUser?.subscription?.isSubscribed) {
      setSubscriptionReason('ai_limit');
      setIsSubscriptionModalOpen(true);
      return;
    }
    setActiveNote(note);
    setIsCopilotOpen(true);
    setCopilotAction({ note, action: 'explain' });
  };

  const handleAskAIAction = (note: Note, action: string) => {
    if (currentUser?.subscription?.isTrialExpired && !currentUser?.subscription?.isSubscribed) {
      setSubscriptionReason('ai_limit');
      setIsSubscriptionModalOpen(true);
      return;
    }
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
      success('Notebook category created!');
    } catch (err: any) {
      toastError(`Failed to create category: ${err.message}`);
    }
  };

  const handleDeleteSubject = async (id: string) => {
    try {
      await api.deleteSubject(id);
      if (activeSubjectId === id) {
        setActiveSubjectId(null);
      }
      loadData();
      success('Notebook category deleted.');
    } catch (err: any) {
      toastError(`Failed to delete notebook category: ${err.message}`);
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
      <div className="min-h-screen bg-transparent flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 text-xs">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center text-white shadow-xl shadow-sky-500/25 mb-4 animate-pulse">
          <Brain className="w-6 h-6" />
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-sky-500 dark:bg-cyan-400 animate-ping" />
          <span className="font-semibold text-slate-700 dark:text-slate-300">Loading DevBrain Vault...</span>
        </div>
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
    if (activeSubjectId && n.subject_id !== activeSubjectId) return false;
    if (activeTag && (!n.tags || !n.tags.includes(activeTag))) return false;
    if (activeFilter === 'starred' && n.starred !== 1) return false;
    if (activeFilter === 'interview' && n.status !== 'Interview Ready') return false;
    if (activeFilter === 'exam' && n.status !== 'Exam Ready') return false;
    if (activeFilter === 'mastered' && n.status !== 'Mastered') return false;
    if (activeFilter === 'revising' && n.status !== 'Revising' && n.status !== 'Draft') return false;
    if (difficultyFilter !== 'All' && n.difficulty !== difficultyFilter) return false;
    
    // Accurate Multi-field Search
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const inTitle = n.title?.toLowerCase().includes(q);
      const inContent = n.content?.toLowerCase().includes(q);
      const inSummary = n.summary?.toLowerCase().includes(q);
      const inTags = n.tags?.some((t) => t.toLowerCase().includes(q));
      const inSubject = n.subject_name?.toLowerCase().includes(q);
      const inAttachments = n.attachments?.some((a) => a.name?.toLowerCase().includes(q));
      if (!inTitle && !inContent && !inSummary && !inTags && !inSubject && !inAttachments) return false;
    }
    return true;
  }).sort((a, b) => {
    if (sortBy === 'title') {
      return (a.title || '').localeCompare(b.title || '');
    }
    if (sortBy === 'oldest') {
      const dateA = new Date(a.created_at || 0).getTime();
      const dateB = new Date(b.created_at || 0).getTime();
      return dateA - dateB;
    }
    if (sortBy === 'starred') {
      if ((b.starred || 0) !== (a.starred || 0)) {
        return (b.starred || 0) - (a.starred || 0);
      }
    }
    // Default: 'recent' (pinned notes stay on top, then newest updated)
    if ((b.pinned || 0) !== (a.pinned || 0)) {
      return (b.pinned || 0) - (a.pinned || 0);
    }
    const dateA = new Date(a.updated_at || a.created_at || 0).getTime();
    const dateB = new Date(b.updated_at || b.created_at || 0).getTime();
    return dateB - dateA;
  });

  return (
    <div className="min-h-screen bg-transparent text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-sky-500/30 selection:text-sky-900 dark:selection:text-sky-200 transition-colors duration-200">
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
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        onOpenSubscription={() => {
          setSubscriptionReason('upgrade');
          setIsSubscriptionModalOpen(true);
        }}
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
          {/* 3-Month Free Trial Expired Warning Banner */}
          {currentUser?.subscription?.isTrialExpired && !currentUser?.subscription?.isSubscribed && (
            <div className="mb-6 p-4.5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-rose-500/15 to-purple-500/15 border border-amber-500/40 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Your 3-Month Free Trial has expired</span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black uppercase">
                      Action Required
                    </span>
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                    Your existing notes and materials are 100% safe. To continue creating new notes, uploading files, and using the AI Study Copilot, please pick a plan.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setSubscriptionReason('expired');
                  setIsSubscriptionModalOpen(true);
                }}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs shadow-md transition-all hover:scale-[1.02] flex items-center gap-1.5 flex-shrink-0 self-start sm:self-center cursor-pointer"
              >
                <Crown className="w-4 h-4" />
                <span>Upgrade to Pro Plan</span>
              </button>
            </div>
          )}

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
          ) : vaultLoaded && notes.length === 0 && subjects.length === 0 && !searchQuery ? (
            /* Mode 3: Fresh Blank Slate Onboarding */
            <div className="max-w-2xl mx-auto py-12 px-4 text-center">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-sky-500/20 to-blue-500/20 border border-sky-500/30 flex items-center justify-center mx-auto mb-5 text-sky-500 dark:text-cyan-400 shadow-lg shadow-sky-500/10">
                <BookOpen className="w-8 h-8" />
              </div>

              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mb-2">
                Welcome to your Knowledge Vault, {currentUser.name}! 🌟
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 max-w-lg mx-auto leading-relaxed mb-8">
                Your notebook is completely blank and ready. Capture photos of handwritten notes or whiteboard sketches, upload PDF documents, save essential links, and let AI help you understand any concept!
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto mb-8">
                <button
                  onClick={handleStartCreate}
                  className="p-5 rounded-2xl bg-white/80 dark:bg-slate-900/65 backdrop-blur-xl hover:bg-white dark:hover:bg-slate-800 border border-white/80 dark:border-white/10 hover:border-sky-400/60 dark:hover:border-sky-400/40 text-left transition-all group shadow-md hover:scale-[1.02]"
                >
                  <Plus className="w-6 h-6 text-sky-500 dark:text-cyan-400 mb-2 group-hover:scale-110 transition-transform" />
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Create Your First Note</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Upload photos, attach PDFs, paste web links, and write thoughts.
                  </p>
                </button>

                <button
                  onClick={() => setIsSubjectModalOpen(true)}
                  className="p-5 rounded-2xl bg-white/80 dark:bg-slate-900/65 backdrop-blur-xl hover:bg-white dark:hover:bg-slate-800 border border-white/80 dark:border-white/10 hover:border-purple-400/60 dark:hover:border-purple-400/40 text-left transition-all group shadow-md hover:scale-[1.02]"
                >
                  <FolderPlus className="w-6 h-6 text-purple-500 dark:text-purple-400 mb-2 group-hover:scale-110 transition-transform" />
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Add a Notebook / Subject</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Organize by School, College, Work, Exam, or Personal Learning topics.
                  </p>
                </button>
              </div>

              {/* Supported Media Features */}
              <div className="grid grid-cols-3 gap-3 max-w-lg mx-auto text-center">
                <div className="p-3 rounded-xl bg-white/70 dark:bg-slate-900/50 backdrop-blur-md border border-white/80 dark:border-white/10 text-slate-700 dark:text-slate-300 shadow-xs">
                  <Camera className="w-4 h-4 text-sky-500 dark:text-cyan-400 mx-auto mb-1" />
                  <span className="text-[11px] font-semibold block">Notebook Photos</span>
                </div>
                <div className="p-3 rounded-xl bg-white/70 dark:bg-slate-900/50 backdrop-blur-md border border-white/80 dark:border-white/10 text-slate-700 dark:text-slate-300 shadow-xs">
                  <FileText className="w-4 h-4 text-rose-500 dark:text-rose-400 mx-auto mb-1" />
                  <span className="text-[11px] font-semibold block">PDF Documents</span>
                </div>
                <div className="p-3 rounded-xl bg-white/70 dark:bg-slate-900/50 backdrop-blur-md border border-white/80 dark:border-white/10 text-slate-700 dark:text-slate-300 shadow-xs">
                  <Link2 className="w-4 h-4 text-indigo-500 dark:text-indigo-400 mx-auto mb-1" />
                  <span className="text-[11px] font-semibold block">Important Links</span>
                </div>
              </div>
            </div>
          ) : (
            /* Mode 4: Notes Explorer */
            <div className="max-w-7xl mx-auto space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800/80 pb-4">
                <div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
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
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800/50 text-rose-600 dark:text-rose-300 text-xs font-semibold transition-all shadow-xs"
                        title="Delete this notebook category"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Notebook</span>
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Showing <span className="font-semibold text-slate-700 dark:text-slate-300">{filteredNotes.length}</span> saved study notes • Organized & ready for revision
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Sort By Dropdown */}
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/70 dark:bg-slate-900/60 backdrop-blur-md border border-white/80 dark:border-white/10 text-xs shadow-xs">
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="bg-transparent text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer pr-1"
                    >
                      <option value="recent" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">Recently Updated</option>
                      <option value="title" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">Alphabetical (A-Z)</option>
                      <option value="starred" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">Starred First</option>
                      <option value="oldest" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">Oldest First</option>
                    </select>
                  </div>

                  {/* Difficulty Filter */}
                  <div className="flex items-center bg-white/70 dark:bg-slate-900/60 backdrop-blur-md border border-white/80 dark:border-white/10 rounded-full p-1 text-xs shadow-xs">
                    {(['All', 'Beginner', 'Intermediate', 'Advanced'] as const).map((diff) => (
                      <button
                        key={diff}
                        onClick={() => setDifficultyFilter(diff)}
                        className={`px-3 py-1 rounded-full font-semibold transition-all ${
                          difficultyFilter === diff
                            ? 'bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-300 shadow-xs'
                            : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 font-medium'
                        }`}
                      >
                        {diff}
                      </button>
                    ))}
                  </div>

                  {/* Grid / List View Mode Toggle */}
                  <div className="flex items-center bg-white/70 dark:bg-slate-900/60 backdrop-blur-md border border-white/80 dark:border-white/10 rounded-full p-1 text-xs shadow-xs">
                    <button
                      onClick={() => setViewMode('grid')}
                      title="Grid Card View"
                      className={`p-1.5 rounded-full transition-all ${
                        viewMode === 'grid'
                          ? 'bg-sky-500 text-white shadow-xs'
                          : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <LayoutGrid className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      title="Compact List View"
                      className={`p-1.5 rounded-full transition-all ${
                        viewMode === 'list'
                          ? 'bg-sky-500 text-white shadow-xs'
                          : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <List className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {loading ? (
                <div className="py-20 text-center text-slate-400 text-sm flex items-center justify-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                  <span>Loading notes...</span>
                </div>
              ) : filteredNotes.length === 0 ? (
                <div className="py-16 text-center bg-white/70 dark:bg-slate-900/50 backdrop-blur-xl border border-white/80 dark:border-white/10 rounded-2xl p-8 max-w-lg mx-auto shadow-md">
                  <SearchX className="w-10 h-10 text-slate-400 dark:text-slate-500 mx-auto mb-3" />
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">No notes match your filters</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
                    {searchQuery
                      ? `No notes match "${searchQuery}".`
                      : 'Create your first note or upload a photo/PDF to get started.'}
                  </p>
                  <button
                    onClick={handleStartCreate}
                    className="px-4 py-2 bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 text-white rounded-xl text-xs font-semibold shadow-md hover:scale-[1.02] transition-all"
                  >
                    + Create Note
                  </button>
                </div>
              ) : viewMode === 'list' ? (
                <div className="space-y-2.5">
                  {filteredNotes.map((note) => {
                    const pdfCount = note.attachments?.filter((a) => a.type === 'pdf' || a.type === 'document').length || 0;
                    const imgCount = note.attachments?.filter((a) => a.type === 'image').length || 0;
                    const wordCount = (note.content || '').trim().split(/\s+/).filter(Boolean).length;
                    const readTime = Math.max(1, Math.ceil(wordCount / 160));
                    const accentColor = note.subject_color || (note.pinned ? '#f59e0b' : '#38bdf8');

                    return (
                      <div
                        key={note.id}
                        onClick={() => handleSelectNote(note)}
                        className="group relative bg-white/80 dark:bg-slate-900/65 backdrop-blur-xl border border-white/80 dark:border-white/10 hover:border-sky-400/60 dark:hover:border-sky-400/40 rounded-2xl p-4 cursor-pointer transition-all duration-200 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.04)] dark:shadow-[0_4px_20px_-4px_rgba(0,0,0,0.3)] hover:shadow-lg hover:-translate-y-0.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 overflow-hidden"
                      >
                        <div
                          className="absolute left-0 top-0 bottom-0 w-1 transition-all group-hover:w-1.5"
                          style={{ backgroundColor: accentColor }}
                        />

                        <div className="flex-1 min-w-0 pl-1.5">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            {note.pinned === 1 && (
                              <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/35 text-amber-600 dark:text-amber-400">
                                <Pin className="w-2.5 h-2.5 fill-amber-500 dark:fill-amber-400" />
                                <span>Pinned</span>
                              </span>
                            )}
                            {note.subject_name && (
                              <span
                                className="text-[10px] font-semibold px-2 py-0.5 rounded-full border"
                                style={{
                                  backgroundColor: `${note.subject_color || '#0284c7'}15`,
                                  borderColor: `${note.subject_color || '#0284c7'}35`,
                                  color: note.subject_color || '#0284c7',
                                }}
                              >
                                {note.subject_name}
                              </span>
                            )}
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                              {note.status}
                            </span>
                          </div>

                          <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white group-hover:text-sky-600 dark:group-hover:text-cyan-300 transition-colors truncate">
                            {note.title}
                          </h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                            {note.summary || (note.content ? note.content.slice(0, 100).replace(/[#*`_]/g, '') : 'Interactive study note')}
                          </p>
                        </div>

                        <div className="flex items-center gap-3 flex-shrink-0 text-xs text-slate-500 dark:text-slate-400 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800/80">
                          {pdfCount > 0 && (
                            <span className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200/80 dark:border-rose-900/40">
                              <FileText className="w-3 h-3" />
                              <span>{pdfCount} {pdfCount === 1 ? 'PDF' : 'PDFs'}</span>
                            </span>
                          )}

                          {imgCount > 0 && (
                            <span className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 border border-sky-200/80 dark:border-sky-900/40">
                              <Camera className="w-3 h-3" />
                              <span>{imgCount}</span>
                            </span>
                          )}

                          <span className="text-[11px] font-medium hidden md:inline text-slate-400">
                            {readTime}m read
                          </span>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleStar(note.id, e);
                            }}
                            title={note.starred ? 'Starred' : 'Add to Starred'}
                            className="p-1.5 rounded-full text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
                          >
                            <Star className={`w-4 h-4 ${note.starred ? 'text-amber-400 fill-amber-400' : ''}`} />
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleQuickAI(note, e);
                            }}
                            title="Ask AI to explain note"
                            className="p-1.5 rounded-full text-purple-500 hover:text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40 transition-colors"
                          >
                            <Sparkles className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
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
        onOpenSubscription={() => {
          setSubscriptionReason('upgrade');
          setIsSubscriptionModalOpen(true);
        }}
      />

      {/* Subject Modal */}
      <SubjectModal
        isOpen={isSubjectModalOpen}
        onClose={() => setIsSubjectModalOpen(false)}
        onSave={handleCreateSubject}
      />

      {/* Global Command Palette (Ctrl+K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        notes={notes}
        subjects={subjects}
        onSelectNote={handleSelectNote}
        onSelectSubject={(id) => {
          setActiveSubjectId(id);
          setActiveNote(null);
        }}
        onCreateNote={handleStartCreate}
        onOpenCopilot={() => setIsCopilotOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenCanvas={() => setIsCanvasOpen(true)}
        onExportVault={() => {
          window.open(api.getExportUrl(), '_blank');
          success('Knowledge Vault JSON backup downloaded!');
        }}
      />

      {/* Quick Whiteboard & Diagram Canvas */}
      <WhiteboardCanvas
        isOpen={isCanvasOpen}
        onClose={() => setIsCanvasOpen(false)}
        onSaveDrawing={async (file) => {
          try {
            const att = await api.uploadFile(file);
            if (activeNote) {
              const updated = await api.updateNote(activeNote.id, {
                ...activeNote,
                attachments: [...(activeNote.attachments || []), att],
              });
              setActiveNote(updated);
              loadData();
              success('Handwritten sketch attached to this study note!');
            } else {
              // Create a quick scratch note with this diagram
              const created = await api.createNote({
                title: `Sketch Diagram — ${new Date().toLocaleDateString()}`,
                content: 'Hand-drawn architecture/algorithm whiteboard diagram.',
                attachments: [att],
                subject_id: activeSubjectId || subjects[0]?.id || null,
              });
              setActiveNote(created);
              loadData();
              success('New note created with your handwritten sketch!');
            }
          } catch (e: any) {
            toastError('Failed to save sketch: ' + e.message);
          }
        }}
      />

      {/* 3-Month Free Trial & Subscription Plans / Payment Modal */}
      {currentUser && (
        <SubscriptionModal
          isOpen={isSubscriptionModalOpen}
          onClose={() => setIsSubscriptionModalOpen(false)}
          user={currentUser}
          reason={subscriptionReason}
          onUserUpdated={(updatedUser) => {
            setCurrentUser(updatedUser);
            loadData();
          }}
        />
      )}
    </div>
  );
}

export default App;
