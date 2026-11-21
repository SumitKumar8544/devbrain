export interface UserSubscription {
  tier: 'free_trial' | 'student_pro' | 'researcher_pro' | 'lifetime';
  status: 'trialing' | 'active' | 'expired' | 'cancelled';
  trialEndsAt: string;
  daysLeftInTrial: number;
  isTrialExpired: boolean;
  isSubscribed: boolean;
  canCreateNotes: boolean;
  expiresAt: string | null;
}

export interface SubscriptionPlan {
  id: 'student_pro' | 'researcher_pro' | 'lifetime';
  name: string;
  badge?: string;
  monthlyPrice: number | null;
  yearlyPrice: number;
  description: string;
  popular?: boolean;
  features: string[];
}

export interface PaymentRecord {
  id: string;
  user_id: string;
  plan_id: string;
  plan_name: string;
  amount: number;
  currency: string;
  billing_cycle: string;
  payment_method: string;
  status: string;
  transaction_id: string;
  created_at: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  institution?: string;
  role?: string;
  grade_or_level?: string;
  created_at?: string;
  trial_ends_at?: string;
  subscription_tier?: 'free_trial' | 'student_pro' | 'researcher_pro' | 'lifetime';
  subscription_status?: 'trialing' | 'active' | 'expired' | 'cancelled';
  subscription_expires_at?: string;
  subscription?: UserSubscription;
}

export type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced';

export type NoteStatus = 'Draft' | 'Revising' | 'Exam Ready' | 'Interview Ready' | 'Mastered';

export interface Attachment {
  id: string;
  name: string;
  url: string;
  type: 'image' | 'pdf' | 'document';
  size?: number;
  mimeType?: string;
  uploaded_at?: string;
}

export interface CodeSnippet {
  id?: string;
  language: string;
  title: string;
  code: string;
}

export interface ResourceLink {
  id?: string;
  title: string;
  url: string;
  type: 'LeetCode' | 'GitHub' | 'YouTube' | 'Documentation' | 'Research Paper' | 'Article' | 'Other';
  description?: string;
}

export interface Flashcard {
  id?: string;
  question: string;
  answer: string;
}

export interface Subject {
  id: string;
  user_id?: string;
  name: string;
  code?: string;
  category?: string;
  semester?: number;
  icon?: string;
  color?: string;
  description?: string;
  note_count?: number;
  created_at?: string;
}

export interface Note {
  id: string;
  user_id?: string;
  subject_id: string | null;
  subject_name?: string;
  subject_color?: string;
  subject_code?: string;
  title: string;
  content: string;
  summary?: string;
  tags: string[];
  difficulty: Difficulty;
  status: NoteStatus;
  starred: number;
  pinned?: number;
  is_public?: number;
  share_id?: string;
  author_name?: string;
  attachments: Attachment[];
  code_snippets: CodeSnippet[];
  resource_links: ResourceLink[];
  flashcards: Flashcard[];
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  message: string;
  timestamp: string;
  provider?: string;
  isOffline?: boolean;
}

export interface VaultStats {
  totalNotes: number;
  totalSubjects: number;
  starredNotes: number;
  masteredNotes: number;
  interviewReady: number;
  subjects: (Subject & { note_count: number })[];
}
