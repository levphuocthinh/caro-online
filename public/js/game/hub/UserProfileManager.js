/**
 * UserProfileManager: Quản lý hồ sơ người chơi (Tên, Avatar, Level, Trạng thái)
 * 
 * 🔌 SẴN SÀNG KẾT NỐI BACKEND:
 * - Hiện tại lưu trữ và đồng bộ cục bộ qua localStorage ('caro_user_profile').
 * - Tự động đồng bộ với các ô nhập tên khi Tạo phòng & Vào phòng chơi Online.
 * - Khi triển khai Backend (Node.js/Auth/REST API/GraphQL), chỉ cần sử dụng các hook
 *   fetchRemoteProfile() và syncRemoteProfile() đã chuẩn bị sẵn bên dưới.
 */

import { CaroModal } from '../../modules/modal.js';
import { soundManager } from '../../modules/audio.js';
import { i18n } from '../../modules/i18n.js';

export class UserProfileManager {
  static STORAGE_KEY = 'caro_user_profile';

  static DEFAULT_PROFILE = {
    id: 'USR_8892',
    name: 'Bé Miu Miu',
    avatar: '🐱',
    level: 1,
    status: 'online',
    tag: '#8892',
    exp: 120,
    coins: 1000
  };

  /**
   * Lấy thông tin hồ sơ hiện tại từ localStorage hoặc trả về mặc định
   */
  static getProfile() {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        return { ...this.DEFAULT_PROFILE, ...JSON.parse(saved) };
      }
    } catch (_) {}
    return { ...this.DEFAULT_PROFILE };
  }

  /**
   * Lưu hồ sơ người chơi vào localStorage và cập nhật toàn bộ giao diện
   */
  static saveProfile(profile) {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(profile));
    } catch (_) {}
    this.renderDom(profile);
    this.syncRoomInputs(profile.name);
  }

  /**
   * Cập nhật một phần thuộc tính của hồ sơ
   */
  static updateProfile(partial) {
    const current = this.getProfile();
    const updated = { ...current, ...partial };
    this.saveProfile(updated);
    return updated;
  }

  /**
   * Cập nhật các phần tử DOM trên Sidebar Header
   */
  static renderDom(profile = this.getProfile()) {
    const nameEl = document.getElementById('sidebar-user-name');
    if (nameEl && profile.name) nameEl.textContent = profile.name;

    const avatarEl = document.getElementById('sidebar-user-avatar');
    if (avatarEl && profile.avatar) avatarEl.textContent = profile.avatar;

    const tagEl = document.getElementById('sidebar-user-tag');
    if (tagEl && profile.tag) tagEl.textContent = profile.tag;

    const levelEl = document.getElementById('sidebar-user-level');
    if (levelEl && profile.level) levelEl.textContent = `Lv. ${profile.level}`;
  }

  /**
   * Đồng bộ tên người chơi vào các form Tạo phòng & Vào phòng của Caro Online
   */
  static syncRoomInputs(name) {
    if (!name) return;
    const createName = document.getElementById('create-player-name');
    if (createName) createName.value = name;
    const joinName = document.getElementById('join-player-name');
    if (joinName) joinName.value = name;
  }

  /**
   * Khởi tạo các sự kiện chỉnh sửa hồ sơ người chơi
   */
  static init() {
    const current = this.getProfile();
    this.renderDom(current);
    this.syncRoomInputs(current.name);

    let selectedAvatar = current.avatar || '🐱';

    // Mở modal chỉnh sửa hồ sơ
    const openEditModal = () => {
      try { soundManager.playCutePop(); } catch (_) {}
      const profile = this.getProfile();
      selectedAvatar = profile.avatar || '🐱';

      const inputName = document.getElementById('input-edit-player-name');
      if (inputName) inputName.value = profile.name || '';

      document.querySelectorAll('#avatar-picker-grid .avatar-pick-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.avatar === selectedAvatar);
      });

      CaroModal.open('modal-edit-profile');
    };

    document.getElementById('btn-edit-user-profile')?.addEventListener('click', openEditModal);
    document.getElementById('btn-edit-avatar-trigger')?.addEventListener('click', openEditModal);

    // Chọn avatar trong modal
    document.querySelectorAll('#avatar-picker-grid .avatar-pick-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        try { soundManager.playCutePop(); } catch (_) {}
        selectedAvatar = btn.dataset.avatar;
        document.querySelectorAll('#avatar-picker-grid .avatar-pick-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    // Nút Lưu thay đổi hồ sơ
    document.getElementById('btn-save-profile')?.addEventListener('click', () => {
      const inputName = document.getElementById('input-edit-player-name');
      const newName = (inputName?.value || '').trim();

      if (!newName) {
        CaroModal.showToast(i18n.getText('toast_enter_name'));
        return;
      }

      this.updateProfile({
        name: newName,
        avatar: selectedAvatar
      });

      try { soundManager.playCuteChime(); } catch (_) {}
      CaroModal.close('modal-edit-profile');
      CaroModal.showToast(i18n.getText('profile_updated_toast') || 'Đã cập nhật hồ sơ người chơi thành công!');
    });
  }

  /**
   * 🔌 HOOK DÀNH CHO BACKEND KHI TRIỂN KHAI TRONG TƯƠNG LAI:
   * Sau này khi backend có API authentication & profile, chỉ cần mở khóa các hàm dưới:
   * 
   * static async fetchRemoteProfile(authToken) {
   *   const res = await fetch('/api/user/profile', {
   *     headers: { Authorization: `Bearer ${authToken}` }
   *   });
   *   if (!res.ok) throw new Error('Không thể tải hồ sơ từ server');
   *   const data = await res.json();
   *   this.saveProfile(data);
   *   return data;
   * }
   * 
   * static async syncRemoteProfile(profileData, authToken) {
   *   const res = await fetch('/api/user/profile', {
   *     method: 'PUT',
   *     headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
   *     body: JSON.stringify(profileData)
   *   });
   *   return res.json();
   * }
   */
}
