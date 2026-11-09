/**
 * WHO BROKE PROD? (Ai đã làm sập Production?) - ROLE QUICK PLAYBOOKS & GUIDES
 * FSOFT MEN'S DAY 2026 • MEN GEN GAME EDITION
 * Comprehensive, concise, easy-to-understand guides for all 9 IT Incident Response roles.
 * Includes: Core Goal, 3-Step Action Playbook, Crucial Rule/Pro Tip (Bilingual VI/EN).
 */

export const ROLE_GUIDES = {
  "FORENSIC_SCIENTIST": {
    "roleId": "FORENSIC_SCIENTIST",
    "title_vi": "Tech Lead / Incident Commander",
    "title_en": "Tech Lead / Incident Commander",
    "team": "INVESTIGATION",
    "icon": "🖥️",
    "motto_vi": "Chỉ huy War Room — Nắm rõ Root Cause, chỉ điểm bằng Marker",
    "motto_en": "War Room Commander — Knows the Root Cause, guides via system markers",
    "goal_vi": "Dẫn dắt Đội Ứng Phó tìm ra đúng cặp Hành vi (Xanh) + Dấu vết Log (Đỏ) của Thủ phạm trước khi hết 3 vòng.",
    "goal_en": "Help Incident Responders deduce the exact Trigger + Log Trace cards before Round 3 ends.",
    "steps_vi": [
      {
        "num": 1,
        "title": "Soi Log Đêm Deploy",
        "desc": "Thấy rõ ai là Thủ phạm (The Culprit) và cặp thẻ gây sập hệ thống (1 Hành vi Xanh + 1 Dấu vết Đỏ)."
      },
      {
        "num": 2,
        "title": "Ghim 6 Đạn Gỗ (Marker)",
        "desc": "Đặt 6 viên đạn gỗ vào các thẻ Thông số Sự cố (Root Cause, Tầng bị sập, Hiện trạng...) để gợi ý tới 2 thẻ lỗi đó."
      },
      {
        "num": 3,
        "title": "Cập Nhật Thông Số",
        "desc": "Đầu Vòng 2 & 3, rút 1 thẻ Thông số mới thay thế 1 thẻ Nâu cũ để tinh chỉnh hướng truy vết cùng AI Log Analyzer."
      }
    ],
    "steps_en": [
      {
        "num": 1,
        "title": "Audit Deployment Night",
        "desc": "See the Culprit and their chosen Trigger (Blue) and Log Trace (Red) cards."
      },
      {
        "num": 2,
        "title": "Pin 6 System Markers",
        "desc": "Place markers onto Incident Parameter tiles (Root Cause, Affected Layer, etc.) to evoke the bug cards."
      },
      {
        "num": 3,
        "title": "Refresh Telemetry Each Round",
        "desc": "At the start of Rounds 2 and 3, replace 1 old Brown Parameter Tile to refine your clues."
      }
    ],
    "crucial_vi": "⚠️ ĐIỀU CẤM KỴ: Tuyệt đối KHÔNG NÓI CHUYỆN, chat gợi ý, gật/lắc đầu hay ra hiệu. Mọi chỉ dẫn CHỈ qua đạn gỗ trên bảng!",
    "crucial_en": "⚠️ STRICT RULE: Never speak, nod, shake head, or gesture. All communication is strictly via system markers!"
  },

  "MURDERER": {
    "roleId": "MURDERER",
    "title_vi": "The Culprit (Thủ phạm gây lỗi)",
    "title_en": "The Culprit",
    "team": "CRIMINAL",
    "icon": "💣",
    "motto_vi": "Sát thủ Production — Gây sập hệ thống, xóa dấu vết, đổ vạ đồng nghiệp",
    "motto_en": "Production Saboteur — Crash the server, hide the logs, blame others",
    "goal_vi": "Sống sót qua 3 vòng họp War Room mà không bị bắt lỗi, hoặc 'đổ vạ' (bắn) trúng Whistleblower ở cuối trận.",
    "goal_en": "Survive 3 War Room rounds without being caught, or scapegoat the Whistleblower if exposed.",
    "steps_vi": [
      {
        "num": 1,
        "title": "Kích Hoạt Lỗi Đêm Khuya",
        "desc": "Trong Đêm Deploy, bí mật chọn 1 thẻ Hành vi (Xanh) và 1 thẻ Dấu vết Log (Đỏ) của chính bạn làm nguyên nhân sập Prod."
      },
      {
        "num": 2,
        "title": "Ngụy Trang & Đổ Lỗi",
        "desc": "Tranh luận tự nhiên như người vô tội; phân tích đạn gỗ của Tech Lead theo hướng trỏ sang bài của đồng nghiệp khác."
      },
      {
        "num": 3,
        "title": "Đổ Vạ Whistleblower",
        "desc": "Nếu bị bắt bài, bạn có 1 cơ hội cuối: Chỉ điểm ai là Whistleblower (Senior Dev) — nếu đoán trúng, phe bạn LẬT KÈO THẮNG!"
      }
    ],
    "steps_en": [
      {
        "num": 1,
        "title": "Trigger the Outage",
        "desc": "At Night, secretly pick 1 Trigger (Blue) and 1 Log Trace (Red) from your own station."
      },
      {
        "num": 2,
        "title": "Deflect & Blame",
        "desc": "Act like a helpful responder and subtly interpret Tech Lead's markers toward other colleagues."
      },
      {
        "num": 3,
        "title": "Scapegoat the Whistleblower",
        "desc": "If caught, identify the Whistleblower—hit correctly to steal the victory!"
      }
    ],
    "crucial_vi": "💡 MẸO SỐNG CÒN: Để ý xem ai đang cố lèo lái cuộc họp nhắm vào bàn của bạn một cách đầy ẩn ý — đó rất có thể là Whistleblower!",
    "crucial_en": "💡 SURVIVAL TIP: Watch for anyone subtly steering the War Room toward your cards—they are likely the Whistleblower!"
  },

  "INVESTIGATOR": {
    "roleId": "INVESTIGATOR",
    "title_vi": "Incident Responder (Đội Ứng Phó)",
    "title_en": "Incident Responder",
    "team": "INVESTIGATION",
    "icon": "🛠️",
    "motto_vi": "Chiến binh trực chiến — Đọc vị Log, khoanh vùng Bug, chốt đơn Thủ phạm",
    "motto_en": "On-call hero — Analyze logs, isolate the bug, pinpoint the Culprit",
    "goal_vi": "Tìm ra đúng Thủ phạm gây lỗi và chính xác cặp thẻ Hành vi (Xanh) + Dấu vết Log (Đỏ) của người đó.",
    "goal_en": "Identify the true Culprit and their exact Trigger (Blue) + Log Trace (Red) pair.",
    "steps_vi": [
      {
        "num": 1,
        "title": "Phân Tích Chỉ Dấu & AI",
        "desc": "Đối chiếu 6 viên đạn gỗ trên bảng Thông số Sự cố và bản tin AI Log Analyzer với các thẻ bài trên bàn."
      },
      {
        "num": 2,
        "title": "Họp War Room Phản Biện",
        "desc": "Trao đổi nhanh gọn trong 2 phút, tìm mối liên hệ logic giữa Hành vi - Dấu vết và phát hiện kẻ đang tung hỏa mù."
      },
      {
        "num": 3,
        "title": "Chốt Đơn Phá Án",
        "desc": "Khi đã chắc chắn, chọn 1 Hành vi + 1 Dấu vết của nghi phạm rồi dùng Huy hiệu bấm [⚡ Chốt Thủ Phạm]!"
      }
    ],
    "steps_en": [
      {
        "num": 1,
        "title": "Analyze Markers & AI Log",
        "desc": "Compare the 6 markers on Incident Tiles and AI Log Analyzer reports with cards across all stations."
      },
      {
        "num": 2,
        "title": "Debate in the War Room",
        "desc": "Discuss theories rapidly, connect triggers to log traces, and spot suspicious excuses."
      },
      {
        "num": 3,
        "title": "Pinpoint the Bug",
        "desc": "When confident, select 1 Trigger + 1 Log Trace on a suspect and spend your Badge to accuse!"
      }
    ],
    "crucial_vi": "⚠️ LƯU Ý QUAN TRỌNG: Mỗi người chỉ có DUY NHẤT 1 HUY HIỆU PHÁ ÁN. Bắt sai sẽ mất quyền chốt đơn (nhưng vẫn được thảo luận)!",
    "crucial_en": "⚠️ CRUCIAL NOTE: You only have ONE BADGE. A wrong accusation costs your badge permanently!"
  },

  "ACCOMPLICE": {
    "roleId": "ACCOMPLICE",
    "title_vi": "The Accomplice (Kẻ đồng lõa)",
    "title_en": "The Accomplice",
    "team": "CRIMINAL",
    "icon": "🎭",
    "motto_vi": "Người bấm Approve PR — Biết rõ lỗi nhưng quyết tâm bao che đến cùng",
    "motto_en": "Blind PR Approver — Knows the bug pair, dedicated to covering it up",
    "goal_vi": "Tung hỏa mù bảo vệ Thủ phạm không bị bắt, hoặc giúp Thủ phạm tìm ra Whistleblower.",
    "goal_en": "Protect the Culprit from being exposed, or help unmask the Whistleblower.",
    "steps_vi": [
      {
        "num": 1,
        "title": "Nắm Rõ Kịch Bản Lỗi",
        "desc": "Trong Đêm Deploy, bạn biết rõ ai là Thủ phạm và cặp bài (Hành vi + Dấu vết) đã làm sập Production."
      },
      {
        "num": 2,
        "title": "Tung Hỏa Mù Trong Họp",
        "desc": "Diễn giải các marker của Tech Lead theo hướng cực kỳ hợp lý nhưng lại trỏ sang bài của đồng nghiệp vô tội."
      },
      {
        "num": 3,
        "title": "Đánh Lạc Hướng & Săn Tìm",
        "desc": "Thu hút sự nghi ngờ về phía mình hoặc tiêu tốn Huy hiệu giả vờ bắt nhầm để làm loạn phòng họp."
      }
    ],
    "steps_en": [
      {
        "num": 1,
        "title": "Know the Bug Pair",
        "desc": "At Night, learn who the Culprit is and which Trigger + Log Trace cards caused the outage."
      },
      {
        "num": 2,
        "title": "Deploy Smoke Screens",
        "desc": "Craft convincing arguments that link the Tech Lead's markers to innocent colleagues' cards."
      },
      {
        "num": 3,
        "title": "Draw Suspicion",
        "desc": "Deflect heat away from the Culprit and help spot who is secretly acting as the Whistleblower."
      }
    ],
    "crucial_vi": "💡 MẸO SỐNG CÒN: Đừng bênh vực Thủ phạm quá lộ liễu! Hãy giả vờ nghi ngờ nhẹ rồi lái mũi dùi sang một cặp bài hấp dẫn khác.",
    "crucial_en": "💡 PRO TIP: Never defend the Culprit too obviously—redirect the room toward a tempting decoy pair instead!"
  },

  "WITNESS": {
    "roleId": "WITNESS",
    "title_vi": "Whistleblower / Senior Dev",
    "title_en": "Whistleblower / Senior Dev",
    "team": "INVESTIGATION",
    "icon": "👁️",
    "motto_vi": "Bậc thầy đọc Git Blame — Biết mặt kẻ gây họa nhưng phải ẩn mình",
    "motto_en": "Silent Senior Dev — Knows the suspects but must stay undercover",
    "goal_vi": "Dẫn dắt Đội Ứng Phó bắt đúng Thủ phạm mà KHÔNG ĐỂ LỘ MÌNH LÀ WHISTLEBLOWER.",
    "goal_en": "Guide the team to catch the Culprit while KEEPING YOUR IDENTITY HIDDEN.",
    "steps_vi": [
      {
        "num": 1,
        "title": "Nhận Diện 2 Nghi Phạm",
        "desc": "Trong Đêm, bạn thấy tên 2 người thuộc phe Gây Lỗi (Thủ phạm & Đồng lõa), nhưng KHÔNG BIẾT ai giữ vai nào."
      },
      {
        "num": 2,
        "title": "Gợi Ý Tinh Tế",
        "desc": "Khéo léo dựa vào đạn gỗ của Tech Lead để hướng mọi người soi kỹ bài của 2 nghi phạm này."
      },
      {
        "num": 3,
        "title": "Giấu Mặt Tuyệt Đối",
        "desc": "Tránh chỉ điểm quá gắt từ Vòng 1 kẻo Thủ phạm phát hiện và 'đổ vạ' ngược lại bạn lúc cuối trận."
      }
    ],
    "steps_en": [
      {
        "num": 1,
        "title": "Spot the Suspects",
        "desc": "At Night, see the 2 Bug Team members (Culprit & Accomplice), without knowing which is which."
      },
      {
        "num": 2,
        "title": "Subtle Guidance",
        "desc": "Nudge responders toward those 2 stations using natural deduction from the system markers."
      },
      {
        "num": 3,
        "title": "Avoid Being Scapegoated",
        "desc": "Do not sound overly certain—if the caught Culprit points at you at the end, the Bug Team steals the win!"
      }
    ],
    "crucial_vi": "⚠️ NGUY HIỂM CHÍ MẠNG: Dù Đội Ứng Phó bắt đúng Thủ phạm, nhưng nếu Thủ phạm đoán trúng bạn là Whistleblower thì PHE GÂY LỖI THẮNG!",
    "crucial_en": "⚠️ DEADLY HAZARD: Even if the Culprit is caught, if they correctly scapegoat you at the end, THE BUG TEAM WINS!"
  },

  "LAB_TECHNICIAN": {
    "roleId": "LAB_TECHNICIAN",
    "title_vi": "DevOps / QA Engineer",
    "title_en": "DevOps / QA Engineer",
    "team": "INVESTIGATION",
    "icon": "🧪",
    "motto_vi": "Chuyên gia Health Check — Chạy test thực nghiệm, xác thực nguồn lỗi",
    "motto_en": "CI/CD & QA Specialist — Run health checks to verify the bug source",
    "goal_vi": "Sử dụng quyền Health Check giữa Vòng 1 và 2 để kiểm chứng 1 thẻ bài đáng ngờ nhất trên bàn.",
    "goal_en": "Run a Health Check between Round 1 and 2 to verify whether a suspicious card is part of the solution.",
    "steps_vi": [
      {
        "num": 1,
        "title": "Chạy Health Check Đêm",
        "desc": "Giữa Vòng 1 và Vòng 2, bí mật chọn 1 lá bài bất kỳ trên bàn để chạy script kiểm định."
      },
      {
        "num": 2,
        "title": "Nhận Báo Cáo Tự Động",
        "desc": "Hệ thống trả kết quả ngay lập tức: Thẻ đó CÓ thuộc đáp án làm sập Prod hay KHÔNG."
      },
      {
        "num": 3,
        "title": "Dẫn Dắt Đội Ứng Phó",
        "desc": "Tận dụng thông tin vàng này để khoanh vùng Thủ phạm hoặc đánh đánh lạc hướng rằng mình là Whistleblower để đỡ đạn!"
      }
    ],
    "steps_en": [
      {
        "num": 1,
        "title": "Run Night Health Check",
        "desc": "Between Round 1 and 2, secretly select any 1 card on the table to inspect."
      },
      {
        "num": 2,
        "title": "Instant Diagnostics",
        "desc": "Learn immediately whether that card is part of the true Incident Solution."
      },
      {
        "num": 3,
        "title": "Steer the War Room",
        "desc": "Use confirmed diagnostics to lock onto the Culprit without exposing the real Whistleblower."
      }
    ],
    "crucial_vi": "💡 MẸO SỐNG CÒN: Nếu soi trúng thẻ ĐÚNG, bạn nắm giữ 50% đáp án! Bạn còn có thể giả làm Whistleblower để thu hút phát đạn cuối trận.",
    "crucial_en": "💡 PRO TIP: Finding a matching card gives you 50% of the solution—and lets you act as a decoy for the Whistleblower!"
  },

  "INSIDE_MAN": {
    "roleId": "INSIDE_MAN",
    "title_vi": "Log Tamperer (Kẻ xóa/sửa log)",
    "title_en": "Log Tamperer",
    "team": "CRIMINAL",
    "icon": "🕶️",
    "motto_vi": "Bóng ma Root Access — Xóa lịch sử log, thu hồi quyền phá án",
    "motto_en": "Root Access Phantom — Wipe the logs, revoke accusation privileges",
    "goal_vi": "Vô hiệu hóa Huy hiệu Phá án của thành viên Đội Ứng Phó nguy hiểm nhất giữa Vòng 1 và 2.",
    "goal_en": "Disable the Accusation Badge of the sharpest responder between Round 1 and 2.",
    "steps_vi": [
      {
        "num": 1,
        "title": "Can Thiệp Quyền Truy Cập",
        "desc": "Giữa Vòng 1 và Vòng 2, bí mật chọn 1 người chơi bất kỳ trên bàn để thu hồi Huy hiệu Phá án."
      },
      {
        "num": 2,
        "title": "Khóa Mõm Chốt Đơn",
        "desc": "Người bị xóa quyền sẽ mất vĩnh viễn khả năng bấm [Chốt Thủ Phạm] trong phần còn lại của ván đấu."
      },
      {
        "num": 3,
        "title": "Hỗ Trợ Thủ Phạm",
        "desc": "Tiếp tục đóng vai thành viên tích cực trong cuộc họp để làm nhiễu loạn thông tin."
      }
    ],
    "steps_en": [
      {
        "num": 1,
        "title": "Revoke Access at Night",
        "desc": "Between Round 1 and 2, secretly target 1 player to strip their Accusation Badge."
      },
      {
        "num": 2,
        "title": "Disable Pinpointing",
        "desc": "The targeted responder permanently loses the ability to make an official accusation."
      },
      {
        "num": 3,
        "title": "Cover the Outage",
        "desc": "Blend into the War Room and sow confusion to run down the clock."
      }
    ],
    "crucial_vi": "💡 MẸO SỐNG CÒN: Hãy nhắm vào người đang phân tích sát đáp án nhất ở Vòng 1 để chặt đứt mũi nhọn của Đội Ứng Phó!",
    "crucial_en": "💡 PRO TIP: Target whoever made the sharpest deduction in Round 1 to silence the team's best investigator!"
  },

  "PROTECTIVE_DETAIL": {
    "roleId": "PROTECTIVE_DETAIL",
    "title_vi": "IT Support / Helpdesk",
    "title_en": "IT Support / Helpdesk",
    "team": "INVESTIGATION",
    "icon": "🛡️",
    "motto_vi": "Tuyến đầu đỡ đạn — Biết rõ Whistleblower, sẵn sàng chịu trận thay",
    "motto_en": "Frontline Shield — Knows the Whistleblower, ready to take the blame",
    "goal_vi": "Thu hút sự chú ý để Thủ phạm tưởng bạn là Whistleblower và bắn nhầm vào bạn lúc cuối trận.",
    "goal_en": "Draw the Culprit's attention so they scapegoat you instead of the real Whistleblower.",
    "steps_vi": [
      {
        "num": 1,
        "title": "Biết Mặt Whistleblower",
        "desc": "Ngay từ đầu ván, bạn được hệ thống mật báo chính xác ai là Whistleblower / Senior Dev."
      },
      {
        "num": 2,
        "title": "Đóng Vai Kẻ Biết Tuốt",
        "desc": "Phát biểu sắc bén, phụ họa theo ý của Whistleblower để Thủ phạm tin rằng bạn mới là người nắm thóp họ."
      },
      {
        "num": 3,
        "title": "Đỡ Đạn Cuối Trận",
        "desc": "Nếu Thủ phạm bị bắt và chỉ điểm nhầm vào bạn thay vì Whistleblower thật, ĐỘI ỨNG PHÓ TOÀN THẮNG!"
      }
    ],
    "steps_en": [
      {
        "num": 1,
        "title": "Identify the Whistleblower",
        "desc": "At Night, learn the exact identity of the real Whistleblower / Senior Dev."
      },
      {
        "num": 2,
        "title": "Act Like the Senior Dev",
        "desc": "Speak with bold confidence and echo the Whistleblower's leads to draw the Culprit's suspicion."
      },
      {
        "num": 3,
        "title": "Take the Scapegoat Shot",
        "desc": "If the caught Culprit blames you instead of the real Whistleblower, THE RESPONSE TEAM WINS!"
      }
    ],
    "crucial_vi": "💡 MẸO SỐNG CÒN: Đừng ngại tỏa sáng! Bạn càng tỏ ra nguy hiểm thì Whistleblower thật càng được an toàn tuyệt đối.",
    "crucial_en": "💡 PRO TIP: Be vocal and analytical! The more you look like the Whistleblower, the safer your teammate is."
  },

  "CONSULTING_DETECTIVE": {
    "roleId": "CONSULTING_DETECTIVE",
    "title_vi": "System Architect",
    "title_en": "System Architect",
    "team": "INVESTIGATION",
    "icon": "🏗️",
    "motto_vi": "Kiến trúc sư trưởng — Tự nguyện bỏ quyền phá án để chứng minh 100% trong sạch",
    "motto_en": "Chief Architect — Discard badge to publicly prove 100% innocence",
    "goal_vi": "Chứng minh mình 100% vô tội để loại bỏ hoàn toàn 8 lá bài của mình khỏi diện nghi vấn.",
    "goal_en": "Flip your role card face-up to eliminate all 8 of your cards from suspicion.",
    "steps_vi": [
      {
        "num": 1,
        "title": "Phân Tích Độc Lập",
        "desc": "Tham gia mổ xẻ log và thông số sự cố cùng toàn bộ thành viên trong phòng họp."
      },
      {
        "num": 2,
        "title": "Lật Bài Chứng Minh",
        "desc": "Bất kỳ lúc nào, bạn có thể tự nguyện nộp bỏ Huy hiệu Phá án để lật ngửa thẻ System Architect lên bàn."
      },
      {
        "num": 3,
        "title": "Thu Hẹp Vòng Vây",
        "desc": "Ngay khi lộ diện, toàn bộ 8 thẻ bài của bạn được xác nhận trong sạch 100%, giúp cả đội tập trung vào kẻ gian thật sự!"
      }
    ],
    "steps_en": [
      {
        "num": 1,
        "title": "Audit Architecture",
        "desc": "Analyze system parameters and debate alongside other responders."
      },
      {
        "num": 2,
        "title": "Sacrifice Badge to Reveal",
        "desc": "Voluntarily discard your Badge at any time to publicly flip your role card face-up."
      },
      {
        "num": 3,
        "title": "Clear Your Station",
        "desc": "Once revealed, all 8 cards at your station are 100% ruled out as the outage cause!"
      }
    ],
    "crucial_vi": "💡 MẸO SỐNG CÒN: Nếu thấy phe Gây Lỗi đang cố tình đổ vạ vào các thẻ bài trên bàn của bạn, hãy lật bài ngay để bẻ gãy âm mưu của chúng!",
    "crucial_en": "💡 PRO TIP: Wait until the Bug Team tries to frame your cards, then flip your role to expose their lie!"
  }
};
