/**
 * DeceptionState: Quản lý trạng thái ván chơi Deception: Murder in Viet Nam
 * 
 * Game ẩn vai trò & suy luận xã hội (Social Deduction Board Game)
 * - 1 Giám định viên pháp y (Forensic Scientist): Biết hung thủ, hung khí và manh mối, gợi ý bằng Bảng Hiện Trường.
 * - 1 Hung thủ (Murderer): Chọn bí mật 1 Hung khí & 1 Manh mối, cố gắng ẩn mình và đánh lạc hướng.
 * - Các Điều tra viên (Investigators): Phân tích gợi ý, thảo luận và phá án.
 * - (Mở rộng) 1 Đồng phạm (Accomplice) & 1 Nhân chứng (Witness).
 */

export const DECEPTION_ROLES = {
  FORENSIC_SCIENTIST: {
    id: 'forensic_scientist',
    name: 'Giám Định Viên Pháp Y',
    icon: '🔬',
    desc: 'Biết toàn bộ chân tướng vụ án. Không được nói chuyện, chỉ dẫn dắt điều tra viên thông qua các Điểm Hiện Trường.'
  },
  MURDERER: {
    id: 'murderer',
    name: 'Hung Thủ',
    icon: '🔪',
    desc: 'Bí mật chọn 1 Hung Khí và 1 Manh Mối trước mặt mình. Phải ẩn mình và đánh lạc hướng các điều tra viên.'
  },
  INVESTIGATOR: {
    id: 'investigator',
    name: 'Điều Tra Viên',
    icon: '🕵️',
    desc: 'Quan sát các thẻ hiện trường, thảo luận cùng đồng đội và tìm ra chính xác Hung Khí & Manh Mối của vụ án.'
  },
  ACCOMPLICE: {
    id: 'accomplice',
    name: 'Đồng Phạm',
    icon: '🎭',
    desc: 'Biết hung thủ là ai. Giúp hung thủ che giấu tội ác và lái hướng nghi ngờ sang người vô tội.'
  },
  WITNESS: {
    id: 'witness',
    name: 'Nhân Chứng',
    icon: '👁️',
    desc: 'Biết ai là phe tội phạm (nhưng không rõ ai là hung thủ, ai là đồng phạm). Phải cẩn thận kẻo bị hung thủ ám sát cuối game.'
  }
};

// Danh mục Hung khí & Manh mối đậm chất Việt Nam
export const VIETNAM_CRIME_DATABASE = {
  means: [
    { id: 'm1', name: 'Dao gọt hoa quả', icon: '🗡️', type: 'Sắc nhọn' },
    { id: 'm2', name: 'Thuốc ngủ liều cao', icon: '💊', type: 'Độc dược' },
    { id: 'm3', name: 'Khóa chữ U xe máy', icon: '🔒', type: 'Vật cùn' },
    { id: 'm4', name: 'Dây sạc điện thoại', icon: '🔌', type: 'Ngạt thở' },
    { id: 'm5', name: 'Bình xịt côn trùng', icon: '🧪', type: 'Hóa chất' },
    { id: 'm6', name: 'Gạch công trình', icon: '🧱', type: 'Chấn thương' },
    { id: 'm7', name: 'Rượu ngâm rắn độc', icon: '🍶', type: 'Đầu độc' },
    { id: 'm8', name: 'Mỏ lết đa năng', icon: '🔧', type: 'Vật nặng' }
  ],
  clues: [
    { id: 'c1', name: 'Vé xe buýt tuyến 08', icon: '🎫', type: 'Di chuyển' },
    { id: 'c2', name: 'Mũ bảo hiểm rách quai', icon: '⛑️', type: 'Đồ vật' },
    { id: 'c3', name: 'Hóa đơn cà phê sữa đá', icon: '🧾', type: 'Thời gian' },
    { id: 'c4', name: 'Bao thuốc Thăng Long', icon: '🚬', type: 'Thói quen' },
    { id: 'c5', name: 'Chiếc nhẫn vàng 18K', icon: '💍', type: 'Tư trang' },
    { id: 'c6', name: 'Điện thoại vỡ màn hình', icon: '📱', type: 'Công nghệ' },
    { id: 'c7', name: 'Chùm chìa khóa phòng trọ', icon: '🔑', type: 'Dấu vết' },
    { id: 'c8', name: 'Sợi tóc lạ trên áo', icon: '🧬', type: 'Sinh học' }
  ]
};

// Bảng hiện trường Giám định Pháp y
export const DEFAULT_SCENE_TILES = [
  {
    id: 'location',
    title: 'Địa Điểm Gây Án',
    isFixed: true,
    options: ['Quán cà phê vỉa hè', 'Khách sạn mini', 'Căn hộ chung cư', 'Bến xe liên tỉnh', 'Nhà kho ven sông', 'Công viên đêm'],
    selected: 0
  },
  {
    id: 'cause_of_death',
    title: 'Nguyên Nhân Tử Vong',
    isFixed: true,
    options: ['Ngạt thở / Xiết cổ', 'Mất máu nghiêm trọng', 'Trúng độc cấp tính', 'Chấn thương đầu', 'Bỏng nhiệt / Điện giật', 'Sốc phản vệ'],
    selected: 0
  },
  {
    id: 'crime_scene_state',
    title: 'Tình Trạng Hiện Trường',
    isFixed: false,
    options: ['Rất hỗn loạn', 'Bị dọn dẹp kỹ', 'Có dấu hiệu giằng co', 'Còn nguyên vẹn', 'Nhiều dấu chân lạ', 'Tối tăm ẩm ướt'],
    selected: 1
  },
  {
    id: 'victim_state',
    title: 'Biểu Hiện Nạn Nhân',
    isFixed: false,
    options: ['Hoảng loạn', 'Bất ngờ', 'Đang ngủ say', 'Đang ăn uống', 'Mặc đồ trang trọng', 'Không thể kháng cự'],
    selected: 2
  }
];

export class DeceptionState {
  constructor() {
    this.caseId = 'VN-' + Math.floor(Math.random() * 8999 + 1000);
    this.caseTitle = 'Vụ Án Bí Ẩn Tại Phố Cổ';
    this.currentPhase = 'setup'; // 'setup' | 'investigation' | 'solved' | 'escaped'
    this.round = 1;
    this.maxRounds = 3;
    this.players = [];
    this.sceneTiles = JSON.parse(JSON.stringify(DEFAULT_SCENE_TILES));
    this.solution = {
      murdererId: null,
      meansId: 'm1',
      clueId: 'c3'
    };
    this.solvedBy = null;
    this.solveAttemptsLeft = 4;
  }

  reset() {
    this.caseId = 'VN-' + Math.floor(Math.random() * 8999 + 1000);
    this.currentPhase = 'setup';
    this.round = 1;
    this.sceneTiles = JSON.parse(JSON.stringify(DEFAULT_SCENE_TILES));
    this.solvedBy = null;
    this.solveAttemptsLeft = 4;
  }
}
