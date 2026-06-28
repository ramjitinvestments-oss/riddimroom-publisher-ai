import { WordSearchPuzzle } from '../types';

interface Placement {
  row: number;
  col: number;
  dirRow: number;
  dirCol: number;
}

export function generateWordSearch(
  title: string,
  wordsInput: string[],
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed',
  gridSize: number = 15
): Omit<WordSearchPuzzle, 'id'> {
  // Clean and filter words
  const cleanWords = wordsInput
    .map(w => w.toUpperCase().replace(/[^A-Z]/g, ''))
    .filter(w => w.length >= 3 && w.length <= gridSize);

  // Initialize empty grid with spaces
  const grid: string[][] = Array(gridSize)
    .fill(null)
    .map(() => Array(gridSize).fill(' '));

  // Determine possible directions based on difficulty
  // directions are [dirRow, dirCol]
  const directions: { dirRow: number; dirCol: number }[] = [];

  // Easy: Horizontal (right), Vertical (down)
  // Medium: + Diagonals (down-right, down-left)
  // Hard: + Reverse (left, up, up-right, up-left, etc.)
  
  if (difficulty === 'easy') {
    directions.push({ dirRow: 0, dirCol: 1 });  // East
    directions.push({ dirRow: 1, dirCol: 0 });  // South
  } else if (difficulty === 'medium') {
    directions.push({ dirRow: 0, dirCol: 1 });  // East
    directions.push({ dirRow: 1, dirCol: 0 });  // South
    directions.push({ dirRow: 1, dirCol: 1 });  // SouthEast
    directions.push({ dirRow: 1, dirCol: -1 }); // SouthWest
  } else { // hard or mixed
    directions.push({ dirRow: 0, dirCol: 1 });   // East
    directions.push({ dirRow: 1, dirCol: 0 });   // South
    directions.push({ dirRow: 1, dirCol: 1 });   // SouthEast
    directions.push({ dirRow: 1, dirCol: -1 });  // SouthWest
    directions.push({ dirRow: 0, dirCol: -1 });  // West (Reverse East)
    directions.push({ dirRow: -1, dirCol: 0 });  // North (Reverse South)
    directions.push({ dirRow: -1, dirCol: -1 }); // NorthWest (Reverse SouthEast)
    directions.push({ dirRow: -1, dirCol: 1 });  // NorthEast (Reverse SouthWest)
  }

  const placedWords: string[] = [];
  const solutions: WordSearchPuzzle['solutions'] = [];

  // Sort words by length descending to place larger words first
  const sortedWords = [...cleanWords].sort((a, b) => b.length - a.length);

  for (const word of sortedWords) {
    let placed = false;
    // Shuffle placements attempts
    const attempts: Placement[] = [];
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        for (const dir of directions) {
          attempts.push({ row: r, col: c, dirRow: dir.dirRow, dirCol: dir.dirCol });
        }
      }
    }

    // Shuffle attempts
    shuffleArray(attempts);

    for (const attempt of attempts) {
      if (canPlaceWord(word, attempt, grid, gridSize)) {
        placeWord(word, attempt, grid);
        placedWords.push(word);
        solutions.push({
          word,
          startRow: attempt.row,
          startCol: attempt.col,
          endRow: attempt.row + (word.length - 1) * attempt.dirRow,
          endCol: attempt.col + (word.length - 1) * attempt.dirCol,
        });
        placed = true;
        break;
      }
    }
  }

  // Fill remaining spaces with random uppercase letters
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      if (grid[r][c] === ' ') {
        grid[r][c] = alphabet.charAt(Math.floor(Math.random() * alphabet.length));
      }
    }
  }

  return {
    category: title,
    grid,
    wordBank: placedWords,
    solutions,
    funFact: '',
    definition: ''
  };
}

function canPlaceWord(word: string, placement: Placement, grid: string[][], gridSize: number): boolean {
  const { row, col, dirRow, dirCol } = placement;
  const wordLen = word.length;

  // Check boundary constraints
  const endRow = row + (wordLen - 1) * dirRow;
  const endCol = col + (wordLen - 1) * dirCol;

  if (endRow < 0 || endRow >= gridSize || endCol < 0 || endCol >= gridSize) {
    return false;
  }

  // Check character overlaps
  for (let i = 0; i < wordLen; i++) {
    const r = row + i * dirRow;
    const c = col + i * dirCol;
    const currentChar = grid[r][c];
    if (currentChar !== ' ' && currentChar !== word.charAt(i)) {
      return false;
    }
  }

  return true;
}

function placeWord(word: string, placement: Placement, grid: string[][]) {
  const { row, col, dirRow, dirCol } = placement;
  for (let i = 0; i < word.length; i++) {
    grid[row + i * dirRow][col + i * dirCol] = word.charAt(i);
  }
}

function shuffleArray(array: any[]) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

export interface CrosswordClueInput {
  clue: string;
  answer: string;
}

export function generateCrossword(
  title: string,
  cluesInput: CrosswordClueInput[],
  gridSize: number = 15
): Omit<WordSearchPuzzle, 'id'> {
  const grid: string[][] = Array(gridSize).fill(null).map(() => Array(gridSize).fill('#'));
  
  const cleanClues = cluesInput
    .map(c => ({
      clue: c.clue,
      answer: c.answer.toUpperCase().replace(/[^A-Z]/g, '')
    }))
    .filter(c => c.answer.length >= 3 && c.answer.length <= gridSize);

  if (cleanClues.length === 0) {
    cleanClues.push({ clue: 'A standard puzzle solver', answer: 'SOLVER' });
    cleanClues.push({ clue: 'Ultimate riddim maker', answer: 'BEATS' });
    cleanClues.push({ clue: 'Sound waves creator', answer: 'AUDIO' });
  }

  const placed: {
    answer: string;
    clue: string;
    direction: 'across' | 'down';
    row: number;
    col: number;
  }[] = [];

  const first = cleanClues[0];
  const firstRow = Math.floor(gridSize / 2);
  const firstCol = Math.floor((gridSize - first.answer.length) / 2);
  
  for (let i = 0; i < first.answer.length; i++) {
    grid[firstRow][firstCol + i] = first.answer[i];
  }
  
  placed.push({
    answer: first.answer,
    clue: first.clue,
    direction: 'across',
    row: firstRow,
    col: firstCol
  });

  for (let cIdx = 1; cIdx < cleanClues.length; cIdx++) {
    const item = cleanClues[cIdx];
    let wordPlaced = false;

    for (const p of placed) {
      if (wordPlaced) break;

      for (let pOffset = 0; pOffset < p.answer.length; pOffset++) {
        if (wordPlaced) break;

        const pChar = p.answer[pOffset];
        const pRow = p.direction === 'across' ? p.row : p.row + pOffset;
        const pCol = p.direction === 'across' ? p.col + pOffset : p.col;

        for (let wOffset = 0; wOffset < item.answer.length; wOffset++) {
          if (wordPlaced) break;

          if (item.answer[wOffset] === pChar) {
            const nextDir = p.direction === 'across' ? 'down' : 'across';
            const nextRow = nextDir === 'down' ? pRow - wOffset : pRow;
            const nextCol = nextDir === 'down' ? pCol : pCol - wOffset;

            if (canPlaceCrosswordWord(item.answer, nextRow, nextCol, nextDir, grid, gridSize, pRow, pCol)) {
              placeCrosswordWord(item.answer, nextRow, nextCol, nextDir, grid);
              placed.push({
                answer: item.answer,
                clue: item.clue,
                direction: nextDir,
                row: nextRow,
                col: nextCol
              });
              wordPlaced = true;
            }
          }
        }
      }
    }

    if (!wordPlaced) {
      for (let r = 2; r < gridSize - 2; r += 2) {
        if (wordPlaced) break;
        let isEmpty = true;
        for (let c = 0; c < gridSize; c++) {
          if (grid[r][c] !== '#') { isEmpty = false; break; }
        }
        if (isEmpty && item.answer.length <= gridSize - 4) {
          const startCol = 2;
          for (let i = 0; i < item.answer.length; i++) {
            grid[r][startCol + i] = item.answer[i];
          }
          placed.push({
            answer: item.answer,
            clue: item.clue,
            direction: 'across',
            row: r,
            col: startCol
          });
          wordPlaced = true;
        }
      }
    }
  }

  const finalClues: { direction: 'across' | 'down'; number: number; clue: string; answer: string; startRow: number; startCol: number }[] = [];
  let currentNum = 1;

  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      if (grid[r][c] === '#') continue;

      const matches = placed.filter(p => p.row === r && p.col === c);

      if (matches.length > 0) {
        const num = currentNum++;

        for (const m of matches) {
          finalClues.push({
            direction: m.direction,
            number: num,
            clue: m.clue,
            answer: m.answer,
            startRow: r,
            startCol: c
          });
        }
      }
    }
  }

  return {
    category: title,
    grid,
    wordBank: placed.map(p => p.answer),
    solutions: placed.map(p => ({
      word: p.answer,
      startRow: p.row,
      startCol: p.col,
      endRow: p.direction === 'across' ? p.row : p.row + p.answer.length - 1,
      endCol: p.direction === 'across' ? p.col + p.answer.length - 1 : p.col
    })),
    clues: finalClues,
    bookType: 'crossword',
    funFact: '',
    definition: ''
  };
}

function canPlaceCrosswordWord(
  word: string,
  row: number,
  col: number,
  direction: 'across' | 'down',
  grid: string[][],
  gridSize: number,
  overlapRow: number,
  overlapCol: number
): boolean {
  const wordLen = word.length;
  const endRow = direction === 'down' ? row + wordLen - 1 : row;
  const endCol = direction === 'across' ? col + wordLen - 1 : col;

  if (row < 0 || endRow >= gridSize || col < 0 || endCol >= gridSize) {
    return false;
  }

  for (let i = 0; i < wordLen; i++) {
    const r = direction === 'down' ? row + i : row;
    const c = direction === 'across' ? col + i : col;

    if (r === overlapRow && c === overlapCol) {
      continue;
    }

    const cellVal = grid[r][c];
    if (cellVal !== '#') {
      return false;
    }

    if (direction === 'across') {
      if (r > 0 && grid[r - 1][c] !== '#') return false;
      if (r < gridSize - 1 && grid[r + 1][c] !== '#') return false;
    } else {
      if (c > 0 && grid[r][c - 1] !== '#') return false;
      if (c < gridSize - 1 && grid[r][c + 1] !== '#') return false;
    }
  }

  if (direction === 'across') {
    if (col > 0 && grid[row][col - 1] !== '#') return false;
    if (endCol < gridSize - 1 && grid[row][endCol + 1] !== '#') return false;
  } else {
    if (row > 0 && grid[row - 1][col] !== '#') return false;
    if (endRow < gridSize - 1 && grid[endRow + 1][col] !== '#') return false;
  }

  return true;
}

function placeCrosswordWord(word: string, row: number, col: number, direction: 'across' | 'down', grid: string[][]) {
  for (let i = 0; i < word.length; i++) {
    const r = direction === 'down' ? row + i : row;
    const c = direction === 'across' ? col + i : col;
    grid[r][c] = word[i];
  }
}

export function generateTrivia(
  title: string,
  questionsInput: { question: string; answer: string; options?: string[] }[]
): Omit<WordSearchPuzzle, 'id'> {
  const cleanQuestions = (questionsInput || []).map(q => {
    const opts = q.options && q.options.length ? q.options : [
      q.answer,
      `Alternative for ${q.answer}`,
      `Another Option for ${q.answer}`,
      `The Wrong Choice`
    ];
    // Ensure actual answer is included and option order is randomized
    const uniqueOpts = Array.from(new Set([q.answer, ...opts])).slice(0, 4);
    while (uniqueOpts.length < 4) {
      uniqueOpts.push(`Option ${uniqueOpts.length + 1}`);
    }
    return {
      question: q.question,
      answer: q.answer,
      options: [...uniqueOpts].sort(() => 0.5 - Math.random())
    };
  });

  return {
    category: title,
    grid: [],
    wordBank: cleanQuestions.map(q => q.answer.toUpperCase()),
    solutions: [],
    funFact: '',
    definition: '',
    bookType: 'trivia',
    questions: cleanQuestions
  };
}

export function generateColoring(
  title: string,
  type?: 'geometric' | 'mandala' | 'nature' | 'abstract'
): Omit<WordSearchPuzzle, 'id'> {
  const types: ('geometric' | 'mandala' | 'nature' | 'abstract')[] = ['geometric', 'mandala', 'nature', 'abstract'];
  const finalType = type || types[Math.floor(Math.random() * types.length)];
  return {
    category: title,
    grid: [],
    wordBank: [],
    solutions: [],
    funFact: '',
    definition: '',
    bookType: 'coloring',
    coloringType: finalType,
    coloringSeed: Math.floor(Math.random() * 10000)
  };
}

export function generateMaze(
  title: string,
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed'
): Omit<WordSearchPuzzle, 'id'> {
  const size = difficulty === 'easy' ? 11 : difficulty === 'medium' ? 15 : 19;
  const grid: number[][] = Array(size).fill(null).map(() => Array(size).fill(0));
  
  // Backtracking carver
  function carve(r: number, c: number) {
    grid[r][c] = 1;
    const dirs = [
      [-2, 0], [2, 0], [0, -2], [0, 2]
    ];
    // shuffle directions
    for (let i = dirs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [dirs[i], dirs[j]] = [dirs[j], dirs[i]];
    }
    for (const [dr, dc] of dirs) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr > 0 && nr < size - 1 && nc > 0 && nc < size - 1) {
        if (grid[nr][nc] === 0) {
          grid[r + dr / 2][c + dc / 2] = 1;
          carve(nr, nc);
        }
      }
    }
  }

  // Carve from 1,1
  carve(1, 1);

  // Guarantee entrance/exit are open
  grid[0][1] = 1;
  grid[size - 1][size - 2] = 1;

  // BFS solver
  const queue: [number, number, [number, number][]][] = [[0, 1, [[0, 1]]]];
  const visited = new Set<string>();
  visited.add('0,1');
  let path: [number, number][] = [];

  while (queue.length > 0) {
    const [cr, cc, currPath] = queue.shift()!;
    if (cr === size - 1 && cc === size - 2) {
      path = currPath;
      break;
    }
    const adj = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (const [dr, dc] of adj) {
      const nr = cr + dr;
      const nc = cc + dc;
      if (nr >= 0 && nr < size && nc >= 0 && nc < size && grid[nr][nc] === 1) {
        const key = `${nr},${nc}`;
        if (!visited.has(key)) {
          visited.add(key);
          queue.push([nr, nc, [...currPath, [nr, nc]]]);
        }
      }
    }
  }

  // To fit inside WordSearchPuzzle interface, we'll convert 0/1 grid to a string grid representing block walls or empty paths
  const stringGrid = grid.map(row => row.map(cell => (cell === 0 ? '#' : ' ')));

  return {
    category: title,
    grid: stringGrid,
    wordBank: [],
    solutions: [],
    funFact: '',
    definition: '',
    bookType: 'maze',
    mazeGrid: {
      grid,
      start: [0, 1],
      end: [size - 1, size - 2],
      path
    }
  };
}

export function generateSudoku(
  title: string,
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed'
): Omit<WordSearchPuzzle, 'id'> {
  // Classic 9x9 board shift algorithm to seed a valid solved sudoku
  const solution = Array(9).fill(null).map((_, r) =>
    Array(9).fill(null).map((_, c) => ((r * 3 + Math.floor(r / 3) + c) % 9 + 1))
  );

  // Shuffle numbers 1-9 to map them
  const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  for (let i = nums.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [nums[i], nums[j]] = [nums[j], nums[i]];
  }

  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      solution[r][c] = nums[solution[r][c] - 1];
    }
  }

  // Shuffle block rows
  for (const block of [0, 1, 2]) {
    const rows = [block * 3, block * 3 + 1, block * 3 + 2];
    for (let i = rows.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [rows[i], rows[j]] = [rows[j], rows[i]];
    }
    const temp = [...solution];
    solution[block * 3] = temp[rows[0]];
    solution[block * 3 + 1] = temp[rows[1]];
    solution[block * 3 + 2] = temp[rows[2]];
  }

  // Create puzzle by blanking out cells
  const grid = solution.map(row => [...row]);
  const cellsToRemove = difficulty === 'easy' ? 30 : difficulty === 'medium' ? 42 : difficulty === 'hard' ? 52 : 45;
  let removed = 0;
  while (removed < cellsToRemove) {
    const r = Math.floor(Math.random() * 9);
    const c = Math.floor(Math.random() * 9);
    if (grid[r][c] !== 0) {
      grid[r][c] = 0;
      removed++;
    }
  }

  // Convert number grid to a string grid for compatibility
  const stringGrid = grid.map(row => row.map(cell => (cell === 0 ? ' ' : String(cell))));

  return {
    category: title,
    grid: stringGrid,
    wordBank: [],
    solutions: [],
    funFact: '',
    definition: '',
    bookType: 'sudoku',
    sudokuGrid: {
      grid,
      solution
    }
  };
}

export function generateCryptogram(
  title: string,
  plaintextQuote: string,
  hintText: string = 'A hidden quote about this topic.'
): Omit<WordSearchPuzzle, 'id'> {
  const plainText = plaintextQuote.toUpperCase();
  
  // Generate random cipher mapping A-Z
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const shuffled = [...alphabet];
  // Simple shuffle
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  // Ensure no letter maps to itself (derangement)
  for (let i = 0; i < alphabet.length; i++) {
    if (shuffled[i] === alphabet[i]) {
      const swapWith = (i + 1) % alphabet.length;
      [shuffled[i], shuffled[swapWith]] = [shuffled[swapWith], shuffled[i]];
    }
  }

  const mapping: Record<string, string> = {};
  alphabet.forEach((letter, idx) => {
    mapping[letter] = shuffled[idx];
  });

  // Cipher text
  let cipherText = '';
  for (let i = 0; i < plainText.length; i++) {
    const char = plainText[i];
    if (char >= 'A' && char <= 'Z') {
      cipherText += mapping[char];
    } else {
      cipherText += char;
    }
  }

  return {
    category: title,
    grid: [],
    wordBank: [],
    solutions: [],
    funFact: '',
    definition: '',
    bookType: 'cryptogram',
    cryptogramData: {
      cipherText,
      plainText,
      hint: hintText
    }
  };
}

export function generateWordScramble(
  title: string,
  words: string[],
  hints?: string[]
): Omit<WordSearchPuzzle, 'id'> {
  const scrambleData = words.map((word, idx) => {
    const cleanWord = word.toUpperCase().replace(/[^A-Z]/g, '');
    let scrambled = cleanWord;
    
    // Scramble letters
    let attempts = 0;
    while (scrambled === cleanWord && cleanWord.length > 1 && attempts < 10) {
      const arr = cleanWord.split('');
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      scrambled = arr.join('');
      attempts++;
    }

    return {
      original: cleanWord,
      scrambled,
      hint: hints?.[idx] || `Thematic word for ${title}`
    };
  });

  return {
    category: title,
    grid: [],
    wordBank: words.map(w => w.toUpperCase()),
    solutions: [],
    funFact: '',
    definition: '',
    bookType: 'wordscramble',
    wordScrambleData: scrambleData
  };
}
