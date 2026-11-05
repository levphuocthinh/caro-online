/**
 * Module quản lý đồng hồ đếm ngược từng lượt đi
 */
export class CaroTimer {
  constructor() {
    this.interval = null;
    this.remaining = 0;
    this.timerXEl = null;
    this.timerOEl = null;
  }

  _getElements() {
    if (!this.timerXEl && typeof document !== 'undefined') {
      this.timerXEl = document.getElementById('timer-player-x');
    }
    if (!this.timerOEl && typeof document !== 'undefined') {
      this.timerOEl = document.getElementById('timer-player-o');
    }
  }

  start(turnTime, currentTurn, onTimeout) {
    this.stop();
    this._getElements();

    if (!turnTime || turnTime <= 0) {
      if (this.timerXEl) this.timerXEl.textContent = '∞';
      if (this.timerOEl) this.timerOEl.textContent = '∞';
      return;
    }

    if (currentTurn !== 'X' && currentTurn !== 'O') {
      this.reset();
      return;
    }

    this.remaining = turnTime;
    this.updateDisplay(currentTurn);

    this.interval = setInterval(() => {
      this.remaining--;
      this.updateDisplay(currentTurn);

      if (this.remaining <= 0) {
        this.stop();
        if (typeof onTimeout === 'function') {
          onTimeout();
        }
      }
    }, 1000);
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  reset() {
    this.stop();
    this.remaining = 0;
    this._getElements();
    if (this.timerXEl) {
      this.timerXEl.textContent = '--';
      this.timerXEl.classList.remove('warning');
    }
    if (this.timerOEl) {
      this.timerOEl.textContent = '--';
      this.timerOEl.classList.remove('warning');
    }
  }

  updateDisplay(currentTurn) {
    this._getElements();
    const isX = currentTurn === 'X';
    const isO = currentTurn === 'O';
    const activeEl = isX ? this.timerXEl : (isO ? this.timerOEl : null);

    if (this.timerXEl && !isX) {
      this.timerXEl.textContent = '--';
      this.timerXEl.classList.remove('warning');
    }
    if (this.timerOEl && !isO) {
      this.timerOEl.textContent = '--';
      this.timerOEl.classList.remove('warning');
    }

    if (activeEl) {
      activeEl.textContent = `${this.remaining}s`;
      if (this.remaining <= 5) {
        activeEl.classList.add('warning');
      } else {
        activeEl.classList.remove('warning');
      }
    }
  }
}

export const caroTimer = new CaroTimer();
