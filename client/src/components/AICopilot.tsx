import React, { useState, useRef, useEffect } from 'react';
import { Note, ChatMessage } from '../types';
import { api } from '../services/api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Sparkles,
  Send,
  X,
  Trash2,
  Copy,
  Check,
  PlusCircle,
  FileText,
  Key,
  Bot,
  User,
  ArrowRight
} from 'lucide-react';

interface AICopilotProps {
  isOpen: boolean;
  onClose: () => void;
  activeNote: Note | null;
  onInsertToNote?: (contentToInsert: string) => void;
  onOpenSettings: () => void;
  initialPromptAction?: { note: Note; action: string } | null;
  onClearInitialAction?: () => void;
}

export const AICopilot: React.FC<AICopilotProps> = ({
  isOpen,
  onClose,
  activeNote,
  onInsertToNote,
  onOpenSettings,
  initialPromptAction,
  onClearInitialAction,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      message: `👋 **Welcome! I'm your DevBrain AI Study Copilot.**

I can help you understand your study notes, whiteboard photos, PDF documents, worksheets, textbook diagrams, and web links.

${
  activeNote
    ? `I have loaded your note on **"${activeNote.title}"**. What concept would you like me to explain or quiz you on?`
    : `Select any saved note or ask me to explain any topic, concept, math formula, or study material!`
}

Try one of the quick actions below, or ask your own question!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      provider: 'DevBrain Assistant',
    },
  ]);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<'gemini' | 'openai'>('gemini');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  // Handle triggered actions from NoteDetail
  useEffect(() => {
    if (initialPromptAction && isOpen) {
      const { note, action } = initialPromptAction;
      let promptText = '';
      if (action === 'explain') promptText = `Explain "${note.title}" simply with an intuitive real-world analogy.`;
      else if (action === 'code') promptText = `Provide a step-by-step formula or implementation breakdown for "${note.title}".`;
      else if (action === 'quiz') promptText = `Generate 3 practice quiz questions with explanations for "${note.title}".`;
      else if (action === 'summarize') promptText = `Generate a concise revision cheat-sheet for "${note.title}".`;
      else if (action === 'edge-cases') promptText = `What are the critical points, pitfalls, and key exam insights in "${note.title}"?`;

      if (promptText) {
        handleSend(promptText, action);
      }
      if (onClearInitialAction) onClearInitialAction();
    }
  }, [initialPromptAction, isOpen]);

  const handleSend = async (customMessage?: string, action?: string) => {
    const textToSend = customMessage || input.trim();
    if (!textToSend || loading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      message: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!customMessage) setInput('');
    setLoading(true);

    try {
      // Build history for context
      const history = messages
        .filter((m) => m.id !== 'welcome')
        .slice(-6)
        .map((m) => ({ role: m.role, message: m.message }));

      const res = await api.chatAI({
        message: textToSend,
        noteId: activeNote?.id,
        history,
        action: action || 'chat',
        provider: selectedProvider,
        model: selectedProvider === 'openai' ? 'gpt-4o' : 'gemini-2.5-flash',
      });

      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        message: res.noteNotice ? `> [!NOTE]\n> ${res.noteNotice}\n\n${res.reply}` : res.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        provider: res.provider,
        isOffline: res.isOffline,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: 'assistant',
          message: `⚠️ **Error communicating with AI:** ${err.message || 'Please check your connection or server.'}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyMessage = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleClear = () => {
    setMessages([
      {
        id: 'welcome-reset',
        role: 'assistant',
        message: 'Chat history cleared. How can I help you study next?',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col transition-all duration-300">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-purple-500/30">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-extrabold text-white">AI Study Copilot</h3>
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold border ${
                selectedProvider === 'openai'
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                  : 'bg-purple-950 text-purple-300 border-purple-800'
              }`}>
                {selectedProvider === 'openai' ? 'OPENAI GPT-4o' : 'GEMINI 2.5'}
              </span>
            </div>
            <p className="text-[10px] text-slate-400">
              {selectedProvider === 'openai'
                ? 'OpenAI GPT-4o with Gemini auto-fallback'
                : 'Powered by Google Gemini 2.5 Flash'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleClear}
            title="Clear Chat History"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Model Switcher Pill Bar */}
      <div className="px-4 py-2 bg-slate-950/90 border-b border-slate-800/80 flex items-center justify-between text-xs">
        <span className="text-slate-400 font-semibold text-[11px] flex items-center gap-1.5">
          <Bot className="w-3.5 h-3.5 text-cyan-400" />
          <span>AI Engine:</span>
        </span>

        <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-800">
          <button
            type="button"
            onClick={() => setSelectedProvider('gemini')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
              selectedProvider === 'gemini'
                ? 'bg-purple-600/30 text-purple-200 border border-purple-500/50 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Google Gemini 2.5 Flash: Fast, multimodal, great for photos & documents"
          >
            <Sparkles className="w-3 h-3 text-purple-400" />
            <span>Gemini 2.5</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedProvider('openai')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
              selectedProvider === 'openai'
                ? 'bg-emerald-600/30 text-emerald-200 border border-emerald-500/50 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="OpenAI GPT-4o: Deep reasoning & code generation (with auto-fallback to Gemini)"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>OpenAI GPT-4o</span>
          </button>
        </div>
      </div>

      {/* Active Note Context Bar */}
      {activeNote ? (
        <div className="px-4 py-2 bg-cyan-950/20 border-b border-cyan-900/30 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 truncate">
            <FileText className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
            <span className="text-slate-400 font-medium">Active Note:</span>
            <span className="text-cyan-300 font-bold truncate">{activeNote.title}</span>
          </div>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 flex-shrink-0">
            {activeNote.subject_name || 'General'}
          </span>
        </div>
      ) : (
        <div className="px-4 py-2 bg-slate-950/40 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Global Study Vault Mode</span>
        </div>
      )}

      {/* Quick 1-Click Action Pills */}
      <div className="px-4 py-2.5 bg-slate-950/30 border-b border-slate-800/80 overflow-x-auto flex items-center gap-1.5 no-scrollbar">
        <button
          onClick={() => handleSend(undefined, 'explain')}
          className="whitespace-nowrap px-2.5 py-1 rounded-full bg-slate-800/80 hover:bg-purple-900/40 border border-slate-700 hover:border-purple-600 text-[11px] font-medium text-slate-300 hover:text-purple-200 transition-all"
        >
          🧠 Explain ELIF5
        </button>
        <button
          onClick={() => handleSend(undefined, 'code')}
          className="whitespace-nowrap px-2.5 py-1 rounded-full bg-slate-800/80 hover:bg-purple-900/40 border border-slate-700 hover:border-purple-600 text-[11px] font-medium text-slate-300 hover:text-purple-200 transition-all"
        >
          💻 Code Solution
        </button>
        <button
          onClick={() => handleSend(undefined, 'quiz')}
          className="whitespace-nowrap px-2.5 py-1 rounded-full bg-slate-800/80 hover:bg-purple-900/40 border border-slate-700 hover:border-purple-600 text-[11px] font-medium text-slate-300 hover:text-purple-200 transition-all"
        >
          🧪 Quiz Me
        </button>
        <button
          onClick={() => handleSend(undefined, 'summarize')}
          className="whitespace-nowrap px-2.5 py-1 rounded-full bg-slate-800/80 hover:bg-purple-900/40 border border-slate-700 hover:border-purple-600 text-[11px] font-medium text-slate-300 hover:text-purple-200 transition-all"
        >
          📝 Cheatsheet
        </button>
        <button
          onClick={() => handleSend(undefined, 'edge-cases')}
          className="whitespace-nowrap px-2.5 py-1 rounded-full bg-slate-800/80 hover:bg-purple-900/40 border border-slate-700 hover:border-purple-600 text-[11px] font-medium text-slate-300 hover:text-purple-200 transition-all"
        >
          🐛 Edge Cases
        </button>
      </div>

      {/* Messages Thread */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, idx) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              {!isUser && (
                <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white flex-shrink-0 text-xs mt-1">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed ${
                  isUser
                    ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-tr-none'
                    : 'bg-slate-950 border border-slate-800/90 text-slate-200 rounded-tl-none shadow-lg'
                }`}
              >
                {/* Message Header (Provider & Timestamp) */}
                <div className="flex items-center justify-between gap-2 mb-1.5 text-[10px] text-slate-400">
                  <span className="font-semibold text-purple-300">
                    {isUser ? 'You' : msg.provider || 'DevBrain Assistant'}
                  </span>
                  <span>{msg.timestamp}</span>
                </div>

                {/* Message Body */}
                <div className="prose prose-invert prose-xs max-w-none prose-p:my-1.5 prose-p:leading-relaxed prose-code:text-cyan-300 prose-code:bg-slate-900 prose-code:px-1 prose-code:rounded prose-pre:bg-slate-900 prose-pre:border prose-pre:border-slate-800">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {msg.message}
                  </ReactMarkdown>
                </div>

                {/* Message Actions (Copy & Insert to Note) */}
                {!isUser && msg.id !== 'welcome' && (
                  <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                    <button
                      onClick={() => handleCopyMessage(msg.message, idx)}
                      className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-200 transition-colors"
                    >
                      {copiedIndex === idx ? (
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

                    {onInsertToNote && activeNote && (
                      <button
                        onClick={() => onInsertToNote(msg.message)}
                        className="flex items-center gap-1 text-[10px] text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
                        title="Append this explanation to your active note"
                      >
                        <PlusCircle className="w-3 h-3" />
                        <span>Insert into Note</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {isUser && (
                <div className="w-7 h-7 rounded-lg bg-cyan-700 flex items-center justify-center text-white flex-shrink-0 text-xs mt-1">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          );
        })}

        {loading && (
          <div className="flex gap-3 items-start">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white flex-shrink-0 mt-1">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-2xl rounded-tl-none p-4 text-xs text-purple-300 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
              <span>DevBrain AI is analyzing concepts & crafting response...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Live AI Status */}
      <div className="px-4 py-1.5 bg-slate-950/90 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-slate-300 font-medium">Gemini 2.5 Flash Intelligence</span>
        </span>
        <span className="text-[10px] text-purple-300/80">Online & Ready</span>
      </div>

      {/* Input Form */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/80">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-end gap-2"
        >
          <div className="flex-1 relative">
            <textarea
              rows={2}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={
                activeNote
                  ? `Ask about ${activeNote.title.slice(0, 24)}... (Enter to send)`
                  : 'Ask any study question, concept, or formula... (Enter to send)'
              }
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 resize-none placeholder:text-slate-500"
            />
          </div>

          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="p-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-40 text-white shadow-md shadow-purple-500/20 transition-all hover:scale-[1.04] active:scale-[0.96]"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
