/**
 * Module quản lý bàn cờ Caro, hiển thị quân cờ X/O và kiểm tra chiến thắng tại máy (CaroBoard)
 */
import { soundManager } from '../../modules/audio.js';

export class CaroBoard {
  constructor() {
    this.gridEl = document.getElementById('caro-grid');
    this.size = 15;
    this.data = [];
    this.onCellClick = null;
  }

  // Khởi tạo bàn cờ kích thước N x N
  init(size, onCellClick) {
    this.size = size;
    this.onCellClick = onCellClick;
    this.data = Array(size).fill(null).map(() => Array(size).fill(null));

    if (!this.gridEl) return;

    this.gridEl.innerHTML = '';
    this.gridEl.style.gridTemplateColumns = `repeat(${size}, minmax(0, 1fr))`;
    this.gridEl.style.gridTemplateRows = `repeat(${size}, minmax(0, 1fr))`;

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const cell = document.createElement('div');
        cell.className = 'caro-cell';
        cell.dataset.row = r;
        cell.dataset.col = c;
        cell.addEventListener('click', () => {
          if (typeof this.onCellClick === 'function') {
            this.onCellClick(r, c);
          }
        });
        this.gridEl.appendChild(cell);
      }
    }
  }

  getCellElement(r, c) {
    return this.gridEl ? this.gridEl.querySelector(`.caro-cell[data-row="${r}"][data-col="${c}"]`) : null;
  }

  // Đặt quân cờ lên bàn cờ
  placePiece(r, c, symbol, isLast = true, playSound = true) {
    this.data[r][c] = symbol;
    const cell = this.getCellElement(r, c);
    if (!cell) return;

    cell.textContent = symbol === 'X' ? '✕' : '○';
    cell.classList.add('occupied', symbol === 'X' ? 'cell-x' : 'cell-o');

    document.querySelectorAll('.caro-cell.last-move').forEach(el => el.classList.remove('last-move'));
    if (isLast) {
      cell.classList.add('last-move');
    }

    if (playSound) {
      soundManager.playMoveSound();
    }
  }

  // Kiểm tra bàn cờ đã đầy chưa (Hòa)
  isFull() {
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        if (this.data[r][c] === null) return false;
      }
    }
    return true;
  }

  // Highlight các ô thắng cuộc
  highlightWinningCells(winningLine) {
    if (!winningLine || !Array.isArray(winningLine)) return;
    winningLine.forEach(([r, c]) => {
      const cell = this.getCellElement(r, c);
      if (cell) {
        cell.classList.add('win-cell');
      }
    });
  }

  // Kiểm tra thắng cuộc cục bộ (Offline & AI)
  checkLocalWin(r, c, player, rule = 'standard') {
    const directions = [
      [0, 1],   // Ngang
      [1, 0],   // Dọc
      [1, 1],   // Chéo chính \
      [1, -1]   // Chéo phụ /
    ];

    for (const [dr, dc] of directions) {
      let count = 1;
      const line = [[r, c]];

      // Tiến theo hướng
      let step = 1;
      let end1Blocked = false;
      while (true) {
        const nr = r + dr * step;
        const nc = c + dc * step;
        if (nr < 0 || nr >= this.size || nc < 0 || nc >= this.size) {
          end1Blocked = true;
          break;
        }
        if (this.data[nr][nc] === player) {
          count++;
          line.push([nr, nc]);
          step++;
        } else {
          if (this.data[nr][nc] !== null) {
            end1Blocked = true;
          }
          break;
        }
      }

      // Lùi theo hướng ngược lại
      step = 1;
      let end2Blocked = false;
      while (true) {
        const nr = r - dr * step;
        const nc = c - dc * step;
        if (nr < 0 || nr >= this.size || nc < 0 || nc >= this.size) {
          end2Blocked = true;
          break;
        }
        if (this.data[nr][nc] === player) {
          count++;
          line.push([nr, nc]);
          step++;
        } else {
          if (this.data[nr][nc] !== null) {
            end2Blocked = true;
          }
          break;
        }
      }

      // Đánh giá điều kiện thắng
      if (rule === 'block2ends') {
        if (count >= 5 && (!end1Blocked || !end2Blocked)) {
          return { won: true, line };
        }
      } else {
        if (count >= 5) {
          return { won: true, line };
        }
      }
    }

    return { won: false, line: [] };
  }
}

export const caroBoard = new CaroBoard();
