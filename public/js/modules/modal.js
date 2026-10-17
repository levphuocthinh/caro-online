/**
 * Module quản lý các cửa sổ bật lên (Modals) và thông báo Toast
 */
export const CaroModal = {
  _escapeBound: false,

  open(modalId) {
    const el = typeof modalId === 'string' && typeof document !== 'undefined' && document.getElementById ? document.getElementById(modalId) : modalId;
    if (el && el.classList && typeof el.classList.add === 'function') {
      el.classList.add('active');
    }
  },

  close(modalId) {
    const el = typeof modalId === 'string' && typeof document !== 'undefined' && document.getElementById ? document.getElementById(modalId) : modalId;
    if (el && el.classList && typeof el.classList.remove === 'function') {
      el.classList.remove('active');
    }
  },

  closeAll() {
    if (typeof document === 'undefined') return;
    const activeModals = document.querySelectorAll ? document.querySelectorAll('.modal-overlay.active') : [];
    activeModals.forEach(m => this.close(m));
  },

  show(modalId) {
    this.open(modalId);
  },

  hide(modalId) {
    this.close(modalId);
  },

  closeActiveModal() {
    if (typeof document === 'undefined') return false;
    const activeModals = document.querySelectorAll ? document.querySelectorAll('.modal-overlay.active') : [];
    if (activeModals && activeModals.length > 0) {
      const topModal = activeModals[activeModals.length - 1];
      this.close(topModal);
      return true;
    }
    const chatSidebar = document.getElementById ? document.getElementById('chat-sidebar') : null;
    if (chatSidebar && chatSidebar.classList && typeof chatSidebar.classList.contains === 'function' && chatSidebar.classList.contains('open')) {
      chatSidebar.classList.remove('open');
      return true;
    }
    return false;
  },

  showToast(message, duration = 3000) {
    if (typeof document === 'undefined') return;

    let container = document.querySelector ? document.querySelector('.toast-container') : null;
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      if (document.body && typeof document.body.appendChild === 'function') {
        document.body.appendChild(container);
      }
    }

    const toast = document.createElement('div');
    toast.className = 'caro-toast toast';
    toast.textContent = String(message != null ? message : '');

    if (container && typeof container.appendChild === 'function') {
      container.appendChild(toast);
    }

    const addShowClass = () => {
      if (toast.classList && typeof toast.classList.add === 'function') {
        toast.classList.add('show');
      } else if (typeof toast.className === 'string') {
        toast.className = (toast.className + ' show').trim();
      }
    };

    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(addShowClass);
    } else {
      setTimeout(addShowClass, 10);
    }

    const displayTime = typeof duration === 'number' && duration > 0 ? duration : 3000;
    setTimeout(() => {
      if (toast.classList && typeof toast.classList.remove === 'function') {
        toast.classList.remove('show');
      } else if (typeof toast.className === 'string') {
        toast.className = toast.className.replace(/\bshow\b/g, '').trim();
      }

      if (toast.style) {
        toast.style.opacity = '0';
        toast.style.pointerEvents = 'none';
        toast.style.transition = 'opacity 0.35s ease, transform 0.35s ease';
      }

      setTimeout(() => {
        if (toast && typeof toast.remove === 'function') {
          toast.remove();
        }
      }, 350);
    }, displayTime);
  },

  initCloseButtons() {
    if (typeof document === 'undefined') return;

    // 1. Data-close attribute trigger
    const closeBtns = (document.querySelectorAll && document.querySelectorAll('[data-close]')) || [];
    closeBtns.forEach(btn => {
      if (typeof btn.addEventListener === 'function') {
        btn.addEventListener('click', () => {
          const id = typeof btn.getAttribute === 'function' ? btn.getAttribute('data-close') : null;
          if (id) this.close(id);
        });
      }
    });

    // 2. Backdrop click dismiss for modal overlays
    const overlays = (document.querySelectorAll && document.querySelectorAll('.modal-overlay')) || [];
    overlays.forEach(overlay => {
      if (typeof overlay.addEventListener === 'function') {
        overlay.addEventListener('click', (e) => {
          if (e.target === overlay) {
            this.close(overlay);
          }
        });
      }
    });

    // 3. Escape key dismiss
    if (!this._escapeBound && typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' || e.key === 'Esc' || e.keyCode === 27) {
          this.closeActiveModal();
        }
      });
      this._escapeBound = true;
    }
  }
};
