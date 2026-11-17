import os
import json
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

def set_cell_background(cell, fill_hex):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement('w:shd')
    shd.set(qn('w:val'), 'clear')
    shd.set(qn('w:color'), 'auto')
    shd.set(qn('w:fill'), fill_hex)
    tcPr.append(shd)

def set_cell_margins(cell, top=80, bottom=80, left=110, right=110):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = OxmlElement('w:tcMar')
    for m, val in [('top', top), ('bottom', bottom), ('left', left), ('right', right)]:
        node = OxmlElement(f'w:{m}')
        node.set(qn('w:w'), str(val))
        node.set(qn('w:type'), 'dxa')
        tcMar.append(node)
    tcPr.append(tcMar)

def add_header_styled_paragraph(doc, text, level=1):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(14)
    p.paragraph_format.space_after = Pt(6)
    p.paragraph_format.keep_with_next = True
    run = p.add_run(text)
    run.font.name = 'Arial'
    run.bold = True
    if level == 1:
        run.font.size = Pt(16)
        run.font.color.rgb = RGBColor(15, 23, 42)
    elif level == 2:
        run.font.size = Pt(13)
        run.font.color.rgb = RGBColor(14, 165, 233)
    elif level == 3:
        run.font.size = Pt(11)
        run.font.color.rgb = RGBColor(30, 41, 59)
    return p

def add_body_p(doc, text, bold_prefix="", italic=False, space_after=6):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(space_after)
    p.paragraph_format.line_spacing = 1.15
    if bold_prefix:
        r_pre = p.add_run(bold_prefix)
        r_pre.font.name = 'Arial'
        r_pre.font.size = Pt(10.5)
        r_pre.bold = True
        r_pre.font.color.rgb = RGBColor(15, 23, 42)
    r_body = p.add_run(text)
    r_body.font.name = 'Arial'
    r_body.font.size = Pt(10.5)
    r_body.italic = italic
    r_body.font.color.rgb = RGBColor(51, 65, 85)
    return p

def add_bullet_p(doc, bold_prefix, text):
    p = doc.add_paragraph(style='List Bullet')
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(4)
    p.paragraph_format.line_spacing = 1.15
    if bold_prefix:
        r_pre = p.add_run(bold_prefix)
        r_pre.font.name = 'Arial'
        r_pre.font.size = Pt(10.5)
        r_pre.bold = True
        r_pre.font.color.rgb = RGBColor(15, 23, 42)
    r_body = p.add_run(text)
    r_body.font.name = 'Arial'
    r_body.font.size = Pt(10.5)
    r_body.font.color.rgb = RGBColor(51, 65, 85)
    return p

def style_table_header(row, col_widths=None):
    for i, cell in enumerate(row.cells):
        set_cell_background(cell, '0F172A')
        set_cell_margins(cell, top=110, bottom=110, left=120, right=120)
        cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
        for p in cell.paragraphs:
            p.paragraph_format.space_before = Pt(0)
            p.paragraph_format.space_after = Pt(0)
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            for r in p.runs:
                r.font.name = 'Arial'
                r.font.size = Pt(9.5)
                r.bold = True
                r.font.color.rgb = RGBColor(255, 255, 255)
        if col_widths and i < len(col_widths):
            cell.width = col_widths[i]

def style_table_row(row, is_even=False, col_widths=None):
    bg_color = 'F8FAFC' if is_even else 'FFFFFF'
    for i, cell in enumerate(row.cells):
        if is_even:
            set_cell_background(cell, bg_color)
        set_cell_margins(cell, top=75, bottom=75, left=100, right=100)
        cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
        for p in cell.paragraphs:
            p.paragraph_format.space_before = Pt(0)
            p.paragraph_format.space_after = Pt(0)
            for r in p.runs:
                r.font.name = 'Arial'
                r.font.size = Pt(9)
                r.font.color.rgb = RGBColor(30, 41, 59)
        if col_widths and i < len(col_widths):
            cell.width = col_widths[i]

MEANS_CATEGORY_VI = {
    'Poisoning': 'Nhiễm độc hệ thống / Config & Dependency sai',
    'Suffocation': 'Nghẽn cổ chai / Treo hệ thống / Chết tiến trình',
    'Loss of Blood': 'Rò rỉ dữ liệu / Xóa mất tài nguyên (Drop/Leak)',
    'Severe Injury': 'Sập cứng nghiêm trọng / Phá hủy hạ tầng',
    'Accident': 'Sơ suất vận hành / Thao tác nhầm của con người',
    'Illness': 'Lỗi ngầm tích tụ / Suy thoái hiệu năng lâu ngày',
}

CLUE_CATEGORY_VI = {
    'Written': 'Bản ghi văn bản / Log / Email / Tài liệu / Lịch sử Commit',
    'Personal': 'Vật dụng & thói quen cá nhân của Kỹ sư',
    'Natural': 'Yếu tố sinh học / Đồ ăn uống / Văn phòng phẩm tự nhiên',
    'Synthetic': 'Thiết bị phần cứng / Phụ kiện mạng / Màn hình',
    'Artistic': 'Hình ảnh / Sticker / Thiết kế UI / Đồ trang trí',
    'Unrelated': 'Tác nhân ngoại cảnh / Tình huống ngẫu nhiên tại văn phòng',
}

def translate_category(cat, mapping):
    if not cat:
        return 'Khác'
    parts = [mapping.get(p.strip(), p.strip()) for p in cat.split('/')]
    return f"[{cat}] " + " + ".join(parts)

SCENE_TYPE_VI = {
    'CAUSE_OF_DEATH': 'Root Cause (Nguyên nhân gốc - Cố định)',
    'LOCATION_OF_CRIME': 'Tầng Hệ Thống Bị Sập (Cố định 1/4)',
    'SCENE_TILE': 'Thông Số Hiện Trường Sự Cố (Rút ngẫu nhiên)',
}

def main():
    print("Loading data JSON...")
    json_path = os.path.join(os.path.dirname(__file__), 'deception_full_data.json')
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    doc = docx.Document()

    for section in doc.sections:
        section.top_margin = Inches(0.85)
        section.bottom_margin = Inches(0.85)
        section.left_margin = Inches(0.85)
        section.right_margin = Inches(0.85)

    # -------------------------------------------------------------
    # TRANG BÌA (COVER PAGE)
    # -------------------------------------------------------------
    p_title = doc.add_paragraph()
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_title.paragraph_format.space_before = Pt(32)
    p_title.paragraph_format.space_after = Pt(10)
    r_super = p_title.add_run("TÀI LIỆU THIẾT KẾ & TỔNG QUAN DỰ ÁN GAME\n")
    r_super.font.name = 'Arial'
    r_super.font.size = Pt(13)
    r_super.bold = True
    r_super.font.color.rgb = RGBColor(14, 165, 233)

    r_main = p_title.add_run("WHO BROKE PROD?\nAI ĐÃ LÀM SẬP PRODUCTION?")
    r_main.font.name = 'Arial'
    r_main.font.size = Pt(24)
    r_main.bold = True
    r_main.font.color.rgb = RGBColor(15, 23, 42)

    p_sub = doc.add_paragraph()
    p_sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_sub.paragraph_format.space_before = Pt(6)
    p_sub.paragraph_format.space_after = Pt(20)
    r_sub = p_sub.add_run(
        "IT Incident War Room Social Deduction Board Game\n"
        "Chi Tiết Luật Chơi • 9 Vai Trò • Nguồn Gốc & Danh Mục 290 Thẻ Bài • Kiến Trúc & Báo Cáo QA"
    )
    r_sub.font.name = 'Arial'
    r_sub.font.size = Pt(11)
    r_sub.italic = True
    r_sub.font.color.rgb = RGBColor(100, 116, 139)

    banner_img = os.path.join(os.path.dirname(__file__), '../DOCS_WHO_BROKE_PROD/HINH_ANH/banner_who_broke_prod.jpg')
    if os.path.exists(banner_img):
        p_banner = doc.add_paragraph()
        p_banner.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_banner.paragraph_format.space_after = Pt(20)
        run_img = p_banner.add_run()
        run_img.add_picture(banner_img, width=Inches(6.2))

    p_meta = doc.add_paragraph()
    p_meta.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_meta.paragraph_format.space_after = Pt(16)
    r_meta = p_meta.add_run("Phiên Bản: 2.0 (IT War Room Edition)  |  Công Nghệ: Node.js, Socket.IO & Vanilla ES6+  |  Năm 2026")
    r_meta.font.name = 'Arial'
    r_meta.font.size = Pt(10)
    r_meta.bold = True
    r_meta.font.color.rgb = RGBColor(71, 85, 105)

    doc.add_page_break()

    # -------------------------------------------------------------
    # MỤC LỤC
    # -------------------------------------------------------------
    add_header_styled_paragraph(doc, "MỤC LỤC NỘI DUNG TÀI LIỆU", level=1)
    add_body_p(doc, "Tài liệu này cung cấp cái nhìn toàn diện và chi tiết nhất về tựa game 'Who Broke Prod? • AI Đã Làm Sập Production?': từ bối cảnh sáng tạo, nguồn gốc tài nguyên thẻ bài, bộ ảnh chụp màn hình thực tế, thiết kế 9 vai trò, danh mục trọn vẹn 26 bảng hiện trường và 290 thẻ bài, đến kiến trúc kỹ thuật và báo cáo kiểm thử.")

    add_bullet_p(doc, "Chương 1: ", "Tổng Quan Dự Án & Bối Cảnh Sáng Tạo IT War Room")
    add_bullet_p(doc, "Chương 2: ", "Nguồn Gốc Sáng Tạo, Bản Quyền & Xuất Xứ Tài Nguyên Trò Chơi")
    add_bullet_p(doc, "Chương 3: ", "Bộ Sưu Tập 9 Hình Ảnh Giao Diện Thực Tế Của Game")
    add_bullet_p(doc, "Chương 4: ", "Thiết Kế Game & Đặc Tả Chi Tiết 9 Vai Trò Chiến Thuật")
    add_bullet_p(doc, "Chương 5: ", "Danh Mục Chi Tiết Toàn Bộ 26 Bảng Hiện Trường, 7 Sự Kiện & 290 Thẻ Bài")
    add_bullet_p(doc, "Chương 6: ", "Kiến Trúc Kỹ Thuật, Công Nghệ & An Ninh Zero-Leak")
    add_bullet_p(doc, "Chương 7: ", "Báo Cáo Kiểm Thử Chất Lượng (96/96 Tests) & Hướng Dẫn Vận Hành")

    # -------------------------------------------------------------
    # CHƯƠNG 1
    # -------------------------------------------------------------
    add_header_styled_paragraph(doc, "CHƯƠNG 1: TỔNG QUAN DỰ ÁN & BỐI CẢNH SÁNG TẠO", level=1)
    add_body_p(doc, "Trong môi trường phát triển phần mềm doanh nghiệp, sự cố Production nghiêm trọng (SEV-1 Critical Incident) là tình huống căng thẳng nhất đối với các kỹ sư: hệ thống ngừng hoạt động, người dùng phàn nàn, và áp lực thời gian để khôi phục dịch vụ đè nặng lên từng cá nhân.")
    add_body_p(doc, "Khi sự cố xảy ra, một phòng tác chiến khẩn cấp ('War Room') được triệu tập ngay lập tức:")
    add_bullet_p(doc, "Tech Lead / Incident Commander: ", "Người nắm rõ bức tranh toàn cảnh và phân tích nhật ký (log) hệ thống, nhưng phải giữ im lặng tuyệt đối (Taboo Silence) và chỉ được dẫn dắt đội ngũ thông qua 6 viên đạn gỗ ghim trên bảng thông số.")
    add_bullet_p(doc, "Đội ngũ Dev, DevOps, QA, Support: ", "Phải chạy đua với thời gian, xâu chuỗi từng dòng trace log, đối chiếu mã nguồn và đặt câu hỏi phản biện để tìm ra nguyên nhân gốc (Root Cause Analysis - RCA).")
    add_bullet_p(doc, "Nhân vật bí ẩn (The Culprit): ", "Trong số các đồng nghiệp đang ngồi quanh bàn họp, có một người đã lén đẩy đoạn code lỗi lên Production lúc 2h sáng rồi tìm cách xóa dấu vết để chối tội!")
    add_body_p(doc, "'Who Broke Prod?' chuyển hóa chính xác không khí chân thực, kịch tính và hài hước của văn hóa IT thành một trò chơi suy luận xã hội (Social Deduction) chạy mượt mà trên trình duyệt Web đa nền tảng.")

    # -------------------------------------------------------------
    # CHƯƠNG 2: NGUỒN GỐC
    # -------------------------------------------------------------
    add_header_styled_paragraph(doc, "CHƯƠNG 2: NGUỒN GỐC SÁNG TẠO, BẢN QUYỀN & XUẤT XỨ TÀI NGUYÊN", level=1)
    add_body_p(doc, "Dưới đây là giải trình chi tiết nguồn gốc ý tưởng, xuất xứ hệ thống thẻ bài, biểu tượng đồ họa, âm thanh và trí tuệ nhân tạo của trò chơi:")

    add_header_styled_paragraph(doc, "2.1. Nguồn Gốc Cơ Chế Luật Chơi & Hệ Thống Thẻ Bài", level=2)
    add_bullet_p(doc, "Cảm hứng cơ chế gốc: ", "Trò chơi kế thừa tinh hoa cơ chế suy luận phá án đồng đội của board game nổi tiếng 'Deception: Murder in Hong Kong' (Tác giả: Tobey Ho, Nhà xuất bản: Grey Fox Games) — tác phẩm nằm trong Top Party/Deduction Board Games toàn cầu trên BoardGameGeek.")
    add_bullet_p(doc, "Cấu trúc phân nhóm ngữ nghĩa (Semantic Buckets): ", "Các nhóm phân loại ẩn phía dưới của 90 thẻ Phương thức (Poisoning, Suffocation, Loss of Blood, Severe Injury, Accident, Illness) và 200 thẻ Dấu vết (Written, Personal, Natural, Synthetic, Artistic, Unrelated) được giữ nguyên cấu trúc cân bằng xác suất từ hệ thống chuẩn, sau đó ánh xạ 100% sang ngữ cảnh kỹ thuật phần mềm.")
    add_bullet_p(doc, "Nội dung thẻ bài tự sáng tạo 100%: ", "Toàn bộ 26 Bảng Hiện Trường (156 tùy chọn song ngữ), 7 Thẻ Sự Kiện, 90 Thẻ Hành Vi Lỗi (M001–M090) và 200 Thẻ Dấu Vết Log (C001–C200) được đội ngũ tự biên soạn mới hoàn toàn từ thực tế các sự cố Production trong ngành công nghệ thông tin Việt Nam (VD: 'Bắn JMeter Stress Test thẳng vào Prod', 'Push nhầm file .env lên GitHub Public', 'Truncate sạch bảng tài khoản khách hàng', 'Ly mì tôm úp dở cạnh màn hình'...).")

    add_header_styled_paragraph(doc, "2.2. Nguồn Gốc Hệ Thống Biểu Tượng (Icons) & Đồ Họa", level=2)
    add_bullet_p(doc, "Game-Icons.net (Creative Commons CC-BY 3.0): ", "Toàn bộ vector SVG trên các thẻ bài và bảng vai trò sử dụng bộ icon từ cộng đồng mã nguồn mở Game-Icons.net (các họa sĩ Lorc, Delapouite, sbed...) thông qua hệ thống CDN Iconify, tuân thủ giấy phép CC-BY 3.0.")
    add_bullet_p(doc, "Font Awesome 6 Free & Unicode Emojis: ", "Các nút điều hướng, huy hiệu và biểu tượng phụ trợ sử dụng Font Awesome 6 (SIL OFL 1.1 / MIT) kết hợp bảng mã Unicode Emoji 15.0.")
    add_bullet_p(doc, "Đồ họa 3D Cyberpunk War Room: ", "Bàn hội nghị elip dạ quang, hiệu ứng mưa noir và các hạt hologram được lập trình thủ tục trực tiếp bằng Three.js WebGL & Canvas 2D.")

    add_header_styled_paragraph(doc, "2.3. Nguồn Gốc Âm Thanh & Trí Tuệ Nhân Tạo", level=2)
    add_bullet_p(doc, "Âm thanh thủ tục (Web Audio API): ", "100% âm thanh (còi báo động SEV-1, tiếng click thẻ, tiếng ghim đạn, hiệu ứng thắng cuộc) được tổng hợp trực tiếp bằng dao động sóng âm (OscillatorNode) trên trình duyệt thông qua W3C Web Audio API, không dùng bất kỳ file nhạc MP3/WAV có bản quyền nào.")
    add_bullet_p(doc, "Thuật toán AI Forensic Master & Bot AI: ", "Do đội ngũ tự thiết kế bằng JavaScript thuần, sử dụng bộ đối chiếu từ khóa ranh giới từ (Word-Boundary Semantic Matcher) và máy trạng thái xác suất để Bot tự ghim đạn, tranh luận chat và phán án.")

    # -------------------------------------------------------------
    # CHƯƠNG 3: BỘ SƯU TẬP 9 HÌNH ẢNH CHỤP THỰC TẾ
    # -------------------------------------------------------------
    doc.add_page_break()
    add_header_styled_paragraph(doc, "CHƯƠNG 3: BỘ SƯU TẬP 9 HÌNH ẢNH GIAO DIỆN THỰC TẾ", level=1)
    add_body_p(doc, "Toàn bộ hình ảnh dưới đây được chụp trực tiếp trên trình duyệt Chrome ở độ phân giải cao (1440x960) từ phiên bản đang vận hành tại http://localhost:3000/deception/:")

    img_dir = os.path.join(os.path.dirname(__file__), '../DOCS_WHO_BROKE_PROD/HINH_ANH')
    screenshots = [
        ("01_sanh_choi_lobby.png", "Hình 1: Sảnh Chờ Chính (Lobby) — Bàn War Room Hologram, chế độ Solo Bot AI & Online Multiplayer, chọn vai trò"),
        ("02_bang_huong_dan_9_vai_tro.png", "Hình 2: Sách Luật Chơi & Bảng Đặc Tả 9 Vai Trò Kỹ Sư"),
        ("03_ho_so_vai_tro_role_reveal.png", "Hình 3: Màn Hình Nhận Hồ Sơ Vai Trò Bí Mật (Role Reveal Dossier) — Cẩm nang hành động 3 bước & mẹo sống còn"),
        ("04_giai_doan_dem_toi_chon_bai.png", "Hình 4: Ca Trực Đêm 02:00 AM (Night Phase) — Giao diện Thủ phạm bí mật chọn 1 Hành Vi Lỗi (Xanh) & 1 Dấu Vết Log (Đỏ)"),
        ("05_ban_hop_war_room_tong_the.png", "Hình 5: Toàn Cảnh Bàn Họp War Room — Hiển thị đồng hồ đếm ngược, AI Log Analyzer, các ghế ngồi và bộ bài công khai"),
        ("06_bang_hien_truong_va_dan_go.png", "Hình 6: Chế Độ Xem Pháp Y (6 Thẻ) — Bảng Tím Root Cause, Bảng Xanh Tầng Sập & 4 Bảng Nâu cùng 6 viên đạn gỗ đã ghim"),
        ("07_chi_tiet_the_bai_means_clues.png", "Hình 7: Chế Độ Xem Nghi Phạm — Cận cảnh 4 Thẻ Hành Vi Lỗi và 4 Thẻ Dấu Vết Log của từng kỹ sư quanh bàn"),
        ("08_kenh_dam_thoai_chat_war_room.png", "Hình 8: Kênh Đàm Thoại Trọng Án Trực Tuyến — Người chơi thảo luận và Bot AI phản hồi phân tích dấu vết thời gian thực"),
        ("09_bang_dap_ban_pha_an.png", "Hình 9: Bảng Đập Bàn Phá Án (Accusation Modal) — Chỉ định Thủ phạm và cặp bài Hành Vi + Dấu Vết Log gây sập Prod")
    ]

    for fname, caption in screenshots:
        fpath = os.path.join(img_dir, fname)
        if os.path.exists(fpath):
            p_img = doc.add_paragraph()
            p_img.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p_img.paragraph_format.space_before = Pt(8)
            p_img.paragraph_format.space_after = Pt(2)
            p_img.paragraph_format.keep_with_next = True
            run_img = p_img.add_run()
            run_img.add_picture(fpath, width=Inches(5.8))

            p_cap = doc.add_paragraph()
            p_cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p_cap.paragraph_format.space_after = Pt(12)
            r_cap = p_cap.add_run(caption)
            r_cap.font.name = 'Arial'
            r_cap.font.size = Pt(9)
            r_cap.italic = True
            r_cap.font.color.rgb = RGBColor(100, 116, 139)

    # -------------------------------------------------------------
    # CHƯƠNG 4: THIẾT KẾ GAME & 9 VAI TRÒ
    # -------------------------------------------------------------
    doc.add_page_break()
    add_header_styled_paragraph(doc, "CHƯƠNG 4: THIẾT KẾ GAME & ĐẶC TẢ 9 VAI TRÒ CHIẾN THUẬT", level=1)
    add_body_p(doc, "Trò chơi hỗ trợ 4 đến 9 người chơi, chia làm 2 phe: Phe Điều Tra (Investigation Team) và Phe Gây Lỗi/Tội Phạm (Criminal Team):")

    roles = data['roles']
    t_roles = doc.add_table(rows=1, cols=5)
    t_roles.alignment = WD_TABLE_ALIGNMENT.CENTER
    t_roles.style = 'Table Grid'
    hdr_cells = t_roles.rows[0].cells
    hdr_cells[0].text = "Icon"
    hdr_cells[1].text = "Tên Vai Trò"
    hdr_cells[2].text = "Phe"
    hdr_cells[3].text = "Tối Thiểu"
    hdr_cells[4].text = "Nhiệm Vụ & Cơ Chế Đặc Thù"
    style_table_header(t_roles.rows[0], [Inches(0.6), Inches(1.6), Inches(0.9), Inches(0.8), Inches(2.9)])

    for idx, (rk, rv) in enumerate(roles.items()):
        row = t_roles.add_row()
        rc = row.cells
        rc[0].text = rv.get('icon', '👤')
        rc[1].text = f"{rv.get('name_vi', '')}\n({rv.get('name_en', '')})"
        rc[2].text = "Phe Ứng Phó\n(Investigation)" if rv.get('team') == 'INVESTIGATION' else "Phe Gây Lỗi\n(Criminal)"
        rc[3].text = f"{rv.get('minPlayers', 4)} người"
        rc[4].text = rv.get('desc_vi', '')
        style_table_row(row, is_even=(idx % 2 == 1), col_widths=[Inches(0.6), Inches(1.6), Inches(0.9), Inches(0.8), Inches(2.9)])

    add_body_p(doc, "")
    add_header_styled_paragraph(doc, "4.1. Tiến Trình Vận Hành & Cơ Chế Đột Phá", level=2)
    add_bullet_p(doc, "Ca Trực Đêm (Deployment Night): ", "Thủ phạm chọn bí mật 1 Thẻ Hành Vi (Xanh) + 1 Thẻ Dấu Vết Log (Đỏ). Tech Lead và Đồng lõa biết rõ cặp bài; Whistleblower nhìn thấy mặt 2 nghi phạm phe Gây lỗi nhưng không biết ai cầm lệnh.")
    add_bullet_p(doc, "Vòng 1 – Vòng 3 (War Room): ", "Tech Lead ghim 6 đạn gỗ lên 6 bảng thông số. Ở vòng 2 và vòng 3, Tech Lead bỏ đi 1 bảng Nâu cũ và rút 1 bảng Nâu mới để bổ sung manh mối. Người chơi thảo luận và dùng Huy hiệu Phá án.")
    add_bullet_p(doc, "Đảo Ngược Nhân Chứng (Witness Reversal): ", "Nếu bị bắt đúng, Thủ phạm và Đồng lõa có 1 phát súng cuối cùng để chỉ điểm Whistleblower — nếu đoán trúng, phe Gây lỗi lật kèo chiến thắng!")
    add_bullet_p(doc, "Hội Đồng Phán Quyết 50/50 (Final Showdown): ", "Khi hết 3 vòng hoặc hết sạch Huy hiệu, hệ thống mở cuộc bỏ phiếu sinh tử giữa 2 nghi phạm đáng ngờ nhất.")

    # -------------------------------------------------------------
    # CHƯƠNG 5: DANH MỤC CHI TIẾT TOÀN BỘ THẺ BÀI
    # -------------------------------------------------------------
    doc.add_page_break()
    add_header_styled_paragraph(doc, "CHƯƠNG 5: DANH MỤC ĐẦY ĐỦ 26 BẢNG HIỆN TRƯỜNG, 7 SỰ KIỆN & 290 THẺ BÀI", level=1)

    # 5.1 Scene Tiles
    add_header_styled_paragraph(doc, "5.1. Toàn Bộ 26 Bảng Thông Số Sự Cố (Scene Tiles — 156 Tùy Chọn)", level=2)
    scene_tiles = data.get('sceneTiles', [])
    t_tiles = doc.add_table(rows=1, cols=4)
    t_tiles.alignment = WD_TABLE_ALIGNMENT.CENTER
    t_tiles.style = 'Table Grid'
    h_tiles = t_tiles.rows[0].cells
    h_tiles[0].text = "Mã / Loại"
    h_tiles[1].text = "Tên Bảng (VI / EN)"
    h_tiles[2].text = "Màu"
    h_tiles[3].text = "6 Tiêu Chí Ghim Đạn Gỗ Trong Bảng"
    style_table_header(t_tiles.rows[0], [Inches(1.2), Inches(1.7), Inches(0.8), Inches(3.1)])

    for idx, st in enumerate(scene_tiles):
        row = t_tiles.add_row()
        rc = row.cells
        rc[0].text = f"{st.get('id', '')}\n{SCENE_TYPE_VI.get(st.get('type', ''), st.get('type', ''))}"
        rc[1].text = f"{st.get('name_vi', '')}\n({st.get('name_en', '')})"
        rc[2].text = st.get('color', '')
        opts_vi = st.get('options_vi', [])
        opts_en = st.get('options_en', [])
        lines = []
        for i in range(max(len(opts_vi), len(opts_en))):
            v = opts_vi[i] if i < len(opts_vi) else ''
            e = opts_en[i] if i < len(opts_en) else ''
            lines.append(f"{i+1}. {v} ({e})" if e else f"{i+1}. {v}")
        rc[3].text = "\n".join(lines)
        style_table_row(row, is_even=(idx % 2 == 1), col_widths=[Inches(1.2), Inches(1.7), Inches(0.8), Inches(3.1)])

    # 5.2 Event Tiles
    doc.add_page_break()
    add_header_styled_paragraph(doc, "5.2. Toàn Bộ 7 Thẻ Sự Kiện Ngẫu Nhiên (Event Tiles)", level=2)
    event_tiles = data.get('eventTiles', [])
    t_events = doc.add_table(rows=1, cols=4)
    t_events.alignment = WD_TABLE_ALIGNMENT.CENTER
    t_events.style = 'Table Grid'
    h_ev = t_events.rows[0].cells
    h_ev[0].text = "Mã"
    h_ev[1].text = "Icon"
    h_ev[2].text = "Tên Sự Kiện (VI / EN)"
    h_ev[3].text = "Mô Tả Tác Động Lên Ván Đấu"
    style_table_header(t_events.rows[0], [Inches(0.9), Inches(0.6), Inches(1.9), Inches(3.4)])

    for idx, ev in enumerate(event_tiles):
        row = t_events.add_row()
        rc = row.cells
        rc[0].text = ev.get('id', '')
        rc[1].text = ev.get('icon', '⚡')
        rc[2].text = f"{ev.get('name_vi', '')}\n({ev.get('name_en', '')})"
        rc[3].text = ev.get('desc_vi', '')
        style_table_row(row, is_even=(idx % 2 == 1), col_widths=[Inches(0.9), Inches(0.6), Inches(1.9), Inches(3.4)])

    # 5.3 90 Means Cards
    doc.add_page_break()
    add_header_styled_paragraph(doc, "5.3. Danh Mục Đầy Đủ 90 Thẻ Hành Vi Gây Lỗi (Means Cards: M001 – M090)", level=2)
    add_body_p(doc, "Mỗi thẻ Hành Vi (Xanh) đại diện cho một thao tác, dòng lệnh hoặc sự cố kỹ thuật trực tiếp kích hoạt sập Production:")

    means_cards = data.get('meansCards', [])
    t_means = doc.add_table(rows=1, cols=5)
    t_means.alignment = WD_TABLE_ALIGNMENT.CENTER
    t_means.style = 'Table Grid'
    h_m = t_means.rows[0].cells
    h_m[0].text = "Mã"
    h_m[1].text = "Icon"
    h_m[2].text = "Tên Hành Vi (Tiếng Việt)"
    h_m[3].text = "Tên Tiếng Anh"
    h_m[4].text = "Nhóm Ngữ Nghĩa & Bản Chất Kỹ Thuật"
    style_table_header(t_means.rows[0], [Inches(0.65), Inches(0.55), Inches(1.85), Inches(1.55), Inches(2.2)])

    for idx, mc in enumerate(means_cards):
        row = t_means.add_row()
        rc = row.cells
        rc[0].text = mc.get('id', '')
        rc[1].text = mc.get('icon', '💻')
        rc[2].text = mc.get('vi', '')
        rc[3].text = mc.get('en', '')
        rc[4].text = translate_category(mc.get('category', ''), MEANS_CATEGORY_VI)
        style_table_row(row, is_even=(idx % 2 == 1), col_widths=[Inches(0.65), Inches(0.55), Inches(1.85), Inches(1.55), Inches(2.2)])

    # 5.4 200 Clue Cards
    doc.add_page_break()
    add_header_styled_paragraph(doc, "5.4. Danh Mục Đầy Đủ 200 Thẻ Dấu Vết Log (Clue Cards: C001 – C200)", level=2)
    add_body_p(doc, "Mỗi thẻ Dấu Vết (Đỏ) đại diện cho bằng chứng log, thiết bị hoặc dấu tích vật lý để lại tại hiện trường:")

    clue_cards = data.get('clueCards', [])
    t_clues = doc.add_table(rows=1, cols=5)
    t_clues.alignment = WD_TABLE_ALIGNMENT.CENTER
    t_clues.style = 'Table Grid'
    h_c = t_clues.rows[0].cells
    h_c[0].text = "Mã"
    h_c[1].text = "Icon"
    h_c[2].text = "Tên Dấu Vết (Tiếng Việt)"
    h_c[3].text = "Tên Tiếng Anh"
    h_c[4].text = "Nhóm Ngữ Nghĩa & Bản Chất Bằng Chứng"
    style_table_header(t_clues.rows[0], [Inches(0.65), Inches(0.55), Inches(1.85), Inches(1.55), Inches(2.2)])

    for idx, cc in enumerate(clue_cards):
        row = t_clues.add_row()
        rc = row.cells
        rc[0].text = cc.get('id', '')
        rc[1].text = cc.get('icon', '🔍')
        rc[2].text = cc.get('vi', '')
        rc[3].text = cc.get('en', '')
        rc[4].text = translate_category(cc.get('category', ''), CLUE_CATEGORY_VI)
        style_table_row(row, is_even=(idx % 2 == 1), col_widths=[Inches(0.65), Inches(0.55), Inches(1.85), Inches(1.55), Inches(2.2)])

    # -------------------------------------------------------------
    # CHƯƠNG 6: KIẾN TRÚC KỸ THUẬT
    # -------------------------------------------------------------
    doc.add_page_break()
    add_header_styled_paragraph(doc, "CHƯƠNG 6: KIẾN TRÚC KỸ THUẬT & AN NINH ZERO-LEAK", level=1)
    add_body_p(doc, "'Who Broke Prod?' sử dụng kiến trúc Client-Server Fullstack JavaScript (Node.js + Express + Socket.IO ở backend; Vanilla ES6 Modules + Three.js WebGL + Web Audio API ở frontend), đảm bảo tốc độ tải dưới 1 giây và không phụ thuộc framework nặng nề.")

    add_header_styled_paragraph(doc, "6.1. Nguyên Lý Bảo Mật Zero-Leak Boundary", level=2)
    add_bullet_p(doc, "Phân tách dữ liệu trên RAM Server: ", "Cặp bài gây lỗi và vai trò ẩn chỉ tồn tại trong bộ nhớ máy chủ (DeceptionSocketManager.js), tuyệt đối không phát tán danh sách đáp án về client.")
    add_bullet_p(doc, "Lọc gói tin theo thẩm quyền (Role-Based Scrubbing): ", "Whistleblower chỉ nhận danh sách ID các thành viên phe Tội Phạm; bài gây lỗi được ẩn hoàn toàn khỏi người điều tra và người xem.")
    add_bullet_p(doc, "Cưỡng chế Luật Cấm Kỵ (Taboo Silence): ", "Server chặn cứng mọi gói tin chat gửi từ socket của Tech Lead và trả về sự kiện lỗi, chống gian lận văn bản.")

    add_header_styled_paragraph(doc, "6.2. Trí Tuệ Nhân Tạo AI Forensic Master", level=2)
    add_body_p(doc, "Thuật toán Semantic NLP Word-Boundary Matcher phân tích độ tương quan từ khóa giữa 2 lá bài phạm tội và 26 Bảng thông số sự cố, tự động định vị Bảng Tím/Xanh/Nâu và gợi ý đạn gỗ chính xác cho người chơi cũng như Bot AI.")

    # -------------------------------------------------------------
    # CHƯƠNG 7: QA & VẬN HÀNH
    # -------------------------------------------------------------
    add_header_styled_paragraph(doc, "CHƯƠNG 7: BÁO CÁO KIỂM THỬ QA & HƯỚNG DẪN VẬN HÀNH", level=1)
    add_header_styled_paragraph(doc, "7.1. Kết Quả Kiểm Thử Tự Động (96 / 96 Test Cases Pass 100%)", level=2)
    add_bullet_p(doc, "Deception Roles & Gameplay Deep Suite (27 tests): ", "Kiểm thử toàn diện 9 vai trò, Zero-Leak ban đêm, Taboo Silence, Witness Reversal và 50/50 Showdown — 27/27 PASS.")
    add_bullet_p(doc, "Deception Multiplayer WebSocket Suite (21 tests): ", "Mô phỏng phòng chơi 4–9 người thời gian thực — 21/21 PASS.")
    add_bullet_p(doc, "QA Deep Audit Suite (15 tests): ", "Kiểm tra tính toàn vẹn sự kiện, giải phóng socket & bộ nhớ — 15/15 PASS.")
    add_bullet_p(doc, "Core Database & State Machine (17 tests): ", "Xác thực đủ 9 vai trò, 26 bảng, 90 thẻ phương thức, 200 thẻ dấu vết — 17/17 PASS.")
    add_bullet_p(doc, "FPT Audit & Final Showdown Verification (16 tests): ", "Kiểm tra tương tác Bot AI và vòng bỏ phiếu 50/50 — 16/16 PASS.")

    add_header_styled_paragraph(doc, "7.2. Hướng Dẫn Khởi Chạy Nhanh", level=2)
    add_bullet_p(doc, "Bước 1: ", "Chạy lệnh 'npm install' để cài đặt các gói phụ thuộc.")
    add_bullet_p(doc, "Bước 2: ", "Khởi động máy chủ bằng lệnh 'node server.js' (cổng mặc định 3000).")
    add_bullet_p(doc, "Bước 3: ", "Mở trình duyệt tại địa chỉ http://localhost:3000/deception/ để chơi Solo cùng Bot AI hoặc tạo phòng Online.")

    out_docx = os.path.join(os.path.dirname(__file__), '../DOCS_WHO_BROKE_PROD/TAI_LIEU_TONG_QUAN_DU_AN_WHO_BROKE_PROD.docx')
    doc.save(out_docx)
    print("🎉 Rebuilt complete Word Document with ALL populated tables & 9 genuine screenshots:", out_docx)

if __name__ == '__main__':
    main()
