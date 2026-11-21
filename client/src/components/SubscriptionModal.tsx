import React, { useState } from 'react';
import type { User, UserSubscription } from '../types';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import {
  X,
  Check,
  Sparkles,
  Zap,
  ShieldCheck,
  CreditCard,
  Lock,
  Tag,
  Gift,
  ArrowRight,
  Flame,
  Clock,
  AlertTriangle,
  Award,
  Crown
} from 'lucide-react';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onUserUpdated: (updatedUser: User) => void;
  reason?: 'expired' | 'upgrade' | 'ai_limit';
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({
  isOpen,
  onClose,
  user,
  onUserUpdated,
  reason = 'upgrade',
}) => {
  const { success, error: toastError, info } = useToast();
  const sub: UserSubscription = user.subscription || {
    tier: 'free_trial',
    status: 'trialing',
    trialEndsAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
    daysLeftInTrial: 90,
    isTrialExpired: false,
    isSubscribed: false,
    canCreateNotes: true,
    expiresAt: null,
  };

  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');
  const [selectedPlanId, setSelectedPlanId] = useState<'student_pro' | 'researcher_pro' | 'lifetime'>('student_pro');
  const [isCheckingOut, setIsCheckingOut] = useState<boolean>(false);

  // Checkout Form State
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'upi' | 'paypal'>('card');
  const [cardNumber, setCardNumber] = useState('4242 •••• •••• 4242');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvc, setCardCvc] = useState('888');
  const [cardName, setCardName] = useState(user.name || '');
  const [upiId, setUpiId] = useState(`${user.name.toLowerCase().replace(/\s+/g, '')}@okaxis`);
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<string | null>(null);
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [processing, setProcessing] = useState<boolean>(false);
  const [devSimulating, setDevSimulating] = useState<boolean>(false);

  if (!isOpen) return null;

  // Calculate pricing
  const calculatePrice = (planId: 'student_pro' | 'researcher_pro' | 'lifetime') => {
    if (planId === 'lifetime') return 79.0;
    if (planId === 'researcher_pro') {
      return billingCycle === 'yearly' ? 7.99 * 12 : 9.99;
    }
    return billingCycle === 'yearly' ? 3.99 * 12 : 4.99;
  };

  const currentPlanBasePrice = calculatePrice(selectedPlanId);
  const discountAmount = Number(((currentPlanBasePrice * discountPercent) / 100).toFixed(2));
  const finalDue = Math.max(0.99, Number((currentPlanBasePrice - discountAmount).toFixed(2)));

  const handleApplyPromo = () => {
    const code = promoCode.trim().toUpperCase();
    if (!code) return;
    if (code === 'STUDENT50' || code === 'SCHOLAR50') {
      setDiscountPercent(50);
      setAppliedPromo(code);
      success('50% Student Discount applied successfully! 🎓');
    } else if (code === 'DEV20' || code === 'WELCOME20') {
      setDiscountPercent(20);
      setAppliedPromo(code);
      success('20% Welcome Voucher applied! 🎉');
    } else {
      toastError('Invalid coupon code. Try "STUDENT50" or "DEV20".');
    }
  };

  const handleProcessCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    try {
      const res = await api.checkoutSubscription({
        planId: selectedPlanId,
        billingCycle: selectedPlanId === 'lifetime' ? 'lifetime' : billingCycle,
        paymentMethod: paymentMethod === 'card' ? 'credit_card' : paymentMethod,
        promoCode: appliedPromo || undefined,
        cardName: cardName.trim(),
      });

      success(res.message || 'Subscription successfully activated!');
      onUserUpdated(res.user);
      setIsCheckingOut(false);
      onClose();
    } catch (err: any) {
      toastError(`Payment processing error: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleDevSimulateExpiry = async (expireNow: boolean) => {
    setDevSimulating(true);
    try {
      const res = await api.devSimulateTrialExpiry(expireNow);
      onUserUpdated(res.user);
      info(res.message);
    } catch (err: any) {
      toastError(err.message);
    } finally {
      setDevSimulating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-white/80 dark:border-white/10 rounded-3xl shadow-2xl overflow-hidden my-8 flex flex-col max-h-[92vh]">
        {/* Top Header Banner */}
        <div className="relative px-6 py-5 bg-gradient-to-r from-sky-500/10 via-blue-500/10 to-purple-500/10 dark:from-sky-950/50 dark:via-blue-950/40 dark:to-purple-950/50 border-b border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-500 via-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-sky-500/25">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  DevBrain Pro & Plans
                </h3>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-sky-500/20 text-sky-600 dark:text-sky-300 border border-sky-500/30">
                  3-MONTH FREE TRIAL INCLUDED
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Universal study notebook with multimodal AI copilot for learners, researchers & engineers.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3-Month Trial Status Notification Card */}
        <div className="px-6 pt-5">
          {sub.isSubscribed ? (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Award className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                    Active Subscription: {sub.tier === 'lifetime' ? 'Lifetime Founder Vault' : sub.tier === 'researcher_pro' ? 'Engineer & Researcher Pro' : 'Student & Scholar Pro'}
                  </h4>
                  <p className="text-[11px] text-emerald-600/90 dark:text-emerald-400/90">
                    Your account has full unlimited access to all AI Copilot features and notes vault.
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-500 text-white text-[11px] font-bold shadow-xs flex-shrink-0">
                ACTIVE
              </span>
            </div>
          ) : sub.isTrialExpired ? (
            <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-pulse">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-amber-800 dark:text-amber-200">
                    Your 3-Month Free Trial has expired
                  </h4>
                  <p className="text-[11px] text-amber-700 dark:text-amber-300/90 mt-0.5">
                    Your existing notes and documents are 100% safe to view and export. To continue creating new notes, uploading files, and asking the AI Study Copilot, please pick a plan below.
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-amber-500 text-slate-950 text-[11px] font-black self-start sm:self-center shadow-xs">
                TRIAL EXPIRED
              </span>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/60">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-sky-500" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    3-Month Free Trial in Progress
                  </span>
                </div>
                <span className="text-xs font-extrabold text-sky-600 dark:text-cyan-400">
                  {sub.daysLeftInTrial} days remaining
                </span>
              </div>
              {/* Progress bar */}
              <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-sky-500 to-indigo-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(5, ((90 - sub.daysLeftInTrial) / 90) * 100))}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                Every user enjoys 90 days (3 full months) of free access to all features. After 3 months, an active subscription is required to add new notes or use AI.
              </p>
            </div>
          )}
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {!isCheckingOut ? (
            <>
              {/* Billing Cycle Toggle */}
              <div className="flex items-center justify-center">
                <div className="inline-flex items-center p-1 rounded-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-inner">
                  <button
                    type="button"
                    onClick={() => setBillingCycle('monthly')}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                      billingCycle === 'monthly'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                    }`}
                  >
                    Monthly Billing
                  </button>
                  <button
                    type="button"
                    onClick={() => setBillingCycle('yearly')}
                    className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                      billingCycle === 'yearly'
                        ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-xs'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                    }`}
                  >
                    <span>Annual Billing</span>
                    <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black uppercase">
                      SAVE 20%
                    </span>
                  </button>
                </div>
              </div>

              {/* Plans Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1. Student Pro Plan */}
                <div
                  onClick={() => setSelectedPlanId('student_pro')}
                  className={`relative p-5 rounded-3xl border transition-all cursor-pointer flex flex-col justify-between ${
                    selectedPlanId === 'student_pro'
                      ? 'bg-sky-50/80 dark:bg-sky-950/30 border-sky-400 dark:border-sky-500 shadow-xl shadow-sky-500/10 ring-2 ring-sky-400/50'
                      : 'bg-white/80 dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
                        Student & Scholar
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-700 dark:text-sky-300 text-[10px] font-bold">
                        Most Popular
                      </span>
                    </div>

                    <div className="flex items-baseline gap-1 my-2">
                      <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
                        ${billingCycle === 'yearly' ? '3.99' : '4.99'}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">/month</span>
                    </div>
                    {billingCycle === 'yearly' && (
                      <p className="text-[10px] text-sky-600 dark:text-sky-400 font-semibold">
                        Billed annually ($47.88/yr) • 2 months free
                      </p>
                    )}
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
                      Full study copilot and notes vault tailored for students and exam prep.
                    </p>
                  </div>

                  <ul className="space-y-2 mb-6 text-xs text-slate-600 dark:text-slate-300">
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                      <span>Full AI Study Copilot (Gemini 2.5)</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                      <span>Unlimited notes & notebooks</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                      <span>PDF documents & photo upload</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                      <span>Interactive flashcard generation</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                      <span>Encrypted cloud backup</span>
                    </li>
                  </ul>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPlanId('student_pro');
                      setIsCheckingOut(true);
                    }}
                    className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 ${
                      selectedPlanId === 'student_pro'
                        ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white hover:scale-[1.02]'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    <span>Choose Student Pro</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* 2. Researcher & Engineer Pro Plan */}
                <div
                  onClick={() => setSelectedPlanId('researcher_pro')}
                  className={`relative p-5 rounded-3xl border transition-all cursor-pointer flex flex-col justify-between ${
                    selectedPlanId === 'researcher_pro'
                      ? 'bg-purple-50/80 dark:bg-purple-950/30 border-purple-400 dark:border-purple-500 shadow-xl shadow-purple-500/10 ring-2 ring-purple-400/50'
                      : 'bg-white/80 dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                        Engineer & Researcher
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-700 dark:text-purple-300 text-[10px] font-bold">
                        Dual AI Model
                      </span>
                    </div>

                    <div className="flex items-baseline gap-1 my-2">
                      <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
                        ${billingCycle === 'yearly' ? '7.99' : '9.99'}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">/month</span>
                    </div>
                    {billingCycle === 'yearly' && (
                      <p className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold">
                        Billed annually ($95.88/yr) • 2 months free
                      </p>
                    )}
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
                      For engineers, coders, and academic researchers handling complex technical papers.
                    </p>
                  </div>

                  <ul className="space-y-2 mb-6 text-xs text-slate-600 dark:text-slate-300">
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-purple-500 flex-shrink-0" />
                      <span className="font-semibold text-purple-600 dark:text-purple-300">Gemini 2.5 + GPT-4o Dual Engines</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-purple-500 flex-shrink-0" />
                      <span>Priority handwriting & formula OCR</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-purple-500 flex-shrink-0" />
                      <span>Supabase unlimited cloud storage</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-purple-500 flex-shrink-0" />
                      <span>Shareable web links with custom viewer</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-purple-500 flex-shrink-0" />
                      <span>24/7 dedicated developer support</span>
                    </li>
                  </ul>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPlanId('researcher_pro');
                      setIsCheckingOut(true);
                    }}
                    className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 ${
                      selectedPlanId === 'researcher_pro'
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:scale-[1.02]'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    <span>Choose Researcher Pro</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* 3. Lifetime Founder Vault */}
                <div
                  onClick={() => setSelectedPlanId('lifetime')}
                  className={`relative p-5 rounded-3xl border transition-all cursor-pointer flex flex-col justify-between ${
                    selectedPlanId === 'lifetime'
                      ? 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-400 dark:border-amber-500 shadow-xl shadow-amber-500/10 ring-2 ring-amber-400/50'
                      : 'bg-white/80 dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                        Founder Lifetime
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[10px] font-black uppercase tracking-tight">
                        One-Time
                      </span>
                    </div>

                    <div className="flex items-baseline gap-1 my-2">
                      <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
                        $79
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">one-time payment</span>
                    </div>
                    <p className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                      Never pay a monthly or yearly fee again
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
                      Lifetime ownership of your private study copilot and future AI upgrades.
                    </p>
                  </div>

                  <ul className="space-y-2 mb-6 text-xs text-slate-600 dark:text-slate-300">
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                      <span>All current & future Pro features</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                      <span>Zero recurring subscription renewals</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                      <span>Lifetime cloud storage & sync</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                      <span>Early access to all new AI tools</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                      <span>VIP Founder Profile Badge</span>
                    </li>
                  </ul>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPlanId('lifetime');
                      setIsCheckingOut(true);
                    }}
                    className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 ${
                      selectedPlanId === 'lifetime'
                        ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-slate-950 font-black hover:scale-[1.02]'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    <span>Get Lifetime Access</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            /* Checkout Step */
            <div className="max-w-2xl mx-auto space-y-6">
              <button
                type="button"
                onClick={() => setIsCheckingOut(false)}
                className="text-xs text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 font-semibold"
              >
                ← Back to plan choices
              </button>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                    Selected Plan
                  </span>
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">
                    {selectedPlanId === 'lifetime'
                      ? 'Lifetime Founder Vault'
                      : selectedPlanId === 'researcher_pro'
                      ? 'Engineer & Researcher Pro'
                      : 'Student & Scholar Pro'}
                  </h4>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {selectedPlanId === 'lifetime'
                      ? 'One-time payment'
                      : billingCycle === 'yearly'
                      ? 'Annual billing (2 months free)'
                      : 'Monthly billing'}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black text-slate-900 dark:text-white block">
                    ${finalDue}
                  </span>
                  {discountPercent > 0 && (
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold block">
                      Saved {discountPercent}% (-${discountAmount})
                    </span>
                  )}
                </div>
              </div>

              {/* Payment Method Selector */}
              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Payment Method
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('card')}
                    className={`p-3 rounded-2xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                      paymentMethod === 'card'
                        ? 'bg-sky-50 dark:bg-sky-950/40 border-sky-400 text-sky-700 dark:text-sky-300 shadow-sm'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Credit / Debit Card</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('upi')}
                    className={`p-3 rounded-2xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                      paymentMethod === 'upi'
                        ? 'bg-sky-50 dark:bg-sky-950/40 border-sky-400 text-sky-700 dark:text-sky-300 shadow-sm'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <Zap className="w-4 h-4 text-amber-500" />
                    <span>UPI / QR / GPay</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('paypal')}
                    className={`p-3 rounded-2xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                      paymentMethod === 'paypal'
                        ? 'bg-sky-50 dark:bg-sky-950/40 border-sky-400 text-sky-700 dark:text-sky-300 shadow-sm'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <span className="font-extrabold text-blue-500">P</span>
                    <span>PayPal</span>
                  </button>
                </div>
              </div>

              {/* Checkout Form */}
              <form onSubmit={handleProcessCheckout} className="space-y-4">
                {paymentMethod === 'card' && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Cardholder Name
                      </label>
                      <input
                        type="text"
                        required
                        value={cardName}
                        onChange={(e) => setCardName(e.target.value)}
                        placeholder="Name on card"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:border-sky-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Card Number
                      </label>
                      <div className="relative">
                        <CreditCard className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          required
                          value={cardNumber}
                          onChange={(e) => setCardNumber(e.target.value)}
                          placeholder="4242 4242 4242 4242"
                          className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-xs font-mono focus:outline-none focus:border-sky-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Expires (MM/YY)
                        </label>
                        <input
                          type="text"
                          required
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(e.target.value)}
                          placeholder="12/28"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-xs font-mono focus:outline-none focus:border-sky-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          CVC / CVV
                        </label>
                        <input
                          type="text"
                          required
                          value={cardCvc}
                          onChange={(e) => setCardCvc(e.target.value)}
                          placeholder="888"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-xs font-mono focus:outline-none focus:border-sky-500"
                        />
                      </div>
                    </div>
                  </>
                )}

                {paymentMethod === 'upi' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      UPI ID (Google Pay, PhonePe, Paytm)
                    </label>
                    <input
                      type="text"
                      required
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      placeholder="username@okhdfcbank"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:border-sky-500"
                    />
                    <p className="text-[11px] text-slate-500 mt-1.5">
                      A payment request will be sent to your UPI app for instant approval.
                    </p>
                  </div>
                )}

                {paymentMethod === 'paypal' && (
                  <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs text-blue-700 dark:text-blue-300">
                    Clicking "Pay & Activate" will securely authenticate via PayPal Express Checkout.
                  </div>
                )}

                {/* Promo Code Input */}
                <div className="pt-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Student Coupon or Discount Voucher
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Tag className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value)}
                        placeholder="Try STUDENT50 or DEV20"
                        className="w-full pl-8 pr-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-xs font-mono uppercase focus:outline-none focus:border-sky-500"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleApplyPromo}
                      className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors"
                    >
                      Apply
                    </button>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="submit"
                    disabled={processing}
                    className="w-full py-3 rounded-2xl bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-sky-500/25 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>
                      {processing ? 'Processing Secure Payment...' : `Pay $${finalDue} & Activate DevBrain Pro`}
                    </span>
                  </button>
                </div>
              </form>

              <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>256-Bit SSL Encrypted • Cancel anytime with 1-click in Settings</span>
              </div>
            </div>
          )}
        </div>

        {/* Developer Sandbox Sandbox bar for testing trial states */}
        <div className="px-6 py-3 bg-slate-100/70 dark:bg-slate-950/80 border-t border-slate-200/80 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-700 dark:text-slate-300">🧪 Developer Simulation:</span>
            <span>Test 3-month trial behavior in real time</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={devSimulating}
              onClick={() => handleDevSimulateExpiry(true)}
              className="px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-700 dark:text-amber-300 font-bold hover:bg-amber-500/25 transition-all"
              title="Fast-forward user trial to test paywall & expired behavior"
            >
              Simulate Trial Expired
            </button>
            <button
              type="button"
              disabled={devSimulating}
              onClick={() => handleDevSimulateExpiry(false)}
              className="px-2.5 py-1 rounded-lg bg-sky-500/15 border border-sky-500/40 text-sky-700 dark:text-sky-300 font-bold hover:bg-sky-500/25 transition-all"
              title="Reset user trial to 90 days remaining"
            >
              Reset to 90 Days Free
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
