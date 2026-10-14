/**
 * Tier 1 - Feature Coverage: Bot AI (Feature 18)
 * Covers:
 *   - 3 Intelligence Levels: Easy, Medium, Hard
 *   - Opening moves (empty board center preference, second move adjacent)
 *   - Candidate cell pruning (range = 2)
 *   - Heuristic tactical decisions: completing 5 in a row to win, blocking opponent open 4
 */

const { describe, test, assert, assertEqual, assertTruthy } = require('../harness');

let CaroAI;
async function getAIClass() {
  if (!CaroAI) {
    const mod = await import('../../public/js/modules/ai.js');
    CaroAI = mod.CaroAI;
  }
  return CaroAI;
}

describe('Feature 18: Bot AI Initialization & Difficulty Levels', () => {
  test('Instantiates with default and configured difficulty levels', async () => {
    const AI = await getAIClass();
    const defaultAI = new AI();
    assertEqual(defaultAI.difficulty, 'hard');

    const easyAI = new AI('easy');
    assertEqual(easyAI.difficulty, 'easy');

    easyAI.setDifficulty('medium');
    assertEqual(easyAI.difficulty, 'medium');

    easyAI.setDifficulty('hard');
    assertEqual(easyAI.difficulty, 'hard');
  });

  test('AI first move on empty 15x15 board chooses center (7, 7)', async () => {
    const AI = await getAIClass();
    const ai = new AI('hard');
    const board = Array(15).fill(null).map(() => Array(15).fill(null));

    const move = ai.findBestMove(board, 15, 'O', 'X', 'standard');
    assertEqual(move.row, 7, 'Center row must be 7 for 15x15');
    assertEqual(move.col, 7, 'Center col must be 7 for 15x15');
  });

  test('AI first move on empty 19x19 board chooses center (9, 9)', async () => {
    const AI = await getAIClass();
    const ai = new AI('medium');
    const board = Array(19).fill(null).map(() => Array(19).fill(null));

    const move = ai.findBestMove(board, 19, 'X', 'O', 'standard');
    assertEqual(move.row, 9);
    assertEqual(move.col, 9);
  });

  test('AI response when human played center chooses adjacent or center if free', async () => {
    const AI = await getAIClass();
    const ai = new AI('hard');
    const board = Array(15).fill(null).map(() => Array(15).fill(null));
    board[7][7] = 'X'; // Human played center

    const move = ai.findBestMove(board, 15, 'O', 'X', 'standard');
    assertTruthy(move, 'Move must be returned');
    assert(Math.abs(move.row - 7) <= 1 && Math.abs(move.col - 7) <= 1, 'AI must play in neighborhood of first piece');
    assert(board[move.row][move.col] === null, 'Selected cell must be empty');
  });
});

describe('Feature 18: Tactical Heuristic Decision Making', () => {
  test('AI completes open 4-in-a-row to win immediately', async () => {
    const AI = await getAIClass();
    const ai = new AI('hard');
    const board = Array(15).fill(null).map(() => Array(15).fill(null));

    // AI ('O') has 4 pieces: (7, 3), (7, 4), (7, 5), (7, 6)
    board[7][3] = 'O';
    board[7][4] = 'O';
    board[7][5] = 'O';
    board[7][6] = 'O';
    // Both (7, 2) and (7, 7) are open to complete 5

    const move = ai.findBestMove(board, 15, 'O', 'X', 'standard');
    const isWinningMove = (move.row === 7 && move.col === 2) || (move.row === 7 && move.col === 7);
    assert(isWinningMove, `AI must pick winning spot (7, 2) or (7, 7), picked (${move.row}, ${move.col})`);
  });

  test('AI blocks human open 4-in-a-row to prevent defeat', async () => {
    const AI = await getAIClass();
    const ai = new AI('hard');
    const board = Array(15).fill(null).map(() => Array(15).fill(null));

    // Human ('X') has 4 in a row vertically: (3, 8), (4, 8), (5, 8), (6, 8)
    board[3][8] = 'X';
    board[4][8] = 'X';
    board[5][8] = 'X';
    board[6][8] = 'X';

    // AI ('O') must block at (2, 8) or (7, 8)
    const move = ai.findBestMove(board, 15, 'O', 'X', 'standard');
    const isBlockingMove = (move.col === 8 && (move.row === 2 || move.row === 7));
    assert(isBlockingMove, `AI must block human 4-in-a-row at row 2 or 7, picked (${move.row}, ${move.col})`);
  });

  test('Easy AI candidate generation produces valid moves on non-empty board', async () => {
    const AI = await getAIClass();
    const ai = new AI('easy');
    const board = Array(15).fill(null).map(() => Array(15).fill(null));
    board[7][7] = 'X';
    board[7][8] = 'O';

    const move = ai.findBestMove(board, 15, 'X', 'O', 'standard');
    assertTruthy(move);
    assert(move.row >= 0 && move.row < 15, 'Row in bounds');
    assert(move.col >= 0 && move.col < 15, 'Col in bounds');
    assertEqual(board[move.row][move.col], null, 'Must play on unoccupied cell');
  });
});
