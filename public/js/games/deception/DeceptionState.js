/**
 * DeceptionState: Máy trạng thái (State Machine) & Logic cốt lõi của Deception: Murder in Hong Kong / Viet Nam
 *
 * Vận hành độc lập 100%, bám sát bộ quy chuẩn 4–9 người chơi:
 * - 9 Vai trò (FORENSIC_SCIENTIST, MURDERER, INVESTIGATOR, ACCOMPLICE, WITNESS, LAB_TECHNICIAN, INSIDE_MAN, PROTECTIVE_DETAIL, CONSULTING_DETECTIVE)
 * - 13 Pha trạng thái (LOBBY -> ROLE_CASTING -> NIGHT_CRIME_SELECTION -> NIGHT_WITNESS_REVEAL -> ROUND_1..3 -> ACCUSATION_INTERRUPT -> WITNESS_REVERSAL -> GAME_OVER)
 * - 26 Thẻ Hiện Trường (156 lựa chọn song ngữ), 7 Thẻ Sự Kiện, 90 Thẻ Phương Thức (Xanh), 200 Thẻ Manh Mối (Đỏ)
 */

import {
  DECEPTION_META,
  ROLE_DEFINITIONS,
  EVENT_TILES,
  SCENE_TILES,
  MEANS_CARDS,
  CLUE_CARDS,
  getCardIcon
} from './data/deceptionData.js';
import { getCardGameIconKey } from './data/deceptionIcons.js';

export const GAME_PHASES = {
  LOBBY: 'LOBBY',
  ROLE_CASTING: 'ROLE_CASTING',
  NIGHT_CRIME_SELECTION: 'NIGHT_CRIME_SELECTION',
  NIGHT_WITNESS_REVEAL: 'NIGHT_WITNESS_REVEAL',
  ROUND_1_EVIDENCE: 'ROUND_1_EVIDENCE',
  ROUND_1_PRESENTATION: 'ROUND_1_PRESENTATION',
  ALLIES_NIGHT_PHASE: 'ALLIES_NIGHT_PHASE',
  ROUND_2_EVIDENCE: 'ROUND_2_EVIDENCE',
  ROUND_2_PRESENTATION: 'ROUND_2_PRESENTATION',
  ROUND_3_EVIDENCE: 'ROUND_3_EVIDENCE',
  ROUND_3_PRESENTATION: 'ROUND_3_PRESENTATION',
  ACCUSATION_INTERRUPT: 'ACCUSATION_INTERRUPT',
  FINAL_SHOWDOWN: 'FINAL_SHOWDOWN',
  WITNESS_REVERSAL: 'WITNESS_REVERSAL',
  GAME_OVER: 'GAME_OVER'
};

const DETECTIVE_AVATARS = ['👨‍💻', '👩‍💻', '🧑‍🔧', '🕵️‍♂️', '👩‍🔬', '🧑‍🚀', '🧔‍♂️', '👩‍💼', '🕶️'];

const BOT_NAMES_VI = [
  'Senior Tuấn', 'DevOps Lâm', 'QA Thảo', 'BA Kiệt',
  'Scrum Minh', 'SecOps Vũ', 'Frontend Ngọc', 'Backend Hoàng'
];

const BOT_NAMES_EN = [
  'Senior Tuan', 'DevOps Lam', 'QA Thao', 'BA Kiet',
  'Scrum Minh', 'SecOps Vu', 'Frontend Ngoc', 'Backend Hoang'
];

/**
 * Hệ thống Prompt & Cấu trúc JSON cho tính năng sáng tạo AI FORENSIC MASTER
 * (Tích hợp trực tiếp vào mỗi vòng điều tra & tổng hợp báo cáo RCA cuối trận)
 */
export const AI_FORENSIC_SYSTEM_PROMPT = `Bạn là "AI Forensic Master" — Hệ thống Trí tuệ Nhân tạo Giám định Sự cố IT trong tựa game "WHO BROKE PROD? (Ai đã làm sập Production?)" tại cuộc thi MEN GEN GAME (FSOFT MEN'S DAY 2026).

1. PHÂN TÍCH LOG MỖI VÒNG (AI Log Analyzer):
   - Đầu vào: Cặp bài ẩn của Thủ phạm (Hành vi gây lỗi [Trigger] + Dấu vết [Log Trace]) và 6 viên đạn gỗ (Markers) mà Tech Lead đã ghim lên các thẻ Thông số Sự cố (Incident Parameters).
   - Đầu ra JSON:
     {
       "round": 1,
       "incidentId": "INC-2026",
       "timestamp": "02:13 AM",
       "severity": "SEV-1",
       "confidence": "86%",
       "logAnalysisVi": "Câu thông báo giám định hệ thống ngắn gọn, hài hước kiểu dân IT dự án (không tiết lộ thẳng tên thẻ đáp án)",
       "logAnalysisEn": "Witty IT system diagnostic broadcast in English"
     }

2. TỔNG HỢP BÁO CÁO RCA CUỐI TRẬN (Automated Post-Mortem RCA):
   - Đầu vào: Kết quả ván đấu, danh tính Thủ phạm (The Culprit), Đồng lõa, Whistleblower, cặp thẻ Hành vi + Dấu vết và toàn bộ Thông số Sự cố.
   - Đầu ra JSON:
     {
       "incidentId": "INC-2026",
       "severity": "SEV-0 CRITICAL",
       "status": "RESOLVED (HOTFIXED) | SLA BREACHED (UNRESOLVED)",
       "incident": "Mô tả sự cố sập hệ thống",
       "directCause": "Nguyên nhân trực tiếp từ cặp thẻ Hành vi + Dấu vết của Thủ phạm",
       "rootCause": "Nguyên nhân gốc rễ từ thẻ Root Cause và lỗ hổng quy trình",
       "preventiveAction": "Hành động phòng ngừa châm biếm kiểu dân dự án (VD: Cấm tiệt deploy chiều thứ Sáu)",
       "satiricalVerdict": "Phán quyết hài hước dành cho Thủ phạm"
     }`;

function shuffleArray(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Bảng Hồ sơ Ngữ nghĩa Chuẩn hóa cho toàn bộ 90 Thẻ Hành vi Lỗi (M001..M090)
 * Đảm bảo 100% độ chính xác khi ánh xạ sang:
 * - cause (0..5 trên tile_cause_01: 0=Tràn RAM, 1=Quá tải CPU, 2=Đứt cáp/Mất kết nối DB, 3=Xung đột thư viện, 4=Lỗi phân quyền/Bảo mật, 5=DDoS/Tấn công mạng)
 * - locTile ('tile_loc_01'..'tile_loc_04') & locOpt (0..5: Tầng hệ thống bị sập chính xác)
 * - status (0..5 trên tile_scene_01: Trạng thái Hệ thống Hiện tại)
 * - speed (0..5 trên tile_scene_03: Tốc độ Phát tán Lỗi)
 * - impression (0..5 trên tile_scene_05: Ấn tượng Chung về Bug)
 * - scope (0..5 trên tile_scene_06: Phạm vi Ảnh hưởng trên Hệ thống)
 * - style (0..5 trên tile_scene_08: Phong cách Code của Thủ phạm)
 */
export const MEANS_PROFILES = {
  M001: { cause: 1, locTile: 'tile_loc_04', locOpt: 1, status: 0, speed: 0, impression: 0, scope: 4, style: 0 }, // Code say xỉn sau chầu nhậu
  M002: { cause: 4, locTile: 'tile_loc_01', locOpt: 4, status: 2, speed: 4, impression: 0, scope: 5, style: 1 }, // Hardcode mật khẩu Root trong code
  M003: { cause: 4, locTile: 'tile_loc_04', locOpt: 5, status: 2, speed: 2, impression: 2, scope: 2, style: 1 }, // Nhúng Script bên thứ 3 độc hại
  M004: { cause: 4, locTile: 'tile_loc_01', locOpt: 0, status: 2, speed: 2, impression: 0, scope: 1, style: 1 }, // Không lọc dữ liệu bẩn (Dirty Input)
  M005: { cause: 4, locTile: 'tile_loc_01', locOpt: 2, status: 2, speed: 4, impression: 2, scope: 0, style: 5 }, // Cài phần mềm Crack lên Server
  M006: { cause: 4, locTile: 'tile_loc_01', locOpt: 0, status: 2, speed: 1, impression: 0, scope: 1, style: 1 }, // Nối chuỗi SQL gây lỗi SQL Injection
  M007: { cause: 4, locTile: 'tile_loc_02', locOpt: 0, status: 2, speed: 4, impression: 0, scope: 5, style: 2 }, // Push nhầm file .env lên GitHub Public
  M008: { cause: 1, locTile: 'tile_loc_01', locOpt: 2, status: 1, speed: 2, impression: 2, scope: 0, style: 5 }, // Dính mã độc đào Coin ngầm
  M009: { cause: 5, locTile: 'tile_loc_01', locOpt: 1, status: 0, speed: 1, impression: 4, scope: 3, style: 1 }, // Bắn Spam API hàng loạt không kiểm soát
  M010: { cause: 4, locTile: 'tile_loc_01', locOpt: 4, status: 2, speed: 4, impression: 0, scope: 3, style: 1 }, // Set thời hạn Token 100 năm không hết hạn
  M011: { cause: 3, locTile: 'tile_loc_02', locOpt: 0, status: 2, speed: 4, impression: 2, scope: 5, style: 1 }, // Cài nhầm thư viện NPM giả mạo
  M012: { cause: 4, locTile: 'tile_loc_01', locOpt: 2, status: 2, speed: 1, impression: 4, scope: 5, style: 1 }, // Lộ AWS Secret Key trên nhóm chat
  M013: { cause: 4, locTile: 'tile_loc_01', locOpt: 4, status: 2, speed: 4, impression: 2, scope: 3, style: 5 }, // Mở cổng Backdoor không cần đăng nhập
  M014: { cause: 4, locTile: 'tile_loc_03', locOpt: 2, status: 2, speed: 1, impression: 0, scope: 2, style: 1 }, // Lỗ hổng XSS chèn mã độc vào giao diện
  M015: { cause: 4, locTile: 'tile_loc_01', locOpt: 2, status: 2, speed: 0, impression: 3, scope: 5, style: 5 }, // Phân quyền chmod 777 toàn bộ máy chủ
  M016: { cause: 1, locTile: 'tile_loc_01', locOpt: 2, status: 1, speed: 4, impression: 5, scope: 0, style: 5 }, // Cronjob lỗi tự kích hoạt lúc 0h đêm
  M017: { cause: 4, locTile: 'tile_loc_01', locOpt: 2, status: 2, speed: 0, impression: 3, scope: 0, style: 5 }, // Chạy script Python trôi nổi bằng quyền Sudo
  M018: { cause: 4, locTile: 'tile_loc_02', locOpt: 1, status: 0, speed: 0, impression: 0, scope: 3, style: 1 }, // Tắt kiểm tra chứng chỉ bảo mật SSL
  M019: { cause: 1, locTile: 'tile_loc_01', locOpt: 2, status: 1, speed: 0, impression: 0, scope: 0, style: 0 }, // Vòng lặp vô tận while(true)
  M020: { cause: 2, locTile: 'tile_loc_01', locOpt: 0, status: 1, speed: 3, impression: 4, scope: 1, style: 1 }, // Khóa cứng bảng DB (Deadlock)
  M021: { cause: 1, locTile: 'tile_loc_01', locOpt: 2, status: 1, speed: 3, impression: 0, scope: 0, style: 0 }, // Chặn đứng Main Thread bằng tác vụ đồng bộ
  M022: { cause: 0, locTile: 'tile_loc_01', locOpt: 2, status: 1, speed: 2, impression: 1, scope: 0, style: 4 }, // Build Docker Image nặng 20GB tràn RAM
  M023: { cause: 1, locTile: 'tile_loc_01', locOpt: 2, status: 5, speed: 3, impression: 1, scope: 4, style: 0 }, // Bỏ quên hàm sleep(999999) trong code
  M024: { cause: 0, locTile: 'tile_loc_01', locOpt: 0, status: 1, speed: 1, impression: 0, scope: 1, style: 0 }, // Truy vấn SELECT * 50 triệu dòng vào RAM
  M025: { cause: 1, locTile: 'tile_loc_01', locOpt: 2, status: 5, speed: 4, impression: 5, scope: 4, style: 1 }, // Bắt lỗi try-catch rỗng làm treo ngầm
  M026: { cause: 0, locTile: 'tile_loc_01', locOpt: 2, status: 1, speed: 2, impression: 0, scope: 0, style: 0 }, // Lưu rác vào biến toàn cục gây tràn RAM
  M027: { cause: 2, locTile: 'tile_loc_01', locOpt: 0, status: 5, speed: 3, impression: 1, scope: 1, style: 0 }, // Giới hạn Connection Pool xuống còn 1
  M028: { cause: 1, locTile: 'tile_loc_01', locOpt: 2, status: 0, speed: 1, impression: 0, scope: 0, style: 0 }, // Đệ quy không điểm dừng gây StackOverflow
  M029: { cause: 5, locTile: 'tile_loc_03', locOpt: 3, status: 4, speed: 0, impression: 3, scope: 3, style: 5 }, // Tắt nhầm Firewall chặn sạch kết nối
  M030: { cause: 0, locTile: 'tile_loc_02', locOpt: 3, status: 1, speed: 2, impression: 0, scope: 1, style: 0 }, // In Debug Log làm đầy 100% ổ cứng
  M031: { cause: 0, locTile: 'tile_loc_01', locOpt: 2, status: 1, speed: 2, impression: 4, scope: 0, style: 5 }, // Hàng vạn tiến trình Zombie ăn hết RAM
  M032: { cause: 0, locTile: 'tile_loc_02', locOpt: 2, status: 3, speed: 3, impression: 4, scope: 3, style: 4 }, // Nghẽn cổ chai hàng triệu bản tin Queue
  M033: { cause: 5, locTile: 'tile_loc_01', locOpt: 1, status: 4, speed: 0, impression: 1, scope: 3, style: 5 }, // Cấu hình Rate Limit = 0 chặn mọi user
  M034: { cause: 1, locTile: 'tile_loc_01', locOpt: 1, status: 3, speed: 3, impression: 1, scope: 3, style: 4 }, // 2 Microservice gọi vòng tròn nhau vô tận
  M035: { cause: 2, locTile: 'tile_loc_01', locOpt: 0, status: 0, speed: 0, impression: 3, scope: 1, style: 5 }, // Chạy lệnh DROP TABLE trên Production
  M036: { cause: 2, locTile: 'tile_loc_01', locOpt: 0, status: 2, speed: 0, impression: 0, scope: 1, style: 5 }, // Chạy lệnh UPDATE quên điều kiện WHERE
  M037: { cause: 2, locTile: 'tile_loc_01', locOpt: 0, status: 2, speed: 0, impression: 3, scope: 1, style: 5 }, // Truncate sạch bảng tài khoản khách hàng
  M038: { cause: 4, locTile: 'tile_loc_01', locOpt: 2, status: 0, speed: 0, impression: 3, scope: 5, style: 5 }, // Gõ nhầm sudo rm -rf / trên Server chính
  M039: { cause: 2, locTile: 'tile_loc_02', locOpt: 3, status: 2, speed: 0, impression: 3, scope: 1, style: 5 }, // Xóa nhầm S3 Bucket chứa dữ liệu thật
  M040: { cause: 2, locTile: 'tile_loc_04', locOpt: 0, status: 0, speed: 0, impression: 3, scope: 5, style: 5 }, // Rút nhầm dây cáp quang phòng máy chủ
  M041: { cause: 3, locTile: 'tile_loc_01', locOpt: 2, status: 0, speed: 0, impression: 1, scope: 0, style: 5 }, // Sửa code trực tiếp bằng Vim trên Prod
  M042: { cause: 2, locTile: 'tile_loc_01', locOpt: 0, status: 2, speed: 0, impression: 3, scope: 1, style: 5 }, // Chạy docker prune xóa bay Volume Database
  M043: { cause: 2, locTile: 'tile_loc_01', locOpt: 0, status: 2, speed: 0, impression: 3, scope: 1, style: 5 }, // Kill -9 tiến trình Database đang ghi đĩa
  M044: { cause: 2, locTile: 'tile_loc_01', locOpt: 0, status: 5, speed: 3, impression: 3, scope: 1, style: 5 }, // Xóa sạch Index của các bảng giao dịch
  M045: { cause: 3, locTile: 'tile_loc_02', locOpt: 0, status: 2, speed: 0, impression: 3, scope: 5, style: 2 }, // Force Push đè mất sạch lịch sử nhánh Main
  M046: { cause: 2, locTile: 'tile_loc_01', locOpt: 0, status: 4, speed: 0, impression: 0, scope: 1, style: 0 }, // Ghi đè chuỗi kết nối DB sang localhost
  M047: { cause: 2, locTile: 'tile_loc_01', locOpt: 0, status: 2, speed: 0, impression: 3, scope: 1, style: 1 }, // Chạy Migration lỗi làm gãy toàn bộ bảng
  M048: { cause: 4, locTile: 'tile_loc_02', locOpt: 1, status: 0, speed: 0, impression: 3, scope: 3, style: 5 }, // Xóa mất Private Key trên Load Balancer
  M049: { cause: 2, locTile: 'tile_loc_04', locOpt: 3, status: 2, speed: 1, impression: 3, scope: 1, style: 1 }, // Trỏ nhầm Automation Test xóa sạch DB thật
  M050: { cause: 0, locTile: 'tile_loc_01', locOpt: 5, status: 1, speed: 0, impression: 3, scope: 1, style: 5 }, // Chạy lệnh FLUSHALL xóa trắng Redis Cache
  M051: { cause: 2, locTile: 'tile_loc_01', locOpt: 2, status: 0, speed: 0, impression: 3, scope: 5, style: 5 }, // Chạy terraform destroy xóa sổ hạ tầng
  M052: { cause: 5, locTile: 'tile_loc_01', locOpt: 1, status: 0, speed: 0, impression: 3, scope: 3, style: 5 }, // Xóa nhầm bảng định tuyến API Gateway
  M053: { cause: 5, locTile: 'tile_loc_02', locOpt: 1, status: 4, speed: 0, impression: 0, scope: 3, style: 5 }, // Trỏ nhầm tên miền chính về IP 127.0.0.1
  M054: { cause: 2, locTile: 'tile_loc_01', locOpt: 0, status: 2, speed: 1, impression: 4, scope: 1, style: 1 }, // Xóa 1 bản ghi kéo sập toàn bộ bảng liên kết
  M055: { cause: 2, locTile: 'tile_loc_01', locOpt: 0, status: 1, speed: 2, impression: 0, scope: 1, style: 0 }, // Mở kết nối DB liên tục không bao giờ đóng
  M056: { cause: 2, locTile: 'tile_loc_04', locOpt: 4, status: 2, speed: 0, impression: 3, scope: 1, style: 5 }, // Restore nhầm bản Backup rỗng đè lên Prod
  M057: { cause: 2, locTile: 'tile_loc_04', locOpt: 0, status: 0, speed: 0, impression: 3, scope: 5, style: 5 }, // Đá văng phích cắm nguồn của tủ Server
  M058: { cause: 0, locTile: 'tile_loc_02', locOpt: 4, status: 0, speed: 2, impression: 4, scope: 5, style: 1 }, // Làm cạn sạch hạn mức thẻ tín dụng Cloud
  M059: { cause: 2, locTile: 'tile_loc_01', locOpt: 0, status: 1, speed: 3, impression: 0, scope: 1, style: 0 }, // Gọi 10,000 câu Query trong 3 vòng for lồng nhau
  M060: { cause: 2, locTile: 'tile_loc_04', locOpt: 0, status: 0, speed: 0, impression: 1, scope: 3, style: 0 }, // Chó cưng dẫn lên văn phòng cắn đứt cáp mạng
  M061: { cause: 3, locTile: 'tile_loc_04', locOpt: 3, status: 0, speed: 0, impression: 0, scope: 5, style: 1 }, // Deploy thẳng lên Prod không qua Staging
  M062: { cause: 1, locTile: 'tile_loc_01', locOpt: 2, status: 1, speed: 1, impression: 4, scope: 0, style: 5 }, // Tắt Auto-Scaling ngay trước giờ Flash Sale
  M063: { cause: 1, locTile: 'tile_loc_01', locOpt: 0, status: 1, speed: 3, impression: 0, scope: 1, style: 1 }, // Quét Full Table 100 triệu dòng không Index
  M064: { cause: 3, locTile: 'tile_loc_02', locOpt: 0, status: 0, speed: 0, impression: 2, scope: 5, style: 1 }, // Bỏ qua CI/CD, copy đè file build bằng tay
  M065: { cause: 5, locTile: 'tile_loc_01', locOpt: 2, status: 1, speed: 1, impression: 3, scope: 5, style: 1 }, // Bắn JMeter Stress Test thẳng vào Production
  M066: { cause: 1, locTile: 'tile_loc_01', locOpt: 2, status: 1, speed: 0, impression: 1, scope: 0, style: 0 }, // Regex lỗi làm treo 100% toàn bộ nhân CPU
  M067: { cause: 1, locTile: 'tile_loc_01', locOpt: 1, status: 1, speed: 3, impression: 1, scope: 3, style: 4 }, // Render video 4K đồng bộ ngay trên API chính
  M068: { cause: 0, locTile: 'tile_loc_01', locOpt: 5, status: 1, speed: 1, impression: 4, scope: 1, style: 5 }, // Tắt toàn bộ Cache bắt DB gánh 100% tải
  M069: { cause: 1, locTile: 'tile_loc_02', locOpt: 0, status: 1, speed: 3, impression: 0, scope: 0, style: 5 }, // Chạy npm build ngốn 100% CPU trên máy Live
  M070: { cause: 5, locTile: 'tile_loc_02', locOpt: 1, status: 0, speed: 1, impression: 4, scope: 3, style: 5 }, // Tắt Cloudflare CDN làm lộ IP máy chủ gốc
  M071: { cause: 0, locTile: 'tile_loc_03', locOpt: 1, status: 1, speed: 3, impression: 0, scope: 2, style: 0 }, // Xuất báo cáo Excel 5GB không phân trang
  M072: { cause: 1, locTile: 'tile_loc_01', locOpt: 2, status: 0, speed: 0, impression: 0, scope: 0, style: 1 }, // Quên bắt lỗi Promise làm sập tiến trình Node
  M073: { cause: 1, locTile: 'tile_loc_01', locOpt: 2, status: 0, speed: 0, impression: 3, scope: 5, style: 5 }, // Scale nhầm số lượng Pod Kubernetes về 0
  M074: { cause: 1, locTile: 'tile_loc_03', locOpt: 4, status: 1, speed: 3, impression: 1, scope: 1, style: 5 }, // Chạy huấn luyện AI trực tiếp trên máy chủ DB
  M075: { cause: 1, locTile: 'tile_loc_04', locOpt: 0, status: 0, speed: 0, impression: 3, scope: 5, style: 5 }, // Bấm nhầm nút Reboot cụm máy chủ đang chạy
  M076: { cause: 1, locTile: 'tile_loc_01', locOpt: 0, status: 1, speed: 1, impression: 0, scope: 1, style: 0 }, // JOIN 10 bảng quên điều kiện ON gây nổ CPU
  M077: { cause: 5, locTile: 'tile_loc_02', locOpt: 1, status: 3, speed: 1, impression: 4, scope: 0, style: 1 }, // Cấu hình sai Healthcheck làm chết sạch Pod
  M078: { cause: 5, locTile: 'tile_loc_03', locOpt: 2, status: 5, speed: 1, impression: 0, scope: 2, style: 0 }, // Code useEffect lỗi bắn 1000 request/giây
  M079: { cause: 3, locTile: 'tile_loc_02', locOpt: 0, status: 0, speed: 0, impression: 4, scope: 5, style: 2 }, // Push code thứ Sáu lúc 17h59 rồi tắt máy
  M080: { cause: 5, locTile: 'tile_loc_02', locOpt: 1, status: 0, speed: 1, impression: 3, scope: 3, style: 5 }, // Mở cổng Public bị Botnet DDoS đánh sập
  M081: { cause: 2, locTile: 'tile_loc_04', locOpt: 0, status: 0, speed: 0, impression: 1, scope: 5, style: 5 }, // Chập điện tủ Rack do cắm chung ấm đun nước
  M082: { cause: 3, locTile: 'tile_loc_01', locOpt: 2, status: 2, speed: 4, impression: 1, scope: 4, style: 0 }, // Bug lệch múi giờ UTC làm nổ tung lịch trình
  M083: { cause: 1, locTile: 'tile_loc_04', locOpt: 0, status: 1, speed: 2, impression: 3, scope: 5, style: 5 }, // Tắt nhầm điều hòa phòng Server làm cháy máy
  M084: { cause: 2, locTile: 'tile_loc_04', locOpt: 0, status: 0, speed: 0, impression: 3, scope: 5, style: 5 }, // Hút thuốc làm kích hoạt vòi phun nước phòng Lab
  M085: { cause: 2, locTile: 'tile_loc_01', locOpt: 2, status: 0, speed: 0, impression: 4, scope: 5, style: 4 }, // Đặt toàn bộ Server vào 1 Zone không có dự phòng
  M086: { cause: 3, locTile: 'tile_loc_02', locOpt: 0, status: 0, speed: 0, impression: 4, scope: 5, style: 2 }, // Nâng cấp thẳng Framework bản mới gây xung đột
  M087: { cause: 1, locTile: 'tile_loc_01', locOpt: 3, status: 2, speed: 1, impression: 0, scope: 4, style: 1 }, // Lỗi Race Condition khi 100 người mua cùng lúc
  M088: { cause: 3, locTile: 'tile_loc_02', locOpt: 0, status: 0, speed: 0, impression: 4, scope: 5, style: 2 }, // Deploy liều lĩnh không có kịch bản Rollback
  M089: { cause: 3, locTile: 'tile_loc_02', locOpt: 0, status: 0, speed: 1, impression: 0, scope: 5, style: 1 }, // Xóa file lock gây xung đột thư viện dây chuyền
  M090: { cause: 3, locTile: 'tile_loc_02', locOpt: 0, status: 0, speed: 0, impression: 4, scope: 5, style: 1 }  // Cập nhật Node/Java lệch chuẩn làm gãy hệ thống
};

const CANONICAL_MEANS_BY_ID = new Map(MEANS_CARDS.map(m => [m.id, m]));

function getValidMeansProfile(mCard) {
  if (!mCard || !mCard.id) return null;
  const profile = MEANS_PROFILES[mCard.id];
  if (!profile) return null;
  const canonical = CANONICAL_MEANS_BY_ID.get(mCard.id);
  if (canonical && mCard.vi && canonical.vi !== mCard.vi) {
    return null;
  }
  return profile;
}

/**
 * Phân loại chính xác Bản chất Dấu vết Để lại (tile_scene_04: 0..5) cho toàn bộ 200 lá Dấu vết Log (C001..C200)
 */
export function getClueTraceNature(cCard) {
  if (!cCard) return 2;
  const cText = `${cCard.vi || ''} ${cCard.en || ''}`.toLowerCase();
  const cCat = (cCard.category || '').toLowerCase();

  // 0: Đồ ăn / Thức uống / Vật lý
  if (/cà phê|trà sữa|trà thảo mộc|nước tăng lực|nước đá|c sủi|sữa tươi|lon bia|mì cay|mì tôm|bánh|kẹo|sô-cô-la|đậu phộng|quả táo|vỏ chuối|cơm trưa|muối trắng|xì gà|thuốc lá|gạt tàn|bật lửa|mèo|thú cưng|bọ thật|muỗi|mạng nhện|hoa héo|cây kim tiền|xương rồng|vết giày dính bùn|vỏ ốc/i.test(cText)) {
    return 0;
  }

  // 5: Vật dụng giải trí / Ngoại cảnh
  if (/bi lắc|ps5|tay cầm chơi game|cờ vua|truyện tranh|manga|vịt vàng|rubber duck|gấu bông|bóng bay|quả bóng|cúp lưu niệm|huy chương|bài tarot|lá bùa|nhang trầm|ngọn nến tâm linh|vòng tay phong thủy|vé số|hạc giấy|búp bê nga|đồng hồ cát|planning poker/i.test(cText)) {
    return 5;
  }

  // 1: Giao diện / Hình ảnh / Media
  if (/banner|svg|z-index|\bcss\b|pixel-perfect|đổi màu toàn bộ nút|ảnh chụp màn hình|screenshot|cctv|video|file ghi âm|youtube|astronomia|tiếng bíp|incognito|trình duyệt ẩn danh|easter egg/i.test(cText)) {
    return 1;
  }

  // 2: Bản ghi Log / Văn bản / Chat
  if (/email|đơn xin|lịch sử git|hóa đơn|tài liệu|danh thiếp|vé máy bay|hộ chiếu|bài báo|lịch để bàn|sơ đồ|menu|báo cáo|hợp đồng|sla|thiệp mời|tờ giấy|sổ tay|giấy note|mảnh giấy|sao kê|bảng chấm công|ticket jira|unit test|cuốn sách|stackoverflow|file \.env|bút dạ đỏ|lịch sử hỏi chatgpt|chữ ký số|dấu mộc|icon 🙏|tin nhắn|slack|phishing/i.test(cText)) {
    return 2;
  }

  // 3: File Cấu hình / Hệ thống / Mạng
  if (/ssl|chứng chỉ|cronjob|firewall|dependency|jwt token|bản vá|cảnh báo nhiệt độ|soap xml|file dump|bash_history|thùng rác máy chủ|biểu đồ thời gian|localhost|dây mạng|cáp quang|cáp mạng|ổ khóa mở toang|500 internal|log truy cập vpn|băng thông|rollback|ip đăng nhập|traceroute|tài khoản admin|cấu trúc code|khung xương kiến trúc|nhánh code rác|floating point|domino|all-in|math\.random|thư viện bị thiếu|zip bomb|git hook|bộ định tuyến|datadog|thanh ram|ups|đèn báo lỗi ổ cứng|cầu chì|quạt tản nhiệt|bụi khói đen|tro bụi cháy|điều khiển máy lạnh/i.test(cText)) {
    return 3;
  }

  // 4: Thiết bị / Đồ cá nhân của Dev
  if (/thẻ nhân viên|thẻ thực tập|thẻ cấp quyền|quẹt thẻ|thuốc nhỏ mắt|đồng hồ|yubikey|tai nghe|airpod|dây đeo thẻ|huy hiệu|que chọc sim|tóc|kính|đôi mắt|nút phím|keycap|găng tay|khẩu trang|mũ|áo|chiếc ô|khăn|ví lạnh|balo|cặp tài liệu|chìa khóa|ống hít|lược cài|gương nhỏ|keo tản nhiệt|móng tay|bàn chải|đôi tất|giày|dép|chiếc còi|gối kê cổ|điện thoại|laptop|chiếc usb|đèn pin|tăm bông|tua vít|ốc bắt khay/i.test(cText)) {
    return 4;
  }

  if (cCat.includes('natural')) return 0;
  if (cCat.includes('artistic')) return 1;
  if (cCat.includes('written')) return 2;
  if (cCat.includes('synthetic')) return 3;
  if (cCat.includes('personal')) return 4;
  return 5;
}

/**
 * Tìm Thẻ Hiện Trường Nâu phụ trợ khớp trực diện nhất với lá Dấu vết Log (Clue Card)
 */
export function getBestClueBrownTileAndOption(cCard) {
  if (!cCard) return { tileId: 'tile_scene_09', opt: 5, score: 5 };
  const cText = `${cCard.vi || ''} ${cCard.en || ''}`.toLowerCase();

  // 1. tile_scene_13 (Khung giờ Sập Hệ thống)
  if (/2h sáng|3h sáng|1h sáng|02:13|rạng sáng/i.test(cText)) return { tileId: 'tile_scene_13', opt: 0, score: 10 };
  if (/nửa đêm|ca đêm|xuyên đêm|midnight|night/i.test(cText)) return { tileId: 'tile_scene_13', opt: 5, score: 9 };
  if (/17h30|tan tầm|sắp về/i.test(cText)) return { tileId: 'tile_scene_13', opt: 4, score: 10 };
  if (/cơm trưa|ngủ trưa/i.test(cText)) return { tileId: 'tile_scene_13', opt: 2, score: 10 };
  if (/daily scrum|daily standup/i.test(cText)) return { tileId: 'tile_scene_13', opt: 1, score: 9 };

  // 2. tile_scene_21 (Bầu không khí Phòng họp)
  if (/16 độ|thermal hoodie/i.test(cText)) return { tileId: 'tile_scene_21', opt: 4, score: 10 };
  if (/mồ hôi hột|cold sweat/i.test(cText)) return { tileId: 'tile_scene_21', opt: 3, score: 10 };

  // 3. tile_scene_11 (Tín hiệu Phát hiện Đầu tiên)
  if (/pagerduty|tiếng bíp|còi báo hết giờ/i.test(cText)) return { tileId: 'tile_scene_11', opt: 0, score: 10 };
  if (/quạt tản nhiệt kêu|6000 rpm/i.test(cText)) return { tileId: 'tile_scene_11', opt: 1, score: 10 };
  if (/bốc mùi khét|bụi khói đen|tro bụi cháy|chập mạch/i.test(cText)) return { tileId: 'tile_scene_11', opt: 2, score: 10 };
  if (/tai nghe chống ồn|không nghe thấy còi/i.test(cText)) return { tileId: 'tile_scene_11', opt: 5, score: 10 };

  // 4. tile_scene_14 (Dấu vết Giám định tại Chỗ)
  if (/\bgit\b|\bcommit\b|bash_history|xóa trắng|thùng rác máy chủ|rollback|chữ ký số|incognito|trình duyệt ẩn danh|cắt mất thanh url/i.test(cText)) return { tileId: 'tile_scene_14', opt: 5, score: 10 };
  if (/500 internal|health check|30,000ms|circular dependency|105°c|datadog|ảnh chụp màn hình lỗi|traceroute|ping|firewall vừa bị stop|cronjob|băng thông|floating point|domino|thư viện bị thiếu|chuyển hướng nhầm 100%|vỏ ốc|easter egg/i.test(cText)) return { tileId: 'tile_scene_14', opt: 3, score: 10 };
  if (/cà phê đổ|trà sữa|nước tăng lực đổ|nước đá|ô ướt/i.test(cText)) return { tileId: 'tile_scene_14', opt: 4, score: 10 };
  if (/vết giày dính bùn|giày tây|giày chạy bộ|dép tổ ong|đôi tất|quẹt thẻ|chìa khóa tủ rack|cctv/i.test(cText)) return { tileId: 'tile_scene_14', opt: 1, score: 10 };
  if (/tua vít|ốc bắt khay|cầu chì|vỏ chuối|cúp lưu niệm.*rơi vỡ|lăn trúng dây nguồn|que chọc sim|gãy lẫy/i.test(cText)) return { tileId: 'tile_scene_14', opt: 2, score: 10 };
  if (/nút phím|keycap|khăn lau màn hình|móng tay|găng tay|vân tay|bàn phím/i.test(cText)) return { tileId: 'tile_scene_14', opt: 0, score: 9 };

  // 5. tile_scene_07 (Động cơ / Nguyên nhân Tâm lý)
  if (/\bot\b|48 giờ|mắt đỏ ngầu|thuốc nhỏ mắt|mì tôm|mì cay|bàn chải đánh răng|gối kê cổ|đơn xin nghỉ việc|160 bpm|muỗi đốt|tóc rụng|ống hít mũi|gạt tàn|bật lửa/i.test(cText)) return { tileId: 'tile_scene_07', opt: 0, score: 10 };
  if (/root admin|yubikey|2fa|ssh vào thẳng|all-in|vua săn bug|hackathon|ví lạnh|khẩu trang đen|mũ lưỡi trai đen|phishing|ip đăng nhập lạ|tài khoản admin bị khóa|ổ khóa mở toang|zip bomb/i.test(cText)) return { tileId: 'tile_scene_07', opt: 1, score: 10 };
  if (/tờ vé số|go-live|release|thiệp mời tiệc|bánh kem|xì gà|pomodoro|đồng hồ cát|lgtm|cầu nguyện|nhang trầm|lá bùa|tarot|icon 🙏|phong thủy/i.test(cText)) return { tileId: 'tile_scene_07', opt: 2, score: 10 };
  if (/tỏ tình|bông hoa|truyện tranh|cờ vua|ps5|youtube|ngủ gật|gấu bông|bóng bay|canh sếp đi qua/i.test(cText)) return { tileId: 'tile_scene_07', opt: 3, score: 10 };
  if (/cãi nhau|đổ lỗi|cấm đụng vào|clean code/i.test(cText)) return { tileId: 'tile_scene_07', opt: 4, score: 10 };
  if (/sơ đồ kiến trúc|khung xương kiến trúc|cấu trúc code|búp bê nga|sơ đồ luồng/i.test(cText)) return { tileId: 'tile_scene_07', opt: 5, score: 10 };

  // 6. tile_scene_17 (Tình trạng Codebase)
  if (/ssl đã quá hạn|jwt token đã hết hạn|soap xml cổ lỗ sĩ|mạng nhện giăng kín/i.test(cText)) return { tileId: 'tile_scene_17', opt: 3, score: 10 };
  if (/hotfix copy|bản vá lỗi tạm bợ|localhost:8080|math\.random/i.test(cText)) return { tileId: 'tile_scene_17', opt: 1, score: 10 };

  // 7. tile_scene_20 (Đặc điểm Nhân sự Liên quan)
  if (/thực tập sinh|intern/i.test(cText)) return { tileId: 'tile_scene_20', opt: 0, score: 10 };
  if (/z-index|1px giao diện|banner trang chủ|đổi màu toàn bộ nút|file svg lỗi/i.test(cText)) return { tileId: 'tile_scene_20', opt: 5, score: 10 };

  // 8. tile_scene_19 (Đối tượng Chịu ảnh hưởng Chính)
  if (/thẻ nhân viên fsoft|dây đeo thẻ|áo thun đồng phục|áo polo cam|mũ bảo hiểm/i.test(cText)) return { tileId: 'tile_scene_19', opt: 2, score: 9 };

  // 9. tile_scene_09 (Hiện trạng Bàn làm việc)
  if (/giấy note|mảnh giấy|tờ giấy|sổ tay|stackoverflow|tài liệu|hóa đơn|hợp đồng|bài báo|danh thiếp|vé máy bay|hộ chiếu|đơn xin|báo cáo|sao kê|ticket|file \.env|lịch sử hỏi|lá bài ước lượng/i.test(cText)) return { tileId: 'tile_scene_09', opt: 0, score: 9 };
  if (/khét|nóng|quạt tản nhiệt|keo tản nhiệt|bụi khói|tro bụi|30 độ|ups|đèn báo lỗi/i.test(cText)) return { tileId: 'tile_scene_09', opt: 1, score: 9 };
  if (/cà phê|trà|nước|bia|sữa|bánh|kẹo|sô-cô-la|đậu phộng|quả táo|muối/i.test(cText)) return { tileId: 'tile_scene_09', opt: 2, score: 9 };
  if (/kính chống ánh sáng xanh/i.test(cText)) return { tileId: 'tile_scene_09', opt: 3, score: 9 };
  if (/dây mạng|cáp|lược cài|usb|balo|cặp tài liệu|đèn pin|tăm bông|airpod|đất trồng cây|vịt vàng/i.test(cText)) return { tileId: 'tile_scene_09', opt: 4, score: 9 };

  return { tileId: 'tile_scene_09', opt: 5, score: 6 };
}

export class DeceptionState {
  constructor() {
    this.meta = DECEPTION_META;

    // Cấu hình phòng chơi (4 - 9 người)
    this.config = {
      playerCount: 6,           // 4..9 người chơi (Sweet spot: 6, 7, 8)
      cardsPerPlayer: 4,        // 3, 4 hoặc 5 lá Xanh + Đỏ mỗi người
      preferredRole: 'RANDOM',  // 'RANDOM' hoặc mã RoleType để người chơi trải nghiệm bất kỳ vai nào
      includeAccompliceAndWitness: true,
      includeUndercoverAllies: true,
      includeEventTiles: true,
      presentationSeconds: 120,
      playerName: 'Senior Dev',
      gameMode: 'STANDARD_3ROUNDS' // 'BLITZ_2MIN' (1 Vòng 120s Chuẩn Cuộc Thi FPT) | 'STANDARD_3ROUNDS' (3 Vòng)
    };

    this.caseId = 'INC-' + Math.floor(Math.random() * 8999 + 1000);
    this.roomCode = 'PROD' + Math.floor(Math.random() * 89 + 10);
    this.phase = GAME_PHASES.LOBBY;
    this.previousPhase = null;
    this.round = 1;
    this.maxRounds = 3;

    // Danh sách người chơi (4..9 ghế)
    this.players = [];
    this.humanPlayerId = 'p1';

    // Bảng Hiện Trường (1 Tím + 1 Xanh lá + 4 Nâu)
    this.activeSceneTiles = [];
    this.sceneDeck = [];
    this.unusedLocationTiles = [];
    this.activeEventTile = null;
    this.reversePresentationOrder = false;

    // Đáp án Vụ Án (CrimeSolution)
    this.solution = {
      murdererPlayerId: null,
      accomplicePlayerId: null,
      witnessPlayerId: null,
      meansCardId: null,
      clueCardId: null
    };

    // Lựa chọn tạm thời của người chơi (Đêm gây án / Phá án / Kỹ thuật viên Lab / Nội gián)
    this.pendingSelection = {
      meansCardId: null,
      clueCardId: null,
      accuseTargetPlayerId: null,
      accuseMeansId: null,
      accuseClueId: null,
      replaceTileIndex: null
    };

    // Thông tin Phản hồi riêng tư (Lab Tech soi bài, Inside Man tước huy hiệu)
    this.privateIntel = {
      labCheckedCardId: null,
      labCheckedResult: null,
      insideManTargetId: null
    };

    // Trạng thái Trình bày 30s
    this.speakerQueue = [];
    this.currentSpeakerIndex = 0;
    this.speakerTimeLeft = 30;

    // Ghim nghi vấn của người chơi (lưu ID các thẻ bài đang nghi ngờ)
    this.pinnedCardIds = new Set();

    // Kết quả Kết thúc ván đấu
    this.winnerTeam = null; // 'INVESTIGATION' | 'CRIMINAL'
    this.winReasonKey = '';
    this.winReasonText = '';
    this.accuserPlayerId = null;
    this.witnessShotTargetId = null;

    // Nhật ký hồ sơ sự cố
    this.caseLogs = [];

    // Dữ liệu AI Forensic Master (AI Log Analyzer mỗi vòng & Báo cáo RCA cuối trận)
    this.aiForensicReports = {};
    this.latestAiLogReport = null;
    this.aiRcaReport = null;

    this.initPreviewTable();
  }

  /**
   * Khởi tạo dữ liệu xem trước ở sảnh chờ (LOBBY)
   */
  initPreviewTable() {
    this.caseId = 'INC-' + Math.floor(Math.random() * 8999 + 1000);
    this.phase = GAME_PHASES.LOBBY;
    this.round = 1;
    this.winnerTeam = null;
    this.activeEventTile = null;
    this.pinnedCardIds.clear();
    this.caseLogs = [];
    this.aiForensicReports = {};
    this.latestAiLogReport = null;
    this.aiRcaReport = null;

    // Tạo danh sách ghế ngồi theo config.playerCount
    const count = Math.min(9, Math.max(4, Number(this.config.playerCount) || 6));
    this.players = [];
    for (let i = 0; i < count; i++) {
      const isHuman = i === 0;
      this.players.push({
        id: `p${i + 1}`,
        seatIndex: i,
        displayName: isHuman ? (this.config.playerName || 'Thám tử Trưởng') : BOT_NAMES_VI[i - 1] || `Đặc vụ #${i + 1}`,
        displayNameEn: isHuman ? (this.config.playerName || 'Chief Detective') : BOT_NAMES_EN[i - 1] || `Agent #${i + 1}`,
        avatar: DETECTIVE_AVATARS[i % DETECTIVE_AVATARS.length],
        role: i === 0 ? 'INVESTIGATOR' : (i === 1 ? 'FORENSIC_SCIENTIST' : 'INVESTIGATOR'),
        isHuman,
        isRoleRevealed: false,
        hasBadge: true,
        meansCards: [],
        clueCards: [],
        suspicionFlagId: null
      });
    }

    // Khởi tạo mẫu 6 thẻ hiện trường (1 Tím, 1 Xanh lá, 4 Nâu)
    const purple = SCENE_TILES.find(t => t.color === 'PURPLE');
    const green = SCENE_TILES.find(t => t.color === 'GREEN');
    const browns = SCENE_TILES.filter(t => t.color === 'BROWN').slice(0, 4);

    this.activeSceneTiles = [purple, green, ...browns].filter(Boolean).map((t, idx) => ({
      ...JSON.parse(JSON.stringify(t)),
      selectedOptionIndex: null,
      roundPlaced: 1,
      slotIndex: idx
    }));
  }

  /**
   * Ghi thêm dòng sự kiện vào Hồ sơ Nhật ký Vụ án
   */
  addLog(textVi, textEn, type = 'info') {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    this.caseLogs.unshift({
      id: 'log-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      time: `${hh}:${mm}:${ss}`,
      round: this.round,
      textVi,
      textEn: textEn || textVi,
      type
    });
  }

  /**
   * Xây dựng danh sách Vai trò (Role Pool) chuẩn theo số người chơi (4 - 9) và cấu hình
   */
  buildRolePool(playerCount) {
    const roles = ['FORENSIC_SCIENTIST', 'MURDERER'];

    const useExpanded = this.config.includeAccompliceAndWitness && playerCount >= 5;
    const useAllies = this.config.includeUndercoverAllies;
    const pref = this.config.preferredRole;

    if (useExpanded || pref === 'ACCOMPLICE' || pref === 'WITNESS' || pref === 'PROTECTIVE_DETAIL') {
      if (playerCount >= 5) {
        roles.push('ACCOMPLICE');
        roles.push('WITNESS');
      } else if (pref === 'ACCOMPLICE' || pref === 'WITNESS') {
        roles.push(pref);
      }
    }

    if (useAllies && playerCount >= 7) {
      if (roles.length < playerCount) roles.push('LAB_TECHNICIAN');
    }
    if (useAllies && playerCount >= 8) {
      if (roles.length < playerCount) roles.push('INSIDE_MAN');
    }
    if (useAllies && playerCount >= 9) {
      if (roles.length < playerCount && roles.includes('WITNESS')) {
        roles.push('PROTECTIVE_DETAIL');
      }
      if (roles.length < playerCount) {
        roles.push('CONSULTING_DETECTIVE');
      }
    }

    // Nếu người chơi chọn trải nghiệm đích danh một vai mở rộng nhưng chưa có trong pool
    if (pref && pref !== 'RANDOM' && !roles.includes(pref)) {
      if (pref === 'PROTECTIVE_DETAIL' && !roles.includes('WITNESS') && roles.length + 2 <= playerCount) {
        roles.push('WITNESS');
      }
      if (roles.length < playerCount) {
        roles.push(pref);
      } else {
        roles[roles.length - 1] = pref;
      }
    }

    // Lấp đầy các ghế còn lại bằng Điều tra viên (INVESTIGATOR)
    while (roles.length < playerCount) {
      roles.push('INVESTIGATOR');
    }

    return roles.slice(0, playerCount);
  }

  /**
   * Bắt đầu một Vụ Án Mới: Chia vai trò, chia thẻ Phương thức (Xanh) & Manh mối (Đỏ), rút Thẻ Hiện Trường
   */
  startNewGame() {
    const count = Math.min(9, Math.max(4, Number(this.config.playerCount) || 6));
    const cardsPer = Math.min(5, Math.max(3, Number(this.config.cardsPerPlayer) || 4));

    this.caseId = 'INC-' + Math.floor(Math.random() * 8999 + 1000);
    this.round = 1;
    this.maxRounds = this.config.gameMode === 'BLITZ_2MIN' ? 1 : 3;
    this.winnerTeam = null;
    this.winReasonKey = '';
    this.winReasonText = '';
    this.accuserPlayerId = null;
    this.witnessShotTargetId = null;
    this.activeEventTile = null;
    this.finalShowdown = null;
    this.finalShowdownDone = false;
    this.finalShowdownChosenPlayerId = null;
    this.reversePresentationOrder = false;
    this.pinnedCardIds.clear();
    this.caseLogs = [];
    this.aiForensicReports = {};
    this.latestAiLogReport = null;
    this.aiRcaReport = null;
    this.privateIntel = {
      labCheckedCardId: null,
      labCheckedResult: null,
      labCheckUsed: false,
      insideManTargetId: null,
      insideManUsed: false
    };
    this.pendingSelection = {
      meansCardId: null,
      clueCardId: null,
      accuseTargetPlayerId: null,
      accuseMeansId: null,
      accuseClueId: null,
      replaceTileIndex: null
    };

    // 1. Phân bổ vai trò cho 4 - 9 người chơi
    const pool = shuffleArray(this.buildRolePool(count));
    const pref = this.config.preferredRole;
    if (pref && pref !== 'RANDOM') {
      const idx = pool.indexOf(pref);
      if (idx > 0) {
        [pool[0], pool[idx]] = [pool[idx], pool[0]];
      }
    }

    // 2. Xáo bộ bài 90 lá Phương thức (Xanh) và 200 lá Manh mối (Đỏ)
    // Phân bài đa dạng (Diversified Dealing): Mỗi người chơi nhận các lá Xanh thuộc các nhóm Root Cause khác nhau
    // và các lá Đỏ thuộc các nhóm Bản chất Dấu vết khác nhau để tránh trùng lặp gây nhiễu trên cùng 1 bàn!
    const availableMeans = shuffleArray(MEANS_CARDS);
    const availableClues = shuffleArray(CLUE_CARDS);
    const usedMeansIds = new Set();
    const usedClueIds = new Set();

    const pickDiversifiedMeans = (numCards) => {
      const picked = [];
      const seenCauses = new Set();
      // Lượt 1: Ưu tiên mỗi lá một Root Cause khác nhau
      for (const m of availableMeans) {
        if (picked.length >= numCards) break;
        if (usedMeansIds.has(m.id)) continue;
        const prof = MEANS_PROFILES[m.id];
        const cause = prof ? prof.cause : -1;
        if (cause !== -1 && seenCauses.has(cause)) continue;
        if (cause !== -1) seenCauses.add(cause);
        usedMeansIds.add(m.id);
        picked.push({
          ...m,
          type: 'MEANS',
          icon: getCardIcon(m.category),
          gameIcon: getCardGameIconKey(m)
        });
      }
      // Lượt 2: Bổ sung nếu thiếu
      for (const m of availableMeans) {
        if (picked.length >= numCards) break;
        if (usedMeansIds.has(m.id)) continue;
        usedMeansIds.add(m.id);
        picked.push({
          ...m,
          type: 'MEANS',
          icon: getCardIcon(m.category),
          gameIcon: getCardGameIconKey(m)
        });
      }
      return picked;
    };

    const pickDiversifiedClues = (numCards) => {
      const picked = [];
      const seenNatures = new Set();
      // Lượt 1: Ưu tiên mỗi lá một Bản chất Dấu vết (tile_scene_04) khác nhau
      for (const c of availableClues) {
        if (picked.length >= numCards) break;
        if (usedClueIds.has(c.id)) continue;
        const nature = getClueTraceNature(c);
        if (seenNatures.has(nature)) continue;
        seenNatures.add(nature);
        usedClueIds.add(c.id);
        picked.push({
          ...c,
          type: 'CLUE',
          icon: getCardIcon(c.category),
          gameIcon: getCardGameIconKey(c)
        });
      }
      // Lượt 2: Bổ sung nếu thiếu
      for (const c of availableClues) {
        if (picked.length >= numCards) break;
        if (usedClueIds.has(c.id)) continue;
        usedClueIds.add(c.id);
        picked.push({
          ...c,
          type: 'CLUE',
          icon: getCardIcon(c.category),
          gameIcon: getCardGameIconKey(c)
        });
      }
      return picked;
    };

    this.players = [];
    for (let i = 0; i < count; i++) {
      const role = pool[i];
      const roleDef = ROLE_DEFINITIONS[role] || ROLE_DEFINITIONS.INVESTIGATOR;
      const isForensic = role === 'FORENSIC_SCIENTIST';
      const isHuman = i === 0;

      const pMeans = isForensic ? [] : pickDiversifiedMeans(cardsPer);
      const pClues = isForensic ? [] : pickDiversifiedClues(cardsPer);

      this.players.push({
        id: `p${i + 1}`,
        seatIndex: i,
        displayName: isHuman ? (this.config.playerName || 'Thám tử Trưởng') : BOT_NAMES_VI[i - 1] || `Đặc vụ #${i + 1}`,
        displayNameEn: isHuman ? (this.config.playerName || 'Chief Detective') : BOT_NAMES_EN[i - 1] || `Agent #${i + 1}`,
        avatar: isForensic ? '🖥️' : DETECTIVE_AVATARS[i % DETECTIVE_AVATARS.length],
        role,
        team: roleDef.team,
        isHuman,
        isRoleRevealed: isForensic, // Pháp y luôn mở ngửa thẻ vai trò từ đầu ván
        hasBadge: !isForensic,      // Mọi người trừ Pháp y đều có 1 Huy hiệu Phá án
        meansCards: pMeans,
        clueCards: pClues,
        suspicionFlagId: null
      });
    }

    // 3. Ghi nhận ID của Sát nhân, Đồng phạm, Nhân chứng
    const murderer = this.players.find(p => p.role === 'MURDERER');
    const accomplice = this.players.find(p => p.role === 'ACCOMPLICE');
    const witness = this.players.find(p => p.role === 'WITNESS');

    this.solution = {
      murdererPlayerId: murderer ? murderer.id : null,
      accomplicePlayerId: accomplice ? accomplice.id : null,
      witnessPlayerId: witness ? witness.id : null,
      meansCardId: null,
      clueCardId: null
    };

    // 4. Chuẩn bị Chồng Thẻ Hiện Trường (1 Tím + 1 Xanh lá + 4 Nâu + Chồng rút)
    const purpleTile = SCENE_TILES.find(t => t.color === 'PURPLE');
    const greenTiles = shuffleArray(SCENE_TILES.filter(t => t.color === 'GREEN'));
    const brownTiles = shuffleArray(SCENE_TILES.filter(t => t.color === 'BROWN'));

    const chosenGreen = greenTiles[0];
    this.unusedLocationTiles = greenTiles.slice(1);

    const initialBrowns = brownTiles.slice(0, 4);
    let remainingDeck = brownTiles.slice(4).map(t => ({ ...JSON.parse(JSON.stringify(t)) }));

    if (this.config.includeEventTiles) {
      const events = shuffleArray(EVENT_TILES).slice(0, 3).map(e => ({ ...JSON.parse(JSON.stringify(e)) }));
      remainingDeck = shuffleArray([...remainingDeck, ...events]);
    }

    this.sceneDeck = remainingDeck;
    this.activeSceneTiles = [purpleTile, chosenGreen, ...initialBrowns].filter(Boolean).map((t, idx) => ({
      ...JSON.parse(JSON.stringify(t)),
      selectedOptionIndex: null,
      roundPlaced: 1,
      slotIndex: idx,
      targetCardType: idx <= 3 ? 'MEANS' : 'CLUE'
    }));

    this.phase = GAME_PHASES.ROLE_CASTING;
    this.addLog(
      `🚨 War Room Sự cố #${this.caseId} đã kích hoạt với ${count} thành viên (${cardsPer} Hành vi Xanh + ${cardsPer} Dấu vết Đỏ/người).`,
      `🚨 Incident War Room #${this.caseId} opened with ${count} responders (${cardsPer} Triggers + ${cardsPer} Log Traces each).`,
      'system'
    );
  }

  getHumanPlayer() {
    return this.players.find(p => p.isHuman) || this.players[0];
  }

  getForensicPlayer() {
    return this.players.find(p => p.role === 'FORENSIC_SCIENTIST');
  }

  getMurdererPlayer() {
    return this.players.find(p => p.role === 'MURDERER');
  }

  getPlayerById(id) {
    return this.players.find(p => p.id === id) || null;
  }

  findCardById(cardId) {
    for (const p of this.players) {
      const m = p.meansCards.find(c => c.id === cardId);
      if (m) return { card: m, owner: p };
      const c = p.clueCards.find(cl => cl.id === cardId);
      if (c) return { card: c, owner: p };
    }
    return null;
  }

  /**
   * Chuyển từ pha ROLE_CASTING sang pha Đêm Gây Án (NIGHT_CRIME_SELECTION)
   */
  proceedToNightCrime() {
    this.phase = GAME_PHASES.NIGHT_CRIME_SELECTION;
    const murderer = this.getMurdererPlayer();
    if (!murderer) return;

    // Nếu Sát nhân là Bot, tự động chọn bí mật 1 lá Phương thức + 1 lá Manh mối của mình
    if (!murderer.isHuman) {
      const mPick = murderer.meansCards[Math.floor(Math.random() * murderer.meansCards.length)];
      const cPick = murderer.clueCards[Math.floor(Math.random() * murderer.clueCards.length)];
      if (mPick && cPick) {
        this.commitMurdererSelection(mPick.id, cPick.id);
      }
    } else {
      // Gợi ý sẵn cặp đầu tiên để người chơi có thể đổi hoặc xác nhận ngay
      this.pendingSelection.meansCardId = murderer.meansCards[0]?.id || null;
      this.pendingSelection.clueCardId = murderer.clueCards[0]?.id || null;
    }
  }

  /**
   * Xác nhận lựa chọn Hung khí (Means) + Vật chứng (Clue) của Kẻ Sát Nhân
   */
  commitMurdererSelection(meansId, clueId) {
    const murderer = this.getMurdererPlayer();
    if (!murderer) return false;

    const validMeans = murderer.meansCards.find(c => c.id === meansId);
    const validClue = murderer.clueCards.find(c => c.id === clueId);
    if (!validMeans || !validClue) return false;

    this.solution.meansCardId = validMeans.id;
    this.solution.clueCardId = validClue.id;

    // Tự động căn chỉnh toàn bộ 6 Thẻ Hiện Trường (1 Tím + 1 Xanh Lá + 2 Nâu Hành vi + 2 Nâu Dấu vết)
    this.alignSceneTilesWithCrime(validMeans, validClue);

    this.addLog(
      '🌙 Đêm Deployment: Thủ phạm (The Culprit) đã bí mật kích hoạt 1 Hành vi gây lỗi và để lại 1 Dấu vết Log làm sập Production!',
      '🌙 Deployment Night: The Culprit secretly triggered 1 Action and left behind 1 Log Trace, crashing Production!',
      'crime'
    );
    return true;
  }

  /**
   * Căn chỉnh toàn bộ 6 Thẻ Hiện Trường (Active Scene Tiles) với cặp bài (Means + Clue) của Thủ phạm:
   * - Slot 0 (Tím): Root Cause -> Gợi ý Thẻ Xanh (MEANS)
   * - Slot 1 (Xanh lá): Tầng hệ thống bị sập khớp nhất -> Gợi ý Thẻ Xanh (MEANS)
   * - Slot 2 & 3 (Nâu): 2 Thẻ Thông số Sự cố phân tách rõ nhất cho Thẻ Xanh (MEANS)
   * - Slot 4 (Nâu): Bản chất Dấu vết Để lại (tile_scene_04) -> Gợi ý Thẻ Đỏ (CLUE)
   * - Slot 5 (Nâu): Thẻ Hiện trường Nâu khớp trực diện nhất với Thẻ Đỏ (CLUE)
   */
  alignSceneTilesWithCrime(meansCard, clueCard) {
    if (!this.activeSceneTiles || this.activeSceneTiles.length === 0) return;

    // 1. Căn chỉnh Thẻ Xanh Lá (Slot 1)
    this.alignLocationTileWithCrime(meansCard, clueCard);

    if (this.activeSceneTiles[0]) {
      this.activeSceneTiles[0].targetCardType = 'MEANS';
    }
    if (this.activeSceneTiles[1]) {
      this.activeSceneTiles[1].targetCardType = 'MEANS';
    }

    // 2. Tập hợp tất cả các thẻ Nâu chuẩn từ SCENE_TILES
    const allBrownMap = new Map(
      SCENE_TILES.filter(t => t.color === 'BROWN').map(t => [t.id, JSON.parse(JSON.stringify(t))])
    );

    // 3. Chọn 2 thẻ Nâu tốt nhất cho HÀNH VI LỖI (MEANS) từ nhóm 5 thẻ chuyên sâu kỹ thuật
    const meansBrownCandidates = ['tile_scene_06', 'tile_scene_01', 'tile_scene_03', 'tile_scene_08', 'tile_scene_05'];
    const otherMeansCards = [];
    for (const p of this.players) {
      if (p.role === 'FORENSIC_SCIENTIST') continue;
      for (const m of p.meansCards || []) {
        if (m.id !== meansCard.id) otherMeansCards.push(m);
      }
    }

    const scoredMeansBrowns = meansBrownCandidates
      .map((tileId, priorityIdx) => {
        const tileObj = allBrownMap.get(tileId);
        if (!tileObj) return null;
        const mockTile = { ...tileObj, targetCardType: 'MEANS' };
        const targetOpt = this.computeSmartBulletOption(mockTile, meansCard, clueCard);
        let collisions = 0;
        for (const om of otherMeansCards) {
          if (this.computeSmartBulletOption(mockTile, om, clueCard) === targetOpt) {
            collisions++;
          }
        }
        // Điểm ưu tiên cao cho tile_scene_06 (Phạm vi ảnh hưởng) & tile_scene_01 (Trạng thái hệ thống) + ít trùng lặp nhất
        const score = (100 - collisions * 8) - priorityIdx * 2;
        return { tileId, tileObj, score };
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score);

    const chosenMeansBrown1 = scoredMeansBrowns[0]?.tileObj;
    const chosenMeansBrown2 = scoredMeansBrowns[1]?.tileObj;

    // 4. Chọn 2 thẻ Nâu tốt nhất cho DẤU VẾT LOG (CLUE):
    // Slot 4 luôn là tile_scene_04 (Bản chất Dấu vết Để lại)
    // Slot 5 là thẻ Nâu khớp trực diện nhất với clueCard từ getBestClueBrownTileAndOption
    const chosenClueBrown1 = allBrownMap.get('tile_scene_04');
    const bestClueMatch = getBestClueBrownTileAndOption(clueCard);
    const chosenUsedIds = new Set([
      chosenMeansBrown1?.id,
      chosenMeansBrown2?.id,
      chosenClueBrown1?.id
    ].filter(Boolean));

    let chosenClueBrown2 = allBrownMap.get(bestClueMatch.tileId);
    if (!chosenClueBrown2 || chosenUsedIds.has(chosenClueBrown2.id)) {
      const fallbackClueIds = ['tile_scene_09', 'tile_scene_14', 'tile_scene_07', 'tile_scene_13', 'tile_scene_11', 'tile_scene_20'];
      for (const fid of fallbackClueIds) {
        if (!chosenUsedIds.has(fid) && allBrownMap.has(fid)) {
          chosenClueBrown2 = allBrownMap.get(fid);
          break;
        }
      }
    }
    if (chosenClueBrown2) chosenUsedIds.add(chosenClueBrown2.id);

    const alignedBrowns = [
      chosenMeansBrown1 ? { ...chosenMeansBrown1, targetCardType: 'MEANS' } : null,
      chosenMeansBrown2 ? { ...chosenMeansBrown2, targetCardType: 'MEANS' } : null,
      chosenClueBrown1 ? { ...chosenClueBrown1, targetCardType: 'CLUE' } : null,
      chosenClueBrown2 ? { ...chosenClueBrown2, targetCardType: 'CLUE' } : null
    ].filter(Boolean);

    // Gán 4 thẻ Nâu đã căn chỉnh vào các vị trí Nâu trên activeSceneTiles (Slots 2..5)
    let brownCursor = 0;
    for (let i = 0; i < this.activeSceneTiles.length; i++) {
      if (this.activeSceneTiles[i].color === 'BROWN' && brownCursor < alignedBrowns.length) {
        const picked = alignedBrowns[brownCursor++];
        this.activeSceneTiles[i] = {
          ...JSON.parse(JSON.stringify(picked)),
          selectedOptionIndex: null,
          roundPlaced: this.activeSceneTiles[i].roundPlaced || 1,
          slotIndex: i,
          targetCardType: picked.targetCardType
        };
      }
    }

    // 5. Cập nhật lại sceneDeck với các thẻ Nâu chưa dùng (ưu tiên các thẻ có độ khớp cao lên đầu) và giữ nguyên các EVENT_TILE
    const existingEvents = (this.sceneDeck || []).filter(t => t.type === 'EVENT_TILE');
    const remainingBrowns = [];
    const preferredOrder = [
      ...scoredMeansBrowns.slice(2).map(x => ({ ...x.tileObj, targetCardType: 'MEANS' })),
      ...['tile_scene_09', 'tile_scene_14', 'tile_scene_07', 'tile_scene_13', 'tile_scene_11', 'tile_scene_17', 'tile_scene_20', 'tile_scene_19', 'tile_scene_21', 'tile_scene_02', 'tile_scene_10', 'tile_scene_15', 'tile_scene_16', 'tile_scene_18', 'tile_scene_12']
        .map(id => allBrownMap.get(id))
        .filter(Boolean)
        .map(t => ({ ...t, targetCardType: 'CLUE' }))
    ];

    for (const item of preferredOrder) {
      if (!chosenUsedIds.has(item.id)) {
        chosenUsedIds.add(item.id);
        remainingBrowns.push(JSON.parse(JSON.stringify(item)));
      }
    }

    // Xen kẽ Event Tiles vào nửa sau để Vòng 2/3 rút thẻ Nâu chuẩn xác mà vẫn hỗ trợ Event Tiles
    if (existingEvents.length > 0) {
      const rebuilt = [...remainingBrowns];
      existingEvents.forEach((ev, idx) => {
        const insertPos = Math.min(rebuilt.length, 2 + idx * 3);
        rebuilt.splice(insertPos, 0, ev);
      });
      this.sceneDeck = rebuilt;
    } else {
      this.sceneDeck = remainingBrowns;
    }
  }

  /**
   * Căn chỉnh Thẻ Xanh Lá (Tầng hệ thống bị sập) với phạm vi của lỗi gây sập
   * Nếu thẻ xanh lá hiện tại không khớp bằng một thẻ khác trong unusedLocationTiles,
   * hoán đổi sang thẻ xanh lá phù hợp nhất (tile_loc_01..04).
   */
  alignLocationTileWithCrime(meansCard, clueCard) {
    if (!this.activeSceneTiles || this.activeSceneTiles.length === 0) return;
    const greenIdx = this.activeSceneTiles.findIndex(
      t => t.color === 'GREEN' || t.type === 'LOCATION_OF_CRIME'
    );
    if (greenIdx === -1) return;

    const currentGreen = this.activeSceneTiles[greenIdx];

    // Đảm bảo có danh sách các Thẻ Xanh Lá chưa sử dụng
    let unused = this.unusedLocationTiles || [];
    if (!unused || unused.length === 0) {
      unused = SCENE_TILES.filter(
        t => (t.color === 'GREEN' || t.type === 'LOCATION_OF_CRIME') && t.id !== currentGreen.id
      ).map(t => JSON.parse(JSON.stringify(t)));
      this.unusedLocationTiles = unused;
    }

    const allCandidates = [currentGreen, ...unused];
    let bestCandidate = currentGreen;
    let bestScore = this.scoreLocationTileMatching(currentGreen, meansCard, clueCard);

    for (const candidate of unused) {
      const score = this.scoreLocationTileMatching(candidate, meansCard, clueCard);
      // Chỉ ưu tiên đổi sang thẻ khác nếu candidate có điểm số cao hơn hẳn thẻ hiện tại
      if (score > bestScore) {
        bestScore = score;
        bestCandidate = candidate;
      }
    }

    if (bestCandidate.id !== currentGreen.id) {
      const newGreen = {
        ...JSON.parse(JSON.stringify(bestCandidate)),
        selectedOptionIndex: null,
        roundPlaced: currentGreen.roundPlaced || 1,
        slotIndex: greenIdx,
        targetCardType: 'MEANS'
      };
      this.activeSceneTiles[greenIdx] = newGreen;
      this.unusedLocationTiles = allCandidates.filter(t => t.id !== bestCandidate.id);
    } else {
      this.activeSceneTiles[greenIdx].targetCardType = 'MEANS';
    }
  }

  /**
   * Đánh giá độ phù hợp của 1 Thẻ Xanh Lá (Location) đối với cặp bài Means + Clue
   */
  scoreLocationTileMatching(tile, meansCard, clueCard) {
    if (!tile || !meansCard) return 0;

    // Ưu tiên 1: Nếu meansCard nằm trong bảng hồ sơ chuẩn MEANS_PROFILES (M001..M090)
    const profile = getValidMeansProfile(meansCard);
    if (profile && tile.id) {
      if (tile.id === profile.locTile) return 100;
    }

    const mText = `${meansCard.vi || ''} ${meansCard.en || ''}`.toLowerCase();
    const cText = `${clueCard?.vi || ''} ${clueCard?.en || ''}`.toLowerCase();

    const tileOptionMatchers = {
      tile_loc_01: [
        // 0: Production Database
        /database|connection pool|connections|\bdb\b|\bsql\b|postgres|mysql|mongo|bảng|table|migration|deadlock|pool|query|\borm\b|rò rỉ kết nối|drop table|truncate|dump db|chọc db|redis db|update|select|insert|delete|index/i,
        // 1: API Gateway
        /api gateway|gateway|reverse proxy|endpoint|route|cors|\b502\b|proxy|rest api|ingress|rate limit|spam api|bắn spam|bắn webhook|choke gateway/i,
        // 2: Cloud Server / Cụm K8s
        /\bk8s\b|kubernetes|cloud|cluster|server|pod|docker|aws|\bec2\b|\bvm\b|container|node|\bcpu\b|\bram\b|memory|\boom\b|out of memory|quá tải cpu|treo cứng|kernel|đào coin|miner|vòng lặp|while\(true\)|sleep\(|try-catch|đệ quy|stack overflow|auto-scaling|zone/i,
        // 3: Hệ thống Payment
        /payment|thanh toán|stripe|bank|ngân hàng|ví điện tử|momo|vnpay|transaction|giao dịch|thẻ tín dụng|billing|order|checkout|nạp tiền|hoàn tiền/i,
        // 4: Cổng Auth / Login
        /auth|login|\bjwt\b|token|password|mật khẩu|oauth|\bsso\b|đăng nhập|xác thực|credential|quyền|chmod|root|secret|public repo|hacker|lộ aws|backdoor|phân quyền/i,
        // 5: Cụm Redis Cache
        /redis|cache|memcache|\bttl\b|evict|session|bộ nhớ đệm|in-memory|xóa cache|tràn cache|rò rỉ cache/i
      ],
      tile_loc_02: [
        // 0: CI/CD Pipeline
        /ci\/cd|pipeline|jenkins|gitlab|deploy|github actions|release|runner|build|npm build|merge|push|force push|branch|commit|\bgit\b|rebase|pull request|package-lock|yarn\.lock|lockfile/i,
        // 1: Load Balancer / CDN
        /load balancer|\bcdn\b|cloudflare|nginx|traffic|traffics|ddos|botnet|flood|chịu tải|băng thông|sập mạng|reverse proxy|dns|tên miền|\bdomain\b|\bip\b|chuyển hướng|routing|\bssl\b|\btls\b|chứng chỉ/i,
        // 2: Kafka / RabbitMQ
        /kafka|rabbitmq|queue|hàng đợi|message broker|event bus|pub\/sub|consumer|producer|topic|lag kafka|tràn queue/i,
        // 3: Kho lưu trữ Cloud S3
        /\bs3\b|bucket|storage|blob|upload|file storage|cloud storage|lưu trữ file|tải lên|dung lượng|ổ cứng|ảnh|media|s3 bucket/i,
        // 4: Hệ thống Hóa đơn & Billing
        /billing|hóa đơn|invoice|cost|chi phí|tiền bạc|tính cước|charge|pricing|hóa đơn aws|thâm hụt|vượt ngân sách/i,
        // 5: Máy chủ Tìm kiếm (Elastic)
        /elastic|elasticsearch|search|kibana|index|tìm kiếm|fulltext|lucenes|reindex|truy vấn search/i
      ],
      tile_loc_03: [
        // 0: Ứng dụng Mobile
        /mobile|\bios\b|android|\bapp\b|\bapps\b|flutter|react native|smartphone|chplay|appstore|điện thoại|crash app|build apk|ipa/i,
        // 1: Trang Quản trị Web Admin
        /admin|portal|dashboard|quản trị|\bcms\b|bảng điều khiển|backoffice|bảng tin|phân quyền nhân viên|trang nội bộ|excel|báo cáo|export|report|phân trang/i,
        // 2: Trang chủ Khách hàng
        /landing|trang chủ|\bhome\b|customer|khách hàng|frontend|giao diện web|\bui\b|\bux\b|trình duyệt|browser|html|\bcss\b|\bweb\b|\bfe\b|\bxss\b|giao diện/i,
        // 3: Mạng nội bộ VPN / Intranet
        /\bvpn\b|intranet|nội bộ|wifi|firewall|mạng nội bộ|\blan\b|ip nội bộ|rớt wifi|ngắt kết nối vpn/i,
        // 4: Hệ thống AI / LLM Service
        /\b(ai|llm|gpt|chatbot|bot|gemini|openai)\b|trí tuệ nhân tạo|prompt|hallucination|cháy token llm/i,
        // 5: Cổng Gửi Email / OTP
        /email|\botp\b|\bsms\b|notification|\bmail\b|thông báo|gửi mail|mã xác nhận|smtp|spam mail|cháy quota mail/i
      ],
      tile_loc_04: [
        // 0: Phòng Server Vật lý (On-Prem)
        /on-prem|server room|phần cứng|rack|ổ điện|\bups\b|máy chủ vật lý|dây cáp|nóng ran|khét|cúp điện|phòng server|quạt|\bhú\b|silicon|cháy tủ/i,
        // 1: Phòng dự án ODC
        /\bodc\b|f-ville|f-town|fsoft|bàn làm việc|văn phòng|open space|khu dự án|bàn phím|chuột|màn hình/i,
        // 2: Phòng họp Demo Khách hàng
        /demo.*khách hàng|khách hàng.*demo|thuyết trình|slide|máy chiếu|onsite|pitch/i,
        // 3: Môi trường Staging / UAT
        /staging|\buat\b|\bqa\b|\bqc\b|tester|testcase|kiểm thử|unit test|môi trường test/i,
        // 4: Hệ thống Backup Dự phòng
        /backup|dự phòng|snapshot|restore|phục hồi|mất dữ liệu|sao lưu|hỏng bản backup/i,
        // 5: API Đối tác Bên thứ 3
        /bên thứ 3|third-party|third party|partner|đối tác|external api|script ngoài|nhúng script|dịch vụ ngoài|api đối tác|cổng thứ 3/i
      ]
    };

    const matchers = tileOptionMatchers[tile.id];
    let maxScore = 0;

    if (matchers) {
      for (let i = 0; i < matchers.length; i++) {
        let optScore = 0;
        const re = matchers[i];
        if (re.test(mText)) optScore += 10;
        if (re.test(cText)) optScore += 5;
        if (optScore > maxScore) maxScore = optScore;
      }
    }

    if (tile.options_vi) {
      const stopWords = new Set(['cho', 'của', 'với', 'các', 'một', 'như', 'đang', 'khi', 'vào', 'lên', 'the', 'and', 'for', 'with', 'from', 'into']);
      const shortTechTokens = new Set(['ot', 'db', 'ui', 'fe', 'qa', 'qc', 's3', 'vm', 'pm', 'ai', 'ip', 'os', 'ci', 'cd', 'k8']);
      for (let idx = 0; idx < tile.options_vi.length; idx++) {
        const optVi = (tile.options_vi[idx] || '').toLowerCase();
        const optEn = (tile.options_en ? tile.options_en[idx] : '').toLowerCase();
        const tokens = `${optVi} ${optEn}`
          .split(/[\s,()\/•-]+/)
          .filter(t => (t.length >= 3 || shortTechTokens.has(t)) && !stopWords.has(t));
        let tokenScore = 0;
        for (const token of tokens) {
          if (mText.includes(token)) tokenScore += 4;
          if (cText.includes(token)) tokenScore += 2;
        }
        if (tokenScore > maxScore) {
          maxScore = tokenScore;
        }
      }
    }

    return maxScore;
  }

  /**
   * Chuyển sang pha Đêm Nhân Chứng (NIGHT_WITNESS_REVEAL) hoặc thẳng sang Vòng 1
   */
  proceedAfterNightCrime() {
    const hasWitnessOrProtective = this.players.some(
      p => p.role === 'WITNESS' || p.role === 'PROTECTIVE_DETAIL'
    );
    if (hasWitnessOrProtective) {
      this.phase = GAME_PHASES.NIGHT_WITNESS_REVEAL;
      this.addLog(
        '👁️ Whistleblower (Senior Dev) đã phát hiện 2 nghi phạm thuộc phe Gây Lỗi truy cập Server lúc nửa đêm.',
        '👁️ The Whistleblower (Senior Dev) spotted 2 suspects from the Bug Team accessing the server at midnight.',
        'night'
      );
    } else {
      this.startRound1Evidence();
    }
  }

  /**
   * Bắt đầu Vòng 1: Pháp y đặt 6 viên đạn gỗ lên 6 Thẻ Hiện Trường
   */
  startRound1Evidence() {
    this.round = 1;
    this.phase = GAME_PHASES.ROUND_1_EVIDENCE;
    const forensic = this.getForensicPlayer();

    if (forensic && !forensic.isHuman) {
      this.autoPlaceForensicBullets();
    }
  }

  /**
   * Thuật toán AI Tech Lead / Incident Commander thông minh: Đặt đạn gỗ khớp ngữ nghĩa chuẩn xác với cặp bài của Thủ Phạm
   */
  computeSmartBulletOption(tile, customMeansCard = null, customClueCard = null) {
    const mCard = customMeansCard || this.findCardById(this.solution?.meansCardId)?.card || (customClueCard ? {} : null);
    const cCard = customClueCard || this.findCardById(this.solution?.clueCardId)?.card || (customMeansCard ? {} : null);
    if (!mCard || !cCard) return 0;

    const mProfile = getValidMeansProfile(mCard);
    const bestClueMatch = getBestClueBrownTileAndOption(cCard);

    const mCat = (mCard.category || '').toLowerCase();
    const cCat = (cCard.category || '').toLowerCase();
    const mText = `${mCard.vi || ''} ${mCard.en || ''}`.toLowerCase();
    const cText = `${cCard.vi || ''} ${cCard.en || ''}`.toLowerCase();
    const combined = `${mText} ${cText}`;

    // 1. Ô TÍM: Root Cause (Nguyên nhân Gốc rễ - tile_cause_01)
    if (tile.id === 'tile_cause_01') {
      if (mProfile && typeof mProfile.cause === 'number') {
        return mProfile.cause;
      }
      // Fallback từ khóa IT trực diện trong thẻ Hành vi gây lỗi (Means)
      if (/\b(ram|oom|memory|heap)\b|out of memory|rò rỉ bộ nhớ|leak memory|bộ nhớ|lưu rác/i.test(mText)) return 0; // Tràn RAM (OOM)
      if (/database|đứt kết nối|kết nối db|connection pool|max connection|\bcáp\b|cable|drop table|\bsql\b|query|postgres|mysql|mongo|bảng|table|deadlock|cơ sở dữ liệu|\b(update|insert|delete)\b.*(where|bảng)/i.test(mText)) return 2; // Đứt kết nối DB
      if (/\b(cpu|spike|treo|hang)\b|vòng lặp|\bloop\b|while\(true\)|100%|treo cứng|đệ quy|recursion|đào coin|miner|crypto|tính toán/i.test(mText)) return 1; // Quá tải CPU
      if (/thư viện|dependency|package|\bnpm\b|conflict|version|xung đột|node_modules|build|\bpip\b|typosquatting|package-lock|yarn\.lock/i.test(mText)) return 3; // Xung đột thư viện
      if (/lỗi phân quyền|permission|root|auth|\bjwt\b|token|password|mật khẩu|api key|secret|hacker|bảo mật|chmod|\badmin\b|backdoor|\bxss\b|public repo|lộ aws/i.test(mText)) return 4; // Lỗi phân quyền / Bảo mật
      if (/ddos|botnet|flood|tấn công mạng|spam api|traffic|bắn spam|webhook/i.test(mText)) return 5; // DDoS / Tấn công mạng

      if (mCat.includes('poison')) return 4;
      if (mCat.includes('suffoc')) return (/\b(leak|ram|memory|oom)\b/i.test(mText) ? 0 : 1);
      if (mCat.includes('blood')) return 2;
      if (mCat.includes('severe')) return 1;
      if (mCat.includes('illness')) return 3;
      if (mCat.includes('accident')) return 5;
      return 1;
    }

    // 2. Ô XANH LÁ: Môi trường / Tầng hệ thống bị sập (tile_loc_01 .. tile_loc_04)
    if (tile.color === 'GREEN' || tile.type === 'LOCATION_OF_CRIME') {
      if (mProfile && tile.id === mProfile.locTile && typeof mProfile.locOpt === 'number') {
        return mProfile.locOpt;
      }
      if (tile.id === 'tile_loc_01') { // Core Infra: Database, API Gateway, Cloud K8s, Payment, Auth, Redis
        if (/api gateway|gateway|reverse proxy|endpoint|route|cors|\b502\b|proxy|rest api|ingress|rate limit|spam api|bắn spam|webhook/i.test(mText)) return 1; // API Gateway
        if (/redis|cache|memcache|\bttl\b|evict|session|bộ nhớ đệm|in-memory/i.test(mText)) return 5; // Cụm Redis Cache
        if (/payment|thanh toán|stripe|bank|ngân hàng|ví điện tử|momo|vnpay|transaction|giao dịch|thẻ tín dụng|billing|order|checkout|nạp tiền/i.test(mText)) return 3; // Hệ thống Payment
        if (/auth|login|\bjwt\b|token|password|mật khẩu|oauth|\bsso\b|đăng nhập|xác thực|credential|quyền|chmod|root|secret|public repo|hacker|lộ aws|backdoor/i.test(mText)) return 4; // Cổng Auth / Login
        if (/database|connection pool|connections|\bdb\b|\bsql\b|postgres|mysql|mongo|bảng|table|migration|deadlock|pool|query|\borm\b|rò rỉ kết nối|drop table|truncate|dump db|update|select|insert|delete/i.test(mText)) return 0; // Production Database
        if (/\bk8s\b|kubernetes|cloud|cluster|server|pod|docker|aws|\bec2\b|\bvm\b|container|node|\bcpu\b|\bram\b|memory|\boom\b|treo cứng|kernel|đào coin|vòng lặp|while\(true\)|sleep\(|try-catch|đệ quy/i.test(mText)) return 2; // Cloud Server / Cụm K8s
        return 0;
      } else if (tile.id === 'tile_loc_02') { // DevOps & Pipeline: CI/CD, Load Balancer, Kafka, S3, Billing, Elastic
        if (/ci\/cd|pipeline|jenkins|gitlab|deploy|github actions|release|runner|build|npm build|merge|push|force push|branch|commit|\bgit\b|rebase|package-lock|yarn\.lock|lockfile/i.test(mText)) return 0; // CI/CD Pipeline
        if (/load balancer|\bcdn\b|cloudflare|nginx|traffic|traffics|ddos|botnet|flood|chịu tải|băng thông|sập mạng|dns|tên miền|\bdomain\b|\bip\b|chuyển hướng|routing|\bssl\b|\btls\b|chứng chỉ/i.test(mText)) return 1; // Load Balancer / CDN
        if (/kafka|rabbitmq|queue|hàng đợi|message broker|event bus|pub\/sub|consumer|producer|topic/i.test(mText)) return 2; // Kafka / RabbitMQ
        if (/\bs3\b|bucket|storage|blob|upload|file storage|cloud storage|lưu trữ file|tải lên|dung lượng|ổ cứng|ảnh|media/i.test(mText)) return 3; // Cloud Storage S3
        if (/billing|hóa đơn|invoice|cost|chi phí|tiền bạc|tính cước|charge|pricing|thâm hụt/i.test(mText)) return 4; // Hệ thống Hóa đơn
        if (/elastic|elasticsearch|search|kibana|index|tìm kiếm|fulltext|lucenes/i.test(mText)) return 5; // Elastic Search
        return 0;
      } else if (tile.id === 'tile_loc_03') { // Apps & Portal: Mobile, Admin, Landing, VPN, AI Chatbot, Email/OTP
        if (/mobile|\bios\b|android|\bapp\b|\bapps\b|flutter|react native|smartphone|chplay|appstore|điện thoại/i.test(mText)) return 0; // Mobile App
        if (/admin|portal|dashboard|quản trị|\bcms\b|bảng điều khiển|backoffice|bảng tin|excel|báo cáo|export|report|phân trang/i.test(mText)) return 1; // Web Admin
        if (/landing|trang chủ|\bhome\b|customer|khách hàng|frontend|giao diện web|\bui\b|\bux\b|trình duyệt|browser|html|\bcss\b|\bweb\b|\bfe\b|\bxss\b|useeffect/i.test(mText)) return 2; // Customer Landing
        if (/\bvpn\b|intranet|nội bộ|wifi|firewall|mạng nội bộ|\blan\b|ip nội bộ/i.test(mText)) return 3; // Internal VPN
        if (/\b(ai|llm|gpt|chatbot|bot|gemini|openai)\b|trí tuệ nhân tạo|prompt/i.test(mText)) return 4; // AI Chatbot
        if (/email|\botp\b|\bsms\b|notification|\bmail\b|thông báo|gửi mail|mã xác nhận|smtp/i.test(mText)) return 5; // Email / OTP
        return 2;
      } else if (tile.id === 'tile_loc_04') { // Lab & ODC: On-Prem, ODC Room, Demo Room, Staging, Backup, 3rd Party
        if (/on-prem|server room|phần cứng|rack|ổ điện|\bups\b|máy chủ vật lý|dây cáp|nóng ran|khét|cúp điện|phòng server|quạt|\bhú\b|silicon|vòi phun nước|chập điện/i.test(mText)) return 0; // On-Prem Server Room
        if (/\bodc\b|f-ville|f-town|fsoft|bàn làm việc|văn phòng|open space|khu dự án|bàn phím|chuột|nhậu/i.test(mText)) return 1; // Phòng ODC
        if (/demo.*khách hàng|khách hàng.*demo|thuyết trình|slide|máy chiếu|onsite|pitch/i.test(mText)) return 2; // Phòng Demo
        if (/staging|\buat\b|\bqa\b|\bqc\b|tester|testcase|kiểm thử|unit test|automation test/i.test(mText)) return 3; // Staging / UAT
        if (/backup|dự phòng|snapshot|restore|phục hồi|mất dữ liệu|sao lưu/i.test(mText)) return 4; // Backup Dự phòng
        if (/bên thứ 3|third-party|third party|partner|đối tác|external|script ngoài|nhúng script|dịch vụ ngoài/i.test(mText)) return 5; // API Đối tác
        return 0;
      }
    }

    // 3. CÁC Ô NÂU: Thông số sự cố IT (tile_scene_01 đến tile_scene_21)

    // Ưu tiên khớp trực diện cho Thẻ Nâu phụ trợ của Dấu vết Log (Clue Card)
    if (tile.id !== 'tile_scene_04' && bestClueMatch && bestClueMatch.tileId === tile.id && bestClueMatch.score >= 9) {
      return bestClueMatch.opt;
    }

    // tile_scene_01: Trạng thái Hệ thống Hiện tại (Gợi ý Thẻ Xanh)
    if (tile.id === 'tile_scene_01') {
      if (mProfile && typeof mProfile.status === 'number') return mProfile.status;
      if (/502|gateway|màn hình xanh|bsod|bad gateway|crash/i.test(mText)) return 0;
      if (/treo cứng|freeze|hang|không phản hồi|cpu|loop|vòng lặp|100%/i.test(mText)) return 1;
      if (/mã hóa|encrypt|corrupt|biến dạng|hỏng dữ liệu|loạn font/i.test(mText)) return 2;
      if (/microservice|rải rác|cụm|từng phần|một vài service/i.test(mText)) return 3;
      if (/giao diện|api|backend|frontend vẫn chạy|api chết/i.test(mText)) return 4;
      if (/loading|spinner|quay|vô tận|timeout|chờ mãi/i.test(mText)) return 5;
      return 1;
    }

    // tile_scene_02: Thời điểm Xảy ra Sự cố
    if (tile.id === 'tile_scene_02') {
      if (/flash sale|peak|cao điểm|đông khách|11\.11|12\.12/i.test(combined)) return 0;
      if (/thứ sáu|friday|chiều thứ 6|cuối tuần|sắp về|tan sở|\b17h\b|\b16h\b|17h59|17h30/i.test(combined)) return 1;
      if (/bảo trì|maintenance|nâng cấp định kỳ|bảo dưỡng/i.test(combined)) return 2;
      if (/demo|thuyết trình|sắp trình chiếu|pitch|khách hàng/i.test(combined)) return 3;
      if (/đêm|\b2h\b|khuya|midnight|release|go-live|rạng sáng|\b0h\b|nửa đêm|trực đêm/i.test(combined)) return 4;
      if (/sáng|thứ hai|monday|standup|scrum|đầu tuần|đầu ca/i.test(combined)) return 5;
      return 4;
    }

    // tile_scene_03: Tốc độ Phát tán Lỗi (Gợi ý Thẻ Xanh)
    if (tile.id === 'tile_scene_03') {
      if (mProfile && typeof mProfile.speed === 'number') return mProfile.speed;
      if (/ngấm dần|leak|memory|ram|tăng dần|tích tụ|tràn bộ nhớ/i.test(mText) || mCat.includes('poison') || mCat.includes('illness')) return 2;
      if (/sập tức thì|instant|ngay lập tức|drop table|bấm nút|chết ngay|chmod 777/i.test(mText)) return 0;
      if (/kéo dài|treo|hang|nghẽn|dài dẳng|đình trệ/i.test(mText) || mCat.includes('suffoc')) return 3;
      if (/chớp nhoáng|brief|nhanh|vài giây|spike|đột ngột/i.test(mText) || mCat.includes('blood') || mCat.includes('severe')) return 1;
      if (/ủ bệnh|latent|ngầm|vài ngày|âm thầm|cronjob|hẹn giờ/i.test(mText)) return 4;
      if (/chập chờn|flaky|lúc được lúc mất|không ổn định/i.test(mText)) return 5;
      return 3;
    }

    // tile_scene_04: Bản chất Dấu vết Để lại (Gợi ý Thẻ Đỏ - 100% chuẩn xác cho 200 lá Clue)
    if (tile.id === 'tile_scene_04') {
      return getClueTraceNature(cCard);
    }

    // tile_scene_05: Ấn tượng Chung về Bug (Gợi ý Thẻ Xanh)
    if (tile.id === 'tile_scene_05') {
      if (mProfile && typeof mProfile.impression === 'number') return mProfile.impression;
      if (/kinh điển|phổ biến|rookie|cơ bản|newbie|ngớ ngẩn|quên|sơ đẳng|hardcode|typo|null pointer/i.test(mText)) return 0;
      if (/dị|sáng tạo|bất ngờ|quái đản|bizarre|lạ lùng|hiếm gặp|độc lạ|hack/i.test(mText)) return 1;
      if (/đáng ngờ|xóa log|cover-up|giấu|bí mật|che đậy|xóa vết|phi tang|backdoor|lén lút|gian lận/i.test(mText)) return 2;
      if (/tàn khốc|brutal|wipeout|xóa sạch|drop|mất sạch|cháy rụi|hủy diệt|đứt cáp|sập nguồn/i.test(mText)) return 3;
      if (/ác mộng|kinh hoàng|nightmare|thảm họa|catastrophic|chết chóc|toang|khóc thét|kinh hãi/i.test(mText)) return 4;
      if (/bí ẩn|tiền lệ|unseen|stackoverflow|chưa từng thấy|không dấu vết|ma quái|khó hiểu/i.test(mText)) return 5;
      return 0;
    }

    // tile_scene_06: Phạm vi Ảnh hưởng trên Hệ thống (Gợi ý Thẻ Xanh)
    if (tile.id === 'tile_scene_06') {
      if (mProfile && typeof mProfile.scope === 'number') return mProfile.scope;
      if (/database|db|lưu trữ|storage|s3|bảng|sql|postgres|mysql|mongo|dữ liệu|data|connection pool/i.test(mText)) return 1;
      if (/giao diện|client|frontend|ui|app|mobile|web|trình duyệt|màn hình|người dùng/i.test(mText)) return 2;
      if (/network|api|pipeline|đường truyền|mạng|gateway|traffic|kết nối|băng thông|route|dns/i.test(mText)) return 3;
      if (/phân hệ|cục bộ|module|tính năng|chức năng|nhỏ|một phần|plugin|tool/i.test(mText)) return 4;
      if (/toàn bộ|toàn hệ thống|100%|full|sập hoàn toàn|tất cả|cháy|chết hết|sập nguồn|chmod 777/i.test(mText)) return 5;
      if (/core|engine|master|node chính|hạt nhân|hạ tầng chính|k8s master|điều khiển/i.test(mText)) return 0;
      return 1;
    }

    // tile_scene_07: Động cơ / Nguyên nhân Tâm lý
    if (tile.id === 'tile_scene_07') {
      const targetText = tile.targetCardType === 'CLUE' ? cText : combined;
      if (/quá tải|\bot\b|burnout|bức xúc|mệt mỏi|kiệt sức|trực chiến|48 giờ|48h|đỏ ngầu|thiếu ngủ|mất ngủ|thức trắng|áp lực|căng thẳng|stress|tăng ca|overtime|thuốc nhỏ mắt|mì tôm|mì cay|bàn chải đánh răng|gối kê cổ|đơn xin nghỉ việc|160 bpm|muỗi đốt|tóc rụng|ống hít mũi|gạt tàn|bật lửa/i.test(targetText)) return 0;
      if (/\badmin\b|\broot\b|\bchmod\b|\bsudo\b|thể hiện quyền|khoe|sức mạnh|quyền lực|toàn quyền|chứng tỏ|yubikey|2fa|ssh vào thẳng|all-in|vua săn bug|hackathon|ví lạnh|khẩu trang đen|mũ lưỡi trai đen|phishing|ip đăng nhập lạ|ổ khóa mở toang|zip bomb/i.test(targetText)) return 1;
      if (/tiến độ|thưởng|bonus|\bkpi\b|vội vàng|gấp|chạy deadline|săn thưởng|tiền thưởng|cho kịp|ép tiến độ|tờ vé số|go-live|release|thiệp mời tiệc|bánh kem|xì gà|pomodoro|đồng hồ cát|lgtm|cầu nguyện|nhang trầm|lá bùa|tarot|icon 🙏|phong thủy/i.test(targetText)) return 2;
      if (/crush|nhắn tin crush|tán gái|người yêu|mải nhắn tin|mất tập trung|tán tỉnh|hẹn hò|tỏ tình|bông hoa|truyện tranh|cờ vua|ps5|youtube|ngủ gật|gấu bông|bóng bay|canh sếp đi qua/i.test(targetText)) return 3;
      if (/tự ái|code review|chê|cãi nhau|bảo thủ|cái tôi|\bego\b|bị chê|phê bình|khó chịu|tranh cãi|đổ lỗi|cấm đụng vào|clean code/i.test(targetText)) return 4;
      if (/refactor|làm sạch|dọn dẹp|viết lại|tối ưu|heroic|ngứa mắt|sửa lại|chuẩn hóa|sơ đồ kiến trúc|khung xương kiến trúc|cấu trúc code|búp bê nga|sơ đồ luồng/i.test(targetText)) return 5;
      return 0;
    }

    // tile_scene_08: Phong cách Code của Thủ phạm (Gợi ý Thẻ Xanh)
    if (tile.id === 'tile_scene_08') {
      if (mProfile && typeof mProfile.style === 'number') return mProfile.style;
      if (/máy em|works on my machine|tự tin|chủ quan|chạy ngon|máy tao|không test|cần gì test/i.test(mText)) return 0;
      if (/lách luật|shortcut|bỏ qua test|bỏ unit test|không test|lười test|bỏ qua kiểm tra|bỏ qua bước|skip test/i.test(mText)) return 1;
      if (/force push|push -f|nóng vội|cho lẹ|nhanh chóng|vội vàng|đè code|xung đột git/i.test(mText)) return 2;
      if (/100 file|gom commit|commit khủng|commit bừa|quá nhiều file|1 commit|hàng trăm file/i.test(mText)) return 3;
      if (/cồng kềnh|over-engineer|kiến trúc|áp đặt|phức tạp|quá đà|vẽ vời|nhiều tầng|design pattern/i.test(mText)) return 4;
      if (/sửa trên live|sửa trực tiếp|cowboy|ssh|nano trên server|sửa thẳng|hotfix trực tiếp|sửa live/i.test(mText)) return 5;
      return 1;
    }

    // tile_scene_09: Hiện trạng Bàn làm việc (Gợi ý Thẻ Đỏ)
    if (tile.id === 'tile_scene_09') {
      if (/giấy note|mảnh giấy|tờ giấy|post-it|sticky note|sổ tay|stackoverflow|tài liệu|hóa đơn|hợp đồng|bài báo|danh thiếp|vé máy bay|hộ chiếu|đơn xin|báo cáo|sao kê|ticket|file \.env|lịch sử hỏi|lá bài ước lượng/i.test(cText)) return 0; // Mảnh giấy Note dán chi chít
      if (/nóng ran|khét|quạt hú|cháy|nhiệt|bốc khói|nóng rực|quạt server|quạt tản nhiệt|keo tản nhiệt|bụi khói|tro bụi|30 độ|ups|đèn báo lỗi/i.test(cText)) return 1; // Thiết bị nóng ran / Khét lẹt
      if (/cà phê|trà sữa|trà thảo mộc|nước|bia|sữa|đổ|ly|cốc|vết nước|loang|vết ố|bánh|kẹo|sô-cô-la|đậu phộng|quả táo|muối/i.test(cText)) return 2; // Vết cà phê / Trà sữa đổ loang
      if (/bàn phím|kẹt nút|chuột|vỡ|nứt|keycap|gõ mạnh|liệt phím|hỏng nút|kính chống ánh sáng xanh/i.test(cText)) return 3; // Bàn phím kẹt nút / Màn hình nứt
      if (/dây mạng|cáp|bừa bộn|lộn xộn|dây cáp|rối|rác|vương vãi|lược cài|usb|balo|cặp tài liệu|đèn pin|tăm bông|airpod|đất trồng cây|vịt vàng/i.test(cText)) return 4; // Dây mạng & đồ đạc bừa bộn
      return 5; // Gọn gàng sạch sẽ đáng ngờ
    }

    // tile_scene_10: Hoạt động Đang diễn ra lúc Sập
    if (tile.id === 'tile_scene_10') {
      if (/bi lắc|\bgame\b|ps5|foosball|giải trí|bắn súng/i.test(combined)) return 0; // Đang giải lao chơi Bi lắc / Game
      if (/nghỉ ngơi|ngủ|\bnap\b|chợp mắt|ngủ gục|ngủ trưa|đắp chăn/i.test(combined)) return 1; // Đang nghỉ ngơi / Ngủ trưa
      if (/retro|standup|sprint|all-hands|meeting|họp sprint|họp retro/i.test(combined)) return 2; // Đang họp Sprint Retro / Standup
      if (/thanh toán|checkout|mở cổng thanh toán|flash sale|khách nạp tiền|chốt đơn/i.test(combined)) return 3; // Đang mở cổng thanh toán / Sale
      if (/đoàn khách|thăm odc|onsite visit|tiếp khách hàng|tham quan odc/i.test(combined)) return 4; // Đang đón đoàn Khách hàng thăm ODC
      if (/trà sữa|pizza|liên hoan|ăn mừng|party|tiệc/i.test(combined)) return 5; // Đang liên hoan Trà sữa / Pizza
      return 2;
    }

    // tile_scene_11: Tín hiệu Phát hiện Đầu tiên
    if (tile.id === 'tile_scene_11') {
      if (/pagerduty|\bsiren\b|hú chuông|còi báo động/i.test(combined)) return 0; // Chuông PagerDuty kêu bất ngờ
      if (/tiếng quạt|server hú|tiếng rít|quạt tản nhiệt|quạt hú/i.test(combined)) return 1; // Tiếng quạt Server hú kéo dài
      if (/mùi khét|khét lẹt|khét|bốc mùi|cháy rụi|mùi nhựa|mùi silicon/i.test(combined)) return 2; // Mùi khét lẹt từ tủ máy chủ
      if (/dashboard|đỏ rực|grafana|màn hình giám sát|đỏ lòm|cảnh báo đỏ/i.test(combined)) return 3; // Nhìn thấy Dashboard đỏ rực
      if (/thao tác gõ phím|panicked|hốt hoảng|cuống cuồng nhập|la hét/i.test(combined)) return 4; // Thao tác gõ phím bất thường
      if (/im lặng tuyệt đối|\balert sập\b|mất tín hiệu|không báo gì|tê liệt hoàn toàn|chết lặng/i.test(combined)) return 5; // Im lặng tuyệt đối
      return 3;
    }

    // tile_scene_12: Mối quan hệ trong Dự án
    if (tile.id === 'tile_scene_12') {
      if (/anh em ruột thịt|cùng cảnh ot|chiến hữu|đồng cam|overtime buddy/i.test(combined)) return 0; // Anh em ruột thịt cùng cảnh OT
      if (/bạn thân|chí cốt|tri kỷ|thân thiết|cạ cứng/i.test(combined)) return 1; // Bạn thân chí cốt
      if (/chung squad|đồng nghiệp|cùng team|cùng squad|ngồi cạnh|chung nhóm/i.test(combined)) return 2; // Đồng nghiệp chung Squad
      if (/\bsếp\b|đệ ruột|đệ tử|cấp trên|cấp dưới|\blead\b|junior|quản lý/i.test(combined)) return 3; // Cấp trên - Cấp dưới
      if (/cặp đôi|người yêu|hẹn hò|công sở|yêu đương|tình cảm/i.test(combined)) return 4; // Cặp đôi công sở
      if (/người mới|onboard|fresher|khác bộ phận|cross-team|mới vào|newbie/i.test(combined)) return 5; // Người mới onboard
      return 2;
    }

    // tile_scene_13: Khung giờ Sập Hệ thống
    if (tile.id === 'tile_scene_13') {
      if (/(?<!\d)(02:|03:|04:|05:|2h|3h|4h|5h)\b|rạng sáng|dawn|nửa đêm về sáng/i.test(combined)) return 0; // Rạng sáng (02:00 - 05:00 AM)
      if (/(?<!\d)(08:|09:|10:|8h|9h|10h)\b|buổi sáng|morning|đầu ca|sáng sớm/i.test(combined)) return 1; // Buổi sáng đầu ca
      if (/(?<!\d)(11:|12:|13:|11h|12h|13h)\b|buổi trưa|noon|nghỉ trưa|ăn trưa/i.test(combined)) return 2; // Buổi trưa nghỉ ngơi
      if (/(?<!\d)(14:|15:|16:|14h|15h|16h)\b|buổi chiều|afternoon/i.test(combined)) return 3; // Buổi chiều cao điểm
      if (/(?<!\d)(17:|18:|19:|17h|18h|19h|17:59)\b|tan tầm|chập tối|sắp về|giờ về/i.test(combined)) return 4; // Chập tối sát giờ tan tầm
      if (/(?<!\d)(22:|23:|00:|01:|22h|23h|0h|1h)\b|đêm khuya|night|nửa đêm|midnight/i.test(combined)) return 5; // Đêm khuya thanh vắng
      return 4;
    }

    // tile_scene_14: Dấu vết Giám định tại Chỗ
    if (tile.id === 'tile_scene_14') {
      if (/\bgit\b|\bcommit\b|blame|history|rebase|force push/i.test(cText) || /\bgit\b|\bcommit\b/i.test(mText)) return 5; // Dấu vết xóa / sửa Git History
      if (/stack trace|dump|core dump|trace log|đỏ lòm/i.test(cText) || /trace/i.test(mText)) return 3; // Stack Trace đỏ lòm
      if (/cà phê đổ|nước đổ|ẩm ướt|loang lổ|đổ nước/i.test(cText)) return 4; // Vết nước / Cà phê đổ loang
      if (/vân tay|dấu gõ phím|bàn phím/i.test(cText)) return 0; // Dấu vân tay / Lịch sử gõ phím
      if (/phòng server|dấu giày/i.test(cText)) return 1; // Dấu giày phòng Server
      return 2; // Vết va đập phần cứng
    }

    // tile_scene_15: Sự cố Phát sinh Kèm theo
    if (tile.id === 'tile_scene_15') {
      if (/\bups\b|mất điện|nguồn điện|cúp điện|sập nguồn|ắc quy|máy phát/i.test(combined)) return 0; // Mất điện nguồn dự phòng UPS
      if (/báo động nhiệt|bốc khói|quá nhiệt|nóng quá|cháy nổ|nhiệt độ tăng|nóng ran/i.test(combined)) return 1; // Báo động nhiệt / Bốc khói
      if (/tranh cãi|nảy lửa|slack|nhóm chat|chửi nhau|đổ lỗi|tranh luận/i.test(combined)) return 2; // Tranh cãi nảy lửa trên nhóm chat
      if (/mất backup|bản backup|sao lưu|mất dữ liệu|không khôi phục được|hỏng backup/i.test(combined)) return 3; // Mất luôn bản Backup quý giá
      if (/tiếng hét|thất thanh|\b(pm|lead)\b.*(hét|la|kêu)|la hét|hốt hoảng|hoảng loạn/i.test(combined)) return 4; // Tiếng hét thất thanh của PM
      if (/không có biểu hiện|bình thường|yên ắng|không kèm theo|chỉ có vậy/i.test(combined)) return 5; // Không có biểu hiện phụ
      return 2;
    }

    // tile_scene_16: Quy mô Hệ thống Bị nạn
    if (tile.id === 'tile_scene_16') {
      if (/monolith|khổng lồ|đồ sộ|nguyên khối|triệu dòng code|cũ kĩ to lớn/i.test(combined)) return 0; // Monolith khổng lồ
      if (/microservice|mỏng nhẹ|nhỏ gọn|service độc lập|container/i.test(combined)) return 1; // Microservice mỏng nhẹ
      if (/nhiều tầng|multi-tier|3-tier|phức tạp|n-tier|phân tầng/i.test(combined)) return 2; // Kiến trúc nhiều tầng
      if (/tool nhỏ|\bmvp\b|mới dựng|nội bộ|thử nghiệm|prototype|script nhỏ/i.test(combined)) return 3; // Tool nhỏ / MVP
      if (/legacy|chắp vá|cũ kỹ|nhiều năm|vá víu|code cổ/i.test(combined)) return 4; // Hệ thống Legacy chắp vá
      if (/cân đối|cloud-native|chuẩn|\bk8s\b|hiện đại|tiêu chuẩn/i.test(combined)) return 5; // Cân đối / Cloud-Native
      return 5;
    }

    // tile_scene_17: Tình trạng Codebase
    if (tile.id === 'tile_scene_17') {
      if (/clean code|gọn gàng|ngăn nắp|format|chuẩn mực|đẹp đẽ|rõ ràng/i.test(combined)) return 0; // Clean Code gọn gàng
      if (/spaghetti|xộc xệch|rối rắm|lộn xộn|mì tôm|chắp vá|bẩn/i.test(combined)) return 1; // Spaghetti Code xộc xệch
      if (/sang xịn mịn|kiến trúc|enterprise|over-engineered|xịn sò|công phu/i.test(combined)) return 2; // Kiến trúc sang xịn mịn
      if (/cũ kỹ|nhiều năm tuổi|outdated|deprecated|lỗi thời|cổ lỗ sĩ|từ thời/i.test(combined)) return 3; // Code cũ kỹ nhiều năm tuổi
      if (/kỳ dị|hack não|esoteric|cú pháp lạ|dị hợm|khó hiểu|độc chiêu|macro/i.test(combined)) return 4; // Cú pháp kỳ dị / Hack não
      if (/trống trơn|không document|no docs|không comment|thiếu tài liệu|tù mù/i.test(combined)) return 5; // Trống trơn không một dòng Document
      return 1;
    }

    // tile_scene_18: Biểu cảm của PM / Khách hàng
    if (tile.id === 'tile_scene_18') {
      if (/bình thản|tính năng mới|tưởng feature|không sao|ung dung|bình tĩnh/i.test(combined)) return 0; // Bình thản
      if (/vật lộn|rollback|quay lui|tìm cách khôi phục|hoàn tác|quay lại bản cũ/i.test(combined)) return 1; // Vật lộn tìm cách Rollback
      if (/\bsla\b|hoảng sợ|tụt dốc|đền hợp đồng|phạt hợp đồng|uptime|mất tiền/i.test(combined)) return 2; // Hoảng sợ nhìn SLA tụt dốc
      if (/đau khổ|ôm đầu|tuyệt vọng|khóc|bất lực|than trời/i.test(combined)) return 3; // Đau khổ ôm đầu
      if (/đứng hình|mất 5 giây|speechless|đơ người|chết lặng|sửng sốt|há hốc/i.test(combined)) return 4; // Đứng hình mất 5 giây
      if (/tức giận|triệu tập war room|nổi giận|triệu tập|gắt gỏng|mắng mỏ|khẩn cấp/i.test(combined)) return 5; // Tức giận triệu tập War Room
      return 5;
    }

    // tile_scene_19: Đối tượng Chịu ảnh hưởng Chính
    if (tile.id === 'tile_scene_19') {
      if (/sếp lớn|giám đốc|c-level|director|\bbod\b|lãnh đạo|trưởng ban/i.test(combined)) return 0; // Sếp lớn / Giám đốc
      if (/chuyên gia|tech lead|architect|lead dev|kiến trúc sư|trưởng nhóm kỹ thuật/i.test(combined)) return 1; // Chuyên gia / Tech Lead
      if (/anh em dev|ops trực chiến|\b(dev|developer|qa|qc|tester|ot)\b|lập trình viên|anh em|trực chiến/i.test(combined)) return 2; // Anh em Dev / Ops trực chiến
      if (/thực tập sinh|intern|fresher|học việc|tập sự|mới vào nghề/i.test(combined)) return 3; // Thực tập sinh / Fresher
      if (/chờ dự án|\bbench\b|ngồi không|rảnh rỗi|đang chờ|nhân sự ngoài/i.test(combined)) return 4; // Nhân sự đang chờ dự án
      if (/cựu trào|bàn giao|sắp nghỉ|người cũ|chuẩn bị bàn giao|nghỉ việc/i.test(combined)) return 5; // Cựu trào sắp bàn giao
      return 2;
    }

    // tile_scene_20: Đặc điểm Nhân sự Liên quan
    if (tile.id === 'tile_scene_20') {
      if (/tập sự|intern|rookie|fresher|mới tinh|ngây thơ|chưa kinh nghiệm/i.test(combined)) return 0; // Mới tập sự (Intern)
      if (/gen-z|gen z|tiktok|nhanh nhảu|trẻ trung|\btrẻ\b/i.test(combined)) return 1; // Dev trẻ Gen-Z
      if (/senior|dày dạn|nhiều kinh nghiệm|kinh nghiệm|lâu năm|cứng tay/i.test(combined)) return 2; // Senior dày dạn
      if (/lão làng|guru|veteran|huyền thoại|kỳ cựu|đại thụ|sư phụ/i.test(combined)) return 3; // Lão làng công nghệ
      if (/backend|hạ tầng|infra|devops|database|sysadmin|hệ thống|server|\bk8s\b|cloud|connection pool|\bdb\b/i.test(combined)) return 4; // Chuyên trị Backend / Hạ tầng
      if (/giao diện|fullstack|frontend|\b(ui|ux|fe|web|css)\b|html/i.test(combined)) return 5; // Chuyên trị Giao diện / Fullstack
      return 4;
    }

    // tile_scene_21: Bầu không khí Phòng họp
    if (tile.id === 'tile_scene_21') {
      if (/quang đãng|bình tĩnh|yên ắng|thư thái|không khí nhẹ nhàng|trật tự/i.test(combined)) return 0; // Quang đãng / Bình tĩnh
      if (/bão tin nhắn|réo dồn dập|\bping\b|slack nổ tung|chuông kêu liên tục/i.test(combined)) return 1; // Bão tin nhắn réo dồn dập
      if (/căng thẳng|khô khốc|ngột ngạt|im phăng phắc|căng như dây đàn/i.test(combined)) return 2; // Căng thẳng khô khốc
      if (/mồ hôi|toát mồ hôi|lạnh ngắt|run rẩy|lo sợ|ướt đẫm/i.test(combined)) return 3; // Toát mồ hôi lạnh
      if (/điều hòa|16 độ|lạnh buốt|\brét\b|máy lạnh|đóng băng/i.test(combined)) return 4; // Lạnh buốt điều hòa 16 độ
      if (/nóng như chảo lửa|chảo lửa|nóng bức|hầm hập|như thiêu|sôi sục|nóng ran|khét/i.test(combined)) return 5; // Nóng như chảo lửa
      return 2;
    }

    // 4. Thuật toán chấm điểm token tổng quát nâng cao cho mọi Thẻ Hiện Trường khác
    if (tile.options_vi && tile.options_vi.length > 0) {
      let bestOptIdx = -1;
      let maxOptScore = 0;

      const stopWords = new Set(['cho', 'của', 'với', 'các', 'một', 'như', 'đang', 'khi', 'vào', 'lên', 'the', 'and', 'for', 'with', 'from', 'into']);
      const shortTechTokens = new Set(['ot', 'db', 'ui', 'fe', 'qa', 'qc', 's3', 'vm', 'pm', 'ai', 'ip', 'os', 'ci', 'cd', 'k8']);

      for (let idx = 0; idx < tile.options_vi.length; idx++) {
        const optVi = (tile.options_vi[idx] || '').toLowerCase();
        const optEn = (tile.options_en ? tile.options_en[idx] : '').toLowerCase();
        let optScore = 0;

        const tokens = `${optVi} ${optEn}`
          .split(/[\s,()\/•-]+/)
          .filter(t => (t.length >= 3 || shortTechTokens.has(t)) && !stopWords.has(t));

        for (const token of tokens) {
          if (mText.includes(token)) optScore += 3;
          if (cText.includes(token)) optScore += 2;
        }

        if (optScore > maxOptScore) {
          maxOptScore = optScore;
          bestOptIdx = idx;
        }
      }

      if (bestOptIdx !== -1 && maxOptScore > 0) {
        return bestOptIdx;
      }
    }

    // 5. Fallback nhất quán (Deterministic Hash) nếu không có từ khóa trùng khớp
    const seedStr = `${mCard.id}-${cCard.id}-${tile.id}`;
    let hash = 0;
    for (let i = 0; i < seedStr.length; i++) {
      hash = (hash * 31 + seedStr.charCodeAt(i)) % 997;
    }
    return hash % (tile.options_vi?.length || 6);
  }

  /**
   * Tự động đặt đạn cho các Thẻ Hiện Trường chưa có đạn (khi Pháp y là Bot)
   */
  autoPlaceForensicBullets() {
    this.activeSceneTiles.forEach(tile => {
      if (tile.selectedOptionIndex === null || tile.selectedOptionIndex === undefined) {
        tile.selectedOptionIndex = this.computeSmartBulletOption(tile);
      }
    });

    const summaryVi = this.activeSceneTiles
      .map(t => `${t.name_vi}: [${t.options_vi[tileOptionSafe(t.selectedOptionIndex)]}]`)
      .join(' • ');
    const summaryEn = this.activeSceneTiles
      .map(t => `${t.name_en}: [${t.options_en[tileOptionSafe(t.selectedOptionIndex)]}]`)
      .join(' • ');

    this.addLog(
      `🖥️ Tech Lead đã ghim đạn gỗ lên Bảng Thông Số Sự Cố (Vòng ${this.round}): ${summaryVi}`,
      `🖥️ Tech Lead pinned system markers (Round ${this.round}): ${summaryEn}`,
      'forensic'
    );

    // Tự động kích hoạt AI Forensic Master phân tích Log đầu vòng
    this.generateAiRoundLogAnalysis(this.round);
  }

  /**
   * Pháp y (Người chơi) đặt đạn gỗ lên 1 mục của Thẻ Hiện Trường
   */
  placeBulletOnTile(tileIndex, optionIndex) {
    const tile = this.activeSceneTiles[tileIndex];
    if (!tile || optionIndex < 0 || optionIndex > 5) return false;
    tile.selectedOptionIndex = optionIndex;
    tile.placedAtTimestamp = Date.now();
    return true;
  }

  /**
   * Kiểm tra xem mọi Thẻ Hiện Trường đang mở đã được đặt đạn đủ chưa
   */
  areAllSceneTilesMarked() {
    return this.activeSceneTiles.every(
      t => t.selectedOptionIndex !== null && t.selectedOptionIndex !== undefined
    );
  }

  /**
   * Bắt đầu pha Trình bày 30 giây cho từng người chơi của vòng hiện tại
   */
  startPresentationPhase() {
    if (this.round === 1) this.phase = GAME_PHASES.ROUND_1_PRESENTATION;
    else if (this.round === 2) this.phase = GAME_PHASES.ROUND_2_PRESENTATION;
    else this.phase = GAME_PHASES.ROUND_3_PRESENTATION;

    // Danh sách người trình bày (mọi người trừ Pháp y vì Pháp y không được nói)
    let speakers = this.players.filter(p => p.role !== 'FORENSIC_SCIENTIST');
    if (this.reversePresentationOrder) {
      speakers = [...speakers].reverse();
    }

    this.speakerQueue = speakers.map(p => p.id);
    this.currentSpeakerIndex = 0;
    this.speakerTimeLeft = this.config.presentationSeconds || 30;

    // Nếu Tech Lead là người chơi vừa ghim xong đạn gỗ, sinh báo cáo AI Log Analyzer cho vòng hiện tại
    if (!this.aiForensicReports[this.round]) {
      this.generateAiRoundLogAnalysis(this.round);
    }

    // Tạo phát biểu suy luận đầu vòng của các thành viên AI
    this.generateBotRoundDeductions();
  }

  /**
   * Tính toán điểm số nghi vấn của một cặp Thẻ (Means, Clue) dựa trên các Thẻ Hiện Trường đang có đạn
   */
  evaluateCardPairScore(meansCard, clueCard) {
    if (!meansCard || !clueCard) return 0;
    let score = 0;
    const mCat = (meansCard.category || '').toLowerCase();

    for (const tile of this.activeSceneTiles) {
      if (tile.selectedOptionIndex === null || tile.selectedOptionIndex === undefined) continue;
      const optIdx = tile.selectedOptionIndex;
      const expectedOpt = this.computeSmartBulletOption(tile, meansCard, clueCard);

      // Nếu đạn gỗ thực tế trên bàn khớp với option mà cặp bài này sinh ra:
      if (optIdx === expectedOpt) {
        if (tile.id === 'tile_cause_01') {
          score += 6; // Khớp Root Cause là trọng yếu
        } else if (tile.color === 'GREEN' || tile.type === 'LOCATION_OF_CRIME') {
          score += 5; // Khớp Tầng hệ thống bị sập
        } else if (tile.id === 'tile_scene_04') {
          score += 5; // Khớp Bản chất Dấu vết Để lại
        } else {
          score += 3; // Khớp Thông số sự cố Nâu
        }
      }

      // Giữ nguyên tương thích logic cũ
      if (tile.id === 'tile_cause_01') {
        if (optIdx === 4 && mCat.includes('poison')) score += 2;
        if (optIdx === 0 && mCat.includes('suffoc')) score += 2;
        if (optIdx === 2 && mCat.includes('blood')) score += 2;
        if (optIdx === 1 && mCat.includes('severe')) score += 2;
        if (optIdx === 3 && mCat.includes('illness')) score += 2;
        if (optIdx === 5 && mCat.includes('accident')) score += 2;
      }
    }

    // Nếu là cặp bài chuẩn của vụ án -> được cộng điểm tương quan
    if (meansCard.id === this.solution?.meansCardId && clueCard.id === this.solution?.clueCardId) {
      score += 4;
    }
    return score;
  }

  /**
   * Phân tích Gợi ý AI (AI Detective Co-Pilot / Soi Dấu Vết) dựa thuần túy trên các viên đạn gỗ công khai:
   * - Đánh giá từng lá Hành vi lỗi (Thẻ Xanh) trên bàn so với các Thẻ Hiện Trường nhóm MEANS
   * - Đánh giá từng lá Dấu vết Log (Thẻ Đỏ) trên bàn so với các Thẻ Hiện Trường nhóm CLUE
   * - Xếp hạng Top 3 Nghi phạm & Cặp bài có độ khớp tổng thể cao nhất trên cùng một bàn làm việc
   */
  getPlayerHintAnalysis(customTiles = null, customPlayers = null) {
    const tiles = customTiles || this.activeSceneTiles || [];
    const players = customPlayers || this.players || [];
    const markedTiles = tiles.filter(t => t && t.selectedOptionIndex !== null && t.selectedOptionIndex !== undefined);

    const meansTileSet = new Set(['tile_cause_01', 'tile_loc_01', 'tile_loc_02', 'tile_loc_03', 'tile_loc_04', 'tile_scene_01', 'tile_scene_03', 'tile_scene_05', 'tile_scene_06', 'tile_scene_08', 'tile_scene_16']);
    const meansTiles = [];
    const clueTiles = [];

    markedTiles.forEach((tile, idx) => {
      const isMeans = tile.targetCardType === 'MEANS' ||
        tile.color === 'PURPLE' ||
        tile.color === 'GREEN' ||
        tile.type === 'LOCATION_OF_CRIME' ||
        (!tile.targetCardType && (meansTileSet.has(tile.id) || idx <= 3));
      if (isMeans && tile.id !== 'tile_scene_04') {
        meansTiles.push(tile);
      } else {
        clueTiles.push(tile);
      }
    });

    const cardHintMap = {};
    const suspectPairs = [];
    const dummyClue = { id: 'C001', vi: '', en: '', category: 'Written' };
    const dummyMeans = { id: 'M001', vi: '', en: '', category: 'Severe Injury' };

    for (const p of players) {
      if (p.role === 'FORENSIC_SCIENTIST') continue;
      const pMeansScores = [];
      const pClueScores = [];

      for (const m of p.meansCards || []) {
        let mScore = 0;
        let maxMScore = 0;
        let matchedCount = 0;
        const reasonsVi = [];
        const reasonsEn = [];

        for (const t of meansTiles) {
          const w = t.id === 'tile_cause_01' ? 6 : (t.color === 'GREEN' ? 5 : 3);
          maxMScore += w;
          const expected = this.computeSmartBulletOption(t, m, dummyClue);
          if (expected === t.selectedOptionIndex) {
            mScore += w;
            matchedCount++;
            const optVi = t.options_vi?.[t.selectedOptionIndex] || '';
            const optEn = t.options_en?.[t.selectedOptionIndex] || optVi;
            reasonsVi.push(`${t.name_vi}: ${optVi}`);
            reasonsEn.push(`${t.name_en}: ${optEn}`);
          }
        }

        const pct = maxMScore > 0 ? Math.round((mScore / maxMScore) * 100) : 0;
        const info = {
          cardId: m.id,
          cardType: 'MEANS',
          ownerId: p.id,
          ownerName: p.displayName,
          score: mScore,
          maxScore: maxMScore,
          matchedCount,
          totalTiles: meansTiles.length,
          matchPct: pct,
          isHighMatch: pct >= 60 || (matchedCount >= 2 && matchedCount >= meansTiles.length - 1),
          reasonsVi,
          reasonsEn
        };
        cardHintMap[m.id] = info;
        pMeansScores.push({ card: m, info });
      }

      for (const c of p.clueCards || []) {
        let cScore = 0;
        let maxCScore = 0;
        let matchedCount = 0;
        const reasonsVi = [];
        const reasonsEn = [];

        for (const t of clueTiles) {
          const w = t.id === 'tile_scene_04' ? 6 : 4;
          maxCScore += w;
          const expected = this.computeSmartBulletOption(t, dummyMeans, c);
          if (expected === t.selectedOptionIndex) {
            cScore += w;
            matchedCount++;
            const optVi = t.options_vi?.[t.selectedOptionIndex] || '';
            const optEn = t.options_en?.[t.selectedOptionIndex] || optVi;
            reasonsVi.push(`${t.name_vi}: ${optVi}`);
            reasonsEn.push(`${t.name_en}: ${optEn}`);
          }
        }

        const pct = maxCScore > 0 ? Math.round((cScore / maxCScore) * 100) : 0;
        const info = {
          cardId: c.id,
          cardType: 'CLUE',
          ownerId: p.id,
          ownerName: p.displayName,
          score: cScore,
          maxScore: maxCScore,
          matchedCount,
          totalTiles: clueTiles.length,
          matchPct: pct,
          isHighMatch: pct >= 60 || (matchedCount >= 1 && clueTiles.length > 0 && matchedCount >= clueTiles.length - 1),
          reasonsVi,
          reasonsEn
        };
        cardHintMap[c.id] = info;
        pClueScores.push({ card: c, info });
      }

      pMeansScores.sort((a, b) => b.info.score - a.info.score);
      pClueScores.sort((a, b) => b.info.score - a.info.score);

      if (pMeansScores.length > 0 && pClueScores.length > 0) {
        const bestM = pMeansScores[0];
        const bestC = pClueScores[0];
        const rawMax = (bestM.info.maxScore || 1) + (bestC.info.maxScore || 1);
        const bothHigh = bestM.info.matchPct >= 65 && bestC.info.matchPct >= 60;
        const synergyBonus = bothHigh ? 5 : 0;
        const combinedScore = bestM.info.score + bestC.info.score + synergyBonus;
        const confidencePct = Math.min(99, Math.max(15, Math.round(((bestM.info.score + bestC.info.score) / rawMax) * 96)));

        suspectPairs.push({
          suspect: p,
          playerId: p.id,
          playerName: p.displayName,
          meansCard: bestM.card,
          clueCard: bestC.card,
          meansInfo: bestM.info,
          clueInfo: bestC.info,
          meansReasonsVi: bestM.info.reasonsVi,
          meansReasonsEn: bestM.info.reasonsEn,
          clueReasonsVi: bestC.info.reasonsVi,
          clueReasonsEn: bestC.info.reasonsEn,
          combinedScore,
          confidencePct
        });
      }
    }

    suspectPairs.sort((a, b) => b.combinedScore - a.combinedScore);
    const top3 = suspectPairs.slice(0, 3);

    return {
      hasMarkers: markedTiles.length > 0,
      markedCount: markedTiles.length,
      meansTilesCount: meansTiles.length,
      clueTilesCount: clueTiles.length,
      cardHintMap,
      meansHints: cardHintMap,
      clueHints: cardHintMap,
      topSuspectPairs: top3,
      topPairs: top3
    };
  }

  /**
   * Tìm ứng viên nghi phạm hàng đầu của một Đặc vụ Bot
   */
  findTopSuspectForBot(botPlayerId) {
    const bot = this.getPlayerById(botPlayerId);
    if (!bot || !bot.hasBadge) return null;

    const suspects = this.players.filter(p => p.role !== 'FORENSIC_SCIENTIST' && p.id !== bot.id);
    let best = null;
    let maxScore = -1;

    for (const s of suspects) {
      for (const m of s.meansCards) {
        for (const c of s.clueCards) {
          const score = this.evaluateCardPairScore(m, c);
          const isBetterOrTieBreak = (score > maxScore) || (
            score === maxScore && best && (
              (this.pinnedCardIds && (this.pinnedCardIds.has(m.id) || this.pinnedCardIds.has(c.id))) ||
              (m.id.charCodeAt(m.id.length - 1) % 2 === 0)
            )
          );
          if (isBetterOrTieBreak) {
            maxScore = score;
            best = { suspect: s, meansCard: m, clueCard: c, score };
          }
        }
      }
    }
    return best;
  }

  /**
   * Thử nghiệm lượt Phá Án của Bot Investigator khi có bằng chứng rõ ràng (hoặc ở vòng 2-3)
   */
  triggerBotAccusationAttempt() {
    const eligibleBots = this.players.filter(
      p => !p.isHuman && p.team === 'INVESTIGATION' && p.hasBadge && p.role !== 'FORENSIC_SCIENTIST'
    );
    if (eligibleBots.length === 0) return null;

    // Chọn bot có điểm nghi vấn cao nhất
    let chosenBot = null;
    let chosenTop = null;
    let highestScore = -1;

    for (const bot of eligibleBots) {
      const top = this.findTopSuspectForBot(bot.id);
      if (top && top.score > highestScore) {
        highestScore = top.score;
        chosenBot = bot;
        chosenTop = top;
      }
    }

    if (!chosenBot || !chosenTop) return null;

    // Ngưỡng điểm phá án: Vòng 1 cần score >= 8, Vòng 2 score >= 6, Vòng 3 score >= 4
    const requiredScore = this.round === 1 ? 8 : (this.round === 2 ? 6 : 4);
    if (chosenTop.score >= requiredScore) {
      const res = this.makeAccusation(chosenBot.id, chosenTop.suspect.id, chosenTop.meansCard.id, chosenTop.clueCard.id);
      return { bot: chosenBot, ...chosenTop, accusationResult: res };
    }
    return null;
  }

  /**
   * Sinh lời nhận định suy luận hợp lý từ các Đặc vụ AI trong vòng thảo luận
   */
  generateBotRoundDeductions() {
    const causeTile = this.activeSceneTiles.find(t => t.id === 'tile_cause_01');
    const causeVi = causeTile && causeTile.selectedOptionIndex !== null
      ? causeTile.options_vi[causeTile.selectedOptionIndex]
      : 'chưa rõ';
    const causeEn = causeTile && causeTile.selectedOptionIndex !== null
      ? causeTile.options_en[causeTile.selectedOptionIndex]
      : 'unclear';

    const eligibleBots = this.players.filter(p => !p.isHuman && p.role !== 'FORENSIC_SCIENTIST');
    if (eligibleBots.length === 0) return;

    this.botDeductionCount = (this.botDeductionCount || 0) + 1;
    const speaker = eligibleBots[(this.round + this.botDeductionCount) % eligibleBots.length];
    const top = this.findTopSuspectForBot(speaker.id);

    if (speaker && top) {
      this.addLog(
        `[Vòng ${this.round}] ${speaker.displayName}: "Tech Lead ghim [${causeVi}], tôi nghi cặp [${top.meansCard.vi}] & [${top.clueCard.vi}] trên máy của ${top.suspect.displayName} chính là thủ phạm làm sập Prod!"`,
        `[Round ${this.round}] ${speaker.displayNameEn || speaker.displayName}: "Tech Lead marked [${causeEn}], so ${(top.suspect.displayNameEn || top.suspect.displayName)}'s [${top.meansCard.en}] & [${top.clueCard.en}] look like the culprit!"`,
        'speech'
      );
    }
  }

  getCurrentSpeaker() {
    const id = this.speakerQueue[this.currentSpeakerIndex];
    return this.getPlayerById(id);
  }

  nextSpeaker() {
    if (this.currentSpeakerIndex + 1 < this.speakerQueue.length) {
      this.currentSpeakerIndex++;
      this.speakerTimeLeft = this.config.presentationSeconds || 30;
      return true;
    }
    return false;
  }

  /**
   * Kết thúc Vòng Trình bày hiện tại để chuyển sang Vòng tiếp theo (hoặc Đêm Mở rộng / Kết thúc)
   */
  advanceAfterPresentation() {
    if (this.maxRounds === 1 || this.round >= this.maxRounds) {
      if (!this.finalShowdownDone) {
        this.startFinalShowdownPhase();
        return;
      }
      // Hết thời gian War Room (Quá hạn SLA) mà Đội Ứng Phó chưa tìm ra đúng cặp Hành vi & Dấu vết -> Phe Gây Lỗi thắng!
      this.finishGame(
        'CRIMINAL',
        'TIME_EXPIRED',
        this.maxRounds === 1
          ? 'Hết 120s Tốc Chiến (Quá hạn SLA Cuộc Thi FPT) mà Đội Ứng Phó chưa tìm ra đúng cặp Hành vi & Dấu vết Log. Thủ phạm đã kịp tẩu thoát!'
          : 'Hết 3 vòng họp War Room (Quá hạn SLA) mà Đội Ứng Phó chưa tìm ra đúng cặp Hành vi & Dấu vết Log. Thủ phạm đã xóa sạch dấu vết và hạ cánh an toàn!',
        this.maxRounds === 1
          ? '2-Minute Blitz ended (FPT SLA Breached) without pinpointing the exact Trigger & Log Trace. The Culprit got away clean!'
          : 'All 3 War Room rounds ended (SLA Breached) without pinpointing the exact Trigger & Log Trace. The Culprit got away clean!'
      );
      return;
    }

    if (this.round === 1) {
      // Kiểm tra xem có Kỹ thuật viên Phòng Lab hoặc Nội gián trong bàn không
      const hasAlliesNight = this.players.some(
        p => p.role === 'LAB_TECHNICIAN' || p.role === 'INSIDE_MAN'
      );
      if (hasAlliesNight) {
        this.startAlliesNightPhase();
      } else {
        this.startRound2Evidence();
      }
    } else if (this.round === 2) {
      this.startRound3Evidence();
    } else {
      if (!this.finalShowdownDone) {
        this.startFinalShowdownPhase();
        return;
      }
      // Hết cả 3 vòng họp War Room mà Thủ phạm vẫn chưa bị bắt -> Phe Gây Lỗi thắng!
      this.finishGame(
        'CRIMINAL',
        'TIME_EXPIRED',
        'Hết 3 vòng họp War Room (Quá hạn SLA) mà Đội Ứng Phó chưa tìm ra đúng cặp Hành vi & Dấu vết Log. Thủ phạm đã xóa sạch dấu vết và hạ cánh an toàn!',
        'All 3 War Room rounds ended (SLA Breached) without pinpointing the exact Trigger & Log Trace. The Culprit got away clean!'
      );
    }
  }

  /**
   * Pha Đêm Mở Rộng (ALLIES_NIGHT_PHASE giữa Vòng 1 & Vòng 2):
   * - LAB_TECHNICIAN: Kiểm tra 1 lá bài bất kỳ có thuộc CrimeSolution hay không
   * - INSIDE_MAN: Tước bỏ Huy hiệu của 1 người chơi bất kỳ
   */
  startAlliesNightPhase() {
    this.phase = GAME_PHASES.ALLIES_NIGHT_PHASE;
    const labTech = this.players.find(p => p.role === 'LAB_TECHNICIAN');
    const insideMan = this.players.find(p => p.role === 'INSIDE_MAN');

    // Nếu Lab Tech là Bot -> Tự động soi 1 lá bài
    if (labTech && !labTech.isHuman) {
      const others = this.players.filter(p => p.id !== labTech.id && p.role !== 'FORENSIC_SCIENTIST');
      const pickPlayer = others[Math.floor(Math.random() * others.length)];
      const card = pickPlayer?.meansCards[0];
      if (card) {
        this.performLabTechCheck(card.id);
      }
    }

    // Nếu Inside Man là Bot -> Tự động tước Huy hiệu của 1 Điều tra viên
    if (insideMan && !insideMan.isHuman) {
      const badgeHolders = this.players.filter(
        p => p.hasBadge && p.team === 'INVESTIGATION' && p.role !== 'FORENSIC_SCIENTIST'
      );
      const victim = badgeHolders[Math.floor(Math.random() * badgeHolders.length)];
      if (victim) {
        this.performInsideManStrip(victim.id);
      }
    }
  }

  performLabTechCheck(cardId) {
    if (this.privateIntel && this.privateIntel.labCheckUsed) return false;
    const isMatch = cardId === this.solution.meansCardId || cardId === this.solution.clueCardId;
    this.privateIntel.labCheckUsed = true;
    this.privateIntel.labCheckedCardId = cardId;
    this.privateIntel.labCheckedResult = isMatch;
    this.addLog(
      '🧪 Giữa Ca Trực: DevOps / QA Engineer đã bí mật chạy Health Check kiểm tra 1 thẻ bài trên bàn.',
      '🧪 Mid-Shift Check: DevOps / QA Engineer secretly ran a Health Check on 1 card on the table.',
      'night'
    );
    return isMatch;
  }

  performInsideManStrip(targetPlayerId) {
    if (this.privateIntel && this.privateIntel.insideManUsed) return false;
    const target = this.getPlayerById(targetPlayerId);
    if (!target || !target.hasBadge) return false;
    this.privateIntel.insideManUsed = true;
    target.hasBadge = false;
    this.privateIntel.insideManTargetId = targetPlayerId;
    this.addLog(
      `🕶️ Giữa Ca Trực: Log Tamperer (Kẻ xóa log) đã bí mật vô hiệu hóa Huy hiệu Phá án của ${target.displayName}!`,
      `🕶️ Mid-Shift Sabotage: The Log Tamperer secretly disabled ${(target.displayNameEn || target.displayName)}'s Accusation Badge!`,
      'crime'
    );
    return true;
  }

  /**
   * Vòng 2: Pháp y thay thế 1 Thẻ Hiện Trường Nâu bằng thẻ mới (hoặc kích hoạt Thẻ Sự Kiện)
   */
  startRound2Evidence() {
    this.round = 2;
    this.phase = GAME_PHASES.ROUND_2_EVIDENCE;
    this.reversePresentationOrder = false;

    const forensic = this.getForensicPlayer();
    if (forensic && !forensic.isHuman) {
      // Bot Pháp y tự động thay thẻ Nâu ở vị trí số 2 (index 2)
      this.replaceBrownSceneTile(2);
      this.autoPlaceForensicBullets();
    }
  }

  /**
   * Vòng 3: Pháp y thay thế 1 Thẻ Hiện Trường Nâu lần cuối cùng
   */
  startRound3Evidence() {
    this.round = 3;
    this.phase = GAME_PHASES.ROUND_3_EVIDENCE;
    this.reversePresentationOrder = false;

    const forensic = this.getForensicPlayer();
    if (forensic && !forensic.isHuman) {
      // Bot Pháp y tự động thay thẻ Nâu ở vị trí số 3 (index 3)
      const targetIdx = Math.min(3, this.activeSceneTiles.length - 1);
      this.replaceBrownSceneTile(targetIdx);
      this.autoPlaceForensicBullets();
    }
  }

  /**
   * Thay thế 1 Thẻ Hiện Trường Nâu tại `tileIndex` bằng thẻ rút từ `sceneDeck`
   * Nếu rút trúng Thẻ Sự Kiện (`EVENT_TILE`), thực thi hiệu ứng Sự Kiện ngay lập tức!
   */
  replaceBrownSceneTile(tileIndex) {
    const targetTile = this.activeSceneTiles[tileIndex];
    if (!targetTile || targetTile.color !== 'BROWN') return false;
    if (this.sceneDeck.length === 0) return false;

    let drawn = this.sceneDeck.shift();

    // Nếu rút trúng Thẻ Sự Kiện (EVENT_TILE)
    if (drawn.type === 'EVENT_TILE') {
      this.activeEventTile = drawn;
      this.executeEventTile(drawn, tileIndex);
      return true;
    }

    // Thay thẻ Nâu cũ bằng thẻ Nâu mới
    const forensic = this.getForensicPlayer();
    const meansTileIds = new Set(['tile_scene_01', 'tile_scene_03', 'tile_scene_05', 'tile_scene_06', 'tile_scene_08', 'tile_scene_16']);
    const inferredTarget = drawn.targetCardType || (meansTileIds.has(drawn.id) ? 'MEANS' : 'CLUE');
    const newTile = {
      ...drawn,
      targetCardType: inferredTarget,
      selectedOptionIndex: forensic && !forensic.isHuman ? this.computeSmartBulletOption({ ...drawn, targetCardType: inferredTarget }) : null,
      roundPlaced: this.round,
      slotIndex: tileIndex
    };
    this.activeSceneTiles[tileIndex] = newTile;

    this.addLog(
      `Vòng ${this.round}: Tech Lead đã cập nhật thông số [${targetTile.name_vi}] sang thẻ mới [${newTile.name_vi}].`,
      `Round ${this.round}: Tech Lead updated parameter [${targetTile.name_en}] to [${newTile.name_en}].`,
      'forensic'
    );
    return true;
  }

  /**
   * Thực thi hiệu ứng của 7 Thẻ Sự Kiện (EVENT_01 .. EVENT_07)
   */
  executeEventTile(eventTile, fallbackTileIndex) {
    this.addLog(
      `⚡ SỰ KIỆN ĐẶC BIỆT [${eventTile.name_vi}]: ${eventTile.desc_vi}`,
      `⚡ SPECIAL EVENT [${eventTile.name_en}]: ${eventTile.desc_en}`,
      'event'
    );

    const pullNextBrown = () => {
      const idx = this.sceneDeck.findIndex(t => t.color === 'BROWN');
      if (idx >= 0) {
        const [b] = this.sceneDeck.splice(idx, 1);
        return b;
      }
      return null;
    };

    const forensic = this.getForensicPlayer();
    const isBotForensic = forensic && !forensic.isHuman;

    switch (eventTile.id) {
      case 'EVENT_01': {
        // Sudden Twist: Rút thêm 1 ô Nâu mới mà KHÔNG cần bỏ ô cũ
        const extraBrown = pullNextBrown();
        if (extraBrown) {
          this.activeSceneTiles.push({
            ...extraBrown,
            selectedOptionIndex: isBotForensic ? this.computeSmartBulletOption(extraBrown) : null,
            roundPlaced: this.round,
            slotIndex: this.activeSceneTiles.length
          });
        }
        break;
      }
      case 'EVENT_02': {
        // Forensic Breakthrough: Dời 1 viên đạn trên 1 ô hiện trường sang mục khác chính xác hơn
        const brownTiles = this.activeSceneTiles.filter(t => t.color === 'BROWN' && t.selectedOptionIndex !== null);
        if (brownTiles.length > 0 && isBotForensic) {
          const target = brownTiles[0];
          target.selectedOptionIndex = (target.selectedOptionIndex + 1) % 6;
        }
        const replacement = pullNextBrown();
        if (replacement && this.activeSceneTiles[fallbackTileIndex]) {
          this.activeSceneTiles[fallbackTileIndex] = {
            ...replacement,
            selectedOptionIndex: isBotForensic ? this.computeSmartBulletOption(replacement) : null,
            roundPlaced: this.round,
            slotIndex: fallbackTileIndex
          };
        }
        break;
      }
      case 'EVENT_03': {
        // Evidence Tampering: Bỏ 2 ô Nâu, chỉ rút bù 1 ô Nâu
        const brownIndices = this.activeSceneTiles
          .map((t, i) => (t.color === 'BROWN' ? i : -1))
          .filter(i => i >= 0);
        if (brownIndices.length >= 2) {
          this.activeSceneTiles.splice(brownIndices[brownIndices.length - 1], 1);
        }
        const replacement = pullNextBrown();
        const safeIdx = Math.min(fallbackTileIndex, this.activeSceneTiles.length - 1);
        if (replacement && this.activeSceneTiles[safeIdx]) {
          this.activeSceneTiles[safeIdx] = {
            ...replacement,
            selectedOptionIndex: isBotForensic ? this.computeSmartBulletOption(replacement) : null,
            roundPlaced: this.round,
            slotIndex: safeIdx
          };
        }
        break;
      }
      case 'EVENT_04': {
        // Witness Protection: Đảo chiều trình bày ngược kim đồng hồ
        this.reversePresentationOrder = true;
        const replacement = pullNextBrown();
        if (replacement && this.activeSceneTiles[fallbackTileIndex]) {
          this.activeSceneTiles[fallbackTileIndex] = {
            ...replacement,
            selectedOptionIndex: isBotForensic ? this.computeSmartBulletOption(replacement) : null,
            roundPlaced: this.round,
            slotIndex: fallbackTileIndex
          };
        }
        break;
      }
      case 'EVENT_05': {
        // Internal Investigation: Mỗi điều tra viên ghim nghi vấn lên 1 lá bài của người bên phải
        this.players.forEach((p, idx) => {
          if (p.role !== 'FORENSIC_SCIENTIST') {
            const rightNeighbor = this.players[(idx + 1) % this.players.length];
            if (rightNeighbor && rightNeighbor.meansCards && rightNeighbor.meansCards.length > 0) {
              p.suspicionFlagId = rightNeighbor.meansCards[0].id;
            }
          }
        });
        const replacement = pullNextBrown();
        if (replacement && this.activeSceneTiles[fallbackTileIndex]) {
          this.activeSceneTiles[fallbackTileIndex] = {
            ...replacement,
            selectedOptionIndex: isBotForensic ? this.computeSmartBulletOption(replacement) : null,
            roundPlaced: this.round,
            slotIndex: fallbackTileIndex
          };
        }
        break;
      }
      case 'EVENT_06': {
        // Clean Sweep: Đổi thẻ Địa điểm (Xanh lá) sang thẻ Địa điểm mới
        if (this.unusedLocationTiles.length > 0) {
          const newLoc = this.unusedLocationTiles.shift();
          const greenIdx = this.activeSceneTiles.findIndex(t => t.color === 'GREEN');
          if (greenIdx >= 0 && newLoc) {
            this.activeSceneTiles[greenIdx] = {
              ...newLoc,
              selectedOptionIndex: isBotForensic ? this.computeSmartBulletOption(newLoc) : null,
              roundPlaced: this.round,
              slotIndex: greenIdx
            };
          }
        }
        const replacement = pullNextBrown();
        if (replacement && this.activeSceneTiles[fallbackTileIndex]) {
          this.activeSceneTiles[fallbackTileIndex] = {
            ...replacement,
            selectedOptionIndex: isBotForensic ? this.computeSmartBulletOption(replacement) : null,
            roundPlaced: this.round,
            slotIndex: fallbackTileIndex
          };
        }
        break;
      }
      case 'EVENT_07': {
        // The Perfect Crime: Forensic Scientist peeks at top Scene deck
        this.addLog(
          'Tội ác Hoàn hảo: Pháp y đã kiểm tra đỉnh chồng bài Hiện Trường bí mật.',
          'The Perfect Crime: Forensic Scientist peeked at the top of the Scene Deck.',
          'event'
        );
        const replacement = pullNextBrown();
        if (replacement && this.activeSceneTiles[fallbackTileIndex]) {
          this.activeSceneTiles[fallbackTileIndex] = {
            ...replacement,
            selectedOptionIndex: isBotForensic ? this.computeSmartBulletOption(replacement) : null,
            roundPlaced: this.round,
            slotIndex: fallbackTileIndex
          };
        }
        break;
      }
      default: {
        // Các sự kiện còn lại: Vẫn rút bù 1 thẻ Nâu mới vào vị trí đã chọn
        const replacement = pullNextBrown();
        if (replacement && this.activeSceneTiles[fallbackTileIndex]) {
          this.activeSceneTiles[fallbackTileIndex] = {
            ...replacement,
            selectedOptionIndex: isBotForensic ? this.computeSmartBulletOption(replacement) : null,
            roundPlaced: this.round,
            slotIndex: fallbackTileIndex
          };
        }
        break;
      }
    }
  }

  /**
   * Kỹ năng đặc biệt của Thám tử Cố vấn (CONSULTING_DETECTIVE):
   * Tự nguyện nộp bỏ Huy hiệu để lật ngửa thẻ Vai trò chứng minh 100% vô tội!
   */
  activateConsultingDetectiveReveal(playerId) {
    const player = this.getPlayerById(playerId);
    if (!player || player.role !== 'CONSULTING_DETECTIVE' || !player.hasBadge || player.isRoleRevealed) {
      return false;
    }
    player.hasBadge = false;
    player.isRoleRevealed = true;
    this.addLog(
      `🏗️ ${player.displayName} đã tự nguyện bỏ quyền phá án để lật thẻ [System Architect] — chứng minh 100% trong sạch (Zero-Commit)!`,
      `🏗️ ${(player.displayNameEn || player.displayName)} voluntarily discarded their Badge to reveal [System Architect] — proving 100% innocence!`,
      'forensic'
    );
    return true;
  }

  /**
   * Thực hiện Đập Bàn Phá Án (ACCUSATION_INTERRUPT):
   * Người chơi dùng Huy hiệu chỉ định Nghi phạm + 1 lá Phương thức + 1 lá Manh mối.
   */
  makeAccusation(accuserId, suspectId, meansId, clueId) {
    if (
      this.phase === GAME_PHASES.GAME_OVER ||
      this.phase === GAME_PHASES.WITNESS_REVERSAL ||
      this.phase === GAME_PHASES.ROLE_CASTING
    ) {
      return { valid: false };
    }

    const accuser = this.getPlayerById(accuserId);
    const suspect = this.getPlayerById(suspectId);
    if (!accuser || !suspect || !accuser.hasBadge || accuser.role === 'FORENSIC_SCIENTIST') {
      return { valid: false, reason: 'FORENSIC_CANNOT_ACCUSE' };
    }

    const meansCard = suspect.meansCards.find(c => c.id === meansId);
    const clueCard = suspect.clueCards.find(c => c.id === clueId);
    if (!meansCard || !clueCard) {
      return { valid: false };
    }

    // Thu hồi Huy hiệu Phá án (mỗi người chỉ có 1 lần duy nhất trong suốt ván chơi)
    accuser.hasBadge = false;
    this.accuserPlayerId = accuser.id;

    const isCorrect =
      suspect.id === this.solution.murdererPlayerId &&
      meansId === this.solution.meansCardId &&
      clueId === this.solution.clueCardId;

    if (isCorrect) {
      this.addLog(
        `🚨 CHỐT ĐƠN CHÍNH XÁC! ${accuser.displayName} đã bắt tận tay Thủ phạm ${suspect.displayName} với cặp lỗi [${meansCard.vi}] & [${clueCard.vi}]!`,
        `🚨 BUG PINPOINTED! ${(accuser.displayNameEn || accuser.displayName)} exposed Culprit ${(suspect.displayNameEn || suspect.displayName)} with [${meansCard.en}] & [${clueCard.en}]!`,
        'success'
      );

      // Nếu bàn chơi có Whistleblower (WITNESS) -> Chuyển sang pha Đổ vạ cuối trận (WITNESS_REVERSAL)
      if (this.solution.witnessPlayerId) {
        this.phase = GAME_PHASES.WITNESS_REVERSAL;
        this.addLog(
          '🎯 ĐỔ VẠ CUỐI TRẬN: Thủ phạm đã bị lộ nhưng đang tìm cách chỉ điểm [Whistleblower / Senior Dev] để kéo sập cả đội!',
          '🎯 SCAPEGOAT REVERSAL: The Culprit is cornered and attempts to pinpoint the [Whistleblower / Senior Dev] to steal the win!',
          'crime'
        );

        const murderer = this.getMurdererPlayer();
        if (murderer && !murderer.isHuman) {
          // Nếu Sát nhân là Bot, tự động chọn 1 mục tiêu bên phe Điều tra để bắn
          const targets = this.players.filter(
            p => p.team === 'INVESTIGATION' && p.role !== 'FORENSIC_SCIENTIST'
          );
          const shotTarget = targets[Math.floor(Math.random() * targets.length)];
          if (shotTarget) {
            this.witnessShotTargetId = shotTarget.id;
          }
        }
      } else {
        this.finishGame(
          'INVESTIGATION',
          'ARRESTED',
          `${accuser.displayName} đã khôi phục Production thành công và tóm gọn Thủ phạm ${suspect.displayName} với cặp lỗi [${meansCard.vi}] + [${clueCard.vi}]!`,
          `${(accuser.displayNameEn || accuser.displayName)} restored Production and caught Culprit ${(suspect.displayNameEn || suspect.displayName)} with [${meansCard.en}] + [${clueCard.en}]!`
        );
      }

      return { valid: true, isCorrect: true, meansCard, clueCard, suspect };
    } else {
      // Cáo buộc SAI: Tech Lead chỉ lắc đầu báo SAI, không tiết lộ sai ở đâu
      this.addLog(
        `❌ BẮT NHẦM BUG! ${accuser.displayName} nghi ngờ ${suspect.displayName} gây lỗi bằng [${meansCard.vi}] + [${clueCard.vi}], nhưng Tech Lead xác nhận: KHÔNG KHỚP LOG! (${accuser.displayName} mất Huy hiệu).`,
        `❌ FALSE ALARM! ${(accuser.displayNameEn || accuser.displayName)} accused ${(suspect.displayNameEn || suspect.displayName)} of [${meansCard.en}] + [${clueCard.en}], but Tech Lead ruled: LOG MISMATCH! (Badge lost).`,
        'error'
      );

      // Kiểm tra xem còn ai có Huy hiệu không
      const remainingBadges = this.players.filter(p => p.hasBadge && p.role !== 'FORENSIC_SCIENTIST').length;
      if (remainingBadges === 0) {
        if (!this.finalShowdownDone) {
          this.startFinalShowdownPhase();
        } else {
          this.finishGame(
            'CRIMINAL',
            'NO_BADGES_LEFT',
            'Toàn bộ Huy hiệu Phá án của Đội Ứng Phó đã cạn sạch mà vẫn chưa fix được lỗi. Phe Gây Lỗi giành chiến thắng tuyệt đối!',
            'All Accusation Badges have been exhausted without resolving the outage. The Bug Team wins!'
          );
        }
      }

      return { valid: true, isCorrect: false, meansCard, clueCard, suspect, phase: this.phase };
    }
  }

  /**
   * HỘI ĐỒNG PHÁN QUYẾT SINH TỬ (50/50 SHOWDOWN - TIEBREAKER VOTE):
   * Khi hết 3 vòng hoặc cạn toàn bộ Huy hiệu mà chưa ai phá án thành công,
   * hệ thống khoanh vùng 2 đối tượng khả nghi nhất (Thủ phạm thật sự & 1 Nghi phạm vô tội có điểm đối trọng cao nhất).
   * Tuyệt đối KHÔNG TIẾT LỘ vai trò của 2 người này để người chơi tự quyết định trong thế 50/50!
   */
  startFinalShowdownPhase() {
    if (this.phase === GAME_PHASES.GAME_OVER || this.phase === GAME_PHASES.WITNESS_REVERSAL) return null;
    this.phase = GAME_PHASES.FINAL_SHOWDOWN;
    this.finalShowdownDone = true;

    const murderer = this.getMurdererPlayer();
    if (!murderer) return null;

    // Tìm nghi phạm vô tội có điểm số tương quan cao nhất với các thẻ hiện trường
    const innocentSuspects = this.players.filter(
      p => p.role !== 'FORENSIC_SCIENTIST' && p.id !== murderer.id
    );

    let topInnocent = null;
    let topInnocentMeans = null;
    let topInnocentClue = null;
    let highestScore = -1;

    for (const s of innocentSuspects) {
      for (const m of s.meansCards || []) {
        for (const c of s.clueCards || []) {
          const sc = this.evaluateCardPairScore(m, c);
          if (sc > highestScore) {
            highestScore = sc;
            topInnocent = s;
            topInnocentMeans = m;
            topInnocentClue = c;
          }
        }
      }
    }

    if (!topInnocent && innocentSuspects.length > 0) {
      topInnocent = innocentSuspects[0];
      topInnocentMeans = topInnocent.meansCards?.[0];
      topInnocentClue = topInnocent.clueCards?.[0];
    }

    const trueMeans = this.findCardById(this.solution?.meansCardId)?.card || murderer.meansCards?.[0];
    const trueClue = this.findCardById(this.solution?.clueCardId)?.card || murderer.clueCards?.[0];

    const candMurderer = {
      playerId: murderer.id,
      displayName: murderer.displayName,
      avatar: murderer.avatar || '👤',
      meansCard: trueMeans,
      clueCard: trueClue,
      isTrueCulprit: true
    };

    const candInnocent = {
      playerId: topInnocent ? topInnocent.id : 'innocent_fallback',
      displayName: topInnocent ? topInnocent.displayName : 'DevOps Team',
      avatar: topInnocent ? (topInnocent.avatar || '👤') : '👤',
      meansCard: topInnocentMeans || trueMeans,
      clueCard: topInnocentClue || trueClue,
      isTrueCulprit: false
    };

    // Xáo trộn ngẫu nhiên vị trí 2 ứng viên (50/50 trái hoặc phải, không để lộ ai là hung thủ)
    const shuffled = Math.random() < 0.5 ? [candMurderer, candInnocent] : [candInnocent, candMurderer];

    this.finalShowdown = {
      candidates: shuffled.map(c => ({
        playerId: c.playerId,
        displayName: c.displayName,
        avatar: c.avatar,
        meansCard: c.meansCard,
        clueCard: c.clueCard
      })),
      trueCulpritPlayerId: murderer.id,
      votes: {}, // playerId -> candidatePlayerId
      isResolved: false
    };

    this.addLog(
      '⚖️ HỘI ĐỒNG PHÁN QUYẾT SINH TỬ: Đã hết thời gian điều tra! Tech Lead đã khoanh vùng được 2 Nghi phạm khả nghi nhất (Tỷ lệ 50/50). Hãy đưa ra phán quyết cuối cùng!',
      '⚖️ FINAL SHOWDOWN: War Room time expired! Tech Lead isolated 2 top suspects (50/50 deadlock). Cast the final decisive verdict!',
      'forensic'
    );

    return this.finalShowdown;
  }

  /**
   * Chốt phán quyết cuối cùng của Hội đồng
   */
  resolveFinalShowdown(chosenPlayerId, voterId = null) {
    if (this.phase !== GAME_PHASES.FINAL_SHOWDOWN || !this.finalShowdown) return null;
    this.finalShowdown.isResolved = true;
    this.finalShowdownChosenPlayerId = chosenPlayerId;

    const isCorrect = (chosenPlayerId === this.finalShowdown.trueCulpritPlayerId);
    const chosenPlayer = this.getPlayerById(chosenPlayerId);
    const murderer = this.getMurdererPlayer();

    if (isCorrect) {
      this.addLog(
        `🚨 PHÁN QUYẾT CHÍNH XÁC! Hội đồng đã chỉ định chuẩn xác Thủ phạm ${chosenPlayer ? chosenPlayer.displayName : 'gây lỗi'}!`,
        `🚨 FINAL VERDICT CORRECT! The Council accurately convicted Culprit ${chosenPlayer ? chosenPlayer.displayName : 'in the outage'}!`,
        'success'
      );

      // Nếu bàn chơi có Whistleblower (WITNESS) -> Chuyển sang pha Đổ vạ cuối trận (WITNESS_REVERSAL)
      if (this.solution?.witnessPlayerId) {
        this.phase = GAME_PHASES.WITNESS_REVERSAL;
        this.addLog(
          '🎯 ĐỔ VẠ CUỐI TRẬN: Thủ phạm đã bị lộ nhưng đang tìm cách chỉ điểm [Whistleblower / Senior Dev] để kéo sập cả đội!',
          '🎯 SCAPEGOAT REVERSAL: The Culprit is cornered and attempts to pinpoint the [Whistleblower / Senior Dev] to steal the win!',
          'crime'
        );

        if (murderer && !murderer.isHuman) {
          const targets = this.players.filter(
            p => p.team === 'INVESTIGATION' && p.role !== 'FORENSIC_SCIENTIST'
          );
          const shotTarget = targets[Math.floor(Math.random() * targets.length)];
          if (shotTarget) {
            this.witnessShotTargetId = shotTarget.id;
          }
        }
      } else {
        this.finishGame(
          'INVESTIGATION',
          'FINAL_VERDICT_CORRECT',
          `Phán quyết sinh tử chuẩn xác 100%! Đội Ứng Phó đã bắt đúng Thủ phạm ${murderer ? murderer.displayName : ''} trong tình thế 50/50 ngàn cân treo sợi tóc!`,
          `Flawless Final Verdict! Incident Response Team convicted Culprit ${murderer ? murderer.displayName : ''} in a thrilling 50/50 showdown!`
        );
      }
    } else {
      this.addLog(
        `❌ BẮT OAN NGHI PHẠM! ${chosenPlayer ? chosenPlayer.displayName : 'Người này'} hoàn toàn vô tội. Thủ phạm thật sự ${murderer ? murderer.displayName : ''} đã tẩu thoát an toàn!`,
        `❌ WRONGFUL CONVICTION! ${chosenPlayer ? chosenPlayer.displayName : 'This person'} was innocent. True Culprit ${murderer ? murderer.displayName : ''} slipped away clean!`,
        'error'
      );
      this.finishGame(
        'CRIMINAL',
        'FINAL_VERDICT_WRONG',
        `Hội đồng phán quyết đã bắt nhầm người vô tội (${chosenPlayer ? chosenPlayer.displayName : ''}). Thủ phạm ${murderer ? murderer.displayName : ''} đã xóa dấu vết và tẩu thoát thành công!`,
        `The Council wrongfully convicted an innocent (${chosenPlayer ? chosenPlayer.displayName : ''}). True Culprit ${murderer ? murderer.displayName : ''} wiped logs and escaped clean!`
      );
    }

    const showdownCand = this.finalShowdown?.candidates?.find(c => c.playerId === chosenPlayerId);
    return {
      isCorrect,
      chosenPlayer,
      murderer,
      meansCard: showdownCand?.meansCard,
      clueCard: showdownCand?.clueCard,
      phase: this.phase,
      winnerTeam: this.winnerTeam
    };
  }

  /**
   * Thực thi phát súng cuối cùng của Kẻ Sát Nhân ở pha WITNESS_REVERSAL
   */
  resolveWitnessShot(targetPlayerId) {
    if (this.phase !== GAME_PHASES.WITNESS_REVERSAL) return null;
    const target = this.getPlayerById(targetPlayerId);
    if (!target) return null;

    this.witnessShotTargetId = target.id;
    const hitWitness = target.role === 'WITNESS';

    if (hitWitness) {
      this.finishGame(
        'CRIMINAL',
        'WITNESS_ASSASSINATED',
        `💥 ĐỔ VẠ THÀNH CÔNG! Thủ phạm đã chỉ điểm trúng Whistleblower ${target.displayName}! Người tố cáo bị lộ diện chịu phạt chung, Phe Gây Lỗi lật kèo giành chiến thắng!`,
        `💥 WHISTLEBLOWER EXPOSED! The Culprit successfully scapegoated Whistleblower ${(target.displayNameEn || target.displayName)}! The Bug Team steals the victory!`
      );
    } else {
      this.finishGame(
        'INVESTIGATION',
        'WITNESS_SURVIVED',
        `🛡️ BẢO VỆ WHISTLEBLOWER THÀNH CÔNG! Thủ phạm đổ vạ nhầm sang ${target.displayName} (${ROLE_DEFINITIONS[target.role]?.name_vi}). Whistleblower an toàn gửi báo cáo lên sếp tổng, Đội Ứng Phó toàn thắng!`,
        `🛡️ WHISTLEBLOWER PROTECTED! The Culprit wrongly blamed ${(target.displayNameEn || target.displayName)} (${ROLE_DEFINITIONS[target.role]?.name_en}). The Incident Response team triumphs!`
      );
    }

    return { hitWitness, target };
  }

  /**
   * Kết thúc ván đấu & Mở toàn bộ vai trò bí mật
   */
  /**
   * AI FORENSIC MASTER — 1. Sinh thông báo "Báo cáo Giám định Hệ thống (AI Log Analyzer)" mỗi vòng
   * Dựa trên cặp bài (Hành vi + Dấu vết) của Thủ phạm và các thẻ đạn gỗ mà Tech Lead đã ghim
   */
  generateAiRoundLogAnalysis(roundNum = this.round) {
    const mFound = this.findCardById(this.solution.meansCardId);
    const cFound = this.findCardById(this.solution.clueCardId);
    const mCard = mFound?.card;
    const cCard = cFound?.card;

    const causeTile = this.activeSceneTiles.find(t => t.color === 'PURPLE');
    const locTile = this.activeSceneTiles.find(t => t.color === 'GREEN');
    const brownTiles = this.activeSceneTiles.filter(t => t.color === 'BROWN' && t.selectedOptionIndex !== null);

    const causeIdx = tileOptionSafe(causeTile?.selectedOptionIndex);
    const locIdx = tileOptionSafe(locTile?.selectedOptionIndex);

    const rootCauseVi = causeTile?.options_vi?.[causeIdx] || 'Sự cố bất thường';
    const rootCauseEn = causeTile?.options_en?.[causeIdx] || 'Anomalous failure';
    const layerVi = locTile?.options_vi?.[locIdx] || 'Production Cluster';
    const layerEn = locTile?.options_en?.[locIdx] || 'Production Cluster';

    const latestBrown = brownTiles[brownTiles.length - 1] || brownTiles[0];
    const brownOptIdx = tileOptionSafe(latestBrown?.selectedOptionIndex);
    const brownNameVi = latestBrown ? latestBrown.name_vi : 'Trạng thái hệ thống';
    const brownValVi = latestBrown?.options_vi?.[brownOptIdx] || 'Đang quá tải';
    const brownNameEn = latestBrown ? latestBrown.name_en : 'System State';
    const brownValEn = latestBrown?.options_en?.[brownOptIdx] || 'Overloaded';

    // Gợi ý gián tiếp từ nhóm category của thẻ Hành vi & Dấu vết (không lộ tên thẻ cụ thể)
    const mCat = (mCard?.category || '').toLowerCase();
    const cCat = (cCard?.category || '').toLowerCase();

    let triggerHintVi = 'thao tác can thiệp trực tiếp vào luồng vận hành';
    let triggerHintEn = 'direct operational intervention';
    if (mCat.includes('poison')) {
      triggerHintVi = 'lỗ hổng phân quyền, rò rỉ khóa bảo mật hoặc chèn mã độc ngầm';
      triggerHintEn = 'security credential leak or unauthorized script injection';
    } else if (mCat.includes('suffoc')) {
      triggerHintVi = 'tác vụ gây nghẽn cổ chai, vòng lặp treo cứng hoặc cạn kiệt tài nguyên bộ nhớ';
      triggerHintEn = 'resource starvation, deadlock, or infinite loop bottleneck';
    } else if (mCat.includes('blood')) {
      triggerHintVi = 'lệnh xóa dữ liệu nguy hiểm, đứt gãy kết nối hoặc phá hủy cấu hình gốc';
      triggerHintEn = 'destructive data command, severed connection, or wiped config';
    } else if (mCat.includes('severe')) {
      triggerHintVi = 'tác vụ tính toán quá tải làm vọt 100% CPU hoặc đẩy code thẳng lên Live không qua kiểm thử';
      triggerHintEn = 'heavy compute spike hitting 100% CPU or unverified live deployment';
    } else if (mCat.includes('illness') || mCat.includes('accident')) {
      triggerHintVi = 'xung đột phiên bản thư viện hoặc sự cố hạ tầng vật lý dây chuyền';
      triggerHintEn = 'dependency version conflict or cascading infrastructure outage';
    }

    let traceHintVi = 'dấu vết lưu lại tại bàn làm việc của nghi phạm';
    let traceHintEn = 'physical or digital trace left at the suspect station';
    if (cCat.includes('written')) {
      traceHintVi = 'bản ghi văn bản, tài liệu, hóa đơn hoặc lịch sử commit/ticket';
      traceHintEn = 'written log, documentation, invoice, or commit/ticket note';
    } else if (cCat.includes('personal')) {
      traceHintVi = 'vật dụng cá nhân, thẻ nhân viên hoặc phụ kiện công sở của Dev';
      traceHintEn = 'personal dev gear, access badge, or office accessory';
    } else if (cCat.includes('natural')) {
      traceHintVi = 'đồ ăn, thức uống, vết cà phê/trà sữa đổ hoặc yếu tố sinh học';
      traceHintEn = 'food, beverage spill, coffee/boba trace, or organic item';
    } else if (cCat.includes('synthetic')) {
      traceHintVi = 'thiết bị phần cứng, cáp mạng, thông số hệ thống hoặc log máy chủ';
      traceHintEn = 'hardware device, cable, system metric, or server log';
    } else if (cCat.includes('artistic') || cCat.includes('unrelated')) {
      traceHintVi = 'giao diện hình ảnh, trò chơi giải trí hoặc vật phẩm tâm linh trên bàn code';
      traceHintEn = 'visual asset, office game, or lucky charm on the desk';
    }

    const timestamps = ['02:13 AM', '17:59 PM', '11:42 PM', '03:07 AM', '14:28 PM'];
    const ts = timestamps[(roundNum + (mCard?.id?.charCodeAt(2) || 0)) % timestamps.length];
    const conf = roundNum === 1 ? '50%' : (roundNum === 2 ? '55%' : '60%');
    const sev = roundNum === 3 ? 'SEV-0 CRITICAL' : 'SEV-1 HIGH';

    const quipsVi = [
      `🤖 AI Log Analyzer [Vòng ${roundNum} • Độ tin cậy ${conf}]: Phát hiện sự cố xảy ra lúc ${ts} đánh sập [${layerVi}] với triệu chứng [${rootCauseVi}]. Cảnh báo: Ghi nhận dấu hiệu của ${triggerHintVi} kết hợp với ${traceHintVi}!`,
      `🤖 AI Log Analyzer [Vòng ${roundNum} • Độ tin cậy ${conf}]: Quét sâu thông số [${brownNameVi}: ${brownValVi}] tại tầng [${layerVi}]. Phân tích tương quan chỉ ra nguyên nhân bắt nguồn từ ${triggerHintVi}, hiện trường còn vương lại ${traceHintVi}.`,
      `🤖 AI Log Analyzer [Vòng ${roundNum} • Độ tin cậy ${conf}]: Báo động đỏ ${sev}! Trước khi [${layerVi}] ngưng thở vì [${rootCauseVi}], hệ thống kịp chụp lại dấu vết ${traceHintVi} đi kèm ${triggerHintVi}. Đề nghị khoanh vùng ngay!`
    ];

    const quipsEn = [
      `🤖 AI Log Analyzer [Round ${roundNum} • Confidence ${conf}]: Outage detected at ${ts} crashing [${layerEn}] via [${rootCauseEn}]. Telemetry flags ${triggerHintEn} paired with ${traceHintEn}!`,
      `🤖 AI Log Analyzer [Round ${roundNum} • Confidence ${conf}]: Deep scan on [${brownNameEn}: ${brownValEn}] at [${layerEn}] reveals ${triggerHintEn} leaving behind ${traceHintEn}.`,
      `🤖 AI Log Analyzer [Round ${roundNum} • Confidence ${conf}]: ${sev} Alert! Right before [${layerEn}] collapsed from [${rootCauseEn}], system logs captured ${traceHintEn} linked to ${triggerHintEn}!`
    ];

    const report = {
      round: roundNum,
      incidentId: this.caseId,
      timestamp: ts,
      severity: sev,
      confidence: conf,
      affectedLayerVi: layerVi,
      affectedLayerEn: layerEn,
      rootCauseVi,
      rootCauseEn,
      highlightParamVi: `${brownNameVi}: ${brownValVi}`,
      highlightParamEn: `${brownNameEn}: ${brownValEn}`,
      logAnalysisVi: quipsVi[(roundNum - 1) % quipsVi.length],
      logAnalysisEn: quipsEn[(roundNum - 1) % quipsEn.length],
      message_vi: quipsVi[(roundNum - 1) % quipsVi.length],
      message_en: quipsEn[(roundNum - 1) % quipsEn.length]
    };

    this.aiForensicReports[roundNum] = report;
    this.latestAiLogReport = report;

    this.addLog(report.logAnalysisVi, report.logAnalysisEn, 'forensic');
    return report;
  }

  /**
   * AI FORENSIC MASTER — 2. Tự động tổng hợp bản Báo cáo RCA (Root Cause Analysis) cuối ván chơi
   * Gồm: Incident, Direct Cause, Root Cause, Preventive Action & Lời bình châm biếm kiểu dân dự án IT
   */
  generateAiRcaReport() {
    const murderer = this.getMurdererPlayer();
    const accomplice = this.players.find(p => p.role === 'ACCOMPLICE');
    const witness = this.players.find(p => p.role === 'WITNESS');
    const accuser = this.getPlayerById(this.accuserPlayerId);
    const mFound = this.findCardById(this.solution.meansCardId);
    const cFound = this.findCardById(this.solution.clueCardId);
    const mCard = mFound?.card || { vi: 'Thao tác ẩn', en: 'Hidden Trigger', id: 'M000' };
    const cCard = cFound?.card || { vi: 'Log ẩn', en: 'Hidden Trace', id: 'C000' };

    const causeTile = this.activeSceneTiles.find(t => t.color === 'PURPLE');
    const locTile = this.activeSceneTiles.find(t => t.color === 'GREEN');
    const rootCauseVi = causeTile?.options_vi?.[tileOptionSafe(causeTile?.selectedOptionIndex)] || 'Tràn RAM / Quá tải hệ thống';
    const rootCauseEn = causeTile?.options_en?.[tileOptionSafe(causeTile?.selectedOptionIndex)] || 'Out of Memory / System Overload';
    const layerVi = locTile?.options_vi?.[tileOptionSafe(locTile?.selectedOptionIndex)] || 'Production Server';
    const layerEn = locTile?.options_en?.[tileOptionSafe(locTile?.selectedOptionIndex)] || 'Production Server';

    const culpritName = murderer ? murderer.displayName : 'Ẩn danh';
    const culpritNameEn = murderer ? (murderer.displayNameEn || murderer.displayName) : 'Unknown';
    const isResolved = this.winnerTeam === 'INVESTIGATION';

    const preventiveActionsVi = [
      `1. Cấm tiệt mọi lệnh Deploy lên [${layerVi}] vào chiều thứ Sáu sau 16h00.\n2. Thu hồi quyền sudo/root của ${culpritName} trong 3 Sprint liên tiếp, bắt buộc qua 2 lớp Code Review.\n3. Tịch thu tang vật [${cCard.vi}] tại bàn làm việc và cài AI Pre-Commit Hook chặn hành vi [${mCard.vi}].`,
      `1. Thiết lập luật thép: Ai làm sập [${layerVi}] vì [${mCard.vi}] phải trực chiến OT viết 100 Unit Test bù.\n2. Đưa tang vật [${cCard.vi}] vào bảo tàng kỷ vật War Room của dự án để răn đe.\n3. Bắt buộc chạy Chaos Engineering và kiểm tra tự động trước mỗi ca Go-Live.`,
      `1. Khóa cứng quyền truy cập trực tiếp vào [${layerVi}], mọi thay đổi phải đi qua CI/CD Pipeline.\n2. Yêu cầu ${culpritName} viết bản Post-Mortem dài 5 trang A4 giải trình về sự xuất hiện của [${cCard.vi}].\n3. Cấm vừa xử lý [${mCard.vi}] vừa mở tab giải trí trong giờ cao điểm!`
    ];

    const preventiveActionsEn = [
      `1. Strictly ban all deployments to [${layerEn}] after 4:00 PM on Fridays.\n2. Revoke sudo/root access for ${culpritNameEn} for 3 Sprints and enforce 2-approver PR reviews.\n3. Confiscate [${cCard.en}] and install an AI Pre-Commit Hook to block [${mCard.en}].`,
      `1. Enforce the Golden Rule: Anyone crashing [${layerEn}] via [${mCard.en}] must write 100 unit tests.\n2. Archive [${cCard.en}] in the FSOFT War Room Hall of Fame as a cautionary tale.\n3. Mandate automated staging health checks prior to every release.`
    ];

    const pickIdx = (mCard.id.charCodeAt(mCard.id.length - 1) || 0) % preventiveActionsVi.length;

    const satiricalVi = isResolved
      ? `Phán quyết từ AI Forensic Master: Dù ${culpritName} đã cố ngụy trang bằng câu thần chú "Trên máy em vẫn chạy ngon!", bằng chứng [${cCard.vi}] đã tố cáo tất cả. Đề nghị ${culpritName}${accomplice ? ' cùng đồng phạm ' + accomplice.displayName : ''} khao toàn bộ anh em War Room một chầu trà sữa full topping để tạ lỗi!`
      : `Phán quyết từ AI Forensic Master: Thủ phạm ${culpritName} đã thực hiện pha "xóa log thoát xác" đỉnh cao khiến cả phòng họp War Room quay cuồng đổ lỗi cho nhau! Hệ thống [${layerVi}] tiếp tục nằm thở oxy, còn ${culpritName} ung dung tắt máy đi về đúng 17h30!`;

    const satiricalEn = isResolved
      ? `AI Forensic Verdict: Despite ${culpritNameEn}'s classic excuse "It works on my machine!", the [${cCard.en}] trace exposed the truth. ${culpritNameEn} owes the entire War Room a round of boba tea!`
      : `AI Forensic Verdict: Culprit ${culpritNameEn} pulled off the ultimate cover-up! While the War Room argued in circles, ${culpritNameEn} quietly closed their laptop and clocked out at 5:30 PM!`;

    this.aiRcaReport = {
      incidentId: this.caseId,
      severity: isResolved ? 'SEV-1 (RESOLVED)' : 'SEV-0 (SLA BREACHED)',
      statusVi: isResolved ? 'ĐÃ KHẮC PHỤC & BẮT ĐƯỢC THỦ PHẠM' : 'THỦ PHẠM THOÁT ÁN / SẬP TOÀN DIỆN',
      statusEn: isResolved ? 'RESOLVED & CULPRIT CAUGHT' : 'UNRESOLVED / CULPRIT ESCAPED',
      culpritName,
      culpritNameEn,
      accompliceName: accomplice ? accomplice.displayName : null,
      witnessName: witness ? witness.displayName : null,
      accuserName: accuser ? accuser.displayName : null,
      incidentVi: `Sự cố sập tầng [${layerVi}] kéo dài qua ${this.round} vòng họp War Room với biểu hiện chính là [${rootCauseVi}].`,
      incidentEn: `Outage on [${layerEn}] lasting ${this.round} War Room rounds with primary signature [${rootCauseEn}].`,
      directCauseVi: `Thủ phạm [${culpritName}] đã thực hiện hành vi [${mCard.vi}] và để lộ dấu vết [${cCard.vi}] tại hiện trường.`,
      directCauseEn: `Culprit [${culpritNameEn}] executed [${mCard.en}] and left behind [${cCard.en}] at the station.`,
      rootCauseVi: `Nguyên nhân gốc rễ do [${rootCauseVi}] trên tầng [${layerVi}], cộng thêm việc thiếu kiểm soát quyền truy cập và duyệt PR lỏng lẻo.`,
      rootCauseEn: `Root cause traced to [${rootCauseEn}] on [${layerEn}], compounded by lax access control and blind PR approvals.`,
      preventiveActionVi: preventiveActionsVi[pickIdx],
      preventiveActionEn: preventiveActionsEn[pickIdx % preventiveActionsEn.length],
      satiricalVerdictVi: satiricalVi,
      satiricalVerdictEn: satiricalEn
    };

    return this.aiRcaReport;
  }

  finishGame(winnerTeam, reasonKey, textVi, textEn) {
    this.phase = GAME_PHASES.GAME_OVER;
    this.winnerTeam = winnerTeam;
    this.winReasonKey = reasonKey;
    this.winReasonText = { vi: textVi, en: textEn || textVi };
    this.players.forEach(p => {
      p.isRoleRevealed = true;
    });
    this.addLog(textVi, textEn, winnerTeam === 'INVESTIGATION' ? 'success' : 'crime');
    this.generateAiRcaReport();
  }
}

function tileOptionSafe(idx) {
  if (idx === null || idx === undefined || idx < 0 || idx > 5) return 0;
  return idx;
}
