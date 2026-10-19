import type { Note, Subject, VaultStats, User, Attachment } from '../types';

const API_BASE = '/api';

class ApiService {
  private currentUserId: string | null = null;

  constructor() {
    this.currentUserId = localStorage.getItem('devbrain_user_id');
  }

  setUserId(id: string | null) {
    this.currentUserId = id;
    if (id) {
      localStorage.setItem('devbrain_user_id', id);
    } else {
      localStorage.removeItem('devbrain_user_id');
    }
  }

  getUserId(): string | null {
    return this.currentUserId;
  }

  private getHeaders(extraHeaders: Record<string, string> = {}): Record<string, string> {
    const headers: Record<string, string> = {
      ...extraHeaders,
    };
    if (this.currentUserId) {
      headers['x-user-id'] = this.currentUserId;
    }
    return headers;
  }

  // ================= Auth =================
  async register(data: {
    name: string;
    email: string;
    password: string;
    institution?: string;
    role?: string;
    grade_or_level?: string;
  }): Promise<{ user: User }> {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to register account');
    }
    const result = await res.json();
    this.setUserId(result.user.id);
    return result;
  }

  async login(data: { email: string; password: string }): Promise<{ user: User }> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Invalid email or password');
    }
    const result = await res.json();
    this.setUserId(result.user.id);
    return result;
  }

  async getMe(): Promise<{ user: User } | null> {
    if (!this.currentUserId) return null;
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      this.setUserId(null);
      return null;
    }
    return res.json();
  }

  logout() {
    this.setUserId(null);
  }

  async updateProfile(data: {
    name: string;
    institution?: string;
    role?: string;
    grade_or_level?: string;
  }): Promise<{ user: User }> {
    const res = await fetch(`${API_BASE}/auth/profile`, {
      method: 'PUT',
      headers: this.getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update profile');
    }
    return res.json();
  }

  async changePassword(data: {
    currentPassword: string;
    newPassword: string;
  }): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/auth/password`, {
      method: 'PUT',
      headers: this.getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update password');
    }
    return res.json();
  }

  // ================= File Uploads (Multiple Photos, PDFs, Documents) =================
  async uploadFiles(files: File[] | FileList): Promise<Attachment[]> {
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }
    const res = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to upload files');
    }
    const data = await res.json();
    return data.attachments || (data.attachment ? [data.attachment] : []);
  }

  async uploadFile(file: File): Promise<Attachment> {
    const list = await this.uploadFiles([file]);
    return list[0];
  }

  // ================= Stats =================
  async getStats(): Promise<VaultStats> {
    const res = await fetch(`${API_BASE}/stats`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch stats');
    return res.json();
  }

  // ================= Categories / Notebooks =================
  async getSubjects(): Promise<Subject[]> {
    const res = await fetch(`${API_BASE}/subjects`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch subjects');
    return res.json();
  }

  async createSubject(data: Partial<Subject>): Promise<Subject> {
    const res = await fetch(`${API_BASE}/subjects`, {
      method: 'POST',
      headers: this.getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to create category');
    }
    return res.json();
  }

  async updateSubject(id: string, data: Partial<Subject>): Promise<Subject> {
    const res = await fetch(`${API_BASE}/subjects/${id}`, {
      method: 'PUT',
      headers: this.getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update category');
    }
    return res.json();
  }

  async deleteSubject(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/subjects/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to delete category');
    }
  }

  // ================= Notes =================
  async getNotes(params?: {
    subject_id?: string;
    search?: string;
    difficulty?: string;
    status?: string;
    starred?: boolean;
    tag?: string;
  }): Promise<Note[]> {
    const query = new URLSearchParams();
    if (params?.subject_id) query.append('subject_id', params.subject_id);
    if (params?.search) query.append('search', params.search);
    if (params?.difficulty) query.append('difficulty', params.difficulty);
    if (params?.status) query.append('status', params.status);
    if (params?.starred) query.append('starred', '1');
    if (params?.tag) query.append('tag', params.tag);

    const res = await fetch(`${API_BASE}/notes?${query.toString()}`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to fetch notes');
    }
    return res.json();
  }

  async getNote(id: string): Promise<Note> {
    const res = await fetch(`${API_BASE}/notes/${id}`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to fetch note');
    }
    return res.json();
  }

  async createNote(data: Partial<Note>): Promise<Note> {
    const res = await fetch(`${API_BASE}/notes`, {
      method: 'POST',
      headers: this.getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to create note');
    }
    return res.json();
  }

  async updateNote(id: string, data: Partial<Note>): Promise<Note> {
    const res = await fetch(`${API_BASE}/notes/${id}`, {
      method: 'PUT',
      headers: this.getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update note');
    }
    return res.json();
  }

  async deleteNote(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/notes/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to delete note');
    }
  }

  async toggleStar(id: string): Promise<{ starred: number }> {
    const res = await fetch(`${API_BASE}/notes/${id}/toggle-star`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to toggle star');
    }
    return res.json();
  }

  async togglePin(id: string): Promise<{ pinned: number }> {
    const res = await fetch(`${API_BASE}/notes/${id}/toggle-pin`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to toggle pin');
    }
    return res.json();
  }

  async toggleShare(id: string): Promise<{ is_public: number; share_id: string }> {
    const res = await fetch(`${API_BASE}/notes/${id}/toggle-share`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to toggle share');
    }
    return res.json();
  }

  async getPublicNote(shareId: string): Promise<Note> {
    const res = await fetch(`${API_BASE}/public/notes/${shareId}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Shared note not found or access has been revoked');
    }
    return res.json();
  }

  // ================= AI Assistant =================
  async chatAI(payload: {
    message: string;
    noteId?: string;
    history?: { role: string; message: string }[];
    action?: string;
    provider?: 'gemini' | 'openai';
    model?: string;
  }): Promise<{ reply: string; provider?: string; isOffline?: boolean; warning?: string; noteNotice?: string }> {
    const res = await fetch(`${API_BASE}/ai/chat`, {
      method: 'POST',
      headers: this.getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to talk to AI assistant');
    return res.json();
  }

  // ================= Settings =================
  async getSettings(): Promise<Record<string, string>> {
    const res = await fetch(`${API_BASE}/settings`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch settings');
    return res.json();
  }

  async saveSetting(key: string, value: string): Promise<void> {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'POST',
      headers: this.getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ key, value }),
    });
    if (!res.ok) throw new Error('Failed to save setting');
  }

  // ================= Backup Export / Import =================
  getExportUrl(): string {
    return `${API_BASE}/export?userId=${this.currentUserId || ''}`;
  }

  async importVault(payload: { subjects: any[]; notes: any[] }): Promise<{ importedSubjects: number; importedNotes: number }> {
    const res = await fetch(`${API_BASE}/import`, {
      method: 'POST',
      headers: this.getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to import backup');
    return res.json();
  }
}

export const api = new ApiService();
