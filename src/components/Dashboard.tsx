import { useState } from 'react';
import { Book, User } from '../types';
import { 
  Plus, Sparkles, BookOpen, Clock, Download, Layers, Trash2, 
  Copy, Eye, ChevronRight, LayoutGrid, List, BarChart3, ShieldCheck 
} from 'lucide-react';

interface DashboardProps {
  books: Book[];
  currentPlan: 'free' | 'creator' | 'publisher';
  onSelectBook: (book: Book) => void;
  onDuplicateBook: (id: string) => void;
  onDeleteBook: (id: string) => void;
  onStartWizard: () => void;
  onTriggerUpgrade: () => void;
}

export default function Dashboard({
  books,
  currentPlan,
  onSelectBook,
  onDuplicateBook,
  onDeleteBook,
  onStartWizard,
  onTriggerUpgrade
}: DashboardProps) {
  const [viewStyle, setViewStyle] = useState<'grid' | 'list'>('grid');

  // Quota calculators
  const bookQuota = currentPlan === 'free' ? 3 : currentPlan === 'creator' ? 50 : 9999;
  const remainingQuota = Math.max(0, bookQuota - books.length);

  return (
    <div className="space-y-8">
      
      {/* QUICK WELCOME HERO SUMMARY */}
      <div className="bg-gradient-to-tr from-[#04150e] to-[#072d1c] text-white p-8 rounded-3xl border border-emerald-950/80 relative overflow-hidden shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        
        {/* Ambient background decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl" />

        <div className="space-y-2 relative z-10">
          <span className="px-3 py-1 bg-[#072316] text-[#10B981] border border-emerald-900/40 font-black text-[10px] uppercase tracking-wider rounded-full shadow-lg">
            Creator Studio
          </span>
          <h1 className="text-2xl font-black tracking-tight mt-2 flex items-center gap-2 text-[#ff0000] font-sans">
            Publisher AI TEST 123 <Sparkles className="w-5 h-5 text-[#ff0000] animate-pulse" />
          </h1>
          <p className="text-sm font-semibold text-[#ff0000] tracking-wide">
            Deployment Verification Build
          </p>
          <p className="text-xs text-zinc-300 max-w-md leading-relaxed font-medium">
            Design and compile complete, publication-ready KDP paperback interiors, custom cover wrappers, and metadata sheets in minutes using Gemini 3.5 Flash.
          </p>
        </div>

        <button
          onClick={onStartWizard}
          className="px-6 py-3 bg-[#D4AF37] hover:bg-[#EAB308] text-[#030805] font-black rounded-xl text-xs transition-all duration-200 shadow-lg shadow-amber-950/20 shrink-0 flex items-center gap-1.5 z-10"
        >
          Create New Book <Plus className="w-4 h-4 stroke-[3]" />
        </button>
      </div>

      {/* METRIC QUOTA PROGRESS BARS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Books Quota */}
        <div className="bg-[#04150e] border border-emerald-950/80 p-5 rounded-2xl flex flex-col justify-between">
          <div>
            <span className="text-[10px] uppercase tracking-widest font-extrabold text-[#D4AF37]">Monthly Generation Usage</span>
            <div className="flex justify-between items-baseline mt-2">
              <h3 className="text-xl font-bold text-white">
                {books.length} <span className="text-xs font-normal text-zinc-500">/ {currentPlan === 'publisher' ? 'Unlimited' : bookQuota} books used</span>
              </h3>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <div className="w-full h-2 bg-emerald-950 rounded-full overflow-hidden border border-emerald-900/30">
              <div 
                className="h-full bg-gradient-to-r from-emerald-500 to-[#10B981] rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, (books.length / bookQuota) * 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] font-bold text-zinc-400">
              <span>{remainingQuota} remaining</span>
              <span className="text-[#10B981]">{currentPlan === 'free' ? '3/mo Limit' : 'Stripe Active'}</span>
            </div>
          </div>
        </div>

        {/* Current Plan Card */}
        <div className="bg-[#04150e] border border-emerald-950/80 p-5 rounded-2xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] uppercase tracking-widest font-extrabold text-[#D4AF37]">Account Tier</span>
            <h3 className="text-lg font-black text-white capitalize flex items-center gap-1.5">
              {currentPlan} Plan
              {currentPlan !== 'free' && <ShieldCheck className="w-4 h-4 text-[#10B981]" />}
            </h3>
            <p className="text-[10px] text-zinc-400">
              {currentPlan === 'free' 
                ? 'Standard 15x15 grids, watermarked' 
                : 'Pristine, non-watermarked commercial PDFs'}
            </p>
          </div>
          {currentPlan === 'free' && (
            <button
              onClick={onTriggerUpgrade}
              className="py-1.5 px-3 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 text-[#10B981] font-bold rounded-lg text-xs transition"
            >
              Upgrade
            </button>
          )}
        </div>

        {/* Dynamic Tip Box */}
        <div className="bg-[#04150e] border border-emerald-950/80 p-5 rounded-2xl flex flex-col justify-between">
          <div>
            <span className="text-[10px] uppercase tracking-widest font-extrabold text-[#D4AF37]">KDP Print Advice</span>
            <p className="text-xs text-zinc-400 mt-2 leading-relaxed font-medium">
              Paperback books require at least 70-80 pages to print text onto the spine. Add at least 50 puzzles to reach this spec.
            </p>
          </div>
        </div>

      </div>

      {/* FILTER SHEETS BAR */}
      <div className="flex justify-between items-center pb-4 border-b border-emerald-950/80">
        <div>
          <h3 className="text-sm font-bold text-white font-sans">Compiled Paperbacks Shelf</h3>
          <p className="text-xs text-zinc-500 mt-0.5">{books.length} publications saved in workspace</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setViewStyle('grid')}
            className={`p-2 rounded-lg border transition ${
              viewStyle === 'grid' 
                ? 'bg-[#072316] border-emerald-900/50 text-[#10B981]' 
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewStyle('list')}
            className={`p-2 rounded-lg border transition ${
              viewStyle === 'list' 
                ? 'bg-[#072316] border-emerald-900/50 text-[#10B981]' 
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* BOOKSHELF SHELVES LISTINGS */}
      {books.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-emerald-950/80 rounded-3xl bg-[#04150e]/30 space-y-4">
          <div className="w-12 h-12 bg-emerald-500/10 text-[#10B981] rounded-xl flex items-center justify-center mx-auto border border-emerald-500/20">
            <BookOpen className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h4 className="text-md font-bold text-white">Bookshelf is currently empty</h4>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto mt-1">
              Kickstart your paperback catalog by generating a beautifully themed word search puzzle collection using the creator wizard.
            </p>
          </div>
          <button
            onClick={onStartWizard}
            className="px-5 py-2.5 bg-[#D4AF37] hover:bg-[#EAB308] text-[#030805] rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5"
          >
            Start Wizard <Plus className="w-4 h-4 stroke-[3]" />
          </button>
        </div>
      ) : (
        <>
          {viewStyle === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {books.map((book) => {
                const coverStyle = book.details.cover.style || 'caribbean';
                const coverColor = book.details.cover.backgroundColor || '#0a424a';
                
                return (
                  <div
                    key={book.id}
                    className="group bg-[#04150e] border border-emerald-950/80 rounded-3xl overflow-hidden shadow-md hover:shadow-xl hover:scale-[1.01] transition-all duration-300 flex flex-col h-96"
                  >
                    {/* Visual paperback cover thumbnail container */}
                    <div 
                      className="h-44 flex items-center justify-center p-4 relative select-none"
                      style={{ backgroundColor: coverColor }}
                    >
                      {/* Grid overlays */}
                      <div className="absolute inset-2 border border-white/5 rounded" />

                      <div className="text-center text-white space-y-1.5 max-w-[80%]">
                        <h4 className="text-xs font-black tracking-tight uppercase line-clamp-2 leading-tight">
                          {book.title}
                        </h4>
                        <span className="inline-block px-1.5 py-0.5 bg-black/25 rounded text-[8px] font-bold uppercase tracking-widest text-zinc-300">
                          {book.topic}
                        </span>
                      </div>

                      {/* Spine binding visual line */}
                      <div className="absolute right-0 top-0 bottom-0 w-1 bg-black/10" />
                    </div>

                    {/* Book Metadata & Actions */}
                    <div className="p-5 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold text-[#10B981] uppercase bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                            {book.details.settings.puzzleCount} Puzzles
                          </span>
                          <span className="text-[10px] font-mono text-zinc-400">
                            {new Date(book.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-white mt-2 truncate">
                          {book.title}
                        </h4>
                        <p className="text-[11px] text-zinc-400 line-clamp-2 mt-1 leading-normal">
                          {book.details.introduction}
                        </p>
                      </div>

                      <div className="flex gap-2 pt-4 border-t border-emerald-950/80">
                        <button
                          onClick={() => onSelectBook(book)}
                          className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" /> Workspace
                        </button>
                        <button
                          onClick={() => onDuplicateBook(book.id)}
                          className="p-2 border border-emerald-950 rounded-xl hover:bg-emerald-950/40 text-zinc-400 hover:text-white transition"
                          title="Duplicate Volume"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteBook(book.id)}
                          className="p-2 border border-red-500/10 rounded-xl hover:bg-red-500/10 text-red-400 transition"
                          title="Delete Volume"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="border border-emerald-950/80 rounded-2xl overflow-hidden bg-[#04150e] text-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#020906] border-b border-emerald-950/80 text-zinc-400 font-bold">
                    <th className="p-4">PUBLICATION TITLE</th>
                    <th className="p-4">CORE TOPIC</th>
                    <th className="p-4">PUZZLE COUNT</th>
                    <th className="p-4">CREATION DATE</th>
                    <th className="p-4 text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-emerald-950/80 text-zinc-300">
                  {books.map((book) => (
                    <tr key={book.id} className="hover:bg-emerald-950/20">
                      <td className="p-4 font-bold text-white flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-[#10B981]" /> {book.title}
                      </td>
                      <td className="p-4 font-mono font-medium">{book.topic}</td>
                      <td className="p-4 font-bold">{book.details.settings.puzzleCount} sheets</td>
                      <td className="p-4">{new Date(book.createdAt).toLocaleDateString()}</td>
                      <td className="p-4 text-right flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onSelectBook(book)}
                          className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs"
                        >
                          Open
                        </button>
                        <button
                          onClick={() => onDuplicateBook(book.id)}
                          className="p-1.5 border border-emerald-950 text-zinc-400 hover:text-white rounded-lg"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteBook(book.id)}
                          className="p-1.5 border border-red-500/10 text-red-400 hover:text-red-500 rounded-lg"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

    </div>
  );
}
