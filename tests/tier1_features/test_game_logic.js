/**
 * Tier 1 - Feature Coverage: Game Logic & Rule Variants
 * Covers:
 *   - Feature 17: 2-Player Local Game Mode logic
 *   - Feature 20: Rule Variants Support (Standard 5-in-a-row & Block-2-Ends)
 */

const { describe, test, assert, assertEqual, assertDeepEqual } = require('../harness');
const { checkWin, isBoardFull, generateRoomCode } = require('../../server/gameLogic');

describe('Feature 20: Standard Gomoku Rules (5-in-a-row)', () => {
  test('Horizontal 5-in-a-row win detection', () => {
    const size = 15;
    const board = Array(size).fill(null).map(() => Array(size).fill(null));
    // Place 5 X's horizontally: (7, 3) to (7, 7)
    for (let c = 3; c <= 7; c++) {
      board[7][c] = 'X';
    }

    const result = checkWin(board, 7, 7, 'X', size, 'standard');
    assertEqual(result.won, true, 'Horizontal 5-in-a-row must win');
    assertEqual(result.line.length, 5, 'Winning line must contain exactly 5 coordinates');
  });

  test('Vertical 5-in-a-row win detection', () => {
    const size = 15;
    const board = Array(size).fill(null).map(() => Array(size).fill(null));
    // Place 5 O's vertically: (2, 5) to (6, 5)
    for (let r = 2; r <= 6; r++) {
      board[r][5] = 'O';
    }

    const result = checkWin(board, 4, 5, 'O', size, 'standard');
    assertEqual(result.won, true, 'Vertical 5-in-a-row must win');
    assertEqual(result.line.length, 5);
  });

  test('Main diagonal (\\) 5-in-a-row win detection', () => {
    const size = 15;
    const board = Array(size).fill(null).map(() => Array(size).fill(null));
    for (let i = 0; i < 5; i++) {
      board[5 + i][5 + i] = 'X';
    }

    const result = checkWin(board, 7, 7, 'X', size, 'standard');
    assertEqual(result.won, true, 'Main diagonal 5-in-a-row must win');
    assertEqual(result.line.length, 5);
  });

  test('Anti-diagonal (/) 5-in-a-row win detection', () => {
    const size = 15;
    const board = Array(size).fill(null).map(() => Array(size).fill(null));
    for (let i = 0; i < 5; i++) {
      board[4 + i][8 - i] = 'O';
    }

    const result = checkWin(board, 6, 6, 'O', size, 'standard');
    assertEqual(result.won, true, 'Anti-diagonal 5-in-a-row must win');
    assertEqual(result.line.length, 5);
  });

  test('Standard rule: 5-in-a-row blocked at both ends STILL wins', () => {
    const size = 15;
    const board = Array(size).fill(null).map(() => Array(size).fill(null));
    // End 1 blocked by O at (7, 2)
    board[7][2] = 'O';
    // 5 X pieces
    for (let c = 3; c <= 7; c++) {
      board[7][c] = 'X';
    }
    // End 2 blocked by O at (7, 8)
    board[7][8] = 'O';

    const result = checkWin(board, 7, 5, 'X', size, 'standard');
    assertEqual(result.won, true, 'Standard rule awards victory even when blocked at both ends');
  });

  test('Standard rule: Overline (6 in a row) counts as win', () => {
    const size = 15;
    const board = Array(size).fill(null).map(() => Array(size).fill(null));
    for (let c = 2; c <= 7; c++) {
      board[5][c] = 'X';
    }

    const result = checkWin(board, 5, 7, 'X', size, 'standard');
    assertEqual(result.won, true, 'Overline (>=5) counts as win in standard rule');
  });

  test('Incomplete line (4 in a row) does not win', () => {
    const size = 15;
    const board = Array(size).fill(null).map(() => Array(size).fill(null));
    for (let c = 3; c <= 6; c++) {
      board[7][c] = 'X';
    }

    const result = checkWin(board, 7, 6, 'X', size, 'standard');
    assertEqual(result.won, false, '4 in a row must not win');
  });
});

describe('Feature 20: Block-2-Ends Rule (Luật Chặn 2 Đầu)', () => {
  test('5 in a row blocked at BOTH ends is NOT a win in block2ends rule', () => {
    const size = 15;
    const board = Array(size).fill(null).map(() => Array(size).fill(null));
    board[7][2] = 'O'; // Blocked left
    for (let c = 3; c <= 7; c++) {
      board[7][c] = 'X';
    }
    board[7][8] = 'O'; // Blocked right

    const result = checkWin(board, 7, 5, 'X', size, 'block2ends');
    assertEqual(result.won, false, 'Blocked at both ends must NOT win in block2ends rule');
  });

  test('5 in a row blocked at ONE end IS a win in block2ends rule', () => {
    const size = 15;
    const board = Array(size).fill(null).map(() => Array(size).fill(null));
    board[7][2] = 'O'; // Blocked left
    for (let c = 3; c <= 7; c++) {
      board[7][c] = 'X';
    }
    // board[7][8] is null (Open right)

    const result = checkWin(board, 7, 5, 'X', size, 'block2ends');
    assertEqual(result.won, true, 'Blocked at only one end IS a win in block2ends rule');
  });

  test('5 in a row with BOTH ends open IS a win in block2ends rule', () => {
    const size = 15;
    const board = Array(size).fill(null).map(() => Array(size).fill(null));
    // board[7][2] is null
    for (let c = 3; c <= 7; c++) {
      board[7][c] = 'X';
    }
    // board[7][8] is null

    const result = checkWin(board, 7, 5, 'X', size, 'block2ends');
    assertEqual(result.won, true, 'Open ends IS a win in block2ends rule');
  });

  test('5 in a row blocked at board edge on one side and open on other wins', () => {
    const size = 15;
    const board = Array(size).fill(null).map(() => Array(size).fill(null));
    // Placed at boundary edge: columns 0, 1, 2, 3, 4 (left is wall)
    for (let c = 0; c <= 4; c++) {
      board[0][c] = 'X';
    }
    // col 5 is null (open)

    const result = checkWin(board, 0, 0, 'X', size, 'block2ends');
    assertEqual(result.won, true, 'Blocked by wall on one side but open on other side wins');
  });
});

describe('Feature 17: Board Full & Local Game State Utilities', () => {
  test('isBoardFull returns false for empty or partially filled board', () => {
    const size = 10;
    const board = Array(size).fill(null).map(() => Array(size).fill(null));
    assertEqual(isBoardFull(board, size), false, 'Empty board is not full');

    board[0][0] = 'X';
    assertEqual(isBoardFull(board, size), false, 'Partially filled board is not full');
  });

  test('isBoardFull returns true when all cells are occupied', () => {
    const size = 3;
    const board = [
      ['X', 'O', 'X'],
      ['O', 'X', 'O'],
      ['O', 'X', 'O']
    ];
    assertEqual(isBoardFull(board, size), true, 'Full board returns true');
  });

  test('generateRoomCode produces valid 6-character alphanumeric code', () => {
    const code = generateRoomCode();
    assertEqual(typeof code, 'string');
    assertEqual(code.length, 6, 'Room code must be 6 characters');
    assert(/^[A-HJ-NP-Z2-9]{6}$/.test(code), `Room code "${code}" must only use unambiguous characters`);
  });
});
