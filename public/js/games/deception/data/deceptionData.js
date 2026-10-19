/**
 * DECEPTION: MURDER IN HONG KONG / VIET NAM - COMPLETE OFFICIAL DATASET
 * - 9 Roles (5 Core + 3 Undercover Allies + 1 Promo)
 * - 26 Scene Tiles (1 Purple Cause of Death, 4 Green Locations, 21 Brown Scene Tiles = 156 bilingual options)
 * - 7 Event Tiles (6 Core + 1 Undercover Allies)
 * - 90 Means of Murder Cards (M001 - M090, Blue Cards)
 * - 200 Key Evidence / Clue Cards (C001 - C200, Red Cards)
 */

export const DECEPTION_META = {
  "game": "Deception: Murder in Hong Kong",
  "supportedPlayers": {
    "min": 4,
    "max": 9,
    "recommendedSweetSpot": [
      6,
      7,
      8
    ]
  },
  "counts": {
    "sceneTiles": 26,
    "meansCards": 90,
    "clueCards": 200
  }
};

export const ROLE_DEFINITIONS = {
  "FORENSIC_SCIENTIST": {
    "id": "FORENSIC_SCIENTIST",
    "name_vi": "Chuyên gia Pháp y",
    "name_en": "Forensic Scientist",
    "team": "INVESTIGATION",
    "icon": "🔬",
    "minPlayers": 4,
    "isOpenRole": true,
    "hasCards": false,
    "hasBadge": false,
    "desc_vi": "Biết rõ chân tướng vụ án nhưng không được phép nói hay ra hiệu bằng lời. Dẫn dắt các Điều tra viên bằng cách đặt 6 viên đạn gỗ lên các Thẻ Hiện Trường.",
    "desc_en": "Knows the full solution but cannot speak or gesture. Guides Investigators solely by placing wooden bullets onto the Scene Tiles."
  },
  "MURDERER": {
    "id": "MURDERER",
    "name_vi": "Kẻ Sát Nhân",
    "name_en": "Murderer",
    "team": "CRIMINAL",
    "icon": "🔪",
    "minPlayers": 4,
    "isOpenRole": false,
    "hasCards": true,
    "hasBadge": true,
    "desc_vi": "Vào Pha Đêm, bí mật chọn 1 lá Phương thức (Xanh) và 1 lá Manh mối (Đỏ) của chính mình làm hung khí & vật chứng. Trà trộn và đánh lạc hướng cho đến hết Vòng 3.",
    "desc_en": "At Night, secretly chooses 1 Means card and 1 Clue card from their own hand. Survive 3 rounds or assassinate the Witness if caught."
  },
  "INVESTIGATOR": {
    "id": "INVESTIGATOR",
    "name_vi": "Điều tra viên",
    "name_en": "Investigator",
    "team": "INVESTIGATION",
    "icon": "🕵️",
    "minPlayers": 4,
    "isOpenRole": false,
    "hasCards": true,
    "hasBadge": true,
    "desc_vi": "Phân tích các viên đạn gợi ý từ Pháp y, tranh luận trong 30 giây mỗi vòng và sử dụng Huy hiệu Cảnh sát để chỉ định chính xác cặp Phương thức + Manh mối của Kẻ Sát Nhân.",
    "desc_en": "Analyze the Forensic Scientist's scene markers, debate suspects, and spend your single Badge to accuse the Murderer's exact Means + Clue pair."
  },
  "ACCOMPLICE": {
    "id": "ACCOMPLICE",
    "name_vi": "Đồng phạm",
    "name_en": "Accomplice",
    "team": "CRIMINAL",
    "icon": "🎭",
    "minPlayers": 6,
    "isOpenRole": false,
    "hasCards": true,
    "hasBadge": true,
    "desc_vi": "Biết ai là Kẻ Sát Nhân và cặp bài Phương thức + Manh mối đã chọn. Hỗ trợ đánh lạc hướng cuộc điều tra để bảo vệ hung thủ.",
    "desc_en": "Knows the Murderer and their chosen Means + Clue pair. Helps deflect suspicion away from the true culprit."
  },
  "WITNESS": {
    "id": "WITNESS",
    "name_vi": "Nhân chứng",
    "name_en": "Witness",
    "team": "INVESTIGATION",
    "icon": "👁️",
    "minPlayers": 6,
    "isOpenRole": false,
    "hasCards": true,
    "hasBadge": true,
    "desc_vi": "Biết 2 nghi phạm thuộc phe Tội phạm (Sát nhân & Đồng phạm) nhưng không rõ ai giữ vai nào. Phải dẫn dắt khéo léo vì nếu Sát nhân bị bắt nhưng đoán trúng bạn là Nhân chứng, Tội phạm sẽ lật kèo thắng!",
    "desc_en": "Sees the Murderer and Accomplice at Night without knowing which is which. Stay hidden—if the caught Murderer shoots you at the end, Criminals steal the win!"
  },
  "LAB_TECHNICIAN": {
    "id": "LAB_TECHNICIAN",
    "name_vi": "Kỹ thuật viên Phòng Lab",
    "name_en": "Lab Technician",
    "team": "INVESTIGATION",
    "icon": "🧪",
    "minPlayers": 7,
    "isExpansion": true,
    "isOpenRole": false,
    "hasCards": true,
    "hasBadge": true,
    "desc_vi": "Bản mở rộng Undercover Allies: Giữa Vòng 1 và Vòng 2, được bí mật kiểm tra 1 lá bài bất kỳ trên bàn xem có nằm trong đáp án vụ án hay không.",
    "desc_en": "Undercover Allies Expansion: Between Round 1 and 2, secretly inspects 1 card on the table to learn whether it is part of the Crime Solution."
  },
  "INSIDE_MAN": {
    "id": "INSIDE_MAN",
    "name_vi": "Nội gián",
    "name_en": "Inside Man",
    "team": "CRIMINAL",
    "icon": "🕶️",
    "minPlayers": 8,
    "isExpansion": true,
    "isOpenRole": false,
    "hasCards": true,
    "hasBadge": true,
    "desc_vi": "Bản mở rộng Undercover Allies: Giữa Vòng 1 và Vòng 2, bí mật vô hiệu hóa Huy hiệu Phá án của 1 người chơi bất kỳ trên bàn.",
    "desc_en": "Undercover Allies Expansion: Between Round 1 and 2, secretly strips 1 player's Badge so they can no longer make an accusation."
  },
  "PROTECTIVE_DETAIL": {
    "id": "PROTECTIVE_DETAIL",
    "name_vi": "Đặc vụ Bảo vệ",
    "name_en": "Protective Detail",
    "team": "INVESTIGATION",
    "icon": "🛡️",
    "minPlayers": 7,
    "isExpansion": true,
    "isOpenRole": false,
    "hasCards": true,
    "hasBadge": true,
    "desc_vi": "Bản mở rộng Undercover Allies: Biết rõ ai là Nhân chứng từ đầu ván để tung hỏa mù và đỡ đạn thay cho Nhân chứng ở pha Phản công cuối trận.",
    "desc_en": "Undercover Allies Expansion: Knows the identity of the Witness at Night and can act as a decoy to draw the Murderer's bullet."
  },
  "CONSULTING_DETECTIVE": {
    "id": "CONSULTING_DETECTIVE",
    "name_vi": "Thám tử Cố vấn",
    "name_en": "Consulting Detective",
    "team": "INVESTIGATION",
    "icon": "🎩",
    "minPlayers": 5,
    "isExpansion": true,
    "isOpenRole": false,
    "hasCards": true,
    "hasBadge": true,
    "desc_vi": "Promo Đặc biệt: Có thể tự nguyện nộp bỏ Huy hiệu Phá án của mình bất kỳ lúc nào để lật ngửa thẻ Vai trò, chứng minh 100% mình thuộc phe Điều tra vô tội.",
    "desc_en": "Promo Role: Can voluntarily discard their Badge at any time to publicly flip their role card face-up, proving 100% innocence."
  }
};

export const EVENT_TILES = [
  {
    "id": "EVENT_01",
    "type": "EVENT_TILE",
    "color": "BLUE_EVENT",
    "name_en": "Sudden Twist",
    "name_vi": "Manh mối Bổ sung",
    "icon": "⚡",
    "desc_en": "Forensic Scientist immediately draws 1 extra Brown Scene Tile and places an additional bullet marker without discarding an existing tile.",
    "desc_vi": "Pháp y lập tức rút thêm 1 Ô Hiện Trường Nâu mới và đặt thêm 1 viên đạn gợi ý (không cần bỏ bớt ô cũ)."
  },
  {
    "id": "EVENT_02",
    "type": "EVENT_TILE",
    "color": "BLUE_EVENT",
    "name_en": "Forensic Breakthrough",
    "name_vi": "Đột phá Pháp y",
    "icon": "💡",
    "desc_en": "Forensic Scientist may relocate 1 bullet marker on an existing Scene Tile to a more accurate option.",
    "desc_vi": "Pháp y được quyền dời vị trí 1 viên đạn trên một Ô Hiện Trường đang có sang mục khác chính xác hơn."
  },
  {
    "id": "EVENT_03",
    "type": "EVENT_TILE",
    "color": "BLUE_EVENT",
    "name_en": "Evidence Tampering",
    "name_vi": "Xáo trộn Hiện trường",
    "icon": "🔥",
    "desc_en": "Forensic Scientist must discard 2 existing Brown Scene Tiles and only draw 1 replacement tile.",
    "desc_vi": "Hiện trường bị phá hoại! Pháp y buộc phải bỏ đi 2 Ô Hiện Trường Nâu cũ và chỉ được rút bù 1 ô mới."
  },
  {
    "id": "EVENT_04",
    "type": "EVENT_TILE",
    "color": "BLUE_EVENT",
    "name_en": "Witness Protection",
    "name_vi": "Bảo vệ Nhân chứng",
    "icon": "🛡️",
    "desc_en": "Presentation order is reversed (counter-clockwise) for this round to disrupt suspect patterns.",
    "desc_vi": "Đảo ngược thứ tự trình bày (ngược chiều kim đồng hồ) trong vòng này để bảo vệ luồng suy luận của Nhân chứng."
  },
  {
    "id": "EVENT_05",
    "type": "EVENT_TILE",
    "color": "BLUE_EVENT",
    "name_en": "Internal Investigation",
    "name_vi": "Điều tra Nội bộ",
    "icon": "🔍",
    "desc_en": "Each investigator flags the single most suspicious card of the player seated to their right before presentations begin.",
    "desc_vi": "Mỗi người chơi chỉ định 1 lá bài đáng ngờ nhất của người ngồi kế bên trước khi bắt đầu vòng Trình bày."
  },
  {
    "id": "EVENT_06",
    "type": "EVENT_TILE",
    "color": "BLUE_EVENT",
    "name_en": "Clean Sweep",
    "name_vi": "Thay máu Địa điểm",
    "icon": "🧹",
    "desc_en": "Forensic Scientist swaps the Green Location of Crime tile for a different Location tile and places a fresh bullet.",
    "desc_vi": "Pháp y được quyền đổi Ô Địa Điểm Gây Án (Xanh lá) sang một thẻ Địa điểm khác phù hợp hơn và đặt lại đạn."
  },
  {
    "id": "EVENT_07",
    "type": "EVENT_TILE",
    "color": "BLUE_EVENT",
    "name_en": "The Perfect Crime",
    "name_vi": "Tội ác Hoàn hảo",
    "icon": "🃏",
    "desc_en": "Undercover Allies: Forensic Scientist peeks at the top Scene Deck card; if it is another Event, tension spikes and 1 bonus clue hint is unlocked.",
    "desc_vi": "Undercover Allies: Pháp y bí mật kiểm tra đỉnh chồng bài Hiện trường; áp lực điều tra tăng cao tối đa!"
  }
];

export const SCENE_TILES = [
  {
    "id": "tile_cause_01",
    "type": "CAUSE_OF_DEATH",
    "color": "PURPLE",
    "name_en": "Cause of Death",
    "name_vi": "Nguyên nhân Tử vong",
    "options_en": [
      "Suffocation",
      "Severe Injury",
      "Loss of Blood",
      "Illness / Disease",
      "Poisoning",
      "Accident"
    ],
    "options_vi": [
      "Ngạt thở",
      "Chấn thương nặng",
      "Mất máu quá nhiều",
      "Bệnh lý / Ốm đau",
      "Trúng độc",
      "Tai nạn"
    ]
  },
  {
    "id": "tile_loc_01",
    "type": "LOCATION_OF_CRIME",
    "color": "GREEN",
    "name_en": "Location of Crime (1/4)",
    "name_vi": "Địa điểm Gây án (1/4 - Nhà ở)",
    "options_en": [
      "Living Room",
      "Bedroom",
      "Storeroom",
      "Bathroom",
      "Kitchen",
      "Balcony"
    ],
    "options_vi": [
      "Phòng khách",
      "Phòng ngủ",
      "Nhà kho",
      "Phòng tắm",
      "Nhà bếp",
      "Ban công"
    ]
  },
  {
    "id": "tile_loc_02",
    "type": "LOCATION_OF_CRIME",
    "color": "GREEN",
    "name_en": "Location of Crime (2/4)",
    "name_vi": "Địa điểm Gây án (2/4 - Dịch vụ & Công trình)",
    "options_en": [
      "Pub",
      "Bookstore",
      "Restaurant",
      "Hotel",
      "Hospital",
      "Building Site"
    ],
    "options_vi": [
      "Quán rượu / Bar",
      "Hiệu sách",
      "Nhà hàng",
      "Khách sạn",
      "Bệnh viện",
      "Công trường xây dựng"
    ]
  },
  {
    "id": "tile_loc_03",
    "type": "LOCATION_OF_CRIME",
    "color": "GREEN",
    "name_en": "Location of Crime (3/4)",
    "name_vi": "Địa điểm Gây án (3/4 - Trường học & Nội khu)",
    "options_en": [
      "Playground",
      "Classroom",
      "Dormitory",
      "Cafeteria",
      "Elevator",
      "Toilet"
    ],
    "options_vi": [
      "Sân chơi",
      "Lớp học",
      "Ký túc xá",
      "Nhà ăn / Căng tin",
      "Thang máy",
      "Nhà vệ sinh"
    ]
  },
  {
    "id": "tile_loc_04",
    "type": "LOCATION_OF_CRIME",
    "color": "GREEN",
    "name_en": "Location of Crime (4/4)",
    "name_vi": "Địa điểm Gây án (4/4 - Công cộng & Ngoài trời)",
    "options_en": [
      "Vacation Home",
      "Park",
      "Supermarket",
      "School",
      "Woods",
      "Bank"
    ],
    "options_vi": [
      "Nhà nghỉ dưỡng",
      "Công viên / Bãi đỗ xe",
      "Siêu thị",
      "Trường học",
      "Rừng cây",
      "Ngân hàng"
    ]
  },
  {
    "id": "tile_scene_01",
    "type": "SCENE_TILE",
    "color": "BROWN",
    "name_en": "Corpse Condition",
    "name_vi": "Tình trạng Thi thể",
    "options_en": [
      "Still Warm",
      "Stiff",
      "Decayed",
      "Incomplete",
      "Intact",
      "Twisted"
    ],
    "options_vi": [
      "Còn ấm",
      "Cứng đờ",
      "Phân hủy",
      "Không nguyên vẹn",
      "Nguyên vẹn",
      "Vặn vẹo / Biến dạng"
    ]
  },
  {
    "id": "tile_scene_02",
    "type": "SCENE_TILE",
    "color": "BROWN",
    "name_en": "Day of Crime",
    "name_vi": "Ngày xảy ra Vụ án",
    "options_en": [
      "Weekday",
      "Weekend",
      "Spring",
      "Summer",
      "Autumn",
      "Winter"
    ],
    "options_vi": [
      "Ngày trong tuần",
      "Cuối tuần",
      "Mùa xuân",
      "Mùa hè",
      "Mùa thu",
      "Mùa đông"
    ]
  },
  {
    "id": "tile_scene_03",
    "type": "SCENE_TILE",
    "color": "BROWN",
    "name_en": "Duration of Crime",
    "name_vi": "Thời lượng Gây án",
    "options_en": [
      "Instantaneous",
      "Brief",
      "Gradual",
      "Prolonged",
      "Few Days",
      "Unclear"
    ],
    "options_vi": [
      "Tức thì",
      "Chớp nhoáng",
      "Từ từ / Ngấm dần",
      "Kéo dài",
      "Vài ngày",
      "Không rõ ràng"
    ]
  },
  {
    "id": "tile_scene_04",
    "type": "SCENE_TILE",
    "color": "BROWN",
    "name_en": "Evidence Left Behind",
    "name_vi": "Bản chất Vật chứng Để lại",
    "options_en": [
      "Natural",
      "Artistic",
      "Written",
      "Synthetic",
      "Personal",
      "Unrelated"
    ],
    "options_vi": [
      "Tự nhiên",
      "Nghệ thuật",
      "Chữ viết / Văn bản",
      "Nhân tạo / Tổng hợp",
      "Đồ cá nhân",
      "Không liên quan"
    ]
  },
  {
    "id": "tile_scene_05",
    "type": "SCENE_TILE",
    "color": "BROWN",
    "name_en": "General Impression",
    "name_vi": "Ấn tượng Chung",
    "options_en": [
      "Common",
      "Creative",
      "Fishy",
      "Cruel",
      "Horrible",
      "Suspenseful"
    ],
    "options_vi": [
      "Phổ biến / Bình thường",
      "Sáng tạo / Tinh vi",
      "Đáng ngờ / Mờ ám",
      "Tàn nhẫn",
      "Kinh hoàng",
      "Hồi hộp / Bí ẩn"
    ]
  },
  {
    "id": "tile_scene_06",
    "type": "SCENE_TILE",
    "color": "BROWN",
    "name_en": "Hint on Corpse",
    "name_vi": "Dấu hiệu trên Thi thể",
    "options_en": [
      "Head",
      "Chest",
      "Hand",
      "Leg",
      "Partial",
      "All-over"
    ],
    "options_vi": [
      "Đầu",
      "Ngực",
      "Tay",
      "Chân",
      "Một phần cơ thể",
      "Toàn thân"
    ]
  },
  {
    "id": "tile_scene_07",
    "type": "SCENE_TILE",
    "color": "BROWN",
    "name_en": "Motive of Crime",
    "name_vi": "Động cơ Gây án",
    "options_en": [
      "Hatred",
      "Power",
      "Money",
      "Love",
      "Jealousy",
      "Justice"
    ],
    "options_vi": [
      "Thù hận",
      "Quyền lực",
      "Tiền bạc",
      "Tình yêu",
      "Ghen tuông",
      "Công lý / Báo thù"
    ]
  },
  {
    "id": "tile_scene_08",
    "type": "SCENE_TILE",
    "color": "BROWN",
    "name_en": "Murderer's Personality",
    "name_vi": "Tính cách Hung thủ",
    "options_en": [
      "Arrogant",
      "Despicable",
      "Furious",
      "Greedy",
      "Forceful",
      "Perverted"
    ],
    "options_vi": [
      "Ngạo mạn",
      "Đê tiện / Hèn hạ",
      "Hung dữ / Điên cuồng",
      "Tham lam",
      "Áp đặt / Tàn bạo",
      "Biến thái / Lệch lạc"
    ]
  },
  {
    "id": "tile_scene_09",
    "type": "SCENE_TILE",
    "color": "BROWN",
    "name_en": "State of The Scene",
    "name_vi": "Hiện trạng Hiện trường",
    "options_en": [
      "Bits and Pieces",
      "Ashes",
      "Water Stain",
      "Cracked",
      "Disorderly",
      "Tidy"
    ],
    "options_vi": [
      "Mảnh vỡ vụn",
      "Tro tàn",
      "Vết nước loang",
      "Nứt vỡ",
      "Hỗn loạn / Bừa bộn",
      "Gọn gàng / Ngăn nắp"
    ]
  },
  {
    "id": "tile_scene_10",
    "type": "SCENE_TILE",
    "color": "BROWN",
    "name_en": "In Progress",
    "name_vi": "Hoạt động Đang diễn ra",
    "options_en": [
      "Entertainment",
      "Relaxation",
      "Assembly",
      "Trading",
      "Visit",
      "Dining"
    ],
    "options_vi": [
      "Giải trí / Vui chơi",
      "Nghỉ ngơi / Thư giãn",
      "Họp mặt / Tụ tập",
      "Giao dịch / Mua bán",
      "Thăm viếng",
      "Ăn uống / Tiệc tùng"
    ]
  },
  {
    "id": "tile_scene_11",
    "type": "SCENE_TILE",
    "color": "BROWN",
    "name_en": "Noticed by Bystander",
    "name_vi": "Người qua đường Phát hiện",
    "options_en": [
      "Sudden Sound",
      "Prolonged Sound",
      "Smell",
      "Visual",
      "Action",
      "Nothing"
    ],
    "options_vi": [
      "Tiếng động bất ngờ",
      "Âm thanh kéo dài",
      "Mùi lạ",
      "Nhìn thấy tận mắt",
      "Hành động bất thường",
      "Không ai chú ý"
    ]
  },
  {
    "id": "tile_scene_12",
    "type": "SCENE_TILE",
    "color": "BROWN",
    "name_en": "Social Relationship",
    "name_vi": "Mối quan hệ Xã hội",
    "options_en": [
      "Relatives",
      "Friends",
      "Colleagues",
      "Employer / Employee",
      "Lovers",
      "Stranger"
    ],
    "options_vi": [
      "Họ hàng / Người thân",
      "Bạn bè",
      "Đồng nghiệp",
      "Chủ - Thợ / Cấp trên - Cấp dưới",
      "Tình nhân",
      "Người dưng / Kẻ lạ"
    ]
  },
  {
    "id": "tile_scene_13",
    "type": "SCENE_TILE",
    "color": "BROWN",
    "name_en": "Time of Death",
    "name_vi": "Thời điểm Tử vong",
    "options_en": [
      "Dawn",
      "Morning",
      "Noon",
      "Afternoon",
      "Evening",
      "Night"
    ],
    "options_vi": [
      "Rạng sáng / Bình minh",
      "Buổi sáng",
      "Buổi trưa",
      "Buổi chiều",
      "Chập tối / Hoàng hôn",
      "Đêm khuya"
    ]
  },
  {
    "id": "tile_scene_14",
    "type": "SCENE_TILE",
    "color": "BROWN",
    "name_en": "Trace at The Scene",
    "name_vi": "Dấu vết tại Hiện trường",
    "options_en": [
      "Fingerprint",
      "Footprint",
      "Bruise",
      "Blood Stain",
      "Bodily Fluid",
      "Scar"
    ],
    "options_vi": [
      "Dấu vân tay",
      "Dấu chân",
      "Vết bầm / Va đập",
      "Vết máu",
      "Dịch cơ thể",
      "Vết xước / Sẹo"
    ]
  },
  {
    "id": "tile_scene_15",
    "type": "SCENE_TILE",
    "color": "BROWN",
    "name_en": "Sudden Incident",
    "name_vi": "Sự cố Bất ngờ",
    "options_en": [
      "Power Failure",
      "Fire",
      "Conflict",
      "Loss of Valuables",
      "Scream",
      "Nothing"
    ],
    "options_vi": [
      "Mất điện",
      "Hỏa hoạn / Cháy",
      "Xô xát / Ẩu đả",
      "Mất tài sản quý giá",
      "Tiếng hét thất thanh",
      "Không có gì"
    ]
  },
  {
    "id": "tile_scene_16",
    "type": "SCENE_TILE",
    "color": "BROWN",
    "name_en": "Victim's Build",
    "name_vi": "Vóc dáng Nạn nhân",
    "options_en": [
      "Large",
      "Thin",
      "Tall",
      "Short",
      "Disfigured",
      "Fit"
    ],
    "options_vi": [
      "To béo / Đồ sộ",
      "Gầy gò",
      "Cao lớn",
      "Thấp bé",
      "Dị dạng / Khuyết tật",
      "Cân đối / Khỏe mạnh"
    ]
  },
  {
    "id": "tile_scene_17",
    "type": "SCENE_TILE",
    "color": "BROWN",
    "name_en": "Victim's Clothes",
    "name_vi": "Trang phục Nạn nhân",
    "options_en": [
      "Neat",
      "Untidy",
      "Elegant",
      "Shabby",
      "Bizarre",
      "Naked"
    ],
    "options_vi": [
      "Chỉnh tề / Gọn gàng",
      "Xộc xệch",
      "Sang trọng / Lịch lãm",
      "Rách rưới / Cũ kỹ",
      "Kỳ dị / Lập dị",
      "Không mặc quần áo"
    ]
  },
  {
    "id": "tile_scene_18",
    "type": "SCENE_TILE",
    "color": "BROWN",
    "name_en": "Victim's Expression",
    "name_vi": "Biểu cảm Nạn nhân",
    "options_en": [
      "Peaceful",
      "Struggling",
      "Frightened",
      "In Pain",
      "Blank",
      "Angry"
    ],
    "options_vi": [
      "Bình thản",
      "Giãy giụa / Chống cự",
      "Hoảng sợ",
      "Đau đớn",
      "Vô hồn / Trống rỗng",
      "Tức giận"
    ]
  },
  {
    "id": "tile_scene_19",
    "type": "SCENE_TILE",
    "color": "BROWN",
    "name_en": "Victim's Occupation",
    "name_vi": "Nghề nghiệp Nạn nhân",
    "options_en": [
      "Boss",
      "Professional",
      "Worker",
      "Student",
      "Unemployed",
      "Retired"
    ],
    "options_vi": [
      "Ông chủ / Sếp lớn",
      "Chuyên gia / Trí thức",
      "Công nhân / Lao động",
      "Học sinh / Sinh viên",
      "Thất nghiệp",
      "Nghỉ hưu"
    ]
  },
  {
    "id": "tile_scene_20",
    "type": "SCENE_TILE",
    "color": "BROWN",
    "name_en": "Victim's Identity",
    "name_vi": "Nhân thân Nạn nhân",
    "options_en": [
      "Child",
      "Young Adult",
      "Middle-Aged",
      "Senior",
      "Male",
      "Female"
    ],
    "options_vi": [
      "Trẻ em",
      "Thanh niên",
      "Trung niên",
      "Người cao tuổi",
      "Nam giới",
      "Nữ giới"
    ]
  },
  {
    "id": "tile_scene_21",
    "type": "SCENE_TILE",
    "color": "BROWN",
    "name_en": "Weather",
    "name_vi": "Thời tiết",
    "options_en": [
      "Sunny",
      "Stormy",
      "Dry",
      "Humid",
      "Cold",
      "Hot"
    ],
    "options_vi": [
      "Nắng ráo",
      "Mưa bão",
      "Khô hanh",
      "Ẩm ướt",
      "Lạnh giá",
      "Nóng bức"
    ]
  }
];

export const MEANS_CARDS = [
  {
    "id": "M001",
    "en": "Alcohol",
    "vi": "Rượu mạnh quá liều",
    "category": "Poisoning"
  },
  {
    "id": "M002",
    "en": "Arsenic",
    "vi": "Thạch tín (Arsenic)",
    "category": "Poisoning"
  },
  {
    "id": "M003",
    "en": "Chemicals",
    "vi": "Hóa chất công nghiệp",
    "category": "Poisoning"
  },
  {
    "id": "M004",
    "en": "Dirty Water",
    "vi": "Nước bẩn nhiễm khuẩn",
    "category": "Poisoning/Illness"
  },
  {
    "id": "M005",
    "en": "Illegal Drug",
    "vi": "Ma túy / Chất cấm",
    "category": "Poisoning"
  },
  {
    "id": "M006",
    "en": "Injection",
    "vi": "Ống tiêm độc dược",
    "category": "Poisoning"
  },
  {
    "id": "M007",
    "en": "Liquid Drug",
    "vi": "Thuốc độc dạng lỏng",
    "category": "Poisoning"
  },
  {
    "id": "M008",
    "en": "Mercury",
    "vi": "Thủy ngân",
    "category": "Poisoning"
  },
  {
    "id": "M009",
    "en": "Pesticide",
    "vi": "Thuốc trừ sâu",
    "category": "Poisoning"
  },
  {
    "id": "M010",
    "en": "Overdose",
    "vi": "Thuốc ngủ quá liều",
    "category": "Poisoning"
  },
  {
    "id": "M011",
    "en": "Pill",
    "vi": "Viên thuốc con nhộng",
    "category": "Poisoning/Illness"
  },
  {
    "id": "M012",
    "en": "Poisonous Gas",
    "vi": "Khí độc rò rỉ",
    "category": "Poisoning/Suffocation"
  },
  {
    "id": "M013",
    "en": "Poisonous Needle",
    "vi": "Kim châm tẩm độc",
    "category": "Poisoning"
  },
  {
    "id": "M014",
    "en": "Powder Drug",
    "vi": "Thuốc bột hòa tan",
    "category": "Poisoning"
  },
  {
    "id": "M015",
    "en": "Radiation",
    "vi": "Phóng xạ hạt nhân",
    "category": "Illness/Poisoning"
  },
  {
    "id": "M016",
    "en": "Venomous Scorpion",
    "vi": "Bọ cạp độc",
    "category": "Poisoning"
  },
  {
    "id": "M017",
    "en": "Venomous Snake",
    "vi": "Rắn độc cắn",
    "category": "Poisoning"
  },
  {
    "id": "M018",
    "en": "Wine",
    "vi": "Rượu vang pha độc",
    "category": "Poisoning"
  },
  {
    "id": "M019",
    "en": "Rope",
    "vi": "Dây thừng siết cổ",
    "category": "Suffocation"
  },
  {
    "id": "M020",
    "en": "Bank Vault",
    "vi": "Nhốt trong két sắt ngân hàng",
    "category": "Suffocation"
  },
  {
    "id": "M021",
    "en": "Dirty Hands",
    "vi": "Bóp cổ bằng tay không",
    "category": "Suffocation"
  },
  {
    "id": "M022",
    "en": "Shipping Container",
    "vi": "Nhốt trong thùng Container",
    "category": "Suffocation"
  },
  {
    "id": "M023",
    "en": "Pillow",
    "vi": "Gối bông úp mặt",
    "category": "Suffocation"
  },
  {
    "id": "M024",
    "en": "Plastic Bag",
    "vi": "Túi nilon trùm đầu",
    "category": "Suffocation"
  },
  {
    "id": "M025",
    "en": "Towel",
    "vi": "Khăn tắm ướt",
    "category": "Suffocation"
  },
  {
    "id": "M026",
    "en": "Scarf",
    "vi": "Khăn choàng lụa",
    "category": "Suffocation"
  },
  {
    "id": "M027",
    "en": "Belt",
    "vi": "Thắt lưng da",
    "category": "Suffocation"
  },
  {
    "id": "M028",
    "en": "Necktie",
    "vi": "Cà vạt siết cổ",
    "category": "Suffocation"
  },
  {
    "id": "M029",
    "en": "Steel Wire",
    "vi": "Dây thép mảnh / Dây đàn",
    "category": "Suffocation/Loss of Blood"
  },
  {
    "id": "M030",
    "en": "Drowning",
    "vi": "Dìm nước",
    "category": "Suffocation"
  },
  {
    "id": "M031",
    "en": "Burying Alive",
    "vi": "Chôn sống",
    "category": "Suffocation"
  },
  {
    "id": "M032",
    "en": "Smoke",
    "vi": "Ngạt khói đám cháy",
    "category": "Suffocation/Accident"
  },
  {
    "id": "M033",
    "en": "Packing Tape",
    "vi": "Băng keo dán kín miệng mũi",
    "category": "Suffocation"
  },
  {
    "id": "M034",
    "en": "Chain",
    "vi": "Dây xích sắt",
    "category": "Suffocation/Severe Injury"
  },
  {
    "id": "M035",
    "en": "Dagger",
    "vi": "Dao găm",
    "category": "Loss of Blood"
  },
  {
    "id": "M036",
    "en": "Kitchen Knife",
    "vi": "Dao làm bếp",
    "category": "Loss of Blood"
  },
  {
    "id": "M037",
    "en": "Cleaver",
    "vi": "Dao phay chặt thịt",
    "category": "Loss of Blood"
  },
  {
    "id": "M038",
    "en": "Box Cutter",
    "vi": "Dao rọc giấy",
    "category": "Loss of Blood"
  },
  {
    "id": "M039",
    "en": "Razor Blade",
    "vi": "Lưỡi dao cạo râu",
    "category": "Loss of Blood"
  },
  {
    "id": "M040",
    "en": "Scissors",
    "vi": "Kéo cắt may",
    "category": "Loss of Blood"
  },
  {
    "id": "M041",
    "en": "Scalpel",
    "vi": "Dao mổ y tế",
    "category": "Loss of Blood"
  },
  {
    "id": "M042",
    "en": "Chainsaw",
    "vi": "Cưa máy",
    "category": "Loss of Blood/Severe Injury"
  },
  {
    "id": "M043",
    "en": "Axe",
    "vi": "Rìu bổ củi",
    "category": "Loss of Blood/Severe Injury"
  },
  {
    "id": "M044",
    "en": "Machete",
    "vi": "Mã tấu / Dao đi rừng",
    "category": "Loss of Blood"
  },
  {
    "id": "M045",
    "en": "Sword",
    "vi": "Kiếm cổ",
    "category": "Loss of Blood"
  },
  {
    "id": "M046",
    "en": "Ice Pick",
    "vi": "Dùi đục nước đá",
    "category": "Loss of Blood"
  },
  {
    "id": "M047",
    "en": "Glass Shard",
    "vi": "Mảnh kính vỡ",
    "category": "Loss of Blood"
  },
  {
    "id": "M048",
    "en": "Broken Bottle",
    "vi": "Chai bia đập bể",
    "category": "Loss of Blood/Severe Injury"
  },
  {
    "id": "M049",
    "en": "Pistol",
    "vi": "Súng lục",
    "category": "Loss of Blood/Severe Injury"
  },
  {
    "id": "M050",
    "en": "Sniper Rifle",
    "vi": "Súng bắn tỉa",
    "category": "Loss of Blood/Severe Injury"
  },
  {
    "id": "M051",
    "en": "Shotgun",
    "vi": "Súng hoa cải",
    "category": "Loss of Blood/Severe Injury"
  },
  {
    "id": "M052",
    "en": "Crossbow",
    "vi": "Nỏ bắn tên",
    "category": "Loss of Blood"
  },
  {
    "id": "M053",
    "en": "Bow and Arrow",
    "vi": "Cung tên",
    "category": "Loss of Blood"
  },
  {
    "id": "M054",
    "en": "Nail Gun",
    "vi": "Súng bắn đinh",
    "category": "Loss of Blood/Accident"
  },
  {
    "id": "M055",
    "en": "Fork",
    "vi": "Nĩa ăn bít tết",
    "category": "Loss of Blood"
  },
  {
    "id": "M056",
    "en": "Wine Opener",
    "vi": "Đồ khui rượu vang",
    "category": "Loss of Blood"
  },
  {
    "id": "M057",
    "en": "High Heels",
    "vi": "Gót giày cao gót nhọn",
    "category": "Loss of Blood/Severe Injury"
  },
  {
    "id": "M058",
    "en": "Hook",
    "vi": "Móc sắt treo thịt",
    "category": "Loss of Blood"
  },
  {
    "id": "M059",
    "en": "Drill",
    "vi": "Máy khoan cầm tay",
    "category": "Loss of Blood/Severe Injury"
  },
  {
    "id": "M060",
    "en": "Rabid Dog",
    "vi": "Chó dữ cắn xé",
    "category": "Loss of Blood/Illness"
  },
  {
    "id": "M061",
    "en": "Hammer",
    "vi": "Búa đóng đinh",
    "category": "Severe Injury"
  },
  {
    "id": "M062",
    "en": "Wrench",
    "vi": "Cờ lê sắt",
    "category": "Severe Injury"
  },
  {
    "id": "M063",
    "en": "Iron Pipe",
    "vi": "Ống nước bằng sắt",
    "category": "Severe Injury"
  },
  {
    "id": "M064",
    "en": "Crowbar",
    "vi": "Xà beng",
    "category": "Severe Injury"
  },
  {
    "id": "M065",
    "en": "Baseball Bat",
    "vi": "Gậy bóng chày",
    "category": "Severe Injury"
  },
  {
    "id": "M066",
    "en": "Golf Club",
    "vi": "Gậy đánh Golf",
    "category": "Severe Injury"
  },
  {
    "id": "M067",
    "en": "Dumbbell",
    "vi": "Quả tạ tay",
    "category": "Severe Injury"
  },
  {
    "id": "M068",
    "en": "Trophy",
    "vi": "Cúp lưu niệm kim loại",
    "category": "Severe Injury"
  },
  {
    "id": "M069",
    "en": "Sculpture",
    "vi": "Tượng điêu khắc đá",
    "category": "Severe Injury"
  },
  {
    "id": "M070",
    "en": "Brick",
    "vi": "Viên gạch xây nhà",
    "category": "Severe Injury/Accident"
  },
  {
    "id": "M071",
    "en": "Stone",
    "vi": "Tảng đá lớn",
    "category": "Severe Injury"
  },
  {
    "id": "M072",
    "en": "Potted Plant",
    "vi": "Chậu cây rơi trúng đầu",
    "category": "Severe Injury/Accident"
  },
  {
    "id": "M073",
    "en": "Folding Chair",
    "vi": "Ghế xếp kim loại",
    "category": "Severe Injury"
  },
  {
    "id": "M074",
    "en": "Candlestick",
    "vi": "Chân nến bằng đồng",
    "category": "Severe Injury"
  },
  {
    "id": "M075",
    "en": "Fire Extinguisher",
    "vi": "Bình cứu hỏa",
    "category": "Severe Injury"
  },
  {
    "id": "M076",
    "en": "Frying Pan",
    "vi": "Chảo gang",
    "category": "Severe Injury"
  },
  {
    "id": "M077",
    "en": "Crutch",
    "vi": "Nạng gỗ y tế",
    "category": "Severe Injury"
  },
  {
    "id": "M078",
    "en": "Wooden Stick",
    "vi": "Gậy gỗ",
    "category": "Severe Injury"
  },
  {
    "id": "M079",
    "en": "Whip",
    "vi": "Roi da",
    "category": "Severe Injury"
  },
  {
    "id": "M080",
    "en": "Taser / Electric Shock",
    "vi": "Súng điện / Điện giật",
    "category": "Accident/Severe Injury"
  },
  {
    "id": "M081",
    "en": "Electric Current",
    "vi": "Dây điện trần rò điện",
    "category": "Accident"
  },
  {
    "id": "M082",
    "en": "Explosives",
    "vi": "Thuốc nổ / Bom tự chế",
    "category": "Severe Injury"
  },
  {
    "id": "M083",
    "en": "Kerosene / Arson",
    "vi": "Dầu hỏa phóng hỏa",
    "category": "Severe Injury/Accident"
  },
  {
    "id": "M084",
    "en": "Matches",
    "vi": "Que diêm châm lửa",
    "category": "Accident"
  },
  {
    "id": "M085",
    "en": "Push from Roof",
    "vi": "Xô ngã từ sân thượng",
    "category": "Severe Injury/Accident"
  },
  {
    "id": "M086",
    "en": "Elevator Sabotage",
    "vi": "Cắt cáp thang máy",
    "category": "Accident/Severe Injury"
  },
  {
    "id": "M087",
    "en": "Scooter / Car Crash",
    "vi": "Tông xe máy / Xe hơi",
    "category": "Accident/Severe Injury"
  },
  {
    "id": "M088",
    "en": "Parachute Sabotage",
    "vi": "Phá hỏng dù lượn",
    "category": "Accident/Severe Injury"
  },
  {
    "id": "M089",
    "en": "Bear Trap",
    "vi": "Bẫy gấu bằng thép",
    "category": "Loss of Blood/Accident"
  },
  {
    "id": "M090",
    "en": "Surgical Operation",
    "vi": "Ca phẫu thuật ngụy tạo",
    "category": "Illness/Accident"
  }
];

export const CLUE_CARDS = [
  {
    "id": "C001",
    "en": "Love Letter",
    "vi": "Bức thư tình",
    "category": "Written"
  },
  {
    "id": "C002",
    "en": "Suicide Note",
    "vi": "Thư tuyệt mệnh giả",
    "category": "Written"
  },
  {
    "id": "C003",
    "en": "Diary",
    "vi": "Cuốn nhật ký",
    "category": "Written"
  },
  {
    "id": "C004",
    "en": "IOU / Debt Note",
    "vi": "Giấy ghi nợ",
    "category": "Written"
  },
  {
    "id": "C005",
    "en": "Will / Testament",
    "vi": "Bản di chúc",
    "category": "Written"
  },
  {
    "id": "C006",
    "en": "Insurance Policy",
    "vi": "Hợp đồng bảo hiểm nhân thọ",
    "category": "Written"
  },
  {
    "id": "C007",
    "en": "Business Card",
    "vi": "Danh thiếp (Name card)",
    "category": "Written"
  },
  {
    "id": "C008",
    "en": "Receipt",
    "vi": "Hóa đơn mua hàng",
    "category": "Written"
  },
  {
    "id": "C009",
    "en": "Boarding Pass",
    "vi": "Vé máy bay / Vé tàu",
    "category": "Written"
  },
  {
    "id": "C010",
    "en": "Lottery Ticket",
    "vi": "Tờ vé số trúng thưởng",
    "category": "Written"
  },
  {
    "id": "C011",
    "en": "Newspaper Clipping",
    "vi": "Mẩu báo cắt rời",
    "category": "Written"
  },
  {
    "id": "C012",
    "en": "Calendar",
    "vi": "Tờ lịch để bàn khoanh đỏ",
    "category": "Written"
  },
  {
    "id": "C013",
    "en": "Map",
    "vi": "Bản đồ đánh dấu",
    "category": "Written"
  },
  {
    "id": "C014",
    "en": "Menu",
    "vi": "Thực đơn nhà hàng",
    "category": "Written"
  },
  {
    "id": "C015",
    "en": "Medical Report",
    "vi": "Bệnh án y khoa",
    "category": "Written"
  },
  {
    "id": "C016",
    "en": "Prescription",
    "vi": "Đơn thuốc của bác sĩ",
    "category": "Written"
  },
  {
    "id": "C017",
    "en": "Contract",
    "vi": "Bản hợp đồng thương mại",
    "category": "Written"
  },
  {
    "id": "C018",
    "en": "Envelope",
    "vi": "Phong bì thư niêm phong",
    "category": "Written"
  },
  {
    "id": "C019",
    "en": "Postcard",
    "vi": "Bưu thiếp du lịch",
    "category": "Written"
  },
  {
    "id": "C020",
    "en": "Invitation Card",
    "vi": "Thiệp mời dự tiệc",
    "category": "Written"
  },
  {
    "id": "C021",
    "en": "Flyer / Leaflet",
    "vi": "Tờ rơi quảng cáo",
    "category": "Written"
  },
  {
    "id": "C022",
    "en": "Notebook",
    "vi": "Sổ tay ghi chép",
    "category": "Written"
  },
  {
    "id": "C023",
    "en": "Sticky Note",
    "vi": "Giấy nhớ (Post-it)",
    "category": "Written"
  },
  {
    "id": "C024",
    "en": "Passport",
    "vi": "Hộ chiếu",
    "category": "Written/Personal"
  },
  {
    "id": "C025",
    "en": "ID Card",
    "vi": "Thẻ căn cước",
    "category": "Written/Personal"
  },
  {
    "id": "C026",
    "en": "Student ID",
    "vi": "Thẻ sinh viên",
    "category": "Written/Personal"
  },
  {
    "id": "C027",
    "en": "VIP Membership Card",
    "vi": "Thẻ hội viên VIP",
    "category": "Written/Personal"
  },
  {
    "id": "C028",
    "en": "Bank Statement",
    "vi": "Sao kê ngân hàng",
    "category": "Written"
  },
  {
    "id": "C029",
    "en": "Checkbook",
    "vi": "Sổ séc",
    "category": "Written"
  },
  {
    "id": "C030",
    "en": "Pawn Ticket",
    "vi": "Giấy cầm đồ",
    "category": "Written"
  },
  {
    "id": "C031",
    "en": "Exam Paper",
    "vi": "Bài kiểm tra điểm kém",
    "category": "Written"
  },
  {
    "id": "C032",
    "en": "Comic Book",
    "vi": "Truyện tranh",
    "category": "Written/Artistic"
  },
  {
    "id": "C033",
    "en": "Novel",
    "vi": "Tiểu thuyết trinh thám",
    "category": "Written/Artistic"
  },
  {
    "id": "C034",
    "en": "Magazine",
    "vi": "Tạp chí thời trang",
    "category": "Written"
  },
  {
    "id": "C035",
    "en": "Confidential File",
    "vi": "Tập hồ sơ tuyệt mật",
    "category": "Written"
  },
  {
    "id": "C036",
    "en": "Lipstick",
    "vi": "Thỏi son môi",
    "category": "Personal"
  },
  {
    "id": "C037",
    "en": "Perfume",
    "vi": "Chai nước hoa",
    "category": "Personal"
  },
  {
    "id": "C038",
    "en": "Wristwatch",
    "vi": "Đồng hồ đeo tay vỡ",
    "category": "Personal"
  },
  {
    "id": "C039",
    "en": "Pocket Watch",
    "vi": "Đồng hồ quả quýt",
    "category": "Personal"
  },
  {
    "id": "C040",
    "en": "Diamond Ring",
    "vi": "Nhẫn kim cương",
    "category": "Personal"
  },
  {
    "id": "C041",
    "en": "Earring",
    "vi": "Khuyên tai rơi lẻ",
    "category": "Personal"
  },
  {
    "id": "C042",
    "en": "Necklace",
    "vi": "Dây chuyền đứt",
    "category": "Personal"
  },
  {
    "id": "C043",
    "en": "Bracelet",
    "vi": "Vòng tay ngọc bích",
    "category": "Personal"
  },
  {
    "id": "C044",
    "en": "Brooch",
    "vi": "Trâm cài áo",
    "category": "Personal/Artistic"
  },
  {
    "id": "C045",
    "en": "Hairpin",
    "vi": "Kẹp tóc",
    "category": "Personal"
  },
  {
    "id": "C046",
    "en": "Wig",
    "vi": "Bộ tóc giả",
    "category": "Personal"
  },
  {
    "id": "C047",
    "en": "Glasses",
    "vi": "Kính cận gãy gọng",
    "category": "Personal"
  },
  {
    "id": "C048",
    "en": "Sunglasses",
    "vi": "Kính râm đen",
    "category": "Personal"
  },
  {
    "id": "C049",
    "en": "Contact Lens",
    "vi": "Kính áp tròng",
    "category": "Personal"
  },
  {
    "id": "C050",
    "en": "Button",
    "vi": "Cúc áo bị đứt",
    "category": "Personal"
  },
  {
    "id": "C051",
    "en": "Cufflink",
    "vi": "Khuy măng sét áo sơ mi",
    "category": "Personal"
  },
  {
    "id": "C052",
    "en": "Gloves",
    "vi": "Đôi găng tay da",
    "category": "Personal"
  },
  {
    "id": "C053",
    "en": "Surgical Mask",
    "vi": "Khẩu trang y tế",
    "category": "Personal/Synthetic"
  },
  {
    "id": "C054",
    "en": "Hat / Cap",
    "vi": "Mũ lưỡi trai",
    "category": "Personal"
  },
  {
    "id": "C055",
    "en": "Raincoat",
    "vi": "Áo mưa mỏng",
    "category": "Personal/Synthetic"
  },
  {
    "id": "C056",
    "en": "Umbrella",
    "vi": "Chiếc ô (dù)",
    "category": "Personal"
  },
  {
    "id": "C057",
    "en": "Handkerchief",
    "vi": "Khăn tay thêu tên",
    "category": "Personal"
  },
  {
    "id": "C058",
    "en": "Wallet",
    "vi": "Ví da rỗng",
    "category": "Personal"
  },
  {
    "id": "C059",
    "en": "Handbag",
    "vi": "Túi xách hàng hiệu",
    "category": "Personal"
  },
  {
    "id": "C060",
    "en": "Briefcase",
    "vi": "Cặp táp khóa số",
    "category": "Personal"
  },
  {
    "id": "C061",
    "en": "Key",
    "vi": "Chùm chìa khóa đồng",
    "category": "Personal"
  },
  {
    "id": "C062",
    "en": "Keycard",
    "vi": "Thẻ từ khách sạn",
    "category": "Personal/Synthetic"
  },
  {
    "id": "C063",
    "en": "Lighter",
    "vi": "Bật lửa Zippo",
    "category": "Personal"
  },
  {
    "id": "C064",
    "en": "Cigarette Butt",
    "vi": "Đầu lọc thuốc lá",
    "category": "Personal"
  },
  {
    "id": "C065",
    "en": "Cigar",
    "vi": "Điếu xì gà Cuba",
    "category": "Personal"
  },
  {
    "id": "C066",
    "en": "Smoking Pipe",
    "vi": "Tẩu thuốc gỗ",
    "category": "Personal"
  },
  {
    "id": "C067",
    "en": "Comb",
    "vi": "Chiếc lược chải đầu",
    "category": "Personal"
  },
  {
    "id": "C068",
    "en": "Mirror",
    "vi": "Gương trang điểm nhỏ",
    "category": "Personal"
  },
  {
    "id": "C069",
    "en": "Nail Polish",
    "vi": "Lọ sơn móng tay",
    "category": "Personal"
  },
  {
    "id": "C070",
    "en": "Fake Fingernail",
    "vi": "Móng tay giả",
    "category": "Personal"
  },
  {
    "id": "C071",
    "en": "Toothbrush",
    "vi": "Bàn chải đánh răng",
    "category": "Personal"
  },
  {
    "id": "C072",
    "en": "Towel",
    "vi": "Khăn mặt dính vết bẩn",
    "category": "Personal"
  },
  {
    "id": "C073",
    "en": "Sock",
    "vi": "Chiếc tất lẻ",
    "category": "Personal"
  },
  {
    "id": "C074",
    "en": "Leather Shoe",
    "vi": "Giày tây nam",
    "category": "Personal"
  },
  {
    "id": "C075",
    "en": "Sneakers",
    "vi": "Giày thể thao dính bùn",
    "category": "Personal"
  },
  {
    "id": "C076",
    "en": "Slippers",
    "vi": "Dép đi trong nhà",
    "category": "Personal"
  },
  {
    "id": "C077",
    "en": "Apron",
    "vi": "Tạp dề làm bếp",
    "category": "Personal"
  },
  {
    "id": "C078",
    "en": "Uniform",
    "vi": "Đồng phục nhân viên",
    "category": "Personal"
  },
  {
    "id": "C079",
    "en": "Badge / Medal",
    "vi": "Huy chương kỷ niệm",
    "category": "Personal"
  },
  {
    "id": "C080",
    "en": "Whistle",
    "vi": "Còi bạc",
    "category": "Personal"
  },
  {
    "id": "C081",
    "en": "Hair",
    "vi": "Sợi tóc dài",
    "category": "Natural"
  },
  {
    "id": "C082",
    "en": "Cat Hair",
    "vi": "Lông mèo",
    "category": "Natural"
  },
  {
    "id": "C083",
    "en": "Dog Fur",
    "vi": "Lông chó",
    "category": "Natural"
  },
  {
    "id": "C084",
    "en": "Feather",
    "vi": "Lông vũ chim",
    "category": "Natural"
  },
  {
    "id": "C085",
    "en": "Rose Petal",
    "vi": "Cánh hoa hồng khô",
    "category": "Natural/Artistic"
  },
  {
    "id": "C086",
    "en": "Leaf",
    "vi": "Chiếc lá cây lạ",
    "category": "Natural"
  },
  {
    "id": "C087",
    "en": "Grass",
    "vi": "Cỏ dại dính đất",
    "category": "Natural"
  },
  {
    "id": "C088",
    "en": "Mud / Soil",
    "vi": "Bùn đất ướt",
    "category": "Natural"
  },
  {
    "id": "C089",
    "en": "Sand",
    "vi": "Cát biển",
    "category": "Natural"
  },
  {
    "id": "C090",
    "en": "Seashell",
    "vi": "Vỏ sò biển",
    "category": "Natural"
  },
  {
    "id": "C091",
    "en": "Spider Web",
    "vi": "Mạng nhện",
    "category": "Natural"
  },
  {
    "id": "C092",
    "en": "Dead Insect",
    "vi": "Xác côn trùng",
    "category": "Natural"
  },
  {
    "id": "C093",
    "en": "Mosquito",
    "vi": "Vết muỗi đốt / Xác muỗi",
    "category": "Natural"
  },
  {
    "id": "C094",
    "en": "Apple",
    "vi": "Quả táo cắn dở",
    "category": "Natural"
  },
  {
    "id": "C095",
    "en": "Banana Peel",
    "vi": "Vỏ chuối",
    "category": "Natural"
  },
  {
    "id": "C096",
    "en": "Orange",
    "vi": "Vỏ cam tươi",
    "category": "Natural"
  },
  {
    "id": "C097",
    "en": "Peanut",
    "vi": "Hạt đậu phộng (dị ứng)",
    "category": "Natural"
  },
  {
    "id": "C098",
    "en": "Coffee Beans",
    "vi": "Hạt cà phê rang",
    "category": "Natural"
  },
  {
    "id": "C099",
    "en": "Tea Leaves",
    "vi": "Bã trà Ô Long",
    "category": "Natural"
  },
  {
    "id": "C100",
    "en": "Herbs",
    "vi": "Thảo dược Đông y",
    "category": "Natural"
  },
  {
    "id": "C101",
    "en": "Spices",
    "vi": "Bột gia vị cay",
    "category": "Natural"
  },
  {
    "id": "C102",
    "en": "Sugar / Salt",
    "vi": "Hạt đường / Muối trắng",
    "category": "Natural"
  },
  {
    "id": "C103",
    "en": "Flour",
    "vi": "Bột mì vương vãi",
    "category": "Natural"
  },
  {
    "id": "C104",
    "en": "Rice",
    "vi": "Cơm thừa",
    "category": "Natural"
  },
  {
    "id": "C105",
    "en": "Noodles",
    "vi": "Tô mì ăn dở",
    "category": "Natural"
  },
  {
    "id": "C106",
    "en": "Bread",
    "vi": "Mẫu bánh mì",
    "category": "Natural"
  },
  {
    "id": "C107",
    "en": "Cake",
    "vi": "Bánh kem sinh nhật",
    "category": "Natural"
  },
  {
    "id": "C108",
    "en": "Chocolate",
    "vi": "Thanh Sô-cô-la",
    "category": "Natural"
  },
  {
    "id": "C109",
    "en": "Candy",
    "vi": "Viên kẹo ngọt",
    "category": "Natural"
  },
  {
    "id": "C110",
    "en": "Chewing Gum",
    "vi": "Bã kẹo cao su",
    "category": "Natural/Synthetic"
  },
  {
    "id": "C111",
    "en": "Ice Cream",
    "vi": "Kem tan chảy",
    "category": "Natural"
  },
  {
    "id": "C112",
    "en": "Ice Cube",
    "vi": "Viên nước đá đang tan",
    "category": "Natural"
  },
  {
    "id": "C113",
    "en": "Bone",
    "vi": "Khúc xương động vật",
    "category": "Natural"
  },
  {
    "id": "C114",
    "en": "Fish Scale",
    "vi": "Vảy cá tươi",
    "category": "Natural"
  },
  {
    "id": "C115",
    "en": "Eggshell",
    "vi": "Vỏ trứng vỡ",
    "category": "Natural"
  },
  {
    "id": "C116",
    "en": "Red Wine Stain",
    "vi": "Vết rượu vang đỏ",
    "category": "Natural"
  },
  {
    "id": "C117",
    "en": "Juice",
    "vi": "Ly nước ép trái cây",
    "category": "Natural"
  },
  {
    "id": "C118",
    "en": "Milk",
    "vi": "Hộp sữa đổ",
    "category": "Natural"
  },
  {
    "id": "C119",
    "en": "Wood Chips",
    "vi": "Mùn cưa / Dăm gỗ",
    "category": "Natural"
  },
  {
    "id": "C120",
    "en": "Charcoal",
    "vi": "Than củi đen",
    "category": "Natural"
  },
  {
    "id": "C121",
    "en": "Smartphone",
    "vi": "Điện thoại di động",
    "category": "Synthetic"
  },
  {
    "id": "C122",
    "en": "Laptop",
    "vi": "Máy tính xách tay",
    "category": "Synthetic"
  },
  {
    "id": "C123",
    "en": "USB Flash Drive",
    "vi": "Thẻ nhớ USB",
    "category": "Synthetic"
  },
  {
    "id": "C124",
    "en": "SD Memory Card",
    "vi": "Thẻ nhớ máy ảnh",
    "category": "Synthetic"
  },
  {
    "id": "C125",
    "en": "Camera",
    "vi": "Máy ảnh kỹ thuật số",
    "category": "Synthetic"
  },
  {
    "id": "C126",
    "en": "CCTV Tape",
    "vi": "Băng ghi hình camera an ninh",
    "category": "Synthetic"
  },
  {
    "id": "C127",
    "en": "Voice Recorder",
    "vi": "Máy ghi âm bỏ túi",
    "category": "Synthetic"
  },
  {
    "id": "C128",
    "en": "Earphones",
    "vi": "Tai nghe đứt dây",
    "category": "Synthetic"
  },
  {
    "id": "C129",
    "en": "Charger Cable",
    "vi": "Dây cáp sạc",
    "category": "Synthetic"
  },
  {
    "id": "C130",
    "en": "Battery",
    "vi": "Viên pin tiểu",
    "category": "Synthetic"
  },
  {
    "id": "C131",
    "en": "Flashlight",
    "vi": "Đèn pin cầm tay",
    "category": "Synthetic"
  },
  {
    "id": "C132",
    "en": "Light Bulb",
    "vi": "Bóng đèn cháy",
    "category": "Synthetic"
  },
  {
    "id": "C133",
    "en": "Fuse",
    "vi": "Cầu chì điện đứt",
    "category": "Synthetic"
  },
  {
    "id": "C134",
    "en": "Remote Control",
    "vi": "Điều khiển tivi",
    "category": "Synthetic"
  },
  {
    "id": "C135",
    "en": "Alarm Clock",
    "vi": "Đồng hồ báo thức",
    "category": "Synthetic"
  },
  {
    "id": "C136",
    "en": "Electric Fan",
    "vi": "Quạt máy đang quay",
    "category": "Synthetic"
  },
  {
    "id": "C137",
    "en": "Iron",
    "vi": "Bàn ủi quần áo còn nóng",
    "category": "Synthetic"
  },
  {
    "id": "C138",
    "en": "Hair Dryer",
    "vi": "Máy sấy tóc",
    "category": "Synthetic"
  },
  {
    "id": "C139",
    "en": "Syringe",
    "vi": "Ống bơm tiêm rỗng",
    "category": "Synthetic"
  },
  {
    "id": "C140",
    "en": "Medicine Bottle",
    "vi": "Lọ thuốc rỗng",
    "category": "Synthetic"
  },
  {
    "id": "C141",
    "en": "Bandage",
    "vi": "Băng gạc y tế dính máu",
    "category": "Synthetic"
  },
  {
    "id": "C142",
    "en": "Cotton Swab",
    "vi": "Tăm bông y tế",
    "category": "Synthetic"
  },
  {
    "id": "C143",
    "en": "Thermometer",
    "vi": "Nhiệt kế thủy ngân vỡ",
    "category": "Synthetic"
  },
  {
    "id": "C144",
    "en": "Rubber Gloves",
    "vi": "Găng tay cao su",
    "category": "Synthetic"
  },
  {
    "id": "C145",
    "en": "Soap",
    "vi": "Bánh xà phòng",
    "category": "Synthetic"
  },
  {
    "id": "C146",
    "en": "Detergent / Bleach",
    "vi": "Chai thuốc tẩy Javel",
    "category": "Synthetic"
  },
  {
    "id": "C147",
    "en": "Mop / Rag",
    "vi": "Cây lau nhà / Giẻ lau",
    "category": "Synthetic"
  },
  {
    "id": "C148",
    "en": "Trash Bag",
    "vi": "Túi đựng rác đen",
    "category": "Synthetic"
  },
  {
    "id": "C149",
    "en": "Duct Tape",
    "vi": "Cuộn băng dính xám",
    "category": "Synthetic"
  },
  {
    "id": "C150",
    "en": "Super Glue",
    "vi": "Keo dán sắt 502",
    "category": "Synthetic"
  },
  {
    "id": "C151",
    "en": "Rope / Twine",
    "vi": "Đoạn dây gai",
    "category": "Synthetic"
  },
  {
    "id": "C152",
    "en": "Padlock",
    "vi": "Ổ khóa bị cạy",
    "category": "Synthetic"
  },
  {
    "id": "C153",
    "en": "Screwdriver",
    "vi": "Tua vít",
    "category": "Synthetic"
  },
  {
    "id": "C154",
    "en": "Nails / Screws",
    "vi": "Đinh vít kim loại",
    "category": "Synthetic"
  },
  {
    "id": "C155",
    "en": "Sawdust",
    "vi": "Bụi kim loại / Mạt sắt",
    "category": "Synthetic"
  },
  {
    "id": "C156",
    "en": "Paint Brush",
    "vi": "Cọ quét sơn",
    "category": "Synthetic/Artistic"
  },
  {
    "id": "C157",
    "en": "Lubricant Oil",
    "vi": "Vết dầu nhớt bôi trơn",
    "category": "Synthetic"
  },
  {
    "id": "C158",
    "en": "Gasoline Can",
    "vi": "Can xăng nhựa",
    "category": "Synthetic"
  },
  {
    "id": "C159",
    "en": "Tire Marks",
    "vi": "Vết lốp xe phanh gấp",
    "category": "Synthetic"
  },
  {
    "id": "C160",
    "en": "Helmet",
    "vi": "Mũ bảo hiểm",
    "category": "Synthetic"
  },
  {
    "id": "C161",
    "en": "License Plate",
    "vi": "Biển số xe rơi",
    "category": "Synthetic"
  },
  {
    "id": "C162",
    "en": "Bullet Casing",
    "vi": "Vỏ đạn đồng",
    "category": "Synthetic"
  },
  {
    "id": "C163",
    "en": "Gunpowder Residue",
    "vi": "Thuốc súng vương lại",
    "category": "Synthetic"
  },
  {
    "id": "C164",
    "en": "Handcuffs",
    "vi": "Còng tay số 8",
    "category": "Synthetic"
  },
  {
    "id": "C165",
    "en": "Paperclip",
    "vi": "Kẹp giấy bẻ cong",
    "category": "Synthetic"
  },
  {
    "id": "C166",
    "en": "Fountain Pen",
    "vi": "Bút máy mực đen",
    "category": "Synthetic/Written"
  },
  {
    "id": "C167",
    "en": "Chalk",
    "vi": "Viên phấn trắng",
    "category": "Synthetic"
  },
  {
    "id": "C168",
    "en": "Eraser",
    "vi": "Cục tẩy cao su",
    "category": "Synthetic"
  },
  {
    "id": "C169",
    "en": "Ruler",
    "vi": "Thước kẻ kim loại",
    "category": "Synthetic"
  },
  {
    "id": "C170",
    "en": "Wine Glass",
    "vi": "Ly rượu vang có dấu môi",
    "category": "Synthetic"
  },
  {
    "id": "C171",
    "en": "Painting",
    "vi": "Bức tranh sơn dầu rách",
    "category": "Artistic"
  },
  {
    "id": "C172",
    "en": "Photograph",
    "vi": "Bức ảnh chụp chung bị xé",
    "category": "Artistic/Personal"
  },
  {
    "id": "C173",
    "en": "Porcelain Vase",
    "vi": "Bình gốm sứ cổ vỡ",
    "category": "Artistic"
  },
  {
    "id": "C174",
    "en": "Violin",
    "vi": "Đàn Violin đứt dây",
    "category": "Artistic"
  },
  {
    "id": "C175",
    "en": "Sheet Music",
    "vi": "Bản nhạc viết tay",
    "category": "Artistic/Written"
  },
  {
    "id": "C176",
    "en": "Theater Mask",
    "vi": "Mặt nạ kịch Opera",
    "category": "Artistic"
  },
  {
    "id": "C177",
    "en": "Origami Crane",
    "vi": "Hạc giấy Origami",
    "category": "Artistic"
  },
  {
    "id": "C178",
    "en": "Calligraphy Brush",
    "vi": "Bút lông thư pháp",
    "category": "Artistic"
  },
  {
    "id": "C179",
    "en": "Antique Coin",
    "vi": "Đồng xu cổ",
    "category": "Artistic"
  },
  {
    "id": "C180",
    "en": "Jade Pendant",
    "vi": "Mặt ngọc bội điêu khắc",
    "category": "Artistic/Personal"
  },
  {
    "id": "C181",
    "en": "Mahjong Tile",
    "vi": "Quân bài Mạt chược",
    "category": "Unrelated/Personal"
  },
  {
    "id": "C182",
    "en": "Playing Cards",
    "vi": "Lá bài Tây (Át Bích)",
    "category": "Unrelated/Artistic"
  },
  {
    "id": "C183",
    "en": "Poker Chip",
    "vi": "Chip sòng bạc",
    "category": "Unrelated/Synthetic"
  },
  {
    "id": "C184",
    "en": "Dice",
    "vi": "Viên xúc xắc",
    "category": "Unrelated"
  },
  {
    "id": "C185",
    "en": "Chess Piece",
    "vi": "Quân cờ Vua (Quân Hậu)",
    "category": "Artistic"
  },
  {
    "id": "C186",
    "en": "Puzzle Piece",
    "vi": "Mảnh ghép hình (Jigsaw)",
    "category": "Artistic"
  },
  {
    "id": "C187",
    "en": "Stuffed Toy / Teddy Bear",
    "vi": "Gấu bông rách",
    "category": "Personal/Unrelated"
  },
  {
    "id": "C188",
    "en": "Puppet / Doll",
    "vi": "Con búp bê sứ",
    "category": "Artistic"
  },
  {
    "id": "C189",
    "en": "Balloon",
    "vi": "Quả bóng bay xẹp",
    "category": "Unrelated"
  },
  {
    "id": "C190",
    "en": "Gift Box",
    "vi": "Hộp quà buộc nơ",
    "category": "Personal"
  },
  {
    "id": "C191",
    "en": "Candle",
    "vi": "Ngọn nến thơm cháy dở",
    "category": "Artistic"
  },
  {
    "id": "C192",
    "en": "Incense / Joss Paper",
    "vi": "Nhang trầm / Tro vàng mã",
    "category": "Natural/Artistic"
  },
  {
    "id": "C193",
    "en": "Amulet / Talisman",
    "vi": "Lá bùa hộ mệnh",
    "category": "Personal/Written"
  },
  {
    "id": "C194",
    "en": "Tarot Card",
    "vi": "Lá bài Tarot (The Death)",
    "category": "Artistic/Written"
  },
  {
    "id": "C195",
    "en": "Cross / Rosary",
    "vi": "Chuỗi tràng hạt / Thánh giá",
    "category": "Personal"
  },
  {
    "id": "C196",
    "en": "Soccer Ball",
    "vi": "Quả bóng đá",
    "category": "Unrelated"
  },
  {
    "id": "C197",
    "en": "Fishing Rod",
    "vi": "Lưỡi câu / Dây câu cá",
    "category": "Synthetic"
  },
  {
    "id": "C198",
    "en": "Compass",
    "vi": "La bàn định hướng",
    "category": "Synthetic"
  },
  {
    "id": "C199",
    "en": "Binoculars",
    "vi": "Ống nhòm",
    "category": "Synthetic"
  },
  {
    "id": "C200",
    "en": "Safe Combination",
    "vi": "Mảnh giấy ghi mã két sắt",
    "category": "Written"
  }
];

export const CATEGORY_ICONS = {
  // Means categories
  'Poisoning': '🧪',
  'Poisoning/Illness': '🦠',
  'Poisoning/Suffocation': '☠️',
  'Suffocation': '🪢',
  'Suffocation/Accident': '🌊',
  'Suffocation/Severe Injury': '🪨',
  'Loss of Blood': '🩸',
  'Loss of Blood/Severe Injury': '🗡️',
  'Loss of Blood/Accident': '🦈',
  'Severe Injury': '🔨',
  'Severe Injury/Accident': '💥',
  'Accident': '⚡',
  'Illness': '💊',
  // Clue categories
  'Written': '📜',
  'Written/Personal': '🪪',
  'Written/Synthetic': '💻',
  'Personal': '💍',
  'Personal/Synthetic': '📱',
  'Personal/Written': '📓',
  'Personal/Natural': '🦷',
  'Personal/Unrelated': '🧸',
  'Natural': '🌿',
  'Natural/Personal': '🐾',
  'Natural/Artistic': '🕯️',
  'Synthetic': '⚙️',
  'Synthetic/Artistic': '🖌️',
  'Synthetic/Written': '🖋️',
  'Artistic': '🎭',
  'Artistic/Personal': '🖼️',
  'Artistic/Written': '🎼',
  'Unrelated': '🎲',
  'Unrelated/Personal': '🀄',
  'Unrelated/Artistic': '🃏',
  'Unrelated/Synthetic': '🪙'
};

export function getCardIcon(category) {
  if (!category) return '🔎';
  if (CATEGORY_ICONS[category]) return CATEGORY_ICONS[category];
  const primary = category.split('/')[0].trim();
  return CATEGORY_ICONS[primary] || '🔎';
}
