/**
 * Danh mục thông tin 8 game trên Cổng Game Console (Games Catalog Model)
 * Chứa metadata, màu sắc theme, huy chương, tính năng và bài viết tin tức cho từng tựa game
 */

export const allGameIds = [
  'caro',
  'deception',
  'catan',
  'carcassonne',
  'avalon',
  'chess',
  'xiangqi',
  'ludo'
];

export function getGamesCatalog(i18n) {
  return {
    caro: {
      title: i18n.getText('hub_caro_title'),
      coverTitle: 'Caro Online',
      category: 'classic',
      stripText: 'CỜ CHIẾN THUẬT',
      studio: i18n.getText('hub_caro_studio'),
      artClass: 'art-caro',
      hasCoverImage: true,
      iconHtml: '<i class="fa-solid fa-paw" id="hub-tower-icon"></i>',
      towerColor: '#e60012',
      towerDark: '#b3000e',
      playable: true,
      badge: i18n.getText('tag_now_playing'),
      pillAva: '🐱',
      pillLabel: i18n.getText('pill_playing'),
      ctaText: i18n.getText('hub_caro_cta'),
      medals: ['18', '12', '3'],
      social: i18n.getText('hub_caro_social'),
      news: [
        { art: 'news-art-online', icon: 'fa-users', text: i18n.getText('news_cap_1'), action: 'online' },
        { art: 'news-art-ai', icon: 'fa-robot', text: i18n.getText('news_cap_2'), action: 'ai' },
        { art: 'news-art-local', icon: 'fa-people-arrows', text: i18n.getText('news_cap_3'), action: 'local' }
      ]
    },
    deception: {
      title: 'Deception: Murder in Viet Nam',
      coverTitle: 'Deception',
      category: 'boardgame',
      stripText: 'ẨN VAI TRÒ • 4-12P',
      studio: 'Lycngames • Social Deduction',
      artClass: 'art-deception',
      hasCoverImage: true,
      iconHtml: '<i class="fa-solid fa-magnifying-glass" id="hub-tower-icon"></i>',
      towerColor: '#8b0000',
      towerDark: '#2d0a0a',
      playable: true,
      badge: i18n.getText('tag_now_playing') || 'PLAY NOW',
      pillAva: '🔍',
      pillLabel: i18n.getText('pill_playing') || 'Playing',
      ctaText: i18n.getText('hub_caro_cta') || 'VÀO ĐIỀU TRA',
      medals: ['24', '15', '5'],
      social: '+14 thám tử đang tham gia điều tra vụ án.',
      news: [
        { art: 'art-deception', icon: 'fa-magnifying-glass', text: 'Vụ án bí ẩn tại phố cổ: Khám phá manh mối và hung khí của hung thủ!' },
        { art: 'art-avalon', icon: 'fa-user-secret', text: 'Giám định viên pháp y: Dẫn đường cho công lý bằng 6 thẻ hiện trường.' },
        { art: 'art-chess', icon: 'fa-shield-halved', text: 'Cẩn thận với Đồng phạm: Kẻ đánh lạc hướng nguy hiểm nhất bàn chơi.' }
      ]
    },
    splendor: {
      title: i18n.getText('hub_splendor_title'),
      coverTitle: 'Splendor',
      category: 'boardgame',
      stripText: 'BOARD GAME • 2-4P',
      studio: i18n.getText('hub_splendor_studio'),
      artClass: 'art-splendor',
      iconHtml: '<i class="fa-solid fa-gem" id="hub-tower-icon"></i>',
      towerColor: '#6c5ce7',
      towerDark: '#4834d4',
      playable: false,
      badge: i18n.getText('coming_badge'),
      pillAva: '💎',
      pillLabel: i18n.getText('coming_badge'),
      ctaText: i18n.getText('coming_badge'),
      medals: ['24', '15', '5'],
      social: i18n.getText('hub_splendor_social'),
      news: [
        { art: 'art-splendor', icon: 'fa-gem', text: i18n.getText('news_splendor_1') },
        { art: 'art-avalon', icon: 'fa-crown', text: i18n.getText('news_splendor_2') },
        { art: 'art-chess', icon: 'fa-layer-group', text: i18n.getText('news_splendor_3') }
      ]
    },
    catan: {
      title: i18n.getText('hub_catan_title'),
      coverTitle: 'Catan',
      category: 'boardgame',
      stripText: 'BOARD GAME • 3-4P',
      studio: i18n.getText('hub_catan_studio'),
      artClass: 'art-catan',
      iconHtml: '<i class="fa-solid fa-wheat-awn" id="hub-tower-icon"></i>',
      towerColor: '#d35400',
      towerDark: '#a04000',
      playable: false,
      badge: i18n.getText('coming_badge'),
      pillAva: '🌾',
      pillLabel: i18n.getText('coming_badge'),
      ctaText: i18n.getText('coming_badge'),
      medals: ['30', '19', '6'],
      social: i18n.getText('hub_catan_social'),
      news: [
        { art: 'art-catan', icon: 'fa-cubes', text: i18n.getText('news_catan_1') },
        { art: 'art-ludo', icon: 'fa-handshake', text: i18n.getText('news_catan_2') },
        { art: 'art-xiangqi', icon: 'fa-chess-rook', text: i18n.getText('news_catan_3') }
      ]
    },
    carcassonne: {
      title: i18n.getText('hub_carcassonne_title'),
      coverTitle: 'Carcassonne',
      category: 'boardgame',
      stripText: 'BOARD GAME • 2-5P',
      studio: i18n.getText('hub_carcassonne_studio'),
      artClass: 'art-carcassonne',
      iconHtml: '<i class="fa-solid fa-chess-rook" id="hub-tower-icon"></i>',
      towerColor: '#10ac84',
      towerDark: '#0b7a5e',
      playable: false,
      badge: i18n.getText('coming_badge'),
      pillAva: '🏰',
      pillLabel: i18n.getText('coming_badge'),
      ctaText: i18n.getText('coming_badge'),
      medals: ['20', '14', '4'],
      social: i18n.getText('hub_carcassonne_social'),
      news: [
        { art: 'art-carcassonne', icon: 'fa-map', text: i18n.getText('news_carcassonne_1') },
        { art: 'art-chess', icon: 'fa-chess-pawn', text: i18n.getText('news_carcassonne_2') },
        { art: 'art-catan', icon: 'fa-trophy', text: i18n.getText('news_carcassonne_3') }
      ]
    },
    avalon: {
      title: i18n.getText('hub_avalon_title'),
      coverTitle: 'Avalon',
      category: 'boardgame',
      stripText: 'BOARD GAME • 5-10P',
      studio: i18n.getText('hub_avalon_studio'),
      artClass: 'art-avalon',
      iconHtml: '<i class="fa-solid fa-shield-halved" id="hub-tower-icon"></i>',
      towerColor: '#8e44ad',
      towerDark: '#5b2c6f',
      playable: false,
      badge: i18n.getText('coming_badge'),
      pillAva: '🛡️',
      pillLabel: i18n.getText('coming_badge'),
      ctaText: i18n.getText('coming_badge'),
      medals: ['22', '16', '5'],
      social: i18n.getText('hub_avalon_social'),
      news: [
        { art: 'art-avalon', icon: 'fa-masks-theater', text: i18n.getText('news_avalon_1') },
        { art: 'art-splendor', icon: 'fa-check-to-slot', text: i18n.getText('news_avalon_2') },
        { art: 'art-xiangqi', icon: 'fa-user-secret', text: i18n.getText('news_avalon_3') }
      ]
    },
    chess: {
      title: i18n.getText('hub_chess_title'),
      coverTitle: 'Cờ Vua',
      category: 'classic',
      stripText: 'CLASSIC CHESS',
      studio: i18n.getText('hub_chess_studio'),
      artClass: 'art-chess',
      iconHtml: '<i class="fa-solid fa-chess-knight" id="hub-tower-icon"></i>',
      towerColor: '#1e3799',
      towerDark: '#0c2461',
      playable: false,
      badge: i18n.getText('coming_badge'),
      pillAva: '♞',
      pillLabel: i18n.getText('coming_badge'),
      ctaText: i18n.getText('coming_badge'),
      medals: ['25', '14', '4'],
      social: i18n.getText('hub_chess_social'),
      news: [
        { art: 'art-chess', icon: 'fa-chess-king', text: i18n.getText('news_chess_1') },
        { art: 'art-caro', icon: 'fa-stopwatch', text: i18n.getText('news_chess_2') },
        { art: 'art-splendor', icon: 'fa-microchip', text: i18n.getText('news_chess_3') }
      ]
    },
    xiangqi: {
      title: i18n.getText('hub_xiangqi_title'),
      coverTitle: 'Cờ Tướng',
      category: 'classic',
      stripText: 'XIANGQI ONLINE',
      studio: i18n.getText('hub_xiangqi_studio'),
      artClass: 'art-xiangqi',
      iconHtml: '<i class="fa-solid fa-chess-board" id="hub-tower-icon"></i>',
      towerColor: '#b71540',
      towerDark: '#780e29',
      playable: false,
      badge: i18n.getText('coming_badge'),
      pillAva: '帥',
      pillLabel: i18n.getText('coming_badge'),
      ctaText: i18n.getText('coming_badge'),
      medals: ['20', '11', '3'],
      social: i18n.getText('hub_xiangqi_social'),
      news: [
        { art: 'art-xiangqi', icon: 'fa-chess-rook', text: i18n.getText('news_xiangqi_1') },
        { art: 'art-catan', icon: 'fa-shield', text: i18n.getText('news_xiangqi_2') },
        { art: 'art-ludo', icon: 'fa-scroll', text: i18n.getText('news_xiangqi_3') }
      ]
    },
    ludo: {
      title: i18n.getText('hub_ludo_title'),
      coverTitle: 'Cờ Cá Ngựa',
      category: 'classic',
      stripText: 'LUDO PARTY',
      studio: i18n.getText('hub_ludo_studio'),
      artClass: 'art-ludo',
      iconHtml: '<i class="fa-solid fa-dice" id="hub-tower-icon"></i>',
      towerColor: '#009432',
      towerDark: '#006221',
      playable: false,
      badge: i18n.getText('coming_badge'),
      pillAva: '🎲',
      pillLabel: i18n.getText('coming_badge'),
      ctaText: i18n.getText('coming_badge'),
      medals: ['15', '10', '2'],
      social: i18n.getText('hub_ludo_social'),
      news: [
        { art: 'art-ludo', icon: 'fa-dice-six', text: i18n.getText('news_ludo_1') },
        { art: 'art-caro', icon: 'fa-horse', text: i18n.getText('news_ludo_2') },
        { art: 'art-splendor', icon: 'fa-users', text: i18n.getText('news_ludo_3') }
      ]
    }
  };
}
