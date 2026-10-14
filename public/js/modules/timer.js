/**
 * Module quản lý đồng hồ đếm ngược từng lượt đi
 */
export class CaroTimer {
  constructor() {
    this.interval = null;
    this.remaining = 0;
    this.timerXEl = document.getElementById('timer-player-x');
    this.timerOEl = document.getElementById('timer-player-o');
  }

  start(turnTime, currentTurn, onTimeout) {
    this.stop();

    if (!turnTime || turnTime <= 0) {
      if (this.timerXEl) this.timerXEl.textContent = '∞';
      if (this.timerOEl) this.timerOEl.textContent = '∞';
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

  updateDisplay(currentTurn) {
    const activeEl = currentTurn === 'X' ? this.timerXEl : this.timerOEl;
    const inactiveEl = currentTurn === 'X' ? this.timerOEl : this.timerXEl;

    if (activeEl) {
      activeEl.textContent = `${this.remaining}s`;
      if (this.remaining <= 5) {
        activeEl.classList.add('warning');
      } else {
        activeEl.classList.remove('warning');
      }
    }

    if (inactiveEl) {
      inactiveEl.textContent = '--';
      inactiveEl.classList.remove('warning');
    }
  }
}

export const caroTimer = new CaroTimer();
