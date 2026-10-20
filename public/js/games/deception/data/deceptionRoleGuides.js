/**
 * DECEPTION: MURDER IN VIET NAM - ROLE QUICK PLAYBOOKS & GUIDES
 * Comprehensive, concise, easy-to-understand guides for all 9 roles.
 * Includes: Core Goal, 3-Step Action Playbook, Crucial Rule/Pro Tip (Bilingual VI/EN).
 */

export const ROLE_GUIDES = {
  "FORENSIC_SCIENTIST": {
    "roleId": "FORENSIC_SCIENTIST",
    "title_vi": "Chuyên Gia Pháp Y",
    "title_en": "Forensic Scientist",
    "team": "INVESTIGATION",
    "icon": "🔬",
    "motto_vi": "Người nắm giữ chân tướng — Dẫn lối bằng đạn gỗ",
    "motto_en": "Master of truth — Leading detectives via wooden markers",
    "goal_vi": "Giúp Cảnh sát đoán đúng cặp Hung khí + Manh mối của Sát nhân trước khi hết 3 vòng.",
    "goal_en": "Help the Investigators deduce the exact Means + Clue cards before Round 3 ends.",
    "steps_vi": [
      {
        "num": 1,
        "title": "Mở Mắt Trong Đêm",
        "desc": "Thấy rõ ai là Kẻ Sát Nhân và cặp thẻ gây án (1 Hung khí Xanh + 1 Manh mối Đỏ)."
      },
      {
        "num": 2,
        "title": "Cắm 6 Viên Đạn Gợi Ý",
        "desc": "Đặt 6 viên đạn vào các thẻ Hiện trường (Nguyên nhân tử vong, Địa điểm,...) để gợi ý tới 2 thẻ đó."
      },
      {
        "num": 3,
        "title": "Đổi Thẻ Sau Mỗi Vòng",
        "desc": "Đầu Vòng 2 & 3, rút 1 thẻ hiện trường mới thay thế 1 thẻ cũ để điều chỉnh hướng suy luận."
      }
    ],
    "steps_en": [
      {
        "num": 1,
        "title": "Witness in the Dark",
        "desc": "See the Murderer and their chosen Means (Blue) and Clue (Red) cards."
      },
      {
        "num": 2,
        "title": "Place 6 Bullet Markers",
        "desc": "Place markers onto Scene Tiles (Cause of Death, Location, etc.) to evoke the murder cards."
      },
      {
        "num": 3,
        "title": "Cycle Tiles Each Round",
        "desc": "At the start of Rounds 2 and 3, replace 1 old Scene Tile to refine your clues."
      }
    ],
    "crucial_vi": "⚠️ ĐIỀU CẤM KỴ: Tuyệt đối KHÔNG NÓI CHUYỆN, gật/lắc đầu hay ra hiệu. Mọi giao tiếp CHỈ qua đạn gỗ!",
    "crucial_en": "⚠️ STRICT RULE: Never speak, nod, shake head, or gesture. All communication is via wooden markers!"
  },

  "MURDERER": {
    "roleId": "MURDERER",
    "title_vi": "Kẻ Sát Nhân",
    "title_en": "The Murderer",
    "team": "CRIMINAL",
    "icon": "🔪",
    "motto_vi": "Bóng ma hiện trường — Trà trộn, đánh lạc hướng và đào tẩu",
    "motto_en": "Shadow of the crime — Blend in, mislead, and escape",
    "goal_vi": "Trốn thoát qua 3 vòng điều tra mà không bị bắt, hoặc ám sát thành công Nhân Chứng ở cuối trận.",
    "goal_en": "Survive 3 rounds without being caught, or assassinate the Witness if exposed.",
    "steps_vi": [
      {
        "num": 1,
        "title": "Chọn Thẻ Gây Án",
        "desc": "Trong Đêm, chọn bí mật 1 Hung khí (Xanh) và 1 Manh mối (Đỏ) trên bàn của bạn để hạ sát nạn nhân."
      },
      {
        "num": 2,
        "title": "Trà Trộn & Tung Hỏa Mù",
        "desc": "Nói năng tự nhiên như người vô tội; khéo léo giải thích đạn Pháp y theo hướng trỏ vào thẻ của người khác."
      },
      {
        "num": 3,
        "title": "Bắn Hạ Nhân Chứng",
        "desc": "Nếu bị Cảnh sát bắt, bạn có 1 cơ hội cuối cùng: Đoán ai là Nhân chứng — nếu bắn trúng, bạn LẬT KÈO THẮNG!"
      }
    ],
    "steps_en": [
      {
        "num": 1,
        "title": "Pick Crime Cards",
        "desc": "At Night, secretly pick 1 Means (Blue) and 1 Clue (Red) in your own station."
      },
      {
        "num": 2,
        "title": "Blend in & Misdirect",
        "desc": "Act innocent, join debate, and subtly interpret forensic clues toward other players."
      },
      {
        "num": 3,
        "title": "Shoot the Witness",
        "desc": "If arrested, guess the Witness—hit correctly to steal the victory!"
      }
    ],
    "crucial_vi": "💡 MẸO SỐNG CÒN: Quan sát xem ai đang cố lèo lái bàn chơi nhắm vào thẻ của bạn một cách bí hiểm — kẻ đó rất có thể là Nhân Chứng!",
    "crucial_en": "💡 SURVIVAL TIP: Watch for anyone subtly steering the table toward your cards—they are likely the Witness!"
  },

  "INVESTIGATOR": {
    "roleId": "INVESTIGATOR",
    "title_vi": "Điều Tra Viên",
    "title_en": "Investigator",
    "team": "INVESTIGATION",
    "icon": "🕵️",
    "motto_vi": "Lưới trời lồng lộng — Phân tích vật chứng, vạch trần tội ác",
    "motto_en": "Seeker of truth — Analyze evidence, unmask the culprit",
    "goal_vi": "Tìm ra ai là Kẻ Sát Nhân và đúng cặp Hung khí (Xanh) + Manh mối (Đỏ) của hắn.",
    "goal_en": "Identify the true Murderer and their exact Means (Blue) + Clue (Red) cards.",
    "steps_vi": [
      {
        "num": 1,
        "title": "Soi Đạn Pháp Y",
        "desc": "Đối chiếu 6 viên đạn trên các thẻ Hiện trường (Nguyên nhân tử vong, Địa điểm...) với thẻ các nghi can."
      },
      {
        "num": 2,
        "title": "Thảo Luận & Phản Biện",
        "desc": "Tích cực trao đổi, tìm kiếm mối liên kết giữa các vật chứng và quan sát thái độ của từng người."
      },
      {
        "num": 3,
        "title": "Phá Án 1 Chạm",
        "desc": "Khi chắc chắn, nhấp chọn 1 Hung khí + 1 Manh mối của nghi can rồi bấm [⚡ Phá án ngay]!"
      }
    ],
    "steps_en": [
      {
        "num": 1,
        "title": "Examine Markers",
        "desc": "Compare the 6 bullet markers on Scene Tiles with evidence cards across all suspect stations."
      },
      {
        "num": 2,
        "title": "Debate & Interrogate",
        "desc": "Discuss theories, look for creative interpretations of forensic clues, and spot inconsistencies."
      },
      {
        "num": 3,
        "title": "Accuse in 1-Click",
        "desc": "When confident, select 1 Means + 1 Clue on a suspect and click [⚡ Accuse Now]!"
      }
    ],
    "crucial_vi": "⚠️ LƯU Ý QUAN TRỌNG: Bạn chỉ có DUY NHẤT 1 HUY HIỆU PHÁ ÁN. Đoán sai sẽ mất vĩnh viễn quyền phá án (nhưng vẫn được thảo luận)!",
    "crucial_en": "⚠️ CRUCIAL NOTE: You only have ONE BADGE. If incorrect, you lose your badge permanently (though you can still debate)!"
  },

  "ACCOMPLICE": {
    "roleId": "ACCOMPLICE",
    "title_vi": "Đồng Phạm",
    "title_en": "The Accomplice",
    "team": "CRIMINAL",
    "icon": "🎭",
    "motto_vi": "Tay trong bóng tối — Che chắn hung thủ, gây nhiễu cuộc điều tra",
    "motto_en": "Partner in crime — Shield the killer, disrupt the investigation",
    "goal_vi": "Bảo vệ Kẻ Sát Nhân không bị bắt, hoặc hỗ trợ Sát nhân tìm ra Nhân Chứng.",
    "goal_en": "Protect the Murderer from being arrested, or help identify the Witness.",
    "steps_vi": [
      {
        "num": 1,
        "title": "Biết Rõ Kẻ Gây Án",
        "desc": "Trong Đêm mở mắt cùng Sát nhân, biết rõ ai là Sát nhân và cặp thẻ gây án đã chọn."
      },
      {
        "num": 2,
        "title": "Tung Hỏa Mù Tích Cực",
        "desc": "Giải thích các viên đạn Pháp y theo hướng hợp lý nhưng lại trỏ vào thẻ của các Điều tra viên vô tội."
      },
      {
        "num": 3,
        "title": "Thu Hút Hỏa Lực",
        "desc": "Nhận bớt nghi ngờ về mình hoặc dùng Huy hiệu phá án bừa để đánh lừa và làm rối Cảnh sát."
      }
    ],
    "steps_en": [
      {
        "num": 1,
        "title": "Meet the Murderer",
        "desc": "At Night, wake up with the Murderer and learn their identity and the 2 murder cards."
      },
      {
        "num": 2,
        "title": "Deploy Smoke & Mirrors",
        "desc": "Provide clever arguments linking forensic markers to innocent players' cards."
      },
      {
        "num": 3,
        "title": "Draw Fire",
        "desc": "Attract suspicion onto yourself or spend your badge on a wrong accusation to mislead the police."
      }
    ],
    "crucial_vi": "💡 MẸO SỐNG CÒN: Nếu Sát nhân bị nghi ngờ, hãy gây chú ý để Sát nhân có cơ hội quan sát và tìm ra Nhân Chứng!",
    "crucial_en": "💡 PRO TIP: If suspicion falls on the Murderer, draw attention to yourself so the Murderer can spot the Witness!"
  },

  "WITNESS": {
    "roleId": "WITNESS",
    "title_vi": "Nhân Chứng",
    "title_en": "The Witness",
    "team": "INVESTIGATION",
    "icon": "👁️",
    "motto_vi": "Đôi mắt vô hình — Thấy rõ tội ác nhưng phải giấu mình để sống sót",
    "motto_en": "The silent eye — Sees the criminals but must stay hidden to survive",
    "goal_vi": "Dẫn dắt Cảnh sát bắt đúng Kẻ Sát Nhân mà TUYỆT ĐỐI KHÔNG ĐƯỢC ĐỂ LỘ BẢN THÂN.",
    "goal_en": "Guide the investigation to catch the Murderer while KEEPING YOUR IDENTITY HIDDEN.",
    "steps_vi": [
      {
        "num": 1,
        "title": "Thấy Phe Tội Phạm",
        "desc": "Trong Đêm, bạn thấy 2 kẻ gian (Sát nhân & Đồng phạm), nhưng KHÔNG BIẾT ai là ai và họ chọn thẻ gì."
      },
      {
        "num": 2,
        "title": "Gợi Ý Khéo Léo",
        "desc": "Tế nhị hướng bàn chơi vào thẻ của 2 người này, nhưng nói năng tự nhiên như người chưa biết gì."
      },
      {
        "num": 3,
        "title": "Ẩn Mình Cẩn Trọng",
        "desc": "Đừng bao giờ khẳng định chắc nịch hoặc ép người khác, tránh bị Sát nhân nhận diện."
      }
    ],
    "steps_en": [
      {
        "num": 1,
        "title": "See the Culprits",
        "desc": "At Night, see the 2 Criminals (Murderer & Accomplice), without knowing which is which."
      },
      {
        "num": 2,
        "title": "Subtle Guidance",
        "desc": "Nudge detectives toward these 2 suspects' cards using plausible, natural reasoning."
      },
      {
        "num": 3,
        "title": "Stay in Shadows",
        "desc": "Never sound overly certain or authoritative—acting too knowledgeable will expose you!"
      }
    ],
    "crucial_vi": "⚠️ NGUY HIỂM CHÍ MẠNG: Dù Cảnh sát phá án đúng, nhưng nếu Sát nhân bắn trúng bạn ở cuối trận, PHE CẢNH SÁT SẼ THUA!",
    "crucial_en": "⚠️ DEADLY HAZARD: Even if police solve the case, if the Murderer shoots you at the end, THE POLICE LOSE!"
  },

  "LAB_TECHNICIAN": {
    "roleId": "LAB_TECHNICIAN",
    "title_vi": "Kỹ Thuật Viên Phòng Lab",
    "title_en": "Lab Technician",
    "team": "INVESTIGATION",
    "icon": "🧪",
    "motto_vi": "Khoa học hình sự — Kiểm chứng mẫu vật trực tiếp trong phòng thí nghiệm",
    "motto_en": "Forensic testing — Test evidence directly in the laboratory",
    "goal_vi": "Kiểm định 1 thẻ bài nghi vấn để mang lại manh mối thép cho phe Điều tra.",
    "goal_en": "Test 1 suspicious card to provide definitive proof to the investigation.",
    "steps_vi": [
      {
        "num": 1,
        "title": "Đêm Hoạt Động Ngầm",
        "desc": "Giữa Vòng 1 và Vòng 2, bí mật chọn 1 lá bài bất kỳ trên bàn để xét nghiệm trong phòng lab."
      },
      {
        "num": 2,
        "title": "Nhận Kết Quả",
        "desc": "Hệ thống báo ngay kết quả: Lá bài đó có phải là một phần của vụ án hay không (Dương tính / Âm tính)."
      },
      {
        "num": 3,
        "title": "Dẫn Dắt Thông Minh",
        "desc": "Dùng kết quả này để định hướng điều tra mà không để Sát nhân nghi bạn là Nhân chứng."
      }
    ],
    "steps_en": [
      {
        "num": 1,
        "title": "Undercover Night Test",
        "desc": "Between Round 1 and 2, secretly choose any 1 card on the table to run lab tests on."
      },
      {
        "num": 2,
        "title": "Instant Result",
        "desc": "Receive immediate feedback: Whether the card is positive (part of crime) or negative."
      },
      {
        "num": 3,
        "title": "Tactical Guidance",
        "desc": "Use confirmed intel to guide the room without making yourself look like the Witness."
      }
    ],
    "crucial_vi": "💡 MẸO SỐNG CÒN: Mẫu Dương tính là bằng chứng vàng để bắt hung thủ; mẫu Âm tính giúp loại trừ ngay một hướng đi sai!",
    "crucial_en": "💡 PRO TIP: A positive test is golden evidence; a negative test instantly eliminates a misleading rabbit hole!"
  },

  "INSIDE_MAN": {
    "roleId": "INSIDE_MAN",
    "title_vi": "Nội Gián",
    "title_en": "Inside Man",
    "team": "CRIMINAL",
    "icon": "🕶️",
    "motto_vi": "Bàn tay giấu mặt — Đánh cắp huy hiệu, chặt đứt quyền lực cảnh sát",
    "motto_en": "Hidden sabotage — Steal police badges, cripple the investigation",
    "goal_vi": "Tê liệt khả năng phá án của Điều tra viên nguy hiểm nhất trên bàn.",
    "goal_en": "Neutralize the most dangerous Investigator by stripping their badge.",
    "steps_vi": [
      {
        "num": 1,
        "title": "Hành Động Trong Đêm",
        "desc": "Giữa Vòng 1 và Vòng 2, bí mật chọn 1 Điều tra viên để đánh cắp Huy hiệu Phá án của họ."
      },
      {
        "num": 2,
        "title": "Tước Quyền Phá Án",
        "desc": "Người bị chọn sẽ vĩnh viễn mất quyền bấm phá án trong toàn bộ các vòng còn lại."
      },
      {
        "num": 3,
        "title": "Bảo Vệ Sát Nhân",
        "desc": "Tiếp tục giả làm cảnh sát để tung tin giả và bảo vệ đồng bọn."
      }
    ],
    "steps_en": [
      {
        "num": 1,
        "title": "Undercover Strike",
        "desc": "Between Round 1 and 2, secretly choose 1 player to steal their badge."
      },
      {
        "num": 2,
        "title": "Neutralize Target",
        "desc": "The chosen investigator permanently loses their right to make an accusation."
      },
      {
        "num": 3,
        "title": "Cover the Killer",
        "desc": "Blend in, feed disinformation, and protect your criminal partner."
      }
    ],
    "crucial_vi": "💡 MẸO SỐNG CÒN: Hãy tước huy hiệu của Điều tra viên có suy luận sắc sảo nhất hoặc người đang nghi ngờ đúng Sát nhân!",
    "crucial_en": "💡 PRO TIP: Steal the badge of the sharpest detective or whoever is closest to unmasking the Murderer!"
  },

  "PROTECTIVE_DETAIL": {
    "roleId": "PROTECTIVE_DETAIL",
    "title_vi": "Đặc Vụ Bảo Vệ",
    "title_en": "Protective Detail",
    "team": "INVESTIGATION",
    "icon": "🛡️",
    "motto_vi": "Lá chắn thép — Thu hút hỏa lực, bảo vệ Nhân Chứng đến cùng",
    "motto_en": "The steel shield — Draw fire, protect the Witness at all costs",
    "goal_vi": "Lừa Kẻ Sát Nhân bắn vào bạn thay vì bắn vào Nhân Chứng ở cuối trận.",
    "goal_en": "Shield the Witness by tricking the Murderer into shooting you at the end.",
    "steps_vi": [
      {
        "num": 1,
        "title": "Biết Rõ Nhân Chứng",
        "desc": "Ngay trong pha Đêm, bạn được biết chính xác ai là Nhân Chứng thật của vụ án."
      },
      {
        "num": 2,
        "title": "Đóng Giả Nhân Chứng",
        "desc": "Hành xử sắc sảo, tự tin để Kẻ Sát Nhân tin rằng bạn chính là Nhân Chứng."
      },
      {
        "num": 3,
        "title": "Đỡ Đạn Cuối Trận",
        "desc": "Nếu Sát nhân bị bắt và bắn vào bạn thay vì Nhân chứng, PHE CẢNH SÁT TOÀN THẮNG!"
      }
    ],
    "steps_en": [
      {
        "num": 1,
        "title": "Know the Witness",
        "desc": "At Night, learn the exact identity of the Witness."
      },
      {
        "num": 2,
        "title": "Act as Decoy",
        "desc": "Speak with keen insight and subtle confidence to draw the Murderer's eyes onto you."
      },
      {
        "num": 3,
        "title": "Take the Bullet",
        "desc": "If the caught Murderer shoots you instead of the real Witness, THE POLICE WIN!"
      }
    ],
    "crucial_vi": "💡 MẸO SỐNG CÒN: Hãy tự tin và thu hút sự chú ý! Bạn càng giống Nhân Chứng thì Nhân Chứng thật càng an toàn.",
    "crucial_en": "💡 PRO TIP: Do not shy from attention! The more you look like the Witness, the safer the real Witness is."
  },

  "CONSULTING_DETECTIVE": {
    "roleId": "CONSULTING_DETECTIVE",
    "title_vi": "Thám Tử Cố Vấn",
    "title_en": "Consulting Detective",
    "team": "INVESTIGATION",
    "icon": "🔎",
    "motto_vi": "Bậc thầy suy luận — Đổi phù hiệu lấy sự trong sạch tuyệt đối",
    "motto_en": "Master deductive mind — Sacrifice badge to prove 100% innocence",
    "goal_vi": "Chứng minh sự trong sạch tuyệt đối để thu hẹp diện nghi can cho cuộc điều tra.",
    "goal_en": "Prove complete innocence to narrow down suspect pool for detectives.",
    "steps_vi": [
      {
        "num": 1,
        "title": "Điều Tra Tự Do",
        "desc": "Tham gia thảo luận và soi vật chứng như một thám tử độc lập."
      },
      {
        "num": 2,
        "title": "Nộp Lại Huy Hiệu",
        "desc": "Có thể chủ động hủy Huy hiệu Phá án để công khai lật mở thẻ vai trò của mình."
      },
      {
        "num": 3,
        "title": "Xóa Sổ Nghi Can",
        "desc": "Khi được chứng minh vô tội, toàn bộ 8 thẻ bài trên trạm của bạn được loại bỏ 100%!"
      }
    ],
    "steps_en": [
      {
        "num": 1,
        "title": "Analyze Freely",
        "desc": "Analyze forensic evidence alongside all other detectives."
      },
      {
        "num": 2,
        "title": "Sacrifice Badge",
        "desc": "Discard your Badge to publicly reveal your innocent role."
      },
      {
        "num": 3,
        "title": "Clear Suspicion",
        "desc": "Once revealed, all 8 cards at your station are 100% ruled out as murder cards!"
      }
    ],
    "crucial_vi": "💡 MẸO SỐNG CÒN: Khi bàn chơi bị phân tâm vào thẻ của bạn, hãy dùng năng lực này để giải oan ngay lập tức!",
    "crucial_en": "💡 PRO TIP: If suspicion focuses on your station, reveal yourself to immediately refocus on the true killer!"
  }
};
