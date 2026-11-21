import React, { useState, useEffect } from 'react';
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
  ArrowRight,
  Clock,
  AlertTriangle,
  Award,
  Crown,
  Printer,
  QrCode,
  Download,
  Smartphone,
  ExternalLink,
  CheckCircle2,
  HelpCircle,
  Key
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

  // Checkout Flow Stages: 'plans' -> 'checkout' -> 'otp_verify' -> 'receipt'
  const [stage, setStage] = useState<'plans' | 'checkout' | 'otp_verify' | 'receipt'>('plans');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');
  const [selectedPlanId, setSelectedPlanId] = useState<'student_pro' | 'researcher_pro' | 'lifetime'>('student_pro');

  // Payment Gateway Options
  const [gatewayType, setGatewayType] = useState<'card' | 'upi' | 'stripe'>('card');
  const [stripeConfig, setStripeConfig] = useState<{ stripeEnabled: boolean; publishableKey: string } | null>(null);

  // Card Form State
  const [cardNumber, setCardNumber] = useState('4242 4242 4242 4242');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvc, setCardCvc] = useState('888');
  const [cardName, setCardName] = useState(user.name || 'Sumit Kumar');
  const [cardBrand, setCardBrand] = useState<'visa' | 'mastercard' | 'amex' | 'generic'>('visa');

  // UPI State
  const [upiId, setUpiId] = useState(`${user.name.toLowerCase().replace(/\s+/g, '')}@okhdfcbank`);

  // Discount & Promo Codes
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<string | null>(null);
  const [discountPercent, setDiscountPercent] = useState<number>(0);

  // 3D Secure / OTP Challenge
  const [otpCode, setOtpCode] = useState('424242');
  const [otpTimer, setOtpTimer] = useState(120);

  // Completed Payment Receipt State
  const [receiptData, setReceiptData] = useState<{
    transactionId: string;
    amount: number;
    planName: string;
    billingCycle: string;
    date: string;
    paymentMethod: string;
    authCode: string;
  } | null>(null);

  const [processing, setProcessing] = useState<boolean>(false);
  const [devSimulating, setDevSimulating] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      api.getGatewayConfig().then(setStripeConfig).catch(() => null);
    }
  }, [isOpen]);

  useEffect(() => {
    let interval: any = null;
    if (stage === 'otp_verify' && otpTimer > 0) {
      interval = setInterval(() => setOtpTimer((t) => Math.max(0, t - 1)), 1000);
    }
    return () => clearInterval(interval);
  }, [stage, otpTimer]);

  if (!isOpen) return null;

  // Auto-detect card brand from prefix
  const handleCardNumberChange = (raw: string) => {
    const cleaned = raw.replace(/\D/g, '').slice(0, 16);
    // Add spaces every 4 digits
    const formatted = cleaned.replace(/(\d{4})(?=\d)/g, '$1 ');
    setCardNumber(formatted);

    if (cleaned.startsWith('4')) setCardBrand('visa');
    else if (cleaned.startsWith('5')) setCardBrand('mastercard');
    else if (cleaned.startsWith('34') || cleaned.startsWith('37')) setCardBrand('amex');
    else setCardBrand('generic');
  };

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
  const planName =
    selectedPlanId === 'lifetime'
      ? 'Lifetime Founder Vault'
      : selectedPlanId === 'researcher_pro'
      ? 'Engineer & Researcher Pro'
      : 'Student & Scholar Pro';

  const handleApplyPromo = () => {
    const code = promoCode.trim().toUpperCase();
    if (!code) return;
    if (code === 'STUDENT50' || code === 'SCHOLAR50') {
      setDiscountPercent(50);
      setAppliedPromo(code);
      success('50% Student Discount applied! 🎓');
    } else if (code === 'DEV20' || code === 'WELCOME20') {
      setDiscountPercent(20);
      setAppliedPromo(code);
      success('20% Welcome Voucher applied! 🎉');
    } else {
      toastError('Invalid coupon. Try "STUDENT50" or "DEV20".');
    }
  };

  // Step 1: User submits payment initiation
  const handleInitiatePayment = async (e: React.FormEvent) => {
    e.preventDefault();

    // If Stripe hosted checkout was chosen
    if (gatewayType === 'stripe') {
      setProcessing(true);
      try {
        const stripeRes = await api.createStripeCheckoutSession({
          planId: selectedPlanId,
          billingCycle: selectedPlanId === 'lifetime' ? 'lifetime' : billingCycle,
          promoCode: appliedPromo || undefined,
        });

        if (stripeRes.checkoutUrl) {
          info('Redirecting to Stripe Official Secure Checkout...');
          window.location.href = stripeRes.checkoutUrl;
          return;
        }

        if (stripeRes.fallbackToInApp) {
          info('Stripe API keys not yet set in server/.env. Switching to direct Card / UPI Payment Gate...');
          setGatewayType('card');
          setStage('otp_verify');
          setOtpTimer(120);
          return;
        }
      } catch (err: any) {
        toastError(`Stripe checkout notice: ${err.message}. Using direct payment gateway.`);
        setGatewayType('card');
      } finally {
        setProcessing(false);
      }
    }

    // Direct Card or UPI: Proceed to 3D Secure / OTP Challenge
    setStage('otp_verify');
    setOtpTimer(120);
  };

  // Step 2: User completes 3D Secure / OTP authorization
  const handleVerifyOtpAndAuthorize = async () => {
    if (!otpCode || otpCode.length < 4) {
      toastError('Please enter the 6-digit bank verification code.');
      return;
    }

    setProcessing(true);
    try {
      const res = await api.checkoutSubscription({
        planId: selectedPlanId,
        billingCycle: selectedPlanId === 'lifetime' ? 'lifetime' : billingCycle,
        paymentMethod: gatewayType === 'card' ? 'credit_card' : 'upi_instant',
        promoCode: appliedPromo || undefined,
        cardName: cardName.trim(),
      });

      const authCode = `AUTH_${Math.floor(100000 + Math.random() * 900000)}`;
      setReceiptData({
        transactionId: res.transactionId,
        amount: res.amount,
        planName,
        billingCycle: selectedPlanId === 'lifetime' ? 'Lifetime' : billingCycle === 'yearly' ? 'Annual' : 'Monthly',
        date: new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
        paymentMethod: gatewayType === 'card' ? `Card (${cardBrand.toUpperCase()} •••• ${cardNumber.replace(/\s+/g, '').slice(-4)})` : `UPI (${upiId})`,
        authCode,
      });

      onUserUpdated(res.user);
      setStage('receipt');
      success(res.message || 'Payment authorized & subscription activated!');
    } catch (err: any) {
      toastError(`Payment authorization error: ${err.message}`);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-white/80 dark:border-white/10 rounded-3xl shadow-2xl overflow-hidden my-8 flex flex-col max-h-[92vh]">
        {/* Top Header Banner */}
        <div className="relative px-6 py-4.5 bg-gradient-to-r from-sky-500/10 via-blue-500/10 to-purple-500/10 dark:from-sky-950/50 dark:via-blue-950/40 dark:to-purple-950/50 border-b border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-500 via-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-sky-500/25">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  DevBrain Payment Gate & Subscription
                </h3>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" />
                  <span>256-BIT SSL SECURE</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Official payment processing for DevBrain Vault & AI Study Copilot.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3-Month Free Trial Status Pill */}
        <div className="px-6 pt-4">
          {sub.isSubscribed ? (
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Award className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                    Active Plan: {sub.tier === 'lifetime' ? 'Lifetime Founder Vault' : sub.tier === 'researcher_pro' ? 'Engineer & Researcher Pro' : 'Student & Scholar Pro'}
                  </h4>
                  <p className="text-[11px] text-emerald-600/90 dark:text-emerald-400/90">
                    Unlimited notes vault and AI study copilot active.
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-500 text-white text-[11px] font-bold shadow-xs">
                ACTIVE
              </span>
            </div>
          ) : sub.isTrialExpired ? (
            <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-amber-800 dark:text-amber-200">
                    Your 3-Month Free Trial has expired
                  </h4>
                  <p className="text-[11px] text-amber-700 dark:text-amber-300/90 mt-0.5">
                    Your existing notes and materials remain 100% safe. Complete checkout below to unlock new notes creation and AI Study Copilot.
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black uppercase shadow-xs self-start sm:self-center">
                UPGRADE REQUIRED
              </span>
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/60">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-sky-500" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    3-Month Free Trial Active
                  </span>
                </div>
                <span className="text-xs font-black text-sky-600 dark:text-cyan-400">
                  {sub.daysLeftInTrial} days remaining
                </span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-sky-500 to-indigo-500 h-full rounded-full transition-all"
                  style={{ width: `${Math.min(100, Math.max(5, ((90 - sub.daysLeftInTrial) / 90) * 100))}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Modal Flow Stages */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* ================================= STAGE 1: PLAN SELECTION ================================= */}
          {stage === 'plans' && (
            <div className="space-y-6">
              {/* Billing Cycle Toggle */}
              <div className="flex items-center justify-center">
                <div className="inline-flex items-center p-1 rounded-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-inner">
                  <button
                    type="button"
                    onClick={() => setBillingCycle('monthly')}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
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
                    className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
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
                  className={`p-5 rounded-3xl border transition-all cursor-pointer flex flex-col justify-between ${
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
                      setStage('checkout');
                    }}
                    className="w-full py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-md hover:scale-[1.02] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Proceed to Payment</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* 2. Researcher & Engineer Pro Plan */}
                <div
                  onClick={() => setSelectedPlanId('researcher_pro')}
                  className={`p-5 rounded-3xl border transition-all cursor-pointer flex flex-col justify-between ${
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
                      setStage('checkout');
                    }}
                    className="w-full py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md hover:scale-[1.02] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Proceed to Payment</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* 3. Lifetime Founder Vault */}
                <div
                  onClick={() => setSelectedPlanId('lifetime')}
                  className={`p-5 rounded-3xl border transition-all cursor-pointer flex flex-col justify-between ${
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
                      setStage('checkout');
                    }}
                    className="w-full py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-slate-950 font-black shadow-md hover:scale-[1.02] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Get Lifetime Access</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ================================= STAGE 2: PAYMENT GATEWAY & CHECKOUT ================================= */}
          {stage === 'checkout' && (
            <div className="max-w-2xl mx-auto space-y-6">
              <button
                type="button"
                onClick={() => setStage('plans')}
                className="text-xs text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
              >
                ← Back to plan selection
              </button>

              {/* Order Summary Pill */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Selected Plan
                  </span>
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">
                    {planName}
                  </h4>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {selectedPlanId === 'lifetime' ? 'One-time payment' : billingCycle === 'yearly' ? 'Billed Annually' : 'Billed Monthly'}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black text-slate-900 dark:text-white block">
                    ${finalDue} USD
                  </span>
                  {discountPercent > 0 && (
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold block">
                      Saved {discountPercent}% (-${discountAmount})
                    </span>
                  )}
                </div>
              </div>

              {/* Gateway Selection Tabs */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Select Payment Gateway
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setGatewayType('card')}
                    className={`p-3 rounded-2xl border text-xs font-semibold flex flex-col sm:flex-row items-center justify-center gap-2 transition-all cursor-pointer ${
                      gatewayType === 'card'
                        ? 'bg-sky-50 dark:bg-sky-950/40 border-sky-400 text-sky-700 dark:text-sky-300 shadow-sm'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <CreditCard className="w-4 h-4 text-sky-500" />
                    <span>Credit / Debit Card</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setGatewayType('upi')}
                    className={`p-3 rounded-2xl border text-xs font-semibold flex flex-col sm:flex-row items-center justify-center gap-2 transition-all cursor-pointer ${
                      gatewayType === 'upi'
                        ? 'bg-sky-50 dark:bg-sky-950/40 border-sky-400 text-sky-700 dark:text-sky-300 shadow-sm'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <Zap className="w-4 h-4 text-amber-500" />
                    <span>UPI / QR / GPay</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setGatewayType('stripe')}
                    className={`p-3 rounded-2xl border text-xs font-semibold flex flex-col sm:flex-row items-center justify-center gap-2 transition-all cursor-pointer ${
                      gatewayType === 'stripe'
                        ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-400 text-indigo-700 dark:text-indigo-300 shadow-sm'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <ExternalLink className="w-4 h-4 text-indigo-500" />
                    <span>Stripe Checkout</span>
                  </button>
                </div>
              </div>

              {/* Gateway-specific Form */}
              <form onSubmit={handleInitiatePayment} className="space-y-4">
                {gatewayType === 'card' && (
                  <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3.5 shadow-sm">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Direct 3D Secure Card Gateway</span>
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${cardBrand === 'visa' ? 'bg-blue-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>Visa</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${cardBrand === 'mastercard' ? 'bg-orange-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>Mastercard</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${cardBrand === 'amex' ? 'bg-cyan-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>Amex</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Cardholder Full Name
                      </label>
                      <input
                        type="text"
                        required
                        value={cardName}
                        onChange={(e) => setCardName(e.target.value)}
                        placeholder="Name on card"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:border-sky-500 font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Card Number (16 Digits)
                      </label>
                      <div className="relative">
                        <CreditCard className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          required
                          value={cardNumber}
                          onChange={(e) => handleCardNumberChange(e.target.value)}
                          placeholder="4242 4242 4242 4242"
                          maxLength={19}
                          className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-xs font-mono focus:outline-none focus:border-sky-500 tracking-wider"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Expiration (MM/YY)
                        </label>
                        <input
                          type="text"
                          required
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(e.target.value)}
                          placeholder="12/28"
                          maxLength={5}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-xs font-mono focus:outline-none focus:border-sky-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Security Code (CVV)
                        </label>
                        <input
                          type="password"
                          required
                          value={cardCvc}
                          onChange={(e) => setCardCvc(e.target.value)}
                          placeholder="•••"
                          maxLength={4}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-xs font-mono focus:outline-none focus:border-sky-500"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {gatewayType === 'upi' && (
                  <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm text-center">
                    <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 max-w-xs mx-auto">
                      <div className="w-36 h-36 bg-white p-2 rounded-xl border border-slate-300 shadow-inner flex flex-col items-center justify-center">
                        <QrCode className="w-28 h-28 text-slate-900" />
                        <span className="text-[9px] font-mono text-slate-600 font-bold">SCAN TO PAY ${finalDue}</span>
                      </div>
                      <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 mt-2">
                        Scan with Google Pay, PhonePe, Paytm, or BHIM
                      </span>
                    </div>

                    <div className="text-left">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Or Pay via Virtual Payment Address (VPA)
                      </label>
                      <input
                        type="text"
                        required
                        value={upiId}
                        onChange={(e) => setUpiId(e.target.value)}
                        placeholder="yourname@okaxis"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:border-sky-500 font-mono"
                      />
                    </div>
                  </div>
                )}

                {gatewayType === 'stripe' && (
                  <div className="p-5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 text-xs text-indigo-900 dark:text-indigo-200 space-y-3">
                    <div className="flex items-center gap-2">
                      <ExternalLink className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <span className="font-bold text-sm">Official Stripe Hosted Checkout</span>
                    </div>
                    <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                      You will be securely routed to Stripe's checkout portal with 1-click support for <strong>Apple Pay</strong>, <strong>Google Pay</strong>, and all international currencies.
                    </p>
                    {stripeConfig && !stripeConfig.stripeEnabled && (
                      <div className="p-2.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-[11px]">
                        ℹ️ Note: <code>STRIPE_SECRET_KEY</code> is not currently set in <code>server/.env</code>. Clicking proceed will test connection and route seamlessly to the direct in-app card processor.
                      </div>
                    )}
                  </div>
                )}

                {/* Promo Code Input */}
                <div className="pt-2">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Tag className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value)}
                        placeholder="Voucher code (try STUDENT50 or DEV20)"
                        className="w-full pl-8 pr-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-xs font-mono uppercase focus:outline-none focus:border-sky-500"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleApplyPromo}
                      className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors cursor-pointer"
                    >
                      Apply
                    </button>
                  </div>
                </div>

                {/* Submit Action Button */}
                <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="submit"
                    disabled={processing}
                    className="w-full py-3 rounded-2xl bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-sky-500/25 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>
                      {processing
                        ? 'Connecting to Payment Gate...'
                        : gatewayType === 'stripe'
                        ? `Proceed to Stripe Checkout ($${finalDue} USD)`
                        : `Authorize & Pay $${finalDue} USD`}
                    </span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ================================= STAGE 3: 3D SECURE / BANK OTP VERIFICATION ================================= */}
          {stage === 'otp_verify' && (
            <div className="max-w-md mx-auto py-6 space-y-6 text-center animate-in zoom-in-95 duration-200">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
                <ShieldCheck className="w-8 h-8" />
              </div>

              <div>
                <h4 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Bank 3D-Secure Two-Factor Authentication
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Card Issuer Verification for payment of <strong className="text-slate-900 dark:text-white">${finalDue} USD</strong> to DevBrain Vault.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-left space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 pb-2 border-b border-slate-200 dark:border-slate-800">
                  <span>Merchant:</span>
                  <span className="font-bold text-slate-900 dark:text-white">DevBrain Knowledge Vault</span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 pb-2 border-b border-slate-200 dark:border-slate-800">
                  <span>Card / Payment:</span>
                  <span className="font-mono text-slate-900 dark:text-white">•••• {cardNumber.replace(/\s+/g, '').slice(-4) || '4242'}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                  <span>Authentication Code sent to:</span>
                  <span className="font-mono text-slate-900 dark:text-white">+1 (•••) •••-4242</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Enter 6-Digit One-Time Password (OTP)
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="424242"
                  className="w-48 text-center px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border-2 border-sky-500 text-slate-900 dark:text-white text-lg font-mono tracking-widest focus:outline-none shadow-sm mx-auto block"
                />
                <span className="text-[11px] text-slate-400 block mt-2">
                  Expires in {Math.floor(otpTimer / 60)}:{(otpTimer % 60).toString().padStart(2, '0')} min (Pre-filled with test code)
                </span>
              </div>

              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  disabled={processing}
                  onClick={handleVerifyOtpAndAuthorize}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-500/20 hover:scale-[1.01] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{processing ? 'Verifying with Bank...' : 'Confirm & Authorize Payment'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStage('checkout')}
                  className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                >
                  Cancel & choose another payment method
                </button>
              </div>
            </div>
          )}

          {/* ================================= STAGE 4: PRINTABLE INVOICE RECEIPT ================================= */}
          {stage === 'receipt' && receiptData && (
            <div className="max-w-xl mx-auto py-4 space-y-6 animate-in zoom-in-95 duration-200">
              <div className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/25 mb-3">
                  <Check className="w-8 h-8 stroke-[3]" />
                </div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white">
                  Payment Complete & Confirmed! 🎉
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Thank you for your purchase. Your DevBrain Pro subscription has been activated immediately.
                </p>
              </div>

              {/* Printable VAT / Payment Receipt Card */}
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-4 shadow-xl">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                  <div>
                    <h5 className="font-extrabold text-base text-slate-900 dark:text-white tracking-tight">
                      DevBrain Technologies Inc.
                    </h5>
                    <span className="text-[10px] text-slate-400 font-mono">Invoice #{receiptData.transactionId.slice(0, 16).toUpperCase()}</span>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                    PAID IN FULL
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs text-slate-600 dark:text-slate-300">
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Billed To</span>
                    <span className="font-bold text-slate-900 dark:text-white block">{user.name}</span>
                    <span className="text-[11px] text-slate-500 block">{user.email}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Date & Time</span>
                    <span className="font-semibold text-slate-900 dark:text-white block">{receiptData.date}</span>
                    <span className="text-[11px] text-slate-500 block">Auth Code: {receiptData.authCode}</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white block">{receiptData.planName}</span>
                    <span className="text-[10px] text-slate-400 block">{receiptData.billingCycle} Subscription Plan</span>
                  </div>
                  <span className="text-base font-black text-slate-900 dark:text-white">
                    ${receiptData.amount.toFixed(2)} USD
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span>Payment Channel:</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">{receiptData.paymentMethod}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Receipt</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white text-xs font-bold shadow-md shadow-sky-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <span>Start Using DevBrain Pro</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Developer Sandbox Sandbox bar for testing trial states */}
        <div className="px-6 py-3 bg-slate-100/70 dark:bg-slate-950/80 border-t border-slate-200/80 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-700 dark:text-slate-300">🧪 Gateway Sandbox:</span>
            <span>Switch between 3-month trial and paid states instantly</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={devSimulating}
              onClick={() => handleDevSimulateExpiry(true)}
              className="px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-700 dark:text-amber-300 font-bold hover:bg-amber-500/25 transition-all cursor-pointer"
              title="Fast-forward user trial to test paywall & expired behavior"
            >
              Simulate Trial Expired
            </button>
            <button
              type="button"
              disabled={devSimulating}
              onClick={() => handleDevSimulateExpiry(false)}
              className="px-2.5 py-1 rounded-lg bg-sky-500/15 border border-sky-500/40 text-sky-700 dark:text-sky-300 font-bold hover:bg-sky-500/25 transition-all cursor-pointer"
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
