import React, { useState, FormEvent } from 'react';
import { Check, ShieldCheck, Sparkles, CreditCard, Lock, ArrowRight, Loader2, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface BillingPortalProps {
  currentPlan: 'free' | 'creator' | 'publisher';
  bookCount: number;
  onUpgrade: (newPlan: 'free' | 'creator' | 'publisher') => void;
  onClose: () => void;
}

export default function BillingPortal({ currentPlan, bookCount, onUpgrade, onClose }: BillingPortalProps) {
  const [selectedPlan, setSelectedPlan] = useState<'creator' | 'publisher'>('creator');
  const [showCheckout, setShowCheckout] = useState(false);
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('4242 •••• •••• 4242');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvc, setCardCvc] = useState('123');
  const [isProcessing, setIsProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showConfirmCancel, setShowConfirmCancel] = useState(false);
  const [showAlertMessage, setShowAlertMessage] = useState<string | null>(null);

  const plans = [
    {
      id: 'free' as const,
      name: 'Free Plan',
      price: '$0',
      period: 'forever',
      description: 'Test the waters and create sample interior layouts.',
      features: [
        '3 KDP puzzle books per month',
        'Watermarked exports',
        'Standard 15x15 grids',
        'Basic 2D cover creator',
        'Community access support'
      ]
    },
    {
      id: 'creator' as const,
      name: 'Creator Plan',
      price: '$9.99',
      period: 'month',
      description: 'For active KDP authors looking to scale their shelves.',
      features: [
        '50 KDP puzzle books per month',
        'Zero watermarks',
        'Commercial PDF exports',
        'Advanced trim & layout options',
        'High-speed category generation',
        'Cover creator & uploaded art'
      ],
      popular: true
    },
    {
      id: 'publisher' as const,
      name: 'Publisher Plan',
      price: '$29.99',
      period: 'month',
      description: 'For power-users and commercial agencies.',
      features: [
        'Unlimited KDP books per month',
        'Priority AI queue processing',
        'Full Commercial Resell Rights',
        'KDP Bleed & Cover wraps',
        'Custom author bio generator',
        'Dedicated 1-on-1 print review'
      ]
    }
  ];

  const handleStartCheckout = (planId: 'creator' | 'publisher') => {
    setSelectedPlan(planId);
    setShowCheckout(true);
  };

  const handlePaySimulate = async (e: FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    // Simulate network delay to checkout.stripe.com
    await new Promise(r => setTimeout(r, 1800));

    // Simulate Stripe Webhook payload post & update
    try {
      await fetch('/api/billing/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: selectedPlan })
      });

      // Local state log append
      await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level: 'info',
          message: `Stripe Webhook Event: invoice.paid successfully processed. Plan ${selectedPlan} unlocked.`,
          category: 'stripe'
        })
      });
    } catch (e) {
      console.error(e);
    }

    setIsProcessing(false);
    setSuccess(true);
    
    setTimeout(() => {
      onUpgrade(selectedPlan);
      setSuccess(false);
      setShowCheckout(false);
      onClose();
    }, 1500);
  };

  const handleCancelSubscription = () => {
    setShowConfirmCancel(true);
  };

  const executeCancelSubscription = async () => {
    setShowConfirmCancel(false);
    try {
      await fetch('/api/billing/cancel', { method: 'POST' });
      await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level: 'info',
          message: 'Stripe Webhook Event: customer.subscription.deleted processed. Plan downgraded to Free.',
          category: 'stripe'
        })
      });
      onUpgrade('free');
      setShowAlertMessage('Subscription canceled successfully.');
    } catch (e) {
      console.error(e);
    }
  };

  const currentQuota = currentPlan === 'free' ? 3 : currentPlan === 'creator' ? 50 : 9999;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-5xl bg-[#04150e] border border-emerald-950/80 rounded-3xl overflow-hidden shadow-2xl relative max-h-[90vh] flex flex-col"
      >
        {/* Banner */}
        <div className="p-6 bg-gradient-to-r from-emerald-500/10 via-emerald-600/10 to-emerald-500/5 border-b border-emerald-950/80 flex justify-between items-center shrink-0">
          <div>
            <span className="px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider font-extrabold bg-emerald-600 text-white shadow-md shadow-emerald-600/15">
              Billing Panel
            </span>
            <h2 className="text-xl font-black text-white mt-1.5 flex items-center gap-1.5 font-sans">
              RiddimRoom Premium Workspace <Sparkles className="w-4 h-4 text-[#D4AF37]" />
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-emerald-950/40 text-zinc-400 hover:text-white font-bold transition"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Container */}
        <div className="p-8 overflow-y-auto space-y-8 flex-1">
          {/* Quick Stats Usage */}
          <div className="bg-[#020906] p-5 rounded-2xl border border-emerald-950/80 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <p className="text-[10px] text-zinc-400 font-extrabold uppercase tracking-wider">CURRENT SUBSCRIPTION</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-lg font-black text-white capitalize">
                  {currentPlan} Plan
                </span>
                {currentPlan !== 'free' && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#10B981] bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    <ShieldCheck className="w-3 h-3" /> Stripe Active
                  </span>
                )}
              </div>
            </div>

            <div className="w-full md:w-64">
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="text-zinc-400">Monthly Book Quota</span>
                <span className="text-white">
                  {bookCount} / {currentPlan === 'publisher' ? 'Unlimited' : currentQuota}
                </span>
              </div>
              <div className="w-full h-2.5 bg-emerald-950/40 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, (bookCount / currentQuota) * 100)}%` }}
                />
              </div>
            </div>

            {currentPlan !== 'free' && (
              <button
                onClick={handleCancelSubscription}
                className="text-xs text-red-400 hover:text-red-300 font-bold hover:underline py-1.5 px-3 rounded-lg border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 transition"
              >
                Cancel Subscription
              </button>
            )}
          </div>

          {/* Plan Comparison Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => {
              const isCurrent = plan.id === currentPlan;
              return (
                <div
                  key={plan.id}
                  className={`border rounded-2xl p-6 relative flex flex-col justify-between transition-all duration-300 ${
                    plan.popular
                      ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-500/[0.01]'
                      : 'border-emerald-950/80'
                  } ${isCurrent ? 'bg-emerald-950/10' : ''}`}
                >
                  {plan.popular && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-[9px] uppercase tracking-wider font-extrabold px-3 py-1 rounded-full shadow-md shadow-emerald-600/15">
                      Most Popular
                    </span>
                  )}

                  <div>
                    <h3 className="text-md font-black text-white">{plan.name}</h3>
                    <p className="text-xs text-zinc-400 mt-1 font-medium leading-relaxed">{plan.description}</p>
                    
                    <div className="mt-4 flex items-baseline gap-1">
                      <span className="text-3xl font-black text-white">{plan.price}</span>
                      <span className="text-xs text-zinc-500 font-semibold">/ {plan.period}</span>
                    </div>

                    <ul className="mt-6 space-y-3">
                      {plan.features.map((feat, idx) => (
                        <li key={idx} className="flex items-start gap-2.5 text-xs text-zinc-300 font-medium">
                          <Check className="w-3.5 h-3.5 text-[#10B981] shrink-0 mt-0.5 stroke-[3]" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-8 pt-4 border-t border-emerald-950/40">
                    {isCurrent ? (
                      <div className="w-full text-center py-2.5 rounded-xl text-xs bg-emerald-950/40 text-zinc-400 font-bold border border-emerald-900/20">
                        Current Active Plan
                      </div>
                    ) : plan.id === 'free' ? (
                      <div className="w-full text-center py-2.5 text-xs text-zinc-500 font-semibold">
                        N/A (Downgrade via Cancel)
                      </div>
                    ) : (
                      <button
                        onClick={() => handleStartCheckout(plan.id as 'creator' | 'publisher')}
                        className={`w-full py-2.5 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 ${
                          plan.popular
                            ? 'bg-[#D4AF37] text-[#030805] hover:bg-[#EAB308] shadow-md shadow-amber-950/20'
                            : 'bg-emerald-950/40 hover:bg-emerald-900/35 text-white border border-emerald-900/15'
                        }`}
                      >
                        Upgrade Now <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* STRIPE SIMULATION MODAL */}
        <AnimatePresence>
          {showCheckout && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm"
            >
              <motion.div
                initial={{ y: 20, scale: 0.98 }}
                animate={{ y: 0, scale: 1 }}
                exit={{ y: 20, scale: 0.98 }}
                className="w-full max-w-md bg-[#030805]/95 rounded-3xl p-6 border border-emerald-950 shadow-2xl relative"
              >
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-emerald-950/80 mb-5">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 bg-emerald-600 text-white rounded-lg shadow-md shadow-emerald-600/15">
                      <CreditCard className="w-4 h-4" />
                    </span>
                    <div>
                      <h4 className="text-sm font-black text-white">Stripe Checkout Simulator</h4>
                      <p className="text-[10px] text-zinc-400 font-medium">RiddimRoom Secure Payment Gateway</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowCheckout(false)}
                    className="text-xs text-zinc-500 hover:text-zinc-300 font-bold"
                  >
                    Cancel
                  </button>
                </div>

                {success ? (
                  <div className="text-center py-8 space-y-3">
                    <div className="w-14 h-14 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30">
                      <ShieldCheck className="w-8 h-8 animate-bounce" />
                    </div>
                    <h5 className="text-sm font-bold text-white">Simulated Checkout Succeeded!</h5>
                    <p className="text-xs text-zinc-400">Triggering Stripe Webhooks...</p>
                    <div className="flex items-center justify-center gap-2 text-[10px] text-emerald-500 font-semibold bg-emerald-500/5 border border-emerald-500/10 px-3 py-1 rounded-full max-w-xs mx-auto animate-pulse">
                      <RefreshCw className="w-3 h-3 animate-spin" /> invoice.paid payload posted
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handlePaySimulate} className="space-y-4">
                    <div className="bg-[#020906] p-3.5 rounded-xl border border-emerald-950/80">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-zinc-400 font-medium">Upgrade to:</span>
                        <span className="text-white capitalize">{selectedPlan} Plan</span>
                      </div>
                      <div className="flex justify-between text-xs font-bold mt-1">
                        <span className="text-zinc-400 font-medium">Amount Due:</span>
                        <span className="text-[#D4AF37] font-extrabold">
                          {selectedPlan === 'creator' ? '$9.99' : '$29.99'} / month
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase tracking-wider font-extrabold text-zinc-400 mb-1">
                        Cardholder Name
                      </label>
                      <input
                        type="text"
                        placeholder="John Doe"
                        required
                        value={cardName}
                        onChange={(e) => setCardName(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-emerald-900/30 text-xs bg-[#020906] text-white focus:outline-none focus:ring-1 focus:ring-[#10B981] font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase tracking-wider font-extrabold text-zinc-400 mb-1">
                        Card Details (Use Test Card)
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          required
                          value={cardNumber}
                          onChange={(e) => setCardNumber(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-emerald-900/30 text-xs bg-[#020906] text-white focus:outline-none focus:ring-1 focus:ring-[#10B981] font-mono font-bold"
                        />
                        <span className="absolute right-3.5 top-2.5 text-zinc-500">
                          <svg className="w-6 h-4" viewBox="0 0 24 16">
                            <rect width="24" height="16" fill="#1A1F71" rx="2" />
                            <circle cx="8" cy="8" r="4" fill="#EB001B" />
                            <circle cx="16" cy="8" r="4" fill="#F79E1B" opacity="0.8" />
                          </svg>
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] uppercase tracking-wider font-extrabold text-zinc-400 mb-1">
                          Expiry
                        </label>
                        <input
                          type="text"
                          required
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-emerald-900/30 text-xs bg-[#020906] text-white focus:outline-none focus:ring-1 focus:ring-[#10B981] text-center font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase tracking-wider font-extrabold text-zinc-400 mb-1">
                          CVC
                        </label>
                        <input
                          type="text"
                          required
                          maxLength={3}
                          value={cardCvc}
                          onChange={(e) => setCardCvc(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-emerald-900/30 text-xs bg-[#020906] text-white focus:outline-none focus:ring-1 focus:ring-[#10B981] text-center font-bold"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isProcessing}
                      className="w-full py-3 bg-[#D4AF37] hover:bg-[#EAB308] text-[#030805] font-black rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-amber-950/20"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" /> Authorizing via Stripe Gateway...
                        </>
                      ) : (
                        <>
                          <Lock className="w-3.5 h-3.5" /> Securely Subscribe with Stripe
                        </>
                      )}
                    </button>

                    <div className="text-center text-[10px] text-zinc-500 flex items-center justify-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-500" /> AES-256 Stripe SSL Encrypted Connection
                    </div>
                  </form>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* CUSTOM CONFIRM CANCEL DIALOG */}
        {showConfirmCancel && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <div className="bg-[#030d08] border border-red-900/40 rounded-3xl max-w-sm w-full p-6 text-zinc-100 shadow-2xl relative overflow-hidden animate-in fade-in duration-150 flex flex-col items-center text-center">
              <div className="absolute top-0 left-0 right-0 h-1 bg-red-600"></div>
              <h4 className="text-sm font-black text-white uppercase tracking-wider mb-2">Cancel Subscription?</h4>
              <p className="text-xs text-zinc-400 leading-relaxed mb-6">
                Are you sure you want to cancel your premium subscription? Your plan will return to Free at the end of the current billing cycle.
              </p>
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setShowConfirmCancel(false)}
                  className="flex-1 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition text-xs font-bold"
                >
                  No, Keep It
                </button>
                <button
                  onClick={executeCancelSubscription}
                  className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white transition text-xs font-bold"
                >
                  Yes, Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CUSTOM ALERT DIALOG */}
        {showAlertMessage && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <div className="bg-[#030d08] border border-emerald-900/40 rounded-3xl max-w-sm w-full p-6 text-zinc-100 shadow-2xl relative overflow-hidden animate-in fade-in duration-150 flex flex-col items-center text-center">
              <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500"></div>
              <h4 className="text-sm font-black text-white uppercase tracking-wider mb-2">Success</h4>
              <p className="text-xs text-zinc-400 leading-relaxed mb-6">{showAlertMessage}</p>
              <button
                onClick={() => setShowAlertMessage(null)}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition text-xs font-bold"
              >
                Okay
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
