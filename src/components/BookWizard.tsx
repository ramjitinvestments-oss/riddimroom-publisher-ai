import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, ArrowRight, ArrowLeft, Check, Plus, Trash2, Edit2, Loader2, Info, BookOpen } from 'lucide-react';
import { Book, BookDetails } from '../types';
import { generateWordSearch, generateCrossword, generateTrivia, generateColoring, generateMaze, generateSudoku, generateCryptogram, generateWordScramble } from '../utils/puzzle';

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
  const [bookType, setBookType] = useState<'wordsearch' | 'crossword' | 'trivia' | 'coloring' | 'mixed' | 'maze' | 'sudoku' | 'cryptogram' | 'wordscramble'>('wordsearch');
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
  const [modalError, setModalError] = useState<string | null>(null);

  const handleNextStep = () => {
    if (step === 1 && !topic) {
      setModalError('Please enter a topic to continue.');
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
          puzzleCount,
          bookType
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

        // Solve and build grid depending on bookType or mixed rotations!
        let currentType = bookType;
        if (bookType === 'mixed') {
          const rotationTypes: ('wordsearch' | 'crossword' | 'trivia' | 'coloring' | 'maze' | 'sudoku' | 'cryptogram' | 'wordscramble')[] = [
            'wordsearch', 'crossword', 'trivia', 'coloring', 'maze', 'sudoku', 'cryptogram', 'wordscramble'
          ];
          currentType = rotationTypes[i % rotationTypes.length];
        }

        if (currentType === 'crossword') {
          const clues = aiPuzzleData?.clues || [
            { clue: 'Dynamic lifestyle energy', answer: 'VIBES' },
            { clue: 'Musical cadence and drum patterns', answer: 'RIDDIM' },
            { clue: 'Foundational heritage and lineage', answer: 'ROOTS' },
            { clue: 'Spiritual understanding and knowledge', answer: 'WISDOM' },
            { clue: 'Auditory wave transmissions', answer: 'SOUND' },
            { clue: 'State of mental tranquility and calm', answer: 'PEACE' },
            { clue: 'Vast biological wilderness environment', answer: 'NATURE' },
            { clue: 'A sequential traversal through time', answer: 'JOURNEY' }
          ];
          const puzzle = generateCrossword(catName, clues, 15);
          puzzlesList.push({
            id: `puz_${Math.random().toString(36).substring(2, 9)}`,
            ...puzzle,
            funFact: aiPuzzleData?.funFact || `Did you know? "${catName}" crossword solving improves spatial memory.`,
            definition: aiPuzzleData?.definition || `Solving crosswords is a perfect way to reinforce ${catName} vocabulary.`
          });
        } else if (currentType === 'trivia') {
          const questions = aiPuzzleData?.questions || [
            { question: `Which aspect of "${catName}" is considered the most historically significant?`, answer: 'Heritage', options: ['Heritage', 'Modern Era', 'Commercialization', 'Folk Legend'] },
            { question: `How does "${catName}" primarily influence modern pop culture trends?`, answer: 'Music', options: ['Music', 'Literature', 'Visual Art', 'Fashion Trends'] },
            { question: `Which geographic region is most famous for its association with "${topic}"?`, answer: 'Caribbean', options: ['Caribbean', 'North Europe', 'Far East Asia', 'East Africa'] },
            { question: `What is the core philosophical message behind "${catName}" sub-themes?`, answer: 'Unity', options: ['Unity', 'Competition', 'Solitude', 'Industrialization'] }
          ];
          const puzzle = generateTrivia(catName, questions);
          puzzlesList.push({
            id: `puz_${Math.random().toString(36).substring(2, 9)}`,
            ...puzzle,
            funFact: aiPuzzleData?.funFact || `Did you know? Trivia sheets on ${catName} boost cognitive recall.`,
            definition: aiPuzzleData?.definition || `An educational assessment of your knowledge on ${catName}.`
          });
        } else if (currentType === 'coloring') {
          const colorType = aiPuzzleData?.coloringType || ['geometric', 'mandala', 'nature', 'abstract'][i % 4];
          const puzzle = generateColoring(catName, colorType as any);
          puzzlesList.push({
            id: `puz_${Math.random().toString(36).substring(2, 9)}`,
            ...puzzle,
            funFact: aiPuzzleData?.funFact || `An exquisite ${colorType} coloring layout.`,
            definition: aiPuzzleData?.definition || `Relax and color this amazing theme: ${catName}.`
          });
        } else if (currentType === 'maze') {
          const puzzle = generateMaze(catName, difficulty);
          puzzlesList.push({
            id: `puz_${Math.random().toString(36).substring(2, 9)}`,
            ...puzzle,
            funFact: aiPuzzleData?.funFact || `Did you know? Navigating mazes boosts spatial coordination and problem solving.`,
            definition: aiPuzzleData?.definition || `Find your way through this thematic labyrinth representing ${catName}.`
          });
        } else if (currentType === 'sudoku') {
          const puzzle = generateSudoku(catName, difficulty);
          puzzlesList.push({
            id: `puz_${Math.random().toString(36).substring(2, 9)}`,
            ...puzzle,
            funFact: aiPuzzleData?.funFact || `Did you know? Sudoku was popularized in Japan and trains deep logical reasoning.`,
            definition: aiPuzzleData?.definition || `Place numbers 1-9 without duplicates in any row, column, or 3x3 block.`
          });
        } else if (currentType === 'cryptogram') {
          const phrase = aiPuzzleData?.cryptogramPhrase || `EXPLORING THE AMAZING CORE OF ${catName.toUpperCase()} REVEALS EXTRAORDINARY CULTURAL VALUE.`;
          const hint = aiPuzzleData?.cryptogramHint || `Reflecting on the deeper meaning of ${catName}.`;
          const puzzle = generateCryptogram(catName, phrase, hint);
          puzzlesList.push({
            id: `puz_${Math.random().toString(36).substring(2, 9)}`,
            ...puzzle,
            funFact: aiPuzzleData?.funFact || `Did you know? Cryptograms were originally used for military cryptography in ancient times.`,
            definition: aiPuzzleData?.definition || `Decipher the encrypted letters to reveal a hidden thematic quote.`
          });
        } else if (currentType === 'wordscramble') {
          const scrambleWords = aiPuzzleData?.scrambleWords || [
            'VIBRANT', 'EXPLORE', 'RIDDIM', 'ROOTS', 'CULTURE', 'WISDOM', 'ENERGY', 'PEACE'
          ];
          const puzzle = generateWordScramble(catName, scrambleWords);
          puzzlesList.push({
            id: `puz_${Math.random().toString(36).substring(2, 9)}`,
            ...puzzle,
            funFact: aiPuzzleData?.funFact || `Did you know? Solving scrambled words improves lexicographical recognition and spelling.`,
            definition: aiPuzzleData?.definition || `Unscramble each set of letters to find words relating to ${catName}.`
          });
        } else {
          // wordsearch
          const wordBank = aiPuzzleData?.wordBank || [
            'VIBRANT', 'EXPLORE', 'RIDDIM', 'ROOTS', 'CULTURE', 'WISDOM', 
            'ENERGY', 'PEACE', 'SOUND', 'NATURE', 'JOURNEY', 'CREATIVE'
          ];
          const puzzle = generateWordSearch(catName, wordBank, difficulty, largePrint ? 14 : 16);
          puzzlesList.push({
            id: `puz_${Math.random().toString(36).substring(2, 9)}`,
            ...puzzle,
            funFact: aiPuzzleData?.funFact || `An awesome grid exploring the roots of ${catName}.`,
            definition: aiPuzzleData?.definition || `Themed words representing ${catName}.`
          });
        }
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
          largePrint,
          bookType
        }
      };

      let bookTitleSuffix = 'Puzzle Book';
      if (bookType === 'crossword') bookTitleSuffix = 'Crossword Puzzle Book';
      else if (bookType === 'trivia') bookTitleSuffix = 'Trivia Quiz Book';
      else if (bookType === 'coloring') bookTitleSuffix = 'Coloring Book';
      else if (bookType === 'mixed') bookTitleSuffix = 'Mixed Activity Workbook';
      else if (bookType === 'maze') bookTitleSuffix = 'Labyrinth Maze Book';
      else if (bookType === 'sudoku') bookTitleSuffix = 'Sudoku Puzzle Book';
      else if (bookType === 'cryptogram') bookTitleSuffix = 'Cryptogram Cipher Book';
      else if (bookType === 'wordscramble') bookTitleSuffix = 'Word Scramble Puzzle Book';

      const newBookPayload: Partial<Book> = {
        title: `${topic} ${bookTitleSuffix}`,
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
      setModalError(`Generation failed: ${e.message}. Please retry.`);
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
              {([
                { id: 'wordsearch', label: 'Word Search Book', desc: 'Generate vocabulary matrix grids complete with definitions, trivia, and answer sheets.' },
                { id: 'crossword', label: 'Crossword Book', desc: 'Generate intersecting crossword word grids with clues and full solution keys.' },
                { id: 'trivia', label: 'Trivia Book', desc: 'Generate multiple-choice trivia question sheets with comprehensive answer key pages.' },
                { id: 'coloring', label: 'Coloring Book', desc: 'Generate beautiful procedural vector pattern sheets (geometric, mandala, abstract) for coloring.' },
                { id: 'maze', label: 'Maze Book', desc: 'Generate mind-challenging procedurally carved paths with solutions.' },
                { id: 'sudoku', label: 'Sudoku Book', desc: 'Generate standard 9x9 Sudoku puzzles with block regions and solution keys.' },
                { id: 'cryptogram', label: 'Cryptogram Book', desc: 'Generate letter substitution cipher puzzle sheets with hint systems.' },
                { id: 'wordscramble', label: 'Word Scramble Book', desc: 'Generate themed jumbled-letter list sheets with unscrambled answer keys.' },
                { id: 'mixed', label: 'Mixed Activities', desc: 'A premium combination workbook distributing all activities evenly across the requested page count.' }
              ] as const).map((typeOpt) => {
                const isSelected = bookType === typeOpt.id;
                return (
                  <button
                    key={typeOpt.id}
                    onClick={() => setBookType(typeOpt.id)}
                    className={`p-4 border-2 rounded-2xl flex items-start gap-3 text-left transition-all ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-500/[0.04] ring-2 ring-emerald-500/20'
                        : 'border-emerald-950/80 hover:bg-emerald-950/40 bg-[#020906]/30'
                    }`}
                  >
                    <span className={`p-2 rounded-xl shrink-0 ${isSelected ? 'bg-emerald-600 text-white' : 'bg-emerald-950/40 text-emerald-600'}`}>
                      <BookOpen className="w-5 h-5" />
                    </span>
                    <div className="flex-1">
                      <h4 className="text-sm font-black text-white">{typeOpt.label}</h4>
                      <p className="text-xs text-zinc-400 mt-1 leading-relaxed font-medium">
                        {typeOpt.desc}
                      </p>
                      <span className={`inline-block mt-2.5 px-2 py-0.5 text-[9px] uppercase tracking-wider font-extrabold rounded ${
                        isSelected 
                          ? 'bg-emerald-500/15 border border-emerald-500/30 text-[#10B981]' 
                          : 'bg-emerald-950/60 border border-emerald-950 text-emerald-500/60'
                      }`}>
                        {isSelected ? 'Selected' : 'Active'}
                      </span>
                    </div>
                  </button>
                );
              })}
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

      {/* Custom Modal Error Dialog */}
      {modalError && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#030d08] border border-red-900/40 rounded-3xl max-w-sm w-full p-6 text-zinc-100 shadow-2xl relative overflow-hidden animate-in fade-in duration-150 flex flex-col items-center text-center">
            <div className="absolute top-0 left-0 right-0 h-1 bg-red-600"></div>
            <div className="w-12 h-12 rounded-full bg-red-950/40 border border-red-900/40 flex items-center justify-center mb-4">
              <span className="text-red-500 font-bold text-xl">!</span>
            </div>
            <h4 className="text-sm font-black text-white uppercase tracking-wider mb-2">Attention Required</h4>
            <p className="text-xs text-zinc-400 leading-relaxed mb-6">{modalError}</p>
            <button
              onClick={() => setModalError(null)}
              className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white transition text-xs font-bold"
            >
              Acknowledge & Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
