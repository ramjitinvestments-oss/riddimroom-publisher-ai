import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, ArrowRight, ArrowLeft, Check, Plus, Trash2, Edit2, Loader2, Info, BookOpen } from 'lucide-react';
import { Book, BookDetails } from '../types';
import { generateWordSearch } from '../utils/puzzle';

interface BookWizardProps {
  currentPlan: 'free' | 'creator' | 'publisher';
  onBookCreated: (book: Book) => void;
  onCancel: () => void;
}

const TOPIC_SUGGESTIONS = [
  'Jamaican Patois', 'Dogs', 'Fishing', 'Bible Verses', 
  'Gardening', 'Reggae Music', 'Caribbean Foods'
];

export default function BookWizard({ currentPlan, onBookCreated, onCancel }: BookWizardProps) {
  const [step, setStep] = useState(1);
  const [topic, setTopic] = useState('');
  const [bookType, setBookType] = useState<'word_search'>('word_search');
  const [audience, setAudience] = useState<'kids' | 'teens' | 'adults' | 'seniors'>('adults');
  const [puzzleCount, setPuzzleCount] = useState<number>(30);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard' | 'mixed'>('medium');
  const [largePrint, setLargePrint] = useState(true);
  const [categories, setCategories] = useState<string[]>([]);
  const [newCat, setNewCat] = useState('');
  const [editingCatIdx, setEditingCatIdx] = useState<number | null>(null);
  const [editingCatVal, setEditingCatVal] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');

  const handleNextStep = () => {
    if (step === 1 && !topic) {
      alert('Please enter a topic to continue.');
      return;
    }
    if (step === 4) {
      // Fetch categories from Gemini when transitioning to Step 5
      fetchCategories();
    }
    setStep(step + 1);
  };

  const handlePrevStep = () => {
    setStep(Math.max(1, step - 1));
  };

  const fetchCategories = async () => {
    setIsLoading(true);
    setLoadingMessage('Gemini 3.5 Flash is thinking up thematic category ideas...');
    try {
      const res = await fetch('/api/generate-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, puzzleCount })
      });
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      } else {
        const fallbacks = [];
        for (let i = 1; i <= puzzleCount; i++) {
          fallbacks.push(`${topic} Theme ${i}`);
        }
        setCategories(fallbacks);
      }
    } catch (e) {
      console.error(e);
      const fallbacks = [];
      for (let i = 1; i <= puzzleCount; i++) {
        fallbacks.push(`${topic} Theme ${i}`);
      }
      setCategories(fallbacks);
    }
    setIsLoading(false);
  };

  const handleAddCategory = () => {
    if (newCat.trim()) {
      setCategories([...categories, newCat.trim()]);
      setNewCat('');
    }
  };

  const handleRemoveCategory = (index: number) => {
    setCategories(categories.filter((_, idx) => idx !== index));
  };

  const startCategoryEdit = (idx: number, val: string) => {
    setEditingCatIdx(idx);
    setEditingCatVal(val);
  };

  const saveCategoryEdit = () => {
    if (editingCatIdx !== null && editingCatVal.trim()) {
      const updated = [...categories];
      updated[editingCatIdx] = editingCatVal.trim();
      setCategories(updated);
      setEditingCatIdx(null);
    }
  };

  const handleGenerateBook = async () => {
    setIsLoading(true);
    
    const messages = [
      'Drafting vocabulary list groupings...',
      'Cross-referencing definition dictionaries...',
      'Compiling did-you-know fun facts...',
      'Calibrating word search grid matrix algorithms...',
      'Applying margins and KDP page layouts...',
      'Composing Amazon SEO listings metadata...',
      'Polishing everything off with a nice bow...'
    ];

    let msgIdx = 0;
    setLoadingMessage(messages[0]);
    
    const interval = setInterval(() => {
      msgIdx = (msgIdx + 1) % messages.length;
      setLoadingMessage(messages[msgIdx]);
    }, 2500);

    try {
      // Step A: Generate text assets from Express using Gemini Flash
      const response = await fetch('/api/generate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          categories: categories.slice(0, puzzleCount), // slice to puzzle count limit
          audience,
          difficulty,
          trimSize: '8.5x11',
          puzzleCount
        })
      });

      if (!response.ok) {
        throw new Error('Gemini Generation request failed');
      }

      const generatedData = await response.json();

      // Step B: Grid creation on client using our custom math algorithm
      // Make sure we generate exactly matching count
      const puzzlesList = [];
      const countToGenerate = Math.min(puzzleCount, categories.length);

      for (let i = 0; i < countToGenerate; i++) {
        const catName = categories[i];
        
        // Find if Gemini returned generated words for this category
        const aiPuzzleData = generatedData.puzzlesContent?.find(
          (p: any) => p.category.toLowerCase() === catName.toLowerCase()
        ) || generatedData.puzzlesContent?.[i];

        const wordBank = aiPuzzleData?.wordBank || [
          'VIBRANT', 'EXPLORE', 'RIDDIM', 'ROOTS', 'CULTURE', 'WISDOM', 
          'ENERGY', 'PEACE', 'SOUND', 'NATURE', 'JOURNEY', 'CREATIVE'
        ];

        // Solve and build grid
        const puzzle = generateWordSearch(
          catName, 
          wordBank, 
          difficulty, 
          largePrint ? 14 : 16
        );

        puzzlesList.push({
          id: `puz_${Math.random().toString(36).substring(2, 9)}`,
          ...puzzle,
          funFact: aiPuzzleData?.funFact || `An awesome grid exploring the roots of ${catName}.`,
          definition: aiPuzzleData?.definition || `Themed words representing ${catName}.`
        });
      }

      // Step C: Package full Book details object
      const fullBookDetails: BookDetails = {
        introduction: generatedData.introduction,
        overview: generatedData.overview,
        backCoverText: generatedData.backCoverText,
        authorAbout: generatedData.authorAbout,
        publisherAbout: generatedData.publisherAbout,
        funFacts: generatedData.funFacts,
        glossary: generatedData.glossary,
        puzzles: puzzlesList as any,
        amazonListing: generatedData.amazonListing,
        cover: {
          style: 'caribbean',
          backgroundColor: '#0a424a',
          titleColor: '#ffffff',
          subtitleColor: '#eab308',
          frontLayout: 'centered'
        },
        settings: {
          trimSize: '8.5x11',
          puzzleCount,
          audience,
          difficulty,
          largePrint
        }
      };

      const newBookPayload: Partial<Book> = {
        title: `${topic} Word Search Puzzle Book`,
        topic,
        status: 'ready',
        details: fullBookDetails
      };

      // Save to database
      const saveRes = await fetch('/api/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBookPayload)
      });

      if (saveRes.ok) {
        const savedBook = await saveRes.json();
        clearInterval(interval);
        setIsLoading(false);
        onBookCreated(savedBook);
      } else {
        throw new Error('Failed to save generated book to database');
      }

    } catch (e: any) {
      clearInterval(interval);
      setIsLoading(false);
      alert(`Generation failed: ${e.message}. Please retry.`);
    }
  };

  const stepsCount = 5;

  return (
    <div className="bg-[#05150e] border border-emerald-950/80 rounded-3xl overflow-hidden shadow-2xl max-w-3xl mx-auto p-6 relative">
      
      {/* LOADING OVERLAY */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[#030805]/95 flex flex-col items-center justify-center p-8 z-40"
          >
            <div className="w-16 h-16 bg-emerald-500/10 text-[#10B981] rounded-2xl flex items-center justify-center border border-emerald-500/20 mb-5 relative">
              <Loader2 className="w-8 h-8 animate-spin" />
              <div className="absolute inset-0 bg-emerald-500 rounded-2xl opacity-10 blur-md animate-pulse" />
            </div>

            <h3 className="text-lg font-black text-white mb-2 text-center flex items-center gap-2 font-sans">
              Compiling KDP Publisher Assets <Sparkles className="w-4 h-4 text-[#D4AF37] animate-pulse" />
            </h3>
            
            <p className="text-xs text-zinc-400 text-center max-w-sm font-mono animate-pulse">
              {loadingMessage}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER SECTION */}
      <div className="flex justify-between items-center border-b border-emerald-950/80 pb-4 mb-6">
        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#D4AF37]">
            Book Creation Wizard • Step {step} of {stepsCount}
          </span>
          <h2 className="text-lg font-black text-white mt-0.5 font-sans">
            Create Complete KDP Puzzle Book
          </h2>
        </div>
        <button
          onClick={onCancel}
          className="text-xs text-zinc-400 hover:text-white font-bold"
        >
          Cancel Wizard
        </button>
      </div>

      {/* PROGRESS TRACKER */}
      <div className="flex gap-1.5 mb-8">
        {[...Array(stepsCount)].map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full flex-1 transition-all duration-300 ${
              step > i ? 'bg-emerald-600' : 'bg-emerald-950/40'
            }`}
          />
        ))}
      </div>

      {/* CONTENT SWITCHER */}
      <div className="min-h-[250px] mb-8">
        {/* STEP 1: TOPIC INPUT */}
        {step === 1 && (
          <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase text-zinc-400 tracking-wider mb-2">
                What topic is this puzzle book about?
              </label>
              <input
                type="text"
                placeholder="e.g. Jamaican Patois, Gardening, Deep Sea Marine Life..."
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-emerald-900/40 bg-[#020906] text-white focus:outline-none focus:ring-2 focus:ring-[#10B981] text-sm font-bold transition"
              />
            </div>

            <div className="pt-2">
              <p className="text-xs text-zinc-400 font-extrabold mb-3 tracking-widest">POPULAR SUGGESTIONS:</p>
              <div className="flex flex-wrap gap-2">
                {TOPIC_SUGGESTIONS.map((sug) => (
                  <button
                    key={sug}
                    onClick={() => setTopic(sug)}
                    className={`px-3.5 py-1.5 text-xs font-bold rounded-full border transition ${
                      topic === sug
                        ? 'bg-emerald-500/10 text-[#10B981] border-emerald-500/30'
                        : 'bg-emerald-950/40 hover:bg-emerald-900/35 border-emerald-900/20 text-zinc-300'
                    }`}
                  >
                    {sug}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* STEP 2: BOOK TYPE */}
        {step === 2 && (
          <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            <label className="block text-xs font-bold uppercase text-zinc-400 tracking-wider mb-2">
              Select Book Type
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 border-2 border-emerald-500 bg-emerald-500/[0.02] rounded-2xl flex items-start gap-3">
                <span className="p-2 bg-emerald-600 text-white rounded-xl">
                  <BookOpen className="w-5 h-5" />
                </span>
                <div>
                  <h4 className="text-sm font-black text-white">Word Search Book</h4>
                  <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed font-medium">
                    Generate vocabulary matrix grids complete with definitions, trivia, and answer sheets.
                  </p>
                  <span className="inline-block mt-2.5 px-2 py-0.5 bg-emerald-500/15 border border-emerald-500/30 text-[#10B981] text-[9px] uppercase tracking-wider font-extrabold rounded">
                    Fully Active
                  </span>
                </div>
              </div>

              {['Crossword Book', 'Trivia Book', 'Coloring Book', 'Mixed Activities'].map((placeholder) => (
                <div key={placeholder} className="p-4 border border-emerald-950/80 rounded-2xl flex items-start gap-3 opacity-45 bg-[#020906]/60">
                  <span className="p-2 bg-emerald-950/40 text-emerald-800 rounded-xl">
                    <BookOpen className="w-5 h-5" />
                  </span>
                  <div>
                    <h4 className="text-sm font-bold text-zinc-500">{placeholder}</h4>
                    <p className="text-xs text-zinc-600 mt-0.5 leading-relaxed font-medium">
                      Staged for subsequent core rollout schedules.
                    </p>
                    <span className="inline-block mt-2.5 px-2 py-0.5 bg-emerald-950/80 text-zinc-500 text-[9px] uppercase tracking-wider font-bold rounded">
                      Locked Roadmap
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* STEP 3: AUDIENCE & SETTINGS */}
        {step === 3 && (
          <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
            <div>
              <label className="block text-xs font-bold uppercase text-zinc-400 tracking-wider mb-2">
                Select KDP Target Audience
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {([
                  { id: 'kids', label: 'Kids', desc: '12x12 grid, large words' },
                  { id: 'teens', label: 'Teens', desc: '14x14, medium vocabulary' },
                  { id: 'adults', label: 'Adults', desc: '15x15, complex density' },
                  { id: 'seniors', label: 'Seniors', desc: 'Large font, standard difficulty' }
                ] as const).map((aud) => (
                  <button
                    key={aud.id}
                    onClick={() => setAudience(aud.id)}
                    className={`p-4 border rounded-xl text-left transition ${
                      audience === aud.id
                        ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-500/[0.02]'
                        : 'border-emerald-950 hover:bg-emerald-950/50'
                    }`}
                  >
                    <h5 className="text-xs font-extrabold text-white">{aud.label}</h5>
                    <p className="text-[10px] text-zinc-400 mt-1 leading-normal font-medium">{aud.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold uppercase text-zinc-400 tracking-wider mb-2">
                  Grid Difficulty
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { id: 'easy', label: 'Easy' },
                    { id: 'medium', label: 'Medium' },
                    { id: 'hard', label: 'Hard' },
                    { id: 'mixed', label: 'Mixed' }
                  ] as const).map((diff) => (
                    <button
                      key={diff.id}
                      onClick={() => setDifficulty(diff.id)}
                      className={`py-2 px-3 border rounded-xl text-xs font-extrabold text-center capitalize transition ${
                        difficulty === diff.id
                          ? 'border-[#D4AF37] bg-amber-500/[0.02] text-[#D4AF37]'
                          : 'border-emerald-950 text-zinc-300 hover:bg-emerald-950/50'
                      }`}
                    >
                      {diff.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-zinc-400 tracking-wider mb-2">
                  Page Accessibility
                </label>
                <button
                  onClick={() => setLargePrint(!largePrint)}
                  className={`w-full py-3.5 px-4 border rounded-xl text-left transition flex justify-between items-center ${
                    largePrint
                      ? 'border-emerald-500 bg-emerald-500/[0.02]'
                      : 'border-emerald-950'
                  }`}
                >
                  <div>
                    <h5 className="text-xs font-extrabold text-white">Large Print Layout (KDP Specs)</h5>
                    <p className="text-[10px] text-zinc-400 mt-0.5 font-medium">Inject minimum 16pt sans fonts for readability</p>
                  </div>
                  <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition ${
                    largePrint ? 'bg-emerald-600 border-emerald-500 text-white' : 'border-emerald-900'
                  }`}>
                    {largePrint && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* STEP 4: PUZZLE COUNT */}
        {step === 4 && (
          <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            <label className="block text-xs font-bold uppercase text-zinc-400 tracking-wider mb-2">
              Select Puzzle Count (Page count determines spine thickness)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[30, 50, 100, 150].map((count) => {
                const isPremium = count > 30;
                const isLocked = isPremium && currentPlan === 'free';
                
                return (
                  <button
                    key={count}
                    disabled={isLocked}
                    onClick={() => setPuzzleCount(count)}
                    className={`p-5 border rounded-2xl text-left transition flex flex-col justify-between h-32 relative ${
                      puzzleCount === count
                        ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-500/[0.02]'
                        : isLocked
                          ? 'border-emerald-950/40 opacity-40 bg-[#020906]/10 cursor-not-allowed'
                          : 'border-emerald-950 hover:bg-emerald-950/50'
                    }`}
                  >
                    {isLocked && (
                      <span className="absolute top-2 right-2 px-1.5 py-0.5 bg-emerald-600 text-white text-[8px] font-extrabold uppercase rounded">
                        Stripe
                      </span>
                    )}
                    
                    <h5 className="text-2xl font-black text-white">{count}</h5>
                    <div>
                      <p className="text-xs font-bold text-zinc-200 mt-1">Puzzles</p>
                      <p className="text-[10px] text-zinc-400 mt-0.5 font-medium">~{count + 8} total book pages</p>
                    </div>
                  </button>
                );
              })}
            </div>
            
            {currentPlan === 'free' && (
              <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 text-[#10B981] rounded-xl text-[11px] flex items-start gap-2">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  The Free plan allows books up to 30 puzzles. To unlock 50, 100, or 150 puzzle books for massive KDP bundles, upgrade to Creator or Publisher plan via Stripe.
                </span>
              </div>
            )}
          </motion.div>
        )}

        {/* STEP 5: AI CATEGORIES REVIEWS */}
        {step === 5 && (
          <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            <div className="flex justify-between items-center">
              <label className="block text-xs font-bold uppercase text-zinc-400 tracking-wider">
                Review & Edit Categories (Max book limit: {puzzleCount})
              </label>
              <span className="text-[11px] font-extrabold text-[#D4AF37]">
                {categories.length} / {puzzleCount} Categories Listed
              </span>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Add custom category or theme (e.g. Traditional Slang)"
                value={newCat}
                onChange={(e) => setNewCat(e.target.value)}
                className="flex-1 px-3 py-1.5 rounded-xl border border-emerald-900/40 text-xs bg-[#020906] text-white focus:outline-none focus:ring-1 focus:ring-[#10B981] font-bold"
              />
              <button
                onClick={handleAddCategory}
                className="px-4 py-2 bg-[#D4AF37] hover:bg-[#EAB308] text-[#030805] rounded-xl text-xs font-black flex items-center gap-1 transition"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" /> Add
              </button>
            </div>

            {/* Editable list */}
            <div className="border border-emerald-950/80 rounded-2xl overflow-hidden max-h-[300px] overflow-y-auto divide-y divide-emerald-950/80 text-xs bg-[#020906]/20">
              {categories.map((cat, idx) => (
                <div key={idx} className="p-3 flex justify-between items-center hover:bg-emerald-950/20">
                  {editingCatIdx === idx ? (
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="text"
                        value={editingCatVal}
                        onChange={(e) => setEditingCatVal(e.target.value)}
                        className="flex-1 px-2 py-1 border border-emerald-900/40 rounded bg-[#020906] text-white text-xs focus:outline-none focus:ring-1 focus:ring-[#10B981] font-bold"
                      />
                      <button
                        onClick={saveCategoryEdit}
                        className="px-2.5 py-1 bg-emerald-600 text-white rounded text-[10px] font-bold"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingCatIdx(null)}
                        className="text-[10px] text-zinc-500 hover:text-zinc-300"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="font-extrabold text-zinc-200">
                        Puzzle #{idx + 1}: {cat}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => startCategoryEdit(idx, cat)}
                          className="p-1 text-zinc-500 hover:text-[#10B981]"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleRemoveCategory(idx)}
                          className="p-1 text-zinc-500 hover:text-red-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* FOOTER ACTION BUTTONS */}
      <div className="flex justify-between items-center border-t border-emerald-950/80 pt-4">
        <button
          disabled={step === 1}
          onClick={handlePrevStep}
          className={`py-2 px-4 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
            step === 1
              ? 'text-emerald-950 cursor-not-allowed'
              : 'bg-emerald-950/40 border border-emerald-900/20 hover:bg-emerald-950 text-zinc-300'
          }`}
        >
          <ArrowLeft className="w-4 h-4" /> Previous
        </button>

        {step < stepsCount ? (
          <button
            onClick={handleNextStep}
            className="py-2.5 px-5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
          >
            Next Step <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handleGenerateBook}
            className="py-3 px-6 bg-[#D4AF37] hover:bg-[#EAB308] text-[#030805] rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-lg shadow-amber-950/20 animate-pulse"
          >
            Generate Complete Book <Sparkles className="w-4 h-4 text-[#030805]" />
          </button>
        )}
      </div>
    </div>
  );
}
