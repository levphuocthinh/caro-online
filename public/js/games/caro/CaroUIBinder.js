/**
 * Gắn kết các sự kiện giao diện dành riêng cho trò chơi cờ Caro (CaroUIBinder)
 * Bao gồm các modal tạo phòng, nhập mã phòng, đấu AI, bàn cờ, đầu hàng, cầu hòa, tái đấu.
 */
import { CaroModal } from '../../modules/modal.js';
import { caroOnline } from '../../modules/online.js';

export class CaroUIBinder {
  /**
   * Cập nhật trạng thái hiển thị của các nút chức năng khi là Khán giả (Spectator)
   */
  static updateSpectatorUI(isSpectator) {
    const displayVal = isSpectator ? 'none' : '';
    const ctrlSurrender = document.getElementById('btn-surrender');
    const ctrlDraw = document.getElementById('btn-offer-draw');
    const mSurrender = document.getElementById('btn-mobile-surrender');
    const mDraw = document.getElementById('btn-mobile-draw');
    const rematchBtn = document.getElementById('btn-game-over-rematch');
    const specBadge = document.getElementById('spectator-badge');

    if (ctrlSurrender) ctrlSurrender.style.display = displayVal;
    if (ctrlDraw) ctrlDraw.style.display = displayVal;
    if (mSurrender) mSurrender.style.display = displayVal;
    if (mDraw) mDraw.style.display = displayVal;
    if (rematchBtn) rematchBtn.style.display = displayVal;
    if (specBadge) specBadge.style.display = isSpectator ? 'inline-flex' : 'none';
  }

  /**
   * Gắn toàn bộ sự kiện các nút bấm, modal, form input của Caro
   * @param {Object} caroModule Thể hiện của CaroModule hoặc GameManager
   */
  static bind(caroModule) {
    // 1. Các nút chọn chế độ ở Sảnh chờ Caro
    document.getElementById('btn-open-create-room')?.addEventListener('click', () => CaroModal.open('modal-create-room'));
    document.getElementById('btn-open-join-room')?.addEventListener('click', () => CaroModal.open('modal-join-room'));
    document.getElementById('btn-open-ai-setup')?.addEventListener('click', () => CaroModal.open('modal-ai-setup'));
    document.getElementById('btn-start-local')?.addEventListener('click', () => caroModule.localGame.start());

    // 2. Nút xác nhận chơi với AI
    document.getElementById('btn-confirm-ai-start')?.addEventListener('click', () => {
      const difficulty = document.getElementById('ai-difficulty')?.value || 'hard';
      const playerSymbol = document.getElementById('ai-player-symbol')?.value || 'X';
      const size = Number(document.getElementById('ai-board-size')?.value || 15);
      CaroModal.close('modal-ai-setup');
      caroModule.aiGame.start(difficulty, playerSymbol, size);
    });

    // 3. Nút xác nhận Tạo phòng Online
    document.getElementById('btn-confirm-create-room')?.addEventListener('click', () => {
      const playerName = document.getElementById('create-player-name')?.value.trim() || 'Người chơi 1';
      const size = Number(document.getElementById('create-board-size')?.value || 15);
      const selectedRule = document.getElementById('create-rule')?.value || 'standard';
      const timeLimit = Number(document.getElementById('create-turn-time')?.value || 30);

      CaroModal.close('modal-create-room');
      caroOnline.createRoom({ playerName, boardSize: size, rule: selectedRule, turnTime: timeLimit });
    });

    // 4. Nút xác nhận Vào phòng Online
    const joinNameInput = document.getElementById('join-player-name');
    const joinCodeInput = document.getElementById('join-room-code');

    const confirmJoin = () => {
      if (document.activeElement) document.activeElement.blur();
      const playerName = joinNameInput?.value.trim() || 'Người chơi 2';
      const code = joinCodeInput?.value.trim().toUpperCase() || '';

      if (!code) {
        CaroModal.showToast('Vui lòng nhập mã phòng!');
        return;
      }

      CaroModal.close('modal-join-room');
      caroOnline.joinRoom({ roomId: code, playerName });
    };

    document.getElementById('btn-confirm-join-room')?.addEventListener('click', confirmJoin);
    [joinNameInput, joinCodeInput].forEach(inp => {
      inp?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') confirmJoin();
      });
    });

    // 5. Nút Sao chép Link mời bạn
    const copyLink = () => {
      if (!caroOnline.roomId) {
        CaroModal.showToast('Chỉ có thể chia sẻ khi chơi Online!');
        return;
      }
      const shareUrl = `${window.location.origin}/?room=${caroOnline.roomId}`;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(shareUrl).then(() => {
          CaroModal.showToast('Đã copy link mời bạn! Hãy gửi qua Zalo/Messenger.');
        }).catch(() => prompt('Sao chép link này:', shareUrl));
      } else {
        prompt('Sao chép link này:', shareUrl);
      }
    };
    document.getElementById('btn-share-room')?.addEventListener('click', copyLink);
    document.getElementById('btn-mobile-share')?.addEventListener('click', copyLink);

    const isSpectator = () => caroModule?.state?.gameMode === 'online' && caroModule?.state?.mySymbol === 'SPECTATOR';

    // 6. Nút Đầu hàng
    const surrender = () => {
      if (isSpectator()) return;
      caroModule.handleSurrender();
    };
    document.getElementById('btn-surrender')?.addEventListener('click', surrender);
    document.getElementById('btn-mobile-surrender')?.addEventListener('click', surrender);

    // 7. Nút Cầu hòa
    const offerDraw = () => {
      if (isSpectator()) return;
      caroModule.handleOfferDraw();
    };
    document.getElementById('btn-offer-draw')?.addEventListener('click', offerDraw);
    document.getElementById('btn-mobile-draw')?.addEventListener('click', offerDraw);

    // 8. Nút Rời trận
    const leaveGame = () => caroModule.confirmLeaveGame();
    document.getElementById('btn-leave-game')?.addEventListener('click', leaveGame);
    document.getElementById('btn-mobile-leave')?.addEventListener('click', leaveGame);

    // 9. Nút Modal Game Over
    document.getElementById('btn-game-over-lobby')?.addEventListener('click', () => {
      CaroModal.close('modal-game-over');
      caroModule.backToLobby();
    });

    document.getElementById('btn-game-over-rematch')?.addEventListener('click', () => {
      if (isSpectator()) return;
      CaroModal.close('modal-game-over');
      caroModule.handleRematch();
    });
  }
}
