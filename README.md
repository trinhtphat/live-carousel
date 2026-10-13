# Live Carousel — Universal AI Skill

Tạo carousel mà mỗi slide là một video có chuyển động, âm thanh và vòng lặp liền mạch. Hai cách làm: thiết kế mới từ chủ đề (**motion**) hoặc làm chuyển động các ảnh slide có sẵn (**photo**). Template đi kèm hiện được xác minh ở 1080 × 1350 (4:5).

## Xem demo

https://github.com/user-attachments/assets/2ae5f935-f42b-4e05-8f8c-081a410d37d3

Bấm **Play** để xem video ngay trong README. [Mở MP4 trực tiếp](media/demo-carousel.mp4) · [Xem poster tĩnh](media/demo-poster.jpg)

Video 12 giây ở trên được cắt từ **bốn slide MP4 đã render** của carousel “Edit từ số 0”, với CTA “comment để nhận bộ kit auto”. Demo minh họa luồng không có ảnh nguồn: chọn hướng từ `gpt-image-2-style-library`, tạo asset minh họa, dựng chuyển động bằng Premium Motion Video và kiểm tra contact sheet, seam, audio. CTA là nội dung minh họa; repo không kèm hệ thống tự gửi kit qua bình luận.

`SKILL.md` chứa **Core Logic**: Role → Context → Rules → Workflow → Output Format. `adapters/` hướng dẫn nạp skill theo nền tảng. Skill này nay kết nối được với **Premium Motion Video** của bạn: dùng thẩm mỹ/chuyển động theo brand và toolkit Premium để render từng slide, tạo contact sheet, kiểm tra pop; giữ quy tắc carousel và ảnh gốc. Toolkit Premium là dependency riêng, được chỉ bằng `PREMIUM_MOTION_TOOLKIT`, không đóng gói trong ZIP này. Backend HyperFrames cũ vẫn dùng được. Xuất MP4 cần quyền đọc file và chạy lệnh; chat chỉ có văn bản chỉ soạn được brief/storyboard/copy.

## Luồng duyệt từ một idea

1. **Chọn chủ đề:** Từ một idea rộng, GPT đề xuất 5–10 chủ đề khác nhau. Mỗi chủ đề có thể trở thành **một carousel riêng**. User chọn, kết hợp hoặc yêu cầu sửa danh sách.
2. **Chốt brief:** Với chủ đề đã chọn, GPT hỏi tỷ lệ 9:16 / 4:5 / 16:9, đề xuất tone màu nếu chưa có màu thương hiệu, hỏi ngôn ngữ hiển thị tiếng Việt / tiếng Anh, rồi tóm tắt slide arc và CTA để user duyệt.
3. **Nguồn ảnh:** Nếu user chưa có ảnh, đề xuất 2–3 hướng hình ảnh. Có thể dùng `gpt-image-2-style-library` khi môi trường đã cài để chọn template và soạn prompt; thư viện này không tự tạo ảnh. Nếu không có công cụ tạo ảnh, bàn giao prompt hoặc dùng đồ họa HTML phù hợp.
4. **Sản xuất:** Chỉ sau khi brief được duyệt mới làm storyboard, tạo/tìm ảnh, dựng và render. Nếu user đã cung cấp lựa chọn nào, không hỏi lại lựa chọn đó.

Hiện template và kiểm tra render đi kèm mới được xác minh cho **4:5 (1080 × 1350)**. Lựa chọn 9:16 hoặc 16:9 cần được triển khai và kiểm tra kích thước, crop, safe area và MP4 trước khi cam kết xuất file. Cobalt chỉ là theme dự phòng khi user không chọn màu nào trong brief.

## Compatibility Matrix

| Môi trường | Nạp hướng dẫn | Đọc file dự án / chạy render | Kết quả khả dụng |
| --- | --- | --- | --- |
| ChatGPT / Custom GPTs | `SKILL.md` vào Instructions; `references/*.md` vào Knowledge khi cần | Chỉ khi phiên có công cụ file và shell phù hợp | Brief/storyboard; MP4 nếu có runtime |
| OpenAI Codex | Giữ cả thư mục skill với `SKILL.md`; xem `adapters/codex-cursor.md` | Có thể, tùy quyền workspace và toolchain | Quy trình đầy đủ khi runtime sẵn sàng |
| Cursor Rules | `.cursor/rules/live-carousel.mdc` tham chiếu thư mục skill; `.cursorrules` là lựa chọn cũ | Có thể, tùy terminal và quyền dự án | Quy trình đầy đủ khi runtime sẵn sàng |
| Gemini / Google AI Studio | Dán lõi vào System Instructions; nạp references có chọn lọc vào context | AI Studio dạng chat cần runtime ngoài để render | Brief/storyboard; MP4 qua runtime ngoài |
| Claude Code / CLI | Giữ thư mục tại `~/.claude/skills/live-carousel/` | Có thể, tùy quyền CLI và toolchain | Quy trình đầy đủ khi runtime sẵn sàng |

Các adapter chi tiết: [ChatGPT](adapters/chatgpt.md) · [Codex/Cursor](adapters/codex-cursor.md) · [Gemini](adapters/gemini.md) · [Claude Code](adapters/claude-code.md).

Hướng dẫn nối [Premium Motion Video](renderers/premium-motion-video.md) mô tả hợp đồng `window.seek(t)`, biến môi trường, lệnh chạy và tiêu chí QA.

## Copy-paste trong 1 phút

**ChatGPT / Custom GPTs:** Dán phần nội dung từ `# Live Carousel — Core Logic` đến hết `SKILL.md` vào **Instructions**. Đưa các file `references/*.md` cần dùng vào **Knowledge**. Gửi: “Ý tưởng carousel của tôi là [idea]. Hãy đề xuất 5–10 chủ đề để tôi chọn trước.”

**Codex:** Mở thư mục này trong workspace hoặc chép nguyên thư mục `live-carousel` vào vị trí skills được Codex nhận diện. Gửi: “Dùng skill live-carousel. Idea của tôi là [idea]; hãy đề xuất chủ đề trước khi sản xuất.”

**Cursor:** Tạo `.cursor/rules/live-carousel.mdc` theo mẫu trong `adapters/codex-cursor.md`, giữ nguyên thư mục skill trong dự án, rồi gửi: “Dùng quy trình live-carousel cho idea [idea]; đề xuất chủ đề để tôi chọn.”

**Gemini / AI Studio:** Dán nội dung `SKILL.md` vào **System Instructions**. Đính kèm chỉ các references liên quan, đặt brief và câu hỏi cụ thể sau phần tài liệu dài. Yêu cầu storyboard hoặc mã nguồn; dùng runtime ngoài để render.

**Claude Code:** Chép nguyên thư mục vào `~/.claude/skills/live-carousel/`. Có thể dùng hướng dẫn cũ tại `INSTALL-PROMPT.md`. Gửi: “Use live-carousel to animate [topic/images].”

## Chạy local

1. Cài Node.js 22+, Python 3.9+, ffmpeg/ffprobe. Với backend Premium, cài toolkit và Playwright theo hướng dẫn của Premium Motion Video. Với backend HyperFrames, lần đầu cần tải CLI và trình duyệt render. Template gốc tham chiếu GSAP qua CDN; cầu nối Premium có đồng hồ local cho các template hiện tại khi CDN không khả dụng.
2. Nếu dùng HyperFrames, trên macOS/Linux hoặc Bash-capable shell chạy `bash scripts/setup.sh`. Nếu dùng Premium, làm theo [hướng dẫn toolkit](renderers/premium-motion-video.md); không cần setup HyperFrames.
3. Tạo dự án: `scripts/py scripts/new_carousel.py ./live-carousels/demo` trong shell POSIX, hoặc gọi `scripts/new_carousel.py` bằng Python đã chuẩn bị.
4. Render với Premium: cấu hình `PREMIUM_MOTION_TOOLKIT`, rồi chạy `scripts/py scripts/render_all.py ./live-carousels/demo --renderer premium`. Xem `renders/premium-sheet-*.jpg`, `renders/contact-sheet.jpg`, `renders/seams/`, các MP4 và `preview.html`. Muốn dùng backend cũ, chọn `--renderer hyperframes`.

Trên Windows PowerShell thuần, `setup.sh` và `scripts/py` không chạy trực tiếp; dùng Git Bash/WSL hoặc Python tương đương cùng các dependency. Xem adapter tương ứng. Việc cài công cụ hệ thống và xuất video vẫn tùy quyền trên máy.

## Cấu trúc

```text
SKILL.md             Core Logic trung lập
adapters/            Cách nạp cho ChatGPT, Codex/Cursor, Gemini, Claude Code
renderers/           Cầu nối sang Premium Motion Video
references/          House style, nguồn ảnh, slide recipes, engine, sound, photo, QA
scripts/             Setup, scaffold, render
templates/           Motion/photo source, engine, fonts, audio
INSTALL-PROMPT.md    Hướng dẫn cài Claude Code cũ
LICENSES.md          Giấy phép thành phần bên thứ ba
```

Các font đi kèm dùng SIL Open Font License. Xem `LICENSES.md`. Các tuyên bố về khả năng đăng tải lên mạng xã hội cần kiểm tra lại theo giới hạn hiện hành của nền tảng.

## Tài liệu nền tảng

- [OpenAI: tạo và sửa Custom GPT](https://help.openai.com/en/articles/8770868-gpt-builder%3F.class) — phân biệt Instructions và Knowledge.
- [OpenAI: Agent Skills](https://developers.openai.com/api/docs/guides/tools-skills) — cấu trúc thư mục `SKILL.md` và tài nguyên đi kèm.
- [Cursor: Project Rules](https://docs.cursor.com/context/rules) — `.cursor/rules/*.mdc` và trạng thái legacy của `.cursorrules`.
- [Google AI Studio quickstart](https://ai.google.dev/gemini-api/docs/ai-studio-quickstart) và [hướng dẫn context dài](https://ai.google.dev/gemini-api/docs/long-context) — System Instructions và cách sắp xếp tài liệu.

