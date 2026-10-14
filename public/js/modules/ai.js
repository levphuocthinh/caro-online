/**
 * Thuật toán AI chơi Cờ Caro thông minh (Heuristic Pattern Evaluation)
 */
export class CaroAI {
  constructor(difficulty = 'hard') {
    this.difficulty = difficulty; // 'easy', 'medium', 'hard'
  }

  setDifficulty(diff) {
    this.difficulty = diff;
  }

  // Tìm nước đi tốt nhất cho AI
  findBestMove(board, boardSize, aiSymbol, humanSymbol, rule = 'standard') {
    let isEmpty = true;
    let piecesCount = 0;
    for (let r = 0; r < boardSize; r++) {
      for (let c = 0; c < boardSize; c++) {
        if (board[r][c] !== null) {
          isEmpty = false;
          piecesCount++;
        }
      }
    }

    const center = Math.floor(boardSize / 2);
    if (isEmpty) {
      return { row: center, col: center };
    }

    if (piecesCount === 1) {
      if (board[center][center] === null) {
        return { row: center, col: center };
      } else {
        const offsets = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
        const [dr, dc] = offsets[Math.floor(Math.random() * offsets.length)];
        return { row: center + dr, col: center + dc };
      }
    }

    const candidateCells = this.getCandidates(board, boardSize);
    if (candidateCells.length === 0) {
      return { row: center, col: center };
    }

    let bestScore = -Infinity;
    let bestMoves = [];

    let attackWeight = 1.0;
    let defenseWeight = 1.1;

    if (this.difficulty === 'easy') {
      attackWeight = 0.7;
      defenseWeight = 0.5;
    } else if (this.difficulty === 'medium') {
      attackWeight = 1.0;
      defenseWeight = 0.9;
    } else {
      attackWeight = 1.0;
      defenseWeight = 1.15;
    }

    for (const { r, c } of candidateCells) {
      const attackScore = this.evaluateCell(board, r, c, aiSymbol, humanSymbol, boardSize, rule);
      const defenseScore = this.evaluateCell(board, r, c, humanSymbol, aiSymbol, boardSize, rule);

      let totalScore = (attackScore * attackWeight) + (defenseScore * defenseWeight);

      const distFromCenter = Math.abs(r - center) + Math.abs(c - center);
      totalScore -= distFromCenter * 2;

      if (this.difficulty === 'easy') {
        totalScore += (Math.random() * 500) - 250;
      } else if (this.difficulty === 'medium') {
        totalScore += (Math.random() * 80) - 40;
      }

      if (totalScore > bestScore) {
        bestScore = totalScore;
        bestMoves = [{ row: r, col: c }];
      } else if (Math.abs(totalScore - bestScore) < 5) {
        bestMoves.push({ row: r, col: c });
      }
    }

    return bestMoves[Math.floor(Math.random() * bestMoves.length)];
  }

  getCandidates(board, boardSize) {
    const candidateSet = new Set();
    const range = 2;

    for (let r = 0; r < boardSize; r++) {
      for (let c = 0; c < boardSize; c++) {
        if (board[r][c] !== null) {
          for (let dr = -range; dr <= range; dr++) {
            for (let dc = -range; dc <= range; dc++) {
              const nr = r + dr;
              const nc = c + dc;
              if (nr >= 0 && nr < boardSize && nc >= 0 && nc < boardSize) {
                if (board[nr][nc] === null) {
                  candidateSet.add(`${nr},${nc}`);
                }
              }
            }
          }
        }
      }
    }

    const candidates = [];
    for (const key of candidateSet) {
      const [r, c] = key.split(',').map(Number);
      candidates.push({ r, c });
    }
    return candidates;
  }

  evaluateCell(board, r, c, player, opponent, boardSize, rule) {
    const directions = [
      [0, 1],   // Ngang
      [1, 0],   // Dọc
      [1, 1],   // Chéo chính
      [1, -1]   // Chéo phụ
    ];

    let totalScore = 0;
    let openThrees = 0;
    let openFours = 0;

    for (const [dr, dc] of directions) {
      let count = 1;
      let openEnds = 0;

      let step = 1;
      let blocked1 = false;
      while (step <= 4) {
        const nr = r + dr * step;
        const nc = c + dc * step;
        if (nr < 0 || nr >= boardSize || nc < 0 || nc >= boardSize) {
          blocked1 = true;
          break;
        }
        if (board[nr][nc] === player) {
          count++;
          step++;
        } else if (board[nr][nc] === null) {
          openEnds++;
          break;
        } else {
          blocked1 = true;
          break;
        }
      }

      step = 1;
      let blocked2 = false;
      while (step <= 4) {
        const nr = r - dr * step;
        const nc = c - dc * step;
        if (nr < 0 || nr >= boardSize || nc < 0 || nc >= boardSize) {
          blocked2 = true;
          break;
        }
        if (board[nr][nc] === player) {
          count++;
          step++;
        } else if (board[nr][nc] === null) {
          openEnds++;
          break;
        } else {
          blocked2 = true;
          break;
        }
      }

      const score = this.scorePattern(count, openEnds, blocked1, blocked2, rule);
      totalScore += score;

      if (count === 3 && openEnds === 2) openThrees++;
      if (count === 4 && openEnds === 2) openFours++;
    }

    if (openFours >= 2 || (openFours >= 1 && openThrees >= 1)) {
      totalScore += 2000000;
    } else if (openThrees >= 2) {
      totalScore += 800000;
    }

    return totalScore;
  }

  scorePattern(count, openEnds, blocked1, blocked2, rule) {
    if (rule === 'block2ends') {
      if (blocked1 && blocked2 && count < 5) return 0;
      if (count >= 5) {
        return (blocked1 && blocked2) ? 0 : 10000000;
      }
    } else {
      if (count >= 5) return 10000000;
    }

    if (count === 4) {
      if (openEnds === 2) return 1500000;
      if (openEnds === 1) return 150000;
    } else if (count === 3) {
      if (openEnds === 2) return 50000;
      if (openEnds === 1) return 3000;
    } else if (count === 2) {
      if (openEnds === 2) return 2000;
      if (openEnds === 1) return 300;
    } else if (count === 1) {
      if (openEnds === 2) return 50;
      if (openEnds === 1) return 10;
    }

    return 0;
  }
}
