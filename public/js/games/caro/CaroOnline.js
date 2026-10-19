/**
 * Module quản lý kết nối Socket.io và giao tiếp mạng Online cho cờ Caro (CaroOnline)
 */
export class CaroOnline {
  constructor() {
    this.socket = null;
    this.roomId = null;
    this.mySymbol = null;
    this.handlers = {};
  }

  connect() {
    if (this.socket && this.socket.connected) return;

    // Khởi tạo thư viện socket.io toàn cục
    if (typeof window !== 'undefined' && typeof window.io === 'function') {
      this.socket = window.io();
    } else {
      return;
    }

    this.socket.on('connect', () => {
      console.log('Socket online connected:', this.socket.id);
    });

    this.socket.on('room_created', (data) => {
      this.roomId = data.roomId;
      this.mySymbol = data.yourSymbol;
      this.trigger('room_created', data);
    });

    this.socket.on('room_joined', (data) => {
      this.roomId = data.roomId;
      this.mySymbol = data.yourSymbol;
      this.trigger('room_joined', data);
    });

    this.socket.on('game_started', (data) => {
      if (this.socket) {
        if (data.roomState.playerXId === this.socket.id) this.mySymbol = 'X';
        else if (data.roomState.playerOId === this.socket.id) this.mySymbol = 'O';
      }
      this.trigger('game_started', data);
    });

    this.socket.on('spectator_joined', (data) => this.trigger('spectator_joined', data));
    this.socket.on('move_made', (data) => this.trigger('move_made', data));
    this.socket.on('player_surrendered', (data) => this.trigger('player_surrendered', data));
    this.socket.on('draw_offered', (data) => this.trigger('draw_offered', data));
    this.socket.on('draw_accepted', () => this.trigger('draw_accepted'));
    this.socket.on('draw_declined', () => this.trigger('draw_declined'));
    this.socket.on('game_over_timeout', (data) => this.trigger('game_over_timeout', data));
    this.socket.on('rematch_requested', () => this.trigger('rematch_requested'));
    this.socket.on('rematch_started', (data) => {
      if (this.socket) {
        if (data.roomState.playerXId === this.socket.id) this.mySymbol = 'X';
        else if (data.roomState.playerOId === this.socket.id) this.mySymbol = 'O';
      }
      this.trigger('rematch_started', data);
    });
    this.socket.on('player_left', (data) => this.trigger('player_left', data));
    this.socket.on('new_chat', (data) => this.trigger('new_chat', data));
    this.socket.on('error_message', (data) => this.trigger('error_message', data));
    this.socket.on('disconnect', () => this.trigger('disconnect'));
  }

  on(event, callback) {
    this.handlers[event] = callback;
  }

  trigger(event, data) {
    if (typeof this.handlers[event] === 'function') {
      this.handlers[event](data);
    }
  }

  createRoom({ playerName, boardSize, rule, turnTime }) {
    this.connect();
    if (this.socket) {
      this.socket.emit('create_room', { playerName, boardSize, rule, turnTime, gameType: 'caro' });
    }
  }

  joinRoom({ roomId, playerName }) {
    this.connect();
    if (this.socket) {
      this.socket.emit('join_room', { roomId, playerName });
    }
  }

  makeMove(row, col) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('make_move', { row, col });
    }
  }

  sendMove(row, col) {
    this.makeMove(row, col);
  }

  sendTimeout() {
    if (this.socket && this.socket.connected) {
      this.socket.emit('turn_timeout');
    }
  }

  surrender() {
    if (this.socket && this.socket.connected) {
      this.socket.emit('surrender');
    }
  }

  offerDraw() {
    if (this.socket && this.socket.connected) {
      this.socket.emit('offer_draw');
    }
  }

  respondDraw(accept) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('respond_draw', { accept });
    }
  }

  requestRematch() {
    if (this.socket && this.socket.connected) {
      this.socket.emit('request_rematch');
    }
  }

  sendChat({ text, emoji }) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('send_chat', { text, emoji });
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.roomId = null;
    this.mySymbol = null;
  }

  getSocketId() {
    return this.socket ? this.socket.id : null;
  }
}

export const caroOnline = new CaroOnline();
