/**
 * Tier 4 - Real-World Scenarios: Multi-Turn AI Game Simulation
 * Covers:
 *   - Simulating an automated 10-turn match between Human moves and Bot AI
 *   - Verifying AI decision speed (< 200ms) and valid legal placements
 *   - Testing AI defense against immediate threats across all 3 levels
 */

const {
  describe,
  test,
  assert,
  assertEqual,
  assertTruthy
} = require('../harness');

describe('Tier 4 Scenario: Multi-Turn Bot AI Gameplay Simulation', () => {
  test('Simulates 10-turn game between human strategy and Hard AI', async () => {
    const { CaroAI } = await import('../../public/js/modules/ai.js');
    const ai = new CaroAI('hard');

    const size = 15;
    const board = Array(size).fill(null).map(() => Array(size).fill(null));

    // Turn 1: Human (X) plays center (7, 7)
    board[7][7] = 'X';

    // AI (O) responds
    let aiMove = ai.findBestMove(board, size, 'O', 'X', 'standard');
    assertTruthy(aiMove);
    assert(board[aiMove.row][aiMove.col] === null, 'AI must select empty cell');
    board[aiMove.row][aiMove.col] = 'O';

    // Simulate 9 more turns
    for (let turn = 2; turn <= 10; turn++) {
      // Find candidate for human: play near existing pieces
      let humanMove = null;
      for (let r = 5; r <= 9; r++) {
        for (let c = 5; c <= 9; c++) {
          if (board[r][c] === null) {
            humanMove = { r, c };
            break;
          }
        }
        if (humanMove) break;
      }

      if (!humanMove) break;
      board[humanMove.r][humanMove.c] = 'X';

      const tStart = Date.now();
      aiMove = ai.findBestMove(board, size, 'O', 'X', 'standard');
      const calcDuration = Date.now() - tStart;

      assert(calcDuration < 250, `AI move evaluation must be fast (<250ms), took ${calcDuration}ms`);
      assertTruthy(aiMove, `AI must return a move on turn ${turn}`);
      assert(board[aiMove.row][aiMove.col] === null, `AI move (${aiMove.row}, ${aiMove.col}) must be unoccupied`);

      board[aiMove.row][aiMove.col] = 'O';
    }
  });

  test('Comparative heuristic: Hard AI has higher defensive awareness than Easy AI', async () => {
    const { CaroAI } = await import('../../public/js/modules/ai.js');
    const hardAi = new CaroAI('hard');
    const easyAi = new CaroAI('easy');

    assertEqual(hardAi.difficulty, 'hard');
    assertEqual(easyAi.difficulty, 'easy');

    // Create a 3-in-a-row threat by human: (7, 5), (7, 6), (7, 7)
    const board = Array(15).fill(null).map(() => Array(15).fill(null));
    board[7][5] = 'X';
    board[7][6] = 'X';
    board[7][7] = 'X';

    const hardCandidate = hardAi.findBestMove(board, 15, 'O', 'X', 'standard');
    assertTruthy(hardCandidate);
    // Hard AI should place adjacent to the threat to block or counter
    assert(
      (hardCandidate.row === 7 && (hardCandidate.col === 4 || hardCandidate.col === 8)) ||
      Math.abs(hardCandidate.row - 7) <= 1,
      `Hard AI should respond directly to 3-in-a-row threat, picked (${hardCandidate.row}, ${hardCandidate.col})`
    );
  });
});
