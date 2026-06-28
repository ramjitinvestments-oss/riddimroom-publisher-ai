export interface User {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  createdAt: string;
  lastLogin?: string;
  plan: 'free' | 'creator' | 'publisher' | 'admin';
  enabled?: boolean;
  role?: 'user' | 'admin';
  booksCreated?: number;
  booksDownloaded?: number;
  lastActivity?: string;
  notes?: string;
  usage?: number;
}

export interface Subscription {
  uid: string;
  plan: 'free' | 'creator' | 'publisher';
  stripeCustomerId: string;
  status: 'active' | 'canceled' | 'past_due' | 'trialing';
  createdAt: string;
}

export interface WordSearchPuzzle {
  id: string;
  category: string;
  grid: string[][]; // 2D array of characters
  wordBank: string[]; // List of words to find
  solutions: { word: string; startRow: number; startCol: number; endRow: number; endCol: number }[];
  funFact?: string;
  definition?: string;
  // Production-grade extension fields for other puzzle/book types:
  bookType?: 'wordsearch' | 'crossword' | 'trivia' | 'coloring' | 'mixed' | 'maze' | 'sudoku' | 'cryptogram' | 'wordscramble';
  clues?: { direction: 'across' | 'down'; number: number; clue: string; answer: string; startRow: number; startCol: number }[];
  questions?: { question: string; answer: string; options?: string[]; questionType?: 'multiple' | 'tf' | 'fill' | 'matching'; explanation?: string }[];
  coloringType?: 'geometric' | 'mandala' | 'nature' | 'abstract';
  coloringSeed?: number;
  mazeGrid?: { grid: number[][]; start: [number, number]; end: [number, number]; path?: [number, number][] };
  sudokuGrid?: { grid: number[][]; solution: number[][] };
  cryptogramData?: { cipherText: string; plainText: string; hint: string };
  wordScrambleData?: { original: string; scrambled: string; hint?: string }[];
}

export interface BookDetails {
  introduction: string;
  overview: string;
  backCoverText: string;
  authorAbout: string;
  publisherAbout: string;
  glossary: { word: string; definition: string; example: string }[];
  funFacts: string[];
  puzzles: WordSearchPuzzle[];
  amazonListing: {
    title: string;
    subtitle: string;
    description: string;
    keywords: string[];
    categories: string[];
    marketingCopy: string;
  };
  cover: {
    style: 'professional' | 'educational' | 'kids' | 'modern' | 'caribbean' | 'vintage';
    backgroundColor: string;
    titleColor: string;
    subtitleColor: string;
    coverImageUrl?: string; // base64 or url
    uploadedImageUrl?: string;
    originalImageUrl?: string;
    frontLayout: 'split' | 'centered' | 'full' | 'bento';
    analysisResult?: string;
    imageLayout?: 'full-wrap' | 'front-bg' | 'front-centered';
  };
  settings: {
    trimSize: '8.5x11' | '8x10' | '6x9';
    puzzleCount: number;
    audience: 'kids' | 'teens' | 'adults' | 'seniors';
    difficulty: 'easy' | 'medium' | 'hard' | 'mixed';
    largePrint: boolean;
    bookType?: 'wordsearch' | 'crossword' | 'trivia' | 'coloring' | 'mixed' | 'maze' | 'sudoku' | 'cryptogram' | 'wordscramble';
  };
}

export interface Book {
  id: string;
  uid: string;
  title: string;
  topic: string;
  status: 'generating' | 'ready' | 'failed';
  coverUrl?: string;
  pdfUrl?: string;
  createdAt: string;
  details: BookDetails;
}

export interface SystemLog {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  category: string;
}

export interface GenerationRecord {
  id: string;
  bookId: string;
  prompt: string;
  tokensUsed: number;
  createdAt: string;
}

export interface DownloadRecord {
  id: string;
  uid: string;
  bookId: string;
  downloadType: 'interior_pdf' | 'cover_pdf' | 'listing_txt';
  createdAt: string;
}
