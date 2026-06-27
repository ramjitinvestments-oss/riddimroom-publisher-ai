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
