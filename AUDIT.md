# Audit gói gốc `live-carousel-skill.zip`

## Phạm vi

Đã kiểm kê 45 file trong ZIP: README, `SKILL.md`, install prompt, requirements, sáu reference, script Python/shell, JSON, CSS/HTML/JS template, font nhị phân và giấy phép font. File font được kiểm tra theo tên/giấy phép; chúng là asset, không phải prompt. Bản gốc không bị sửa.

## Điểm khóa vào Claude Code

| Mức độ | Vị trí gốc | Phát hiện | Xử lý |
| --- | --- | --- | --- |
| Cao | `README.md` | Tên, mô tả, đường cài và cách dùng chỉ nhắc Claude Code; câu “All you need is Claude Code” | Viết lại README, ma trận tương thích và quickstart từng nền tảng |
| Cao | `INSTALL-PROMPT.md` | Yêu cầu cài vào `~/.claude/skills/`, khởi động lại Claude Code | Giữ làm adapter Claude lịch sử; không dùng làm entrypoint chung |
| Trung bình | `SKILL.md` | Quy trình trộn thiết kế, setup shell, render và bàn giao; giả định agent có quyền thực thi local | Tách Core Logic và điều kiện có/không có runtime, adapter nạp riêng |
| Trung bình | `scripts/setup.sh`, `scripts/py` | Bash/POSIX, không chạy trực tiếp trong PowerShell; tự kiểm tra và tải dependency | Ghi rõ runtime, cách dùng Git Bash/WSL hoặc Python tương đương |
| Thấp | `scripts/setup.sh`, `templates/common/audio/lc_audio.py` | Dò SFX pack ở đường `~/.claude/skills/media-use/` và các vị trí khác | Đây là tùy chọn; fallback âm thanh tổng hợp vẫn chạy |
| Không phải AI vendor lock-in | `references/engine-api.md`, `templates/`, `scripts/render_all.py` | Dùng HyperFrames/GSAP/`npx` và CDN | Giữ vì là engine render, tách khỏi hướng dẫn nạp skill |

Không thấy thẻ prompt `<invoke>`, `<thinking>`, slash-command bắt buộc, hay lời gọi Anthropic API trong gói gốc. Thẻ HTML và thuộc tính `data-*` là cấu trúc composition cho renderer, không phải cú pháp điều khiển Claude. `/cmd` trong ví dụ yêu cầu là kiểu rủi ro cần tìm, không phải phát hiện trong gói này.

## Giới hạn còn lại

- Tương thích đa mô hình ở **lớp chỉ dẫn và quy trình**. Render phụ thuộc local toolchain và quyền chạy lệnh.
- GSAP tải từ jsDelivr khi render; `npx`/browser và tùy chọn remove-background có thể cần tải lần đầu. Vì vậy không thể đảm bảo chạy offline hoàn toàn.
- `INSTALL-PROMPT.md` giữ nguyên để người dùng Claude Code còn dùng được. Nó không được nạp như Core Logic ở các nền tảng khác.
- Engine HyperFrames gốc vẫn được giữ. Lần tích hợp tiếp theo thêm cầu nối `window.seek(t)` trong `templates/common/build.py` và tùy chọn `--renderer premium` trong `scripts/render_all.py`; toolkit Premium vẫn là dependency bên ngoài.

## Kiểm thử kết nối Premium Motion Video

Trên máy Windows của chủ sở hữu, đã dựng dự án mẫu motion, tạo contact sheet bằng toolkit Premium và render slide `01-hook` ở 1080 × 1350, 60 fps, 6 giây, có audio. Đã tạo `preview.html`, contact sheet và seam strip. Hai cảnh báo pop-check tại 2.500 s và 2.567 s trùng flash có chủ ý của template; seam nhìn liên tục khi kiểm tra ảnh. `HyperFrames check` qua `npx` không hoàn thành trong phiên thử do npm registry bị từ chối truy cập; backend Premium hiện dùng contact sheet của toolkit và không phụ thuộc bước check này.
