import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, BookOpen, LogOut, ShieldAlert, CreditCard, 
  Settings, Loader2, HelpCircle 
} from 'lucide-react';

import { Book, User } from './types';
import ThemeToggle from './components/ThemeToggle';
import AuthScreen from './components/AuthScreen';
import BillingPortal from './components/BillingPortal';
import AdminPanel from './components/AdminPanel';
import BookWizard from './components/BookWizard';
import BookPreview from './components/BookPreview';
import Dashboard from './components/Dashboard';
import BrandLogo from './components/BrandLogo';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [currentPlan, setCurrentPlan] = useState<'free' | 'creator' | 'publisher'>('free');
  
  // View states
  const [activeScreen, setActiveScreen] = useState<'bookshelf' | 'wizard' | 'admin'>('bookshelf');
  const [activeBook, setActiveBook] = useState<Book | null>(null);
  
  // UI states
  const [showBilling, setShowBilling] = useState(false);
  const [isLoadingBooks, setIsLoadingBooks] = useState(false);

  // Sync user & plan on session load
  useEffect(() => {
    // Try to auto-resolve active demo session if already logged in on client side
    const cachedUser = localStorage.getItem('riddim_auth_user');
    if (cachedUser) {
      const parsed = JSON.parse(cachedUser);
      setUser(parsed);
      fetchPlanState(parsed.uid);
    }
  }, []);

  // Fetch plan status from server
  const fetchPlanState = async (uid?: string) => {
    const activeUid = uid || user?.uid;
    if (!activeUid) return;
    try {
      const res = await fetch('/api/user/plan', {
        headers: { 'x-user-uid': activeUid }
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentPlan(data.plan);
      }
    } catch (e) {
      console.error('Error fetching plan:', e);
    }
  };

  // Fetch user's books
  const fetchBooks = async (uid?: string) => {
    const activeUid = uid || user?.uid;
    if (!activeUid) return;
    setIsLoadingBooks(true);
    try {
      const res = await fetch('/api/books', {
        headers: { 'x-user-uid': activeUid }
      });
      if (res.ok) {
        const data = await res.json();
        setBooks(data);
      }
    } catch (e) {
      console.error('Error fetching books:', e);
    }
    setIsLoadingBooks(false);
  };

  useEffect(() => {
    if (user) {
      fetchBooks(user.uid);
      fetchPlanState(user.uid);
    }
  }, [user]);

  // Handlers
  const handleLoginSuccess = (loggedInUser: User) => {
    setUser(loggedInUser);
    localStorage.setItem('riddim_auth_user', JSON.stringify(loggedInUser));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('riddim_auth_user');
    setActiveScreen('bookshelf');
    setActiveBook(null);
  };

  const handleBookCreated = (newBook: Book) => {
    setBooks([newBook, ...books]);
    setActiveBook(newBook);
    setActiveScreen('bookshelf'); // reset screens
  };

  const handleDuplicateBook = async (id: string) => {
    try {
      const res = await fetch(`/api/books/${id}/duplicate`, { method: 'POST' });
      if (res.ok) {
        const duplicated = await res.json();
        setBooks([duplicated, ...books]);
        // Log log
        await fetch('/api/logs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            level: 'info',
            message: `Book duplicate operation succeeded. New volume ID: ${duplicated.id}`,
            category: 'books'
          })
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteBook = async (id: string) => {
    if (!confirm('Are you sure you want to delete this publication? This action is irreversible.')) {
      return;
    }
    try {
      const res = await fetch(`/api/books/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setBooks(books.filter((b) => b.id !== id));
        if (activeBook?.id === id) {
          setActiveBook(null);
        }
        await fetch('/api/logs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            level: 'info',
            message: `Book ID: ${id} successfully purged from database.`,
            category: 'books'
          })
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handlePlanUpgrade = (newPlan: 'free' | 'creator' | 'publisher') => {
    setCurrentPlan(newPlan);
  };

  if (!user) {
    return <AuthScreen onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-[#030805] text-zinc-100 antialiased font-sans">
      
      {/* GLOBAL BANNER IF FREE */}
      {currentPlan === 'free' && (
        <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-amber-950/80 text-white px-4 py-2.5 text-center text-xs font-bold flex items-center justify-center gap-2 select-none relative z-10 border-b border-[#D4AF37]/20 shadow-md">
          <Sparkles className="w-3.5 h-3.5 animate-bounce shrink-0 text-[#D4AF37]" />
          <span>You are on the Free Plan. Premium features locked.</span>
          <button
            onClick={() => setShowBilling(true)}
            className="underline hover:text-white text-[#D4AF37] font-extrabold ml-1.5"
          >
            Upgrade via Stripe Now →
          </button>
        </div>
      )}

      {/* HEADER BAR */}
      <header className="sticky top-0 z-30 bg-[#030805]/90 backdrop-blur-md border-b border-emerald-950/80 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          
          {/* Logo brand */}
          <div 
            onClick={() => {
              setActiveBook(null);
              setActiveScreen('bookshelf');
            }}
            className="cursor-pointer hover:opacity-90 transition"
          >
            <BrandLogo size="xs" showText={true} />
          </div>

          {/* User operations dashboard links */}
          <div className="flex items-center gap-4">
            
            {/* View navigation switches */}
            <nav className="hidden md:flex items-center gap-1">
              <button
                onClick={() => {
                  setActiveBook(null);
                  setActiveScreen('bookshelf');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  activeScreen === 'bookshelf' && !activeBook
                    ? 'bg-[#072316] text-[#10B981] border border-emerald-900/50 shadow-md shadow-emerald-950/10'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Bookshelf
              </button>

              <button
                onClick={() => setShowBilling(true)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-zinc-400 hover:text-white flex items-center gap-1"
              >
                <CreditCard className="w-3.5 h-3.5 text-[#D4AF37]" /> Billing
              </button>

              {user?.email?.toLowerCase() === 'ramjitinvestments@gmail.com' && (
                <button
                  onClick={() => {
                    setActiveBook(null);
                    setActiveScreen('admin');
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                    activeScreen === 'admin'
                      ? 'bg-[#072316] text-[#10B981] border border-emerald-900/50 shadow-md shadow-emerald-950/10'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Settings className="w-3.5 h-3.5" /> Ops Panel
                </button>
              )}
            </nav>

            {/* Separators */}
            <div className="h-4 w-px bg-emerald-950/80 hidden md:block" />

            {/* User credentials details */}
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold text-zinc-200 truncate max-w-44">
                  {user.email}
                </p>
                <span className="inline-block text-[9px] uppercase tracking-widest font-extrabold text-[#D4AF37]">
                  {currentPlan} Plan
                </span>
              </div>

              {/* System status badge */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-[#10B981] border border-emerald-500/20 text-[10px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse"></span>
                <span>ONLINE</span>
              </div>

              {/* Log Out button */}
              <button
                onClick={handleLogout}
                className="p-2 border border-emerald-950 rounded-xl hover:bg-[#072316]/50 text-zinc-400 hover:text-white transition"
                title="Log Out Session"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>

          </div>

        </div>
      </header>

      {/* BODY MAIN SECTION */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <AnimatePresence mode="wait">
          {isLoadingBooks ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
              <p className="text-xs text-zinc-400 mt-2 font-mono">Loading operations database...</p>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              transition={{ duration: 0.15 }}
            >
              {/* IF CHOSEN ACTIVE BOOK PREVIEW */}
              {activeBook ? (
                <BookPreview
                  book={activeBook}
                  currentPlan={currentPlan}
                  onBookUpdated={(updated) => {
                    setActiveBook(updated);
                    setBooks(books.map((b) => (b.id === updated.id ? updated : b)));
                  }}
                  onBack={() => setActiveBook(null)}
                  onTriggerUpgrade={() => setShowBilling(true)}
                />
              ) : (
                <>
                  {/* WIZARD BUILDER VIEW */}
                  {activeScreen === 'wizard' && (
                    <BookWizard
                      currentPlan={currentPlan}
                      onBookCreated={handleBookCreated}
                      onCancel={() => setActiveScreen('bookshelf')}
                    />
                  )}

                  {/* BOOKSHELF DASHBOARD VIEW */}
                  {activeScreen === 'bookshelf' && (
                    <Dashboard
                      books={books}
                      currentPlan={currentPlan}
                      onSelectBook={(book) => setActiveBook(book)}
                      onDuplicateBook={handleDuplicateBook}
                      onDeleteBook={handleDeleteBook}
                      onStartWizard={() => setActiveScreen('wizard')}
                      onTriggerUpgrade={() => setShowBilling(true)}
                    />
                  )}

                  {/* ADMIN PANEL OPERATIONS VIEW */}
                  {activeScreen === 'admin' && (
                    <AdminPanel 
                      books={books} 
                      currentUserUid={user.uid}
                      onPlanUpdated={handlePlanUpgrade}
                    />
                  )}
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* STRIPE SUBSCRIPTIONS PORTAL MODAL */}
      <AnimatePresence>
        {showBilling && (
          <BillingPortal
            currentPlan={currentPlan}
            bookCount={books.length}
            onUpgrade={handlePlanUpgrade}
            onClose={() => setShowBilling(false)}
          />
        )}
      </AnimatePresence>

      {/* FLOATING ADMIN/OPS HELPER ON MOBILE ONLY */}
      {user?.email?.toLowerCase() === 'ramjitinvestments@gmail.com' && (
        <div className="fixed bottom-6 right-6 md:hidden z-20">
          <button
            onClick={() => {
              setActiveBook(null);
              setActiveScreen(activeScreen === 'admin' ? 'bookshelf' : 'admin');
            }}
            className="p-3.5 bg-zinc-900 text-white rounded-full shadow-lg border border-zinc-800"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      )}

    </div>
  );
}
