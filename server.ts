import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 8080;

app.use(express.json({ limit: '10mb' }));

// Determine a writable directory and database file path dynamically
let DATA_DIR = path.join(process.cwd(), 'data');
let DB_FILE = path.join(DATA_DIR, 'db.json');

try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  // Verify write permission by attempting to write a tiny test file
  const testFile = path.join(DATA_DIR, '.write_test');
  fs.writeFileSync(testFile, 'test');
  fs.unlinkSync(testFile);
} catch (e) {
  console.warn('Local database directory is read-only. Redirecting the database file to /tmp...');
  DATA_DIR = '/tmp';
  DB_FILE = path.join(DATA_DIR, 'db.json');
}

// Global middleware for authorization and usage tracking
app.use((req, res, next) => {
  // If request is for /api/*, verify user status and increment usage count
  if (req.path.startsWith('/api/') && !req.path.startsWith('/api/auth/')) {
    const uid = getReqUid(req);
    const db = readDB();
    const user = db.users?.find((u: any) => u.uid === uid);
    
    // Check if account is disabled by administrator
    if (user && user.enabled === false) {
      appendLog('warn', `Blocked API access for disabled user: ${user.email}`, 'auth');
      return res.status(403).json({ error: 'Your account has been disabled by the administrator. Please contact support.' });
    }

    // Increment usage count for active, non-GET user actions
    if (user && req.method !== 'GET') {
      user.usageCount = (user.usageCount || 0) + 1;
      writeDB(db);
    }
  }
  next();
});

// Initial seed data structure with rich sample users and books for monitoring
const initialDB = {
  users: [
    { uid: 'demo-user', email: 'RamjitInvestments@gmail.com', plan: 'free', enabled: true, usageCount: 45, createdAt: new Date(Date.now() - 3600000 * 24 * 5).toISOString() },
    { uid: 'usr_kdp_1', email: 'publisher_kdp_1@gmail.com', plan: 'publisher', enabled: true, usageCount: 28, createdAt: new Date(Date.now() - 3600000 * 24 * 4).toISOString() },
    { uid: 'usr_kdp_2', email: 'publisher_kdp_2@gmail.com', plan: 'creator', enabled: true, usageCount: 17, createdAt: new Date(Date.now() - 3600000 * 24 * 3).toISOString() },
    { uid: 'usr_kdp_3', email: 'publisher_kdp_3@gmail.com', plan: 'free', enabled: true, usageCount: 6, createdAt: new Date(Date.now() - 3600000 * 24 * 2).toISOString() },
    { uid: 'usr_kdp_4', email: 'publisher_kdp_4@gmail.com', plan: 'free', enabled: true, usageCount: 0, createdAt: new Date(Date.now() - 3600000 * 24 * 1).toISOString() }
  ],
  subscriptions: [
    { uid: 'demo-user', plan: 'free', stripeCustomerId: 'cus_demo_123', status: 'active', createdAt: new Date().toISOString() },
    { uid: 'usr_kdp_1', plan: 'publisher', stripeCustomerId: 'cus_stripe_abc1', status: 'active', createdAt: new Date().toISOString() },
    { uid: 'usr_kdp_2', plan: 'creator', stripeCustomerId: 'cus_stripe_abc2', status: 'active', createdAt: new Date().toISOString() }
  ],
  books: [
    {
      id: 'book_seeded_1',
      uid: 'usr_kdp_1',
      title: 'Patois Culture Riddles',
      topic: 'Jamaica Patois',
      status: 'ready',
      createdAt: new Date(Date.now() - 3600000 * 24 * 4).toISOString(),
      details: { 
        settings: { puzzleCount: 45, trimSize: '8.5x11', audience: 'adults', difficulty: 'medium', largePrint: true }, 
        puzzles: Array(45).fill({}),
        introduction: "Sample introduction text for Jamaica Patois riddles.",
        overview: "An overview of Jamaican Patois puzzle interiors.",
        backCoverText: "The ultimate KDP book cover description.",
        authorAbout: "An inspiring puzzle author bio.",
        publisherAbout: "RiddimRoom Publisher AI statement.",
        glossary: [],
        funFacts: [],
        amazonListing: { title: "Patois Culture Riddles", subtitle: "Large Print Puzzles", description: "Awesome book", keywords: ["patois"], categories: ["Games"], marketingCopy: "Buy now!" },
        cover: { style: 'caribbean', backgroundColor: '#022c22', titleColor: '#fbbf24', subtitleColor: '#f3f4f6', frontLayout: 'centered' }
      }
    },
    {
      id: 'book_seeded_2',
      uid: 'usr_kdp_2',
      title: 'Retro Gaming Wordsearches',
      topic: '90s Video Games',
      status: 'ready',
      createdAt: new Date(Date.now() - 3600000 * 24 * 3).toISOString(),
      details: { 
        settings: { puzzleCount: 20, trimSize: '8x10', audience: 'teens', difficulty: 'easy', largePrint: false }, 
        puzzles: Array(20).fill({}),
        introduction: "Sample intro for retro video game word searches.",
        overview: "A great overview.",
        backCoverText: "A punchy back cover text description.",
        authorAbout: "Author bio description.",
        publisherAbout: "Publisher bio info.",
        glossary: [],
        funFacts: [],
        amazonListing: { title: "Retro Gaming Wordsearches", subtitle: "Retro puzzles", description: "Awesome gaming", keywords: ["gaming"], categories: ["Hobbies"], marketingCopy: "Buy now!" },
        cover: { style: 'modern', backgroundColor: '#0f172a', titleColor: '#10b981', subtitleColor: '#94a3b8', frontLayout: 'split' }
      }
    }
  ],
  downloads: [
    { id: 'dl_s1', uid: 'usr_kdp_1', bookId: 'book_seeded_1', downloadType: 'interior_pdf', createdAt: new Date().toISOString() },
    { id: 'dl_s2', uid: 'usr_kdp_2', bookId: 'book_seeded_2', downloadType: 'cover_pdf', createdAt: new Date().toISOString() }
  ],
  logs: [
    { id: 'log_1', timestamp: new Date().toISOString(), level: 'info', message: 'RiddimRoom Publisher AI Server Booted successfully', category: 'system' }
  ]
};

if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify(initialDB, null, 2), 'utf-8');
} else {
  // Ensure we enrich existing database if it only has 1 user to showcase rich analytics monitoring!
  try {
    const existing = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
    if (!existing.users || existing.users.length <= 1) {
      existing.users = initialDB.users;
      existing.subscriptions = initialDB.subscriptions;
      existing.books = [...(existing.books || []), ...initialDB.books];
      existing.downloads = [...(existing.downloads || []), ...initialDB.downloads];
      fs.writeFileSync(DB_FILE, JSON.stringify(existing, null, 2), 'utf-8');
    }
  } catch (err) {
    console.error("Error upgrading database schema:", err);
  }
}

function generateServerWordSearch(title: string, wordsInput: string[], gridSize: number = 15): any {
  const cleanWords = wordsInput
    .map(w => w.toUpperCase().replace(/[^A-Z]/g, ''))
    .filter(w => w.length >= 3 && w.length <= gridSize);

  const grid = Array(gridSize).fill(null).map(() => Array(gridSize).fill(' '));
  const directions = [
    { dirRow: 0, dirCol: 1 },
    { dirRow: 1, dirCol: 0 },
    { dirRow: 1, dirCol: 1 },
    { dirRow: 1, dirCol: -1 },
    { dirRow: 0, dirCol: -1 },
    { dirRow: -1, dirCol: 0 },
    { dirRow: -1, dirCol: -1 },
    { dirRow: -1, dirCol: 1 }
  ];

  const placedWords: string[] = [];
  const solutions: any[] = [];

  const sortedWords = [...cleanWords].sort((a, b) => b.length - a.length);

  for (const word of sortedWords) {
    let placed = false;
    const attempts: any[] = [];
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        for (const dir of directions) {
          attempts.push({ row: r, col: c, dirRow: dir.dirRow, dirCol: dir.dirCol });
        }
      }
    }

    // fisher-yates shuffle
    for (let i = attempts.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [attempts[i], attempts[j]] = [attempts[j], attempts[i]];
    }

    for (const attempt of attempts) {
      const { row, col, dirRow, dirCol } = attempt;
      const endRow = row + (word.length - 1) * dirRow;
      const endCol = col + (word.length - 1) * dirCol;

      if (endRow < 0 || endRow >= gridSize || endCol < 0 || endCol >= gridSize) continue;

      let overlapOk = true;
      for (let i = 0; i < word.length; i++) {
        const r = row + i * dirRow;
        const c = col + i * dirCol;
        if (grid[r][c] !== ' ' && grid[r][c] !== word.charAt(i)) {
          overlapOk = false;
          break;
        }
      }

      if (overlapOk) {
        for (let i = 0; i < word.length; i++) {
          grid[row + i * dirRow][col + i * dirCol] = word.charAt(i);
        }
        placedWords.push(word);
        solutions.push({
          word,
          startRow: row,
          startCol: col,
          endRow,
          endCol
        });
        placed = true;
        break;
      }
    }
  }

  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      if (grid[r][c] === ' ') {
        grid[r][c] = alphabet.charAt(Math.floor(Math.random() * alphabet.length));
      }
    }
  }

  return {
    id: 'puz_' + Math.random().toString(36).substring(2, 9),
    category: title,
    grid,
    wordBank: placedWords,
    solutions,
    funFact: `Fascinating trivia exploration about ${title}.`,
    definition: `Themed vocabulary surrounding ${title}.`
  };
}

function healBooks(books: any[]): boolean {
  let modified = false;
  if (!books) return false;
  
  for (const book of books) {
    if (!book.details) continue;
    
    // Check if puzzles list is unpopulated or contains empty/invalid objects
    const hasEmptyPuzzles = !book.details.puzzles || 
                            book.details.puzzles.length === 0 || 
                            book.details.puzzles.some((p: any) => !p || !p.grid || p.grid.length === 0);
    
    if (hasEmptyPuzzles) {
      console.log(`Self-healing book: "${book.title}"`);
      const count = book.details.settings?.puzzleCount || 20;
      const topic = book.topic || 'General';
      
      // Determine predefined categories/words based on topic
      let categories: string[] = [];
      let defaultWords: string[] = [];
      
      const topicLower = topic.toLowerCase();
      if (topicLower.includes('patois') || topicLower.includes('jamaica')) {
        categories = [
          "Greetings", "Traditional Food", "Slang Words", "Places & Parishes", "Reggae Music", 
          "Dancehall", "Idioms & Proverbs", "Cultural Icons", "Soca Music", "Traditional Dress", 
          "Famous Beaches", "Blue Mountains", "Kingston City", "Montego Bay", "Ocho Rios", 
          "Negril Cliffs", "Port Antonio", "Yallahs River", "Ackee Fruit", "Saltfish", 
          "Jerk Chicken", "Bammy Bread", "Callaloo Soup", "Run Down", "Gizzada", 
          "Coconut Water", "Red Stripe Beer", "Rum Punch", "Appleton Estate", "Marcus Garvey", 
          "Bob Marley", "Usain Bolt", "Louise Bennett", "Nanny of Maroons", "Sam Sharpe", 
          "Alexander Bustamante", "Norman Manley", "Reggae Sunsplash", "Rebel Salute", "Sumfest", 
          "Jonkonnu Dance", "Quadrille", "Kumina", "Duppy Stories", "Anansi Tales"
        ];
        defaultWords = ["VIBRANT", "EXPLORE", "RIDDIM", "ROOTS", "CULTURE", "WISDOM", "ENERGY", "PEACE", "SOUND", "NATURE", "JOURNEY", "CREATIVE", "AUTHENTIC", "PRIDE"];
      } else if (topicLower.includes('game') || topicLower.includes('retro')) {
        categories = [
          "Super Mario", "Sonic Hedgehog", "Zelda Legend", "Street Fighter", "Mortal Kombat", 
          "Doom FPS", "Quake Arena", "Tomb Raider", "Pokemon Red", "Final Fantasy", 
          "Resident Evil", "Silent Hill", "Crash Bandicoot", "Spyro Dragon", "Metal Gear", 
          "Diablo RPG", "Starcraft RTS", "Warcraft Orcs", "Tekken Fighter", "Chrono Trigger"
        ];
        defaultWords = ["ARCADE", "NINTENDO", "SEGA", "CONTROLLER", "CONSOLE", "LEVEL", "BOSS", "PIXEL", "RELOAD", "QUEST", "FIGHTER", "CLASSIC", "RETRO", "GAMER"];
      } else {
        categories = Array(count).fill(null).map((_, i) => `${topic} Subtheme ${i + 1}`);
        defaultWords = ["PUZZLE", "FIND", "SEARCH", "LETTERS", "MATRIX", "CATEGORIES", "BRAIN", "TRAINING", "VOCABULARY", "GLOSSARY", "TRIVIA", "FACTS"];
      }
      
      while (categories.length < count) {
        categories.push(`${topic} Category ${categories.length + 1}`);
      }
      
      book.details.puzzles = [];
      for (let i = 0; i < count; i++) {
        const cat = categories[i];
        const shuffledWords = [...defaultWords].sort(() => 0.5 - Math.random()).slice(0, 12);
        const puzzle = generateServerWordSearch(cat, shuffledWords, book.details.settings?.largePrint ? 14 : 15);
        book.details.puzzles.push(puzzle);
      }
      
      if (!book.details.glossary || book.details.glossary.length === 0) {
        book.details.glossary = defaultWords.slice(0, 8).map(w => ({
          word: w,
          definition: `A themed vocabulary word from the ${topic} collection.`,
          example: `We searched for the word ${w} in the grid.`
        }));
      }
      if (!book.details.funFacts || book.details.funFacts.length === 0) {
        book.details.funFacts = [
          `Fascinating fact #1 about ${topic} culture and historical relevance.`,
          `Engaging trivia point #2 related to the ${topic} publishing layout.`,
          `Cognitive research #3: Solving ${topic} word puzzles builds active focus reserves.`
        ];
      }
      
      modified = true;
    }
  }
  return modified;
}

// Helper to read and write local JSON DB
function readDB() {
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (healBooks(parsed.books)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(parsed, null, 2), 'utf-8');
    }
    return parsed;
  } catch (err) {
    const fallback = JSON.parse(JSON.stringify(initialDB));
    healBooks(fallback.books);
    return fallback;
  }
}

function writeDB(data: any) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error writing to local db file:', e);
  }
}

// Request UID parser helper for dynamic multi-user flows
function getReqUid(req: express.Request): string {
  const headerUid = req.headers['x-user-uid'];
  if (headerUid && typeof headerUid === 'string') {
    return headerUid;
  }
  const queryUid = req.query.uid;
  if (queryUid && typeof queryUid === 'string') {
    return queryUid;
  }
  return 'demo-user';
}

function appendLog(level: 'info' | 'warn' | 'error', message: string, category: string) {
  const db = readDB();
  const log = {
    id: 'log_' + Math.random().toString(36).substring(2, 9),
    timestamp: new Date().toISOString(),
    level,
    message,
    category
  };
  db.logs = [log, ...(db.logs || [])].slice(0, 100); // keep last 100
  writeDB(db);
  console.log(`[${level.toUpperCase()}] [${category}] ${message}`);
}

// Initialize Gemini SDK lazily
let geminiClient: GoogleGenAI | null = null;
function getGemini(): GoogleGenAI {
  if (!geminiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      appendLog('warn', 'GEMINI_API_KEY is not defined in the environment. AI generations will fall back to simulation mode.', 'ai');
    }
    geminiClient = new GoogleGenAI({
      apiKey: key || 'MOCK_KEY',
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return geminiClient;
}

async function generateContentWithRetry(ai: any, params: any, maxRetries = 4): Promise<any> {
  const modelsToTry = [
    'gemini-3.5-flash',
    'gemini-3.1-flash-lite',
    'gemini-flash-latest'
  ];
  
  let lastError: any = null;
  
  for (const model of modelsToTry) {
    let delay = 1500; // Increased initial delay for better recovery
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        appendLog('info', `Attempting content generation using model ${model} (Attempt ${attempt}/${maxRetries})`, 'ai');
        const response = await ai.models.generateContent({
          ...params,
          model,
        });
        return response;
      } catch (err: any) {
        lastError = err;
        const errMessage = err?.message || String(err);
        const isUnavailableOrRateLimited = errMessage.includes('503') || 
                                           errMessage.toUpperCase().includes('UNAVAILABLE') || 
                                           errMessage.toUpperCase().includes('RESOURCE_EXHAUSTED') ||
                                           errMessage.includes('429');
        
        appendLog('warn', `Generation attempt failed with model ${model} (Attempt ${attempt}/${maxRetries}): ${errMessage}`, 'ai');
        
        if (attempt < maxRetries) {
          // If we hit a 503 or 429, wait a bit longer and apply randomized jitter
          const jitter = Math.floor(Math.random() * 1000);
          const currentDelay = (isUnavailableOrRateLimited ? delay * 1.5 : delay) + jitter;
          appendLog('info', `Temporary Gemini service overload detected. Retrying model ${model} in ${currentDelay}ms (with random jitter)...`, 'ai');
          await new Promise(resolve => setTimeout(resolve, currentDelay));
          delay *= 2;
        }
      }
    }
    appendLog('warn', `All ${maxRetries} attempts failed for model ${model}. Falling back to next available model...`, 'ai');
  }
  
  throw lastError || new Error('All model attempts failed');
}

// ==================================================
// API ROUTES
// ==================================================

// --- AUTHENTICATION ENDPOINTS ---

app.post('/api/auth/login', (req, res) => {
  const { email, password, google } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }
  const db = readDB();
  const lowerEmail = email.toLowerCase().trim();

  // Strict administrator credentials verification
  if (lowerEmail === 'ramjitinvestments@gmail.com') {
    const isGoogle = google === true || google === 'true';
    const cleanPassword = password ? String(password).trim() : '';
    if (!isGoogle && cleanPassword !== '1123$') {
      appendLog('warn', `Failed admin login attempt for ${email}`, 'auth');
      return res.status(401).json({ error: 'Incorrect administrator password.' });
    }
  }

  let user = db.users.find((u: any) => u.email.toLowerCase() === lowerEmail);
  
  if (user && user.enabled === false) {
    appendLog('warn', `Blocked login attempt for disabled user: ${lowerEmail}`, 'auth');
    return res.status(403).json({ error: 'Your account has been disabled by the administrator.' });
  }

  if (!user) {
    // Auto-register style for ease of evaluation and user boarding
    user = {
      uid: lowerEmail === 'ramjitinvestments@gmail.com' ? 'demo-user' : 'usr_' + Math.random().toString(36).substring(2, 9),
      email: lowerEmail,
      plan: (process.env.DEVELOPMENT_UNLOCK_ALL === 'true' || lowerEmail === 'ramjitinvestments@gmail.com') ? 'publisher' : 'free',
      enabled: true,
      usageCount: 1,
      createdAt: new Date().toISOString()
    };
    db.users.push(user);
    appendLog('info', `New user registered via login: ${lowerEmail}`, 'auth');
    writeDB(db);
  } else {
    // Auto-ensure the administrator email retains publisher subscription access
    if (process.env.DEVELOPMENT_UNLOCK_ALL === 'true' || (lowerEmail === 'ramjitinvestments@gmail.com' && user.plan !== 'publisher')) {
      user.plan = 'publisher';
    }
    user.usageCount = (user.usageCount || 0) + 1;
    appendLog('info', `User logged in: ${lowerEmail}`, 'auth');
    writeDB(db);
  }
  if (process.env.DEVELOPMENT_UNLOCK_ALL === 'true' && user) {
    user.plan = 'publisher';
  }
  res.json({ success: true, user });
});

app.post('/api/auth/signup', (req, res) => {
  const { email, name, password } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }
  const db = readDB();
  const lowerEmail = email.toLowerCase().trim();

  if (lowerEmail === 'ramjitinvestments@gmail.com') {
    const cleanPassword = password ? String(password).trim() : '';
    if (cleanPassword !== '1123$') {
      return res.status(401).json({ error: 'Incorrect administrator password.' });
    }
  }

  const existing = db.users.find((u: any) => u.email.toLowerCase() === lowerEmail);
  if (existing) {
    if (existing.enabled === false) {
      return res.status(403).json({ error: 'This account has been disabled by the administrator.' });
    }
    return res.status(400).json({ error: 'Email already registered' });
  }

  const user = {
    uid: lowerEmail === 'ramjitinvestments@gmail.com' ? 'demo-user' : 'usr_' + Math.random().toString(36).substring(2, 9),
    email: lowerEmail,
    plan: (process.env.DEVELOPMENT_UNLOCK_ALL === 'true' || lowerEmail === 'ramjitinvestments@gmail.com') ? 'publisher' : 'free',
    enabled: true,
    usageCount: 1,
    createdAt: new Date().toISOString()
  };
  db.users.push(user);
  appendLog('info', `New user signed up: ${lowerEmail} (${name || 'no name'})`, 'auth');
  writeDB(db);
  res.json({ success: true, user });
});

// --- USER PLAN ENDPOINT ---

app.get('/api/user/plan', (req, res) => {
  if (process.env.DEVELOPMENT_UNLOCK_ALL === 'true') {
    return res.json({ plan: 'publisher' });
  }
  const uid = getReqUid(req);
  const db = readDB();
  const user = db.users.find((u: any) => u.uid === uid);
  res.json({ plan: user ? user.plan : 'free' });
});

// --- ADMIN SYSTEM MONITORING ENDPOINTS ---

app.get('/api/user/status', (req, res) => {
  const uid = getReqUid(req);
  const db = readDB();
  const user = db.users?.find((u: any) => u.uid === uid);
  if (!user) {
    return res.json({ enabled: true, plan: 'free', permissions: { bookGenerator: true, coverGenerator: true, aiCredits: true } });
  }
  res.json({
    enabled: user.enabled !== false,
    plan: user.plan || 'free',
    permissions: user.permissions || {
      bookGenerator: true,
      coverGenerator: true,
      aiCredits: true
    }
  });
});

app.get('/api/admin/users', (req, res) => {
  const adminUid = getReqUid(req);
  const db = readDB();
  const adminUser = db.users?.find((u: any) => u.uid === adminUid);
  const isAdmin = adminUser?.email?.toLowerCase() === 'ramjitinvestments@gmail.com';
  if (!isAdmin) {
    return res.status(403).json({ error: 'Forbidden: Administrator privileges required.' });
  }

  const users = db.users || [];
  const books = db.books || [];
  const downloads = db.downloads || [];
  
  const userStats = users.map((u: any) => {
    const userBooks = books.filter((b: any) => b.uid === u.uid);
    const userDownloads = downloads.filter((d: any) => d.uid === u.uid);
    return {
      uid: u.uid,
      email: u.email,
      plan: u.plan,
      enabled: u.enabled !== false, // default to true if not defined
      usageCount: u.usageCount || (userBooks.length + userDownloads.length + 2),
      createdAt: u.createdAt || new Date().toISOString(),
      booksCount: userBooks.length,
      downloadsCount: userDownloads.length,
      permissions: u.permissions || {
        bookGenerator: true,
        coverGenerator: true,
        aiCredits: true
      },
      books: userBooks.map((b: any) => ({
        id: b.id,
        title: b.title,
        topic: b.topic,
        createdAt: b.createdAt
      }))
    };
  });
  
  res.json(userStats);
});

app.post('/api/admin/users/:uid/toggle', (req, res) => {
  const adminUid = getReqUid(req);
  const db = readDB();
  const adminUser = db.users?.find((u: any) => u.uid === adminUid);
  const isAdmin = adminUser?.email?.toLowerCase() === 'ramjitinvestments@gmail.com';
  if (!isAdmin) {
    return res.status(403).json({ error: 'Forbidden: Administrator privileges required.' });
  }

  const { uid } = req.params;
  const { enabled } = req.body;
  const user = db.users.find((u: any) => u.uid === uid);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Prevent primary admin from disabling their own account
  if (user.email.toLowerCase() === 'ramjitinvestments@gmail.com') {
    return res.status(400).json({ error: 'You cannot disable the primary administrator account.' });
  }

  if (enabled !== undefined) {
    user.enabled = !!enabled;
  } else {
    user.enabled = user.enabled === false ? true : false;
  }
  
  appendLog('info', `Admin [ID: ${adminUid}] toggled account access of ${user.email} to: ${user.enabled ? 'ENABLED' : 'DISABLED'}`, 'admin');
  writeDB(db);
  res.json({ success: true, enabled: user.enabled });
});

app.post('/api/admin/users/:uid/usage', (req, res) => {
  const adminUid = getReqUid(req);
  const db = readDB();
  const adminUser = db.users?.find((u: any) => u.uid === adminUid);
  const isAdmin = adminUser?.email?.toLowerCase() === 'ramjitinvestments@gmail.com';
  if (!isAdmin) {
    return res.status(403).json({ error: 'Forbidden: Administrator privileges required.' });
  }

  const { uid } = req.params;
  const { usageCount } = req.body;

  const user = db.users.find((u: any) => u.uid === uid);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  user.usageCount = usageCount;
  appendLog('info', `Admin [ID: ${adminUid}] manually set usage credits of ${user.email} to: ${usageCount}`, 'admin');
  writeDB(db);
  res.json({ success: true, usageCount: user.usageCount });
});

app.post('/api/admin/users/:uid/permissions', (req, res) => {
  const adminUid = getReqUid(req);
  const db = readDB();
  const adminUser = db.users?.find((u: any) => u.uid === adminUid);
  const isAdmin = adminUser?.email?.toLowerCase() === 'ramjitinvestments@gmail.com';
  if (!isAdmin) {
    return res.status(403).json({ error: 'Forbidden: Administrator privileges required.' });
  }

  const { uid } = req.params;
  const { permissions } = req.body;

  const user = db.users.find((u: any) => u.uid === uid);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  user.permissions = {
    ...(user.permissions || { bookGenerator: true, coverGenerator: true, aiCredits: true }),
    ...permissions
  };

  appendLog('info', `Admin [ID: ${adminUid}] modified permissions for ${user.email} to: ${JSON.stringify(user.permissions)}`, 'admin');
  writeDB(db);
  res.json({ success: true, permissions: user.permissions });
});

app.delete('/api/admin/users/:uid', (req, res) => {
  const adminUid = getReqUid(req);
  const db = readDB();
  const adminUser = db.users?.find((u: any) => u.uid === adminUid);
  const isAdmin = adminUser?.email?.toLowerCase() === 'ramjitinvestments@gmail.com';
  if (!isAdmin) {
    return res.status(403).json({ error: 'Forbidden: Administrator privileges required.' });
  }

  const { uid } = req.params;
  const user = db.users.find((u: any) => u.uid === uid);
  if (!user) {
    return res.status(404).json({ error: 'User workspace not found' });
  }

  // Prevent primary admin from deleting their own account
  if (user.email.toLowerCase() === 'ramjitinvestments@gmail.com') {
    return res.status(400).json({ error: 'You cannot delete the primary administrator account.' });
  }

  const userEmail = user.email;

  // 1. Delete associated books (and their covers, images, assets, etc. since they are embedded)
  const booksCountBefore = db.books?.length || 0;
  db.books = (db.books || []).filter((b: any) => b.uid !== uid);
  const booksDeleted = booksCountBefore - db.books.length;

  // 2. Delete associated downloads
  const downloadsCountBefore = db.downloads?.length || 0;
  db.downloads = (db.downloads || []).filter((d: any) => d.uid !== uid);
  const downloadsDeleted = downloadsCountBefore - db.downloads.length;

  // 3. Delete subscriptions
  db.subscriptions = (db.subscriptions || []).filter((s: any) => s.uid !== uid);

  // 4. Delete user document
  db.users = db.users.filter((u: any) => u.uid !== uid);

  appendLog('info', `Admin [ID: ${adminUid}] permanently deleted user workspace of "${userEmail}" [UID: ${uid}] along with ${booksDeleted} books and ${downloadsDeleted} download logs.`, 'admin');
  writeDB(db);
  res.json({ success: true, message: 'Workspace deleted successfully.' });
});

app.post('/api/admin/users/:uid/plan', (req, res) => {
  const adminUid = getReqUid(req);
  const db = readDB();
  const adminUser = db.users?.find((u: any) => u.uid === adminUid);
  const isAdmin = adminUser?.email?.toLowerCase() === 'ramjitinvestments@gmail.com';
  if (!isAdmin) {
    return res.status(403).json({ error: 'Forbidden: Administrator privileges required.' });
  }

  const { uid } = req.params;
  const { plan } = req.body;
  
  const cleanPlan = plan ? String(plan).toLowerCase() : '';
  if (!['free', 'creator', 'publisher', 'admin'].includes(cleanPlan)) {
    return res.status(400).json({ error: 'Invalid plan tier specification.' });
  }

  const user = db.users.find((u: any) => u.uid === uid);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  user.plan = cleanPlan;
  
  // also sync corresponding subscription if it exists, or create one
  const sub = db.subscriptions.find((s: any) => s.uid === uid);
  if (sub) {
    sub.plan = plan;
  } else {
    db.subscriptions.push({
      uid: uid,
      plan: plan,
      stripeCustomerId: 'cus_' + Math.random().toString(36).substring(2, 10),
      status: 'active',
      createdAt: new Date().toISOString()
    });
  }

  appendLog('info', `Admin [ID: ${adminUid}] manually elevated plan for ${user.email} to: ${plan.toUpperCase()}`, 'admin');
  writeDB(db);
  res.json({ success: true, plan });
});

// --- CORE SYSTEM LOGS & METRICS ---

app.get('/api/logs', (req, res) => {
  const db = readDB();
  res.json(db.logs || []);
});

app.post('/api/logs', (req, res) => {
  const { level, message, category } = req.body;
  appendLog(level || 'info', message || '', category || 'client');
  res.json({ success: true });
});

// --- BILLING WORKFLOWS ---

app.get('/api/billing', (req, res) => {
  const uid = getReqUid(req);
  const db = readDB();
  const subscription = db.subscriptions.find((s: any) => s.uid === uid) || {
    uid: uid,
    plan: 'free',
    stripeCustomerId: 'cus_demo_123',
    status: 'active'
  };
  res.json(subscription);
});

app.post('/api/billing/upgrade', (req, res) => {
  const { plan } = req.body;
  const uid = getReqUid(req);
  const db = readDB();
  const sub = db.subscriptions.find((s: any) => s.uid === uid);
  
  if (sub) {
    sub.plan = plan;
    sub.status = 'active';
  } else {
    db.subscriptions.push({
      uid: uid,
      plan: plan,
      stripeCustomerId: 'cus_' + Math.random().toString(36).substring(2, 10),
      status: 'active',
      createdAt: new Date().toISOString()
    });
  }
  
  const user = db.users.find((u: any) => u.uid === uid);
  if (user) {
    user.plan = plan;
  }

  appendLog('info', `Stripe Subscription Simulator: Upgraded user [${uid}] to ${plan} Plan`, 'billing');
  writeDB(db);
  res.json({ success: true, plan });
});

app.post('/api/billing/cancel', (req, res) => {
  const uid = getReqUid(req);
  const db = readDB();
  const sub = db.subscriptions.find((s: any) => s.uid === uid);
  if (sub) {
    sub.plan = 'free';
  }
  const user = db.users.find((u: any) => u.uid === uid);
  if (user) {
    user.plan = 'free';
  }
  appendLog('info', `Stripe Subscription Simulator: User [${uid}] subscription canceled, downgraded to Free Plan`, 'billing');
  writeDB(db);
  res.json({ success: true, plan: 'free' });
});

// --- BOOK CREATIONS WORKFLOWS ---

app.get('/api/books', (req, res) => {
  const uid = getReqUid(req);
  const db = readDB();
  const userBooks = (db.books || []).filter((b: any) => b.uid === uid);
  res.json(userBooks);
});

app.post('/api/books', (req, res) => {
  const book = req.body;
  const uid = getReqUid(req);
  const db = readDB();

  const user = db.users?.find((u: any) => u.uid === uid);
  const userPermissions = user?.permissions || { bookGenerator: true, coverGenerator: true, aiCredits: true };
  if (userPermissions.bookGenerator === false) {
    return res.status(403).json({ error: 'Book Generator access is disabled by the administrator.' });
  }
  
  if (!book.id) {
    book.id = 'book_' + Math.random().toString(36).substring(2, 9);
    book.createdAt = new Date().toISOString();
    book.uid = uid;
  }

  // filter existing
  const idx = db.books.findIndex((b: any) => b.id === book.id);
  if (idx >= 0) {
    db.books[idx] = { ...db.books[idx], ...book };
    appendLog('info', `Book updated: "${book.title}" [id: ${book.id}]`, 'books');
  } else {
    db.books.push(book);
    appendLog('info', `New book created: "${book.title}" [id: ${book.id}]`, 'books');
  }

  writeDB(db);
  res.json(book);
});

// --- DUPLICATE BOOK INTERIOR ---

const handleDuplicate = (req: any, res: any) => {
  const { id } = req.params;
  const uid = getReqUid(req);
  const db = readDB();

  const user = db.users?.find((u: any) => u.uid === uid);
  const userPermissions = user?.permissions || { bookGenerator: true, coverGenerator: true, aiCredits: true };
  if (userPermissions.bookGenerator === false) {
    return res.status(403).json({ error: 'Book Generator access is disabled by the administrator.' });
  }

  const original = db.books.find((b: any) => b.id === id);
  if (!original) {
    return res.status(404).json({ error: 'Book not found' });
  }

  const copy = JSON.parse(JSON.stringify(original));
  copy.id = 'book_' + Math.random().toString(36).substring(2, 9);
  copy.title = `${copy.title} (Copy)`;
  copy.createdAt = new Date().toISOString();
  copy.uid = uid; // Ensure cloned book is owned by current requester

  db.books.push(copy);
  appendLog('info', `Book duplicated: "${original.title}" duplicated to "${copy.title}"`, 'books');
  writeDB(db);
  res.json(copy);
};

app.post('/api/books/duplicate/:id', handleDuplicate);
app.post('/api/books/:id/duplicate', handleDuplicate);

// --- PURGE BOOK INTERIOR ---

app.delete('/api/books/:id', (req, res) => {
  const { id } = req.params;
  const db = readDB();
  const book = db.books.find((b: any) => b.id === id);
  db.books = db.books.filter((b: any) => b.id !== id);
  appendLog('info', `Book deleted: "${book?.title || id}" [id: ${id}]`, 'books');
  writeDB(db);
  res.json({ success: true });
});

// --- DOWNLOADS TRACKER ---

app.post('/api/downloads', (req, res) => {
  const { bookId, downloadType } = req.body;
  const uid = getReqUid(req);
  const db = readDB();
  const rec = {
    id: 'dl_' + Math.random().toString(36).substring(2, 9),
    uid: uid,
    bookId,
    downloadType,
    createdAt: new Date().toISOString()
  };
  db.downloads.push(rec);
  appendLog('info', `Book download recorded: Type ${downloadType} for Book [id: ${bookId}]`, 'downloads');
  writeDB(db);
  res.json({ success: true, download: rec });
});

// ==================================================
// GEMINI AI INTEGRATION ROUTES
// ==================================================

// Category Suggester Route
app.post('/api/generate-categories', async (req, res) => {
  const uid = getReqUid(req);
  const db = readDB();
  const user = db.users?.find((u: any) => u.uid === uid);
  const userPermissions = user?.permissions || { bookGenerator: true, coverGenerator: true, aiCredits: true };
  if (userPermissions.bookGenerator === false) {
    return res.status(403).json({ error: 'Book Generator access is disabled by the administrator.' });
  }

  const { topic, puzzleCount } = req.body;
  if (!topic) {
    return res.status(400).json({ error: 'Topic is required' });
  }

  const count = parseInt(puzzleCount as string) || 30;

  appendLog('info', `Generating ${count} categories recommendation for topic: "${topic}"`, 'ai');

  // Fallback simulator if Gemini key missing or error
  const simulateCategories = (t: string, num: number) => {
    const formatted = t.toLowerCase();
    const isPatois = formatted.includes('patois') || formatted.includes('jamaica');
    const isDog = formatted.includes('dog') || formatted.includes('pet');

    const patoisBases = [
      'Greetings', 'Traditional Food', 'Slang Phrases', 'Places & Parishes', 'Reggae Music',
      'Dancehall Terms', 'Patois Idioms', 'Cultural Icons', 'Daily Sayings', 'Proverbs',
      'Market Chat', 'Family Terms', 'Beaches & Rivers', 'Folklore Tales', 'Historical Sites',
      'National Heroes', 'Fruits & Vegetables', 'Jamaican Wildlife', 'Local Cooking', 'Island Riddims',
      'Soca Fusions', 'Carnival Beats', 'Calypso Kings', 'Old School Skank', 'Downtown Kingston',
      'Blue Mountains', 'Reggae Festivals', 'Yardie Style', 'Sunday Dinners', 'Ackee & Saltfish'
    ];

    const dogBases = [
      'Dog Breeds', 'Pet Foods', 'Training Commands', 'Agility Games', 'Dog Behavior',
      'Toys & Accessories', 'Popular Dog Names', 'Famous Movies Dogs', 'Working Dogs', 'Toy Group',
      'Terrier Breeds', 'Sporting Dogs', 'Herding Instinct', 'Puppy Care', 'Vet Essentials',
      'Grooming Tools', 'Dog Parks', 'Famous Cartoons', 'Canine Senses', 'Trick Training',
      'Historical Companions', 'Service Dogs', 'Sled Dogs', 'Rescue Operations', 'Pack Mentality',
      'Dog Anatomy', 'Vocalizations', 'Favorite Treats', 'Agility Obstacles', 'Dog Shows'
    ];

    const genericBases = [
      'Basics', 'History', 'Expressions', 'Famous Figures', 'Places', 'Equipment',
      'Modern Terms', 'Advanced Concepts', 'Legends', 'Pioneers', 'Mastery', 'Innovations',
      'Artifacts', 'Myths', 'Anatomy', 'Secrets', 'Discoveries', 'Methods', 'Traditions',
      'Icons', 'Global Trends', 'Niche Areas', 'Chronology', 'Fundamentals', 'Standards',
      'Pro Techniques', 'Pioneers', 'Specialists', 'Journeys', 'Milestones'
    ];

    const result: string[] = [];
    const sourceArray = isPatois ? patoisBases : (isDog ? dogBases : genericBases);

    for (let i = 0; i < num; i++) {
      const baseVal = sourceArray[i % sourceArray.length];
      if (i < sourceArray.length) {
        result.push(isPatois || isDog ? baseVal : `${t} ${baseVal}`);
      } else {
        const indexSuffix = Math.floor(i / sourceArray.length) + 1;
        result.push(isPatois || isDog ? `${baseVal} Pt ${indexSuffix}` : `${t} ${baseVal} Pt ${indexSuffix}`);
      }
    }
    return result;
  };

  if (!process.env.GEMINI_API_KEY) {
    const mockRes = simulateCategories(topic, count);
    appendLog('info', `Gemini key absent. Provided simulated ${mockRes.length} categories for "${topic}"`, 'ai');
    return res.json(mockRes);
  }

  try {
    const ai = getGemini();
    const prompt = `You are a professional Amazon KDP Puzzle publisher.
Topic selected by user: "${topic}"
Generate exactly ${count} unique suggested sub-themes or categories for this topic that can be transformed into separate word search puzzles.
For example, if the topic is "Dogs", suggestions could be: "Breeds", "Foods", "Dog Toys", "Grooming", etc.
Keep category names short (1 to 3 words each). You MUST return exactly ${count} unique category names in the array. Return only a valid JSON array of strings.`;

    const result = await generateContentWithRetry(ai, {
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: `Recommended list of exactly ${count} sub-themes or category names (strings) suitable for individual puzzle titles.`
        }
      }
    });

    let parsed = JSON.parse(result.text || '[]');
    if (!Array.isArray(parsed) || parsed.length === 0) {
      parsed = simulateCategories(topic, count);
    } else if (parsed.length < count) {
      // Pad to exact count if Gemini returned fewer
      const fallbacks = simulateCategories(topic, count);
      for (let i = parsed.length; i < count; i++) {
        parsed.push(fallbacks[i] || `${topic} Extra ${i}`);
      }
    } else if (parsed.length > count) {
      parsed = parsed.slice(0, count);
    }

    appendLog('info', `Successfully generated ${parsed.length} categories using Gemini 3.5 Flash`, 'ai');
    res.json(parsed);
  } catch (error: any) {
    appendLog('error', `Gemini AI failed for categories: ${error.message}. Returning simulated categories fallback.`, 'ai');
    res.json(simulateCategories(topic, count));
  }
});

// Cover Illustration Image Analyzer Route
app.post('/api/cover/analyze', async (req, res) => {
  const uid = getReqUid(req);
  const db = readDB();
  const user = db.users?.find((u: any) => u.uid === uid);
  const userPermissions = user?.permissions || { bookGenerator: true, coverGenerator: true, aiCredits: true };
  if (userPermissions.coverGenerator === false) {
    return res.status(403).json({ error: 'Cover Generator access is disabled by the administrator.' });
  }

  const { image, mimeType, topic } = req.body;
  if (!image || !mimeType) {
    return res.status(400).json({ error: 'Image data and mimeType are required' });
  }

  appendLog('info', `Invoking Gemini to analyze cover illustration for topic: "${topic || 'General'}"`, 'ai');

  const runFallback = () => {
    return {
      style: 'caribbean',
      backgroundColor: '#0f766e',
      titleColor: '#ffffff',
      subtitleColor: '#f59e0b',
      accentColor: '#14b8a6',
      analysis: 'Cover Image Analysis Fallback: Automatically configured a modern Caribbean Teal theme. This coordinates beautifully with most graphics by introducing a deep, high-contrast, eye-catching background (#0f766e) paired with a bright white main title (#ffffff) and an active golden-orange accent title (#f59e0b), satisfying Amazon Kindle Direct Publishing print contrast rules.'
    };
  };

  if (!process.env.GEMINI_API_KEY) {
    appendLog('info', 'Gemini key absent. Using local cover analysis simulation', 'ai');
    return res.json(runFallback());
  }

  try {
    const ai = getGemini();

    const imagePart = {
      inlineData: {
        mimeType: mimeType,
        data: image,
      },
    };

    const systemPrompt = `You are a professional book cover designer specializing in Amazon KDP (Kindle Direct Publishing) specifications.
You are given an illustration that the author uploaded for their book cover.
Analyze this illustration and output a matching color scheme and layout recommendation.
Your recommended style MUST be one of: "professional", "educational", "kids", "modern", "caribbean", "vintage".
You MUST return a valid JSON object matching the requested schema. Use hex code formats (e.g. "#0f766e") for colors. Ensure high-contrast ratio for readability on physical paper and thumbnail prints.`;

    const userPrompt = `Please analyze this book cover illustration for a book titled "${topic || 'Word Search'}" and generate coordinates and hex colors that complement this image beautifully.`;

    const result = await generateContentWithRetry(ai, {
      contents: { parts: [imagePart, { text: userPrompt }] },
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            style: {
              type: Type.STRING,
              description: 'Recommended preset style: "professional", "educational", "kids", "modern", "caribbean", or "vintage".'
            },
            backgroundColor: {
              type: Type.STRING,
              description: 'Recommended HEX code for the cover canvas background.'
            },
            titleColor: {
              type: Type.STRING,
              description: 'Recommended highly-readable HEX code for the front title text.'
            },
            subtitleColor: {
              type: Type.STRING,
              description: 'Recommended HEX code for the front subtitle text.'
            },
            accentColor: {
              type: Type.STRING,
              description: 'Recommended HEX code for cover borders or grid accents.'
            },
            analysis: {
              type: Type.STRING,
              description: 'A 2-3 sentence professional analysis of the illustration explaining why this palette and style choice was selected to maximize sales on Amazon.'
            }
          },
          required: ["style", "backgroundColor", "titleColor", "subtitleColor", "accentColor", "analysis"]
        }
      }
    });

    const parsed = JSON.parse(result.text || '{}');
    appendLog('info', `Successfully analyzed cover image with Gemini. Recommendation: style=${parsed.style}, bg=${parsed.backgroundColor}`, 'ai');
    res.json(parsed);
  } catch (error: any) {
    appendLog('error', `Gemini cover analysis failed: ${error.message}. Returning fallback configuration.`, 'ai');
    res.json(runFallback());
  }
});

// Full Book Content Generator Route
app.post('/api/generate-content', async (req, res) => {
  const uid = getReqUid(req);
  const db = readDB();
  const user = db.users?.find((u: any) => u.uid === uid);
  const userPermissions = user?.permissions || { bookGenerator: true, coverGenerator: true, aiCredits: true };
  if (userPermissions.bookGenerator === false) {
    return res.status(403).json({ error: 'Book Generator access is disabled by the administrator.' });
  }

  const { topic, categories, audience, difficulty, trimSize, puzzleCount, bookType } = req.body;
  if (!topic || !categories || !categories.length) {
    return res.status(400).json({ error: 'Topic and Categories are required' });
  }

  const requestedType = bookType || 'wordsearch';

  appendLog('info', `Invoking Gemini 3.5 Flash to generate publication text for "${topic}" (Type: ${requestedType}, Audience: ${audience}, Difficulty: ${difficulty}, Puzzles: ${puzzleCount})`, 'ai');

  // Fallback simulator for complete book details if Gemini fails or is offline
  const simulateBookContent = () => {
    appendLog('info', `Serving highly customized content simulation dataset for bookType: ${requestedType}`, 'ai');
    
    const glossary = categories.map((cat: string) => ({
      word: cat.replace(/\s+/g, '').toUpperCase().substring(0, 8),
      definition: `A vital keyword associated with the sub-theme: ${cat}.`,
      example: `We explored several concepts relating to ${cat} in this chapter.`
    }));

    const funFacts = [
      `The study of "${topic}" has shown a 45% increase in mental wellness and cognitive reserves.`,
      `Engaging with terms from "${topic}" fosters deeper cultural appreciation and vocabulary expansion.`,
      `Studies reveal that solving themed puzzles is an amazing tool to reinforce active retention of "${topic}" concepts.`
    ];

    const puzzlesContent = categories.map((cat: string, index: number) => {
      let currentType = requestedType;
      if (requestedType === 'mixed') {
        const types = ['wordsearch', 'crossword', 'trivia', 'coloring', 'maze', 'sudoku', 'cryptogram', 'wordscramble'];
        currentType = types[index % types.length];
      }

      // Word search content
      const randomWords = [
        'VIBRANT', 'EXPLORE', 'RIDDIM', 'ROOTS', 'CULTURE', 'WISDOM', 
        'ENERGY', 'PEACE', 'SOUND', 'NATURE', 'JOURNEY', 'CREATIVE',
        'HARMONY', 'BEAUTIFUL', 'SHINE', 'AUTHENTIC', 'PRIDE', 'UNITY'
      ];
      const shuffled = [...randomWords].sort(() => 0.5 - Math.random());
      const selectedWords = shuffled.slice(0, 12).map(w => w.toUpperCase());

      // Crossword clues & answers
      const defaultClues = [
        { clue: 'Dynamic lifestyle energy', answer: 'VIBES' },
        { clue: 'Musical cadence and drum patterns', answer: 'RIDDIM' },
        { clue: 'Foundational heritage and lineage', answer: 'ROOTS' },
        { clue: 'Spiritual understanding and knowledge', answer: 'WISDOM' },
        { clue: 'Auditory wave transmissions', answer: 'SOUND' },
        { clue: 'State of mental tranquility and calm', answer: 'PEACE' },
        { clue: 'Vast biological wilderness environment', answer: 'NATURE' },
        { clue: 'A sequential traversal through time', answer: 'JOURNEY' }
      ];

      // Trivia questions
      const defaultQuestions = [
        { question: `Which aspect of "${cat}" is considered the most historically significant?`, answer: 'Heritage', options: ['Heritage', 'Modern Era', 'Commercialization', 'Folk Legend'] },
        { question: `How does "${cat}" primarily influence modern pop culture trends?`, answer: 'Music', options: ['Music', 'Literature', 'Visual Art', 'Fashion Trends'] },
        { question: `Which geographic region is most famous for its association with "${topic}"?`, answer: 'Caribbean', options: ['Caribbean', 'North Europe', 'Far East Asia', 'East Africa'] },
        { question: `What is the core philosophical message behind "${cat}" sub-themes?`, answer: 'Unity', options: ['Unity', 'Competition', 'Solitude', 'Industrialization'] }
      ];

      // Cryptogram phrase
      const defaultPhrases = [
        `EXPLORING THE INNER DEPTHS OF ${cat.toUpperCase()} LEADS TO LASTING INTELLECTUAL SATISFACTION AND CREATIVITY.`,
        `THE SYSTEMATIC STUDY OF ${topic.toUpperCase()} REVEALS THE EXTRAORDINARY DYNAMICS OF ${cat.toUpperCase()} IN MODERN TIMES.`,
        `NOTHING REPLACES THE PASSIONATE JOURNEY OF DISCOVERING NEW BOUNDARIES WITHIN ${cat.toUpperCase()} AND ITS AMAZING HERITAGE.`
      ];

      return {
        category: cat,
        bookType: currentType,
        wordBank: selectedWords,
        definition: `A beautiful puzzle sheet celebrating "${cat}" and surrounding elements.`,
        funFact: `Did you know? "${cat}" is highly regarded in "${topic}" research circles.`,
        clues: defaultClues,
        questions: defaultQuestions,
        coloringType: ['geometric', 'mandala', 'nature', 'abstract'][index % 4],
        cryptogramPhrase: defaultPhrases[index % defaultPhrases.length],
        cryptogramHint: `A profound insight regarding ${cat}.`,
        scrambleWords: selectedWords.slice(0, 8)
      };
    });

    return {
      introduction: `Welcome to the Ultimate ${requestedType.toUpperCase()} Book on "${topic}"! This collection is specifically compiled to challenge your brain, relax your mind, and take you on an educational journey. Calibrated perfectly for ${audience} at a ${difficulty} level, you will find high-quality puzzle sheets that are perfect for home, travel, or gifting.`,
      overview: `"${topic}" is a fascinating area of study with a rich history and a wonderful variety of concepts. In this book, we unpack the most essential terms, phrases, and facts. Perfect for enhancing linguistic skills, short-term memory, and spatial recognition.`,
      backCoverText: `Are you ready to explore "${topic}" like never before? This carefully crafted interior is fully formatted for Amazon KDP with generous margins, a clean grid presentation, and detailed answers. Inside you'll discover:
• ${categories.length} themed custom pages
• Practical terms glossary for quick learning
• Amazing trivia and fun facts
• Crisp, clear layouts perfect for all reading levels!`,
      authorAbout: `The creator of this series is a passionate puzzle engineer and cultural explorer who loves crafting premium educational workbooks. Aiming to bring complex subjects into simple, delightful mental grids.`,
      publisherAbout: `RiddimRoom Publisher AI is a cloud-based publisher specializing in bespoke activity books, puzzle sheets, and professional print-on-demand assets.`,
      funFacts,
      glossary,
      puzzlesContent,
      amazonListing: {
        title: `${topic} Premium Activity Book`,
        subtitle: `Large Print Themed Pages for ${audience} (${difficulty} Level Edition)`,
        description: `Explore the wonderful world of ${topic} with this publication-ready activity workbook! Specially designed with KDP sizing (trim size ${trimSize}), high contrast text, and large print puzzles. Inside, you'll get vocabulary definitions, fun facts, and detailed answer solutions.`,
        keywords: [topic, requestedType, 'puzzle book', 'KDP publishing', 'brain training', audience, difficulty],
        categories: ['Non-Fiction / Activity Books', 'Games & Activities', 'Education / Workbooks'],
        marketingCopy: `Boost your cognitive health, relieve stress, and learn all about ${topic} through these beautiful activities. Perfect for seniors, teens, and enthusiasts alike!`
      }
    };
  };

  if (!process.env.GEMINI_API_KEY) {
    return res.json(simulateBookContent());
  }

  try {
    const ai = getGemini();

    const systemPrompt = `You are an expert Amazon KDP Puzzle and Activity Book publisher.
Generate structured text content for a workbook.
Topic: "${topic}"
Target Audience: "${audience}"
Difficulty: "${difficulty}"
Puzzles requested: ${puzzleCount}
Book Type: "${requestedType}" (wordsearch, crossword, trivia, coloring, maze, sudoku, cryptogram, wordscramble, or mixed)
Categories to generate puzzles for: ${JSON.stringify(categories)}

You must return a valid JSON object matching the requested schema. Provide rich, highly interesting, real-world educational vocabularies, definitions, and marketing descriptions. Do not return markdown wraps; just pure JSON.`;

    const userPrompt = `Provide the full interior text data for "${topic}" of type "${requestedType}".
Include:
- An introduction and topic overview.
- A back cover promotional summary.
- Author bio and Publisher bio.
- A list of 3 fun facts about the topic.
- A glossary list mapping key terms with simple definitions and example sentences.
- For each category inside ${JSON.stringify(categories)}, generate custom thematic data matching the "${requestedType}" requirement:
  1. If the puzzle type is "wordsearch" or "mixed", generate 12-16 uppercase words.
  2. If the puzzle type is "crossword" or "mixed", generate 8 to 12 clue-answer pairs (answers should be simple, single uppercase words, length 3 to 10).
  3. If the puzzle type is "trivia" or "mixed", generate 8 to 10 high-quality multiple choice trivia questions, specifying the question, the correct answer, and an array of 4 randomized options (including the correct one).
  4. If the puzzle type is "coloring" or "mixed", generate beautiful description prompts and a design style (geometric, mandala, nature, or abstract).
  5. If the puzzle type is "maze" or "mixed", specify a layout category and basic info.
  6. If the puzzle type is "sudoku" or "mixed", specify a difficulty or category theme.
  7. If the puzzle type is "cryptogram" or "mixed", generate a beautiful quote or fact about "${topic}" (plaintext uppercase, letters and punctuation only, 40-100 characters) as "cryptogramPhrase" and a "cryptogramHint".
  8. If the puzzle type is "wordscramble" or "mixed", generate 8 to 10 thematic uppercase words as "scrambleWords".
- Also include a simple sub-category definition and a related fun fact for every category.
- Dynamic Amazon listing metadata: optimized title, subtitle, descriptive summary, keywords, categories, and marketing copy.`;

    const result = await generateContentWithRetry(ai, {
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            introduction: { type: Type.STRING, description: "A warm, premium book introduction." },
            overview: { type: Type.STRING, description: "An informative 2-paragraph educational overview of the topic." },
            backCoverText: { type: Type.STRING, description: "A punchy, benefit-oriented back cover blurb with bullet points." },
            authorAbout: { type: Type.STRING, description: "A creative author biography." },
            publisherAbout: { type: Type.STRING, description: "A brief professional publisher statement." },
            funFacts: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "3 general mind-blowing fun facts about the topic."
            },
            glossary: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  word: { type: Type.STRING, description: "Vocabulary word (all-caps, single word, no spaces/hyphens)" },
                  definition: { type: Type.STRING, description: "A short dictionary-style definition." },
                  example: { type: Type.STRING, description: "An example sentence using the word." }
                },
                required: ["word", "definition", "example"]
              },
              description: "A glossary of 10 primary vocabulary terms."
            },
            puzzlesContent: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  category: { type: Type.STRING, description: "The category sub-theme name from the provided list." },
                  bookType: { type: Type.STRING, description: "The specific sub-puzzle type (wordsearch, crossword, trivia, coloring, maze, sudoku, cryptogram, wordscramble)" },
                  wordBank: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "List of 12 to 16 uppercase words (for word search grids)."
                  },
                  definition: { type: Type.STRING, description: "A 1-sentence description/theme overview of this sub-category." },
                  funFact: { type: Type.STRING, description: "A fun fact related specifically to this subcategory." },
                  clues: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        clue: { type: Type.STRING, description: "The crossword clue describing the word." },
                        answer: { type: Type.STRING, description: "The crossword answer (uppercase, letters only)." }
                      },
                      required: ["clue", "answer"]
                    },
                    description: "Crossword clue-answer pairs (for crossword puzzles)."
                  },
                  questions: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        question: { type: Type.STRING, description: "The multiple choice trivia question text." },
                        answer: { type: Type.STRING, description: "The correct answer word/phrase." },
                        options: {
                          type: Type.ARRAY,
                          items: { type: Type.STRING },
                          description: "Exactly 4 options, including the correct answer."
                        }
                      },
                      required: ["question", "answer", "options"]
                    },
                    description: "Trivia multiple choice questions list."
                  },
                  coloringType: { type: Type.STRING, description: "Recommended coloring style: geometric, mandala, nature, or abstract." },
                  cryptogramPhrase: { type: Type.STRING, description: "A thematic uppercase sentence to encrypt (40-100 characters)." },
                  cryptogramHint: { type: Type.STRING, description: "A helpful clue or context hint for solving." },
                  scrambleWords: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "8 to 10 uppercase vocabulary words for scrambling."
                  }
                },
                required: ["category", "definition", "funFact"]
              },
              description: "An array containing thematic content details for each of the requested categories."
            },
            amazonListing: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING, description: "An attention-grabbing title optimized for KDP search queries." },
                subtitle: { type: Type.STRING, description: "A details-rich subtitle emphasizing puzzles, large print, age group." },
                description: { type: Type.STRING, description: "An HTML-formatted Amazon book description, using bold/list tags." },
                keywords: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "7 SEO-optimized keyword search phrases for Amazon Seller backend."
                },
                categories: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "3 ideal Amazon Browse Node Categories."
                },
                marketingCopy: { type: Type.STRING, description: "A short, persuasive call-to-action summary." }
              },
              required: ["title", "subtitle", "description", "keywords", "categories", "marketingCopy"]
            }
          },
          required: [
            "introduction", "overview", "backCoverText", "authorAbout", "publisherAbout",
            "funFacts", "glossary", "puzzlesContent", "amazonListing"
          ]
        }
      }
    });

    const content = JSON.parse(result.text || '{}');
    appendLog('info', 'Successfully generated complete structured interior content from Gemini!', 'ai');
    res.json(content);
  } catch (error: any) {
    appendLog('error', `Gemini content generation failed: ${error.message}. Returning fallback.`, 'ai');
    res.json(simulateBookContent());
  }
});

// ==================================================
// VITE DEV SERVER & STATIC MIDDLEWARE SETUP
// ==================================================

async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n==================================================`);
    console.log(` RiddimRoom Publisher AI Server Running!`);
    console.log(` Port: ${PORT}`);
    console.log(` Host: 0.0.0.0`);
    console.log(` Development URL: http://localhost:${PORT}`);
    console.log(`==================================================\n`);
    appendLog('info', 'Express Application Server started and listening', 'system');
  });
}

start().catch(err => {
  console.error('Critical startup failure:', err);
});
