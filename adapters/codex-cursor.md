# Adapter: OpenAI Codex / Cursor Rules

## OpenAI Codex

Giữ nguyên thư mục `live-carousel/` với `SKILL.md`, `references/`, `scripts/` và `templates/` trong workspace hoặc vị trí skill mà bản Codex của bạn nhận diện (ví dụ `.codex/skills/live-carousel/` cho một repo). Khi skill `premium-motion-video` cũng được cài, yêu cầu Codex đọc cả hai và dùng `renderers/premium-motion-video.md` để nối toolkit. Chỉ chạy setup và render khi có quyền shell, file và network tương ứng. Không sao chép logic vào một system prompt khác để tránh hai bản lệch nhau.

Nếu chưa có ảnh nguồn và `gpt-image-2-style-library` được cài, đọc skill đó sau khi brief được duyệt để đề xuất style và soạn prompt ảnh. Công cụ tạo ảnh là dependency riêng.

Prompt:

```text
Dùng live-carousel cùng skill premium-motion-video cho idea [idea].
Trước tiên đề xuất 5–10 chủ đề để tôi chọn. Tiếp theo hỏi tỷ lệ,
tone màu, ngôn ngữ và đưa brief để tôi duyệt. Chỉ sau khi brief được
duyệt mới tạo dự án tại [đường dẫn], render nếu định dạng được hỗ trợ,
kiểm tra contact sheet, seams, audio và báo cáo file thực tế.
```

## Cursor Project Rules

Đặt thư mục skill trong dự án. Tạo file `.cursor/rules/live-carousel.mdc`:

```mdc
---
description: Apply the live-carousel workflow when making looping video carousels or animating existing slide images.
alwaysApply: false
---

When the user requests an animated carousel, read live-carousel/SKILL.md.
Read only the relevant references it names. Use the local scripts and
templates when terminal access and dependencies are available. Follow
the topic-selection and production-brief approval gates before authoring.
Report which outputs were actually rendered and verified.
```

Điều chỉnh đường dẫn `live-carousel/SKILL.md` theo vị trí trong repo. Nếu cần quy tắc luôn hiện diện, dùng `alwaysApply: true` nhưng điều đó tăng context cho mọi tác vụ. `.cursorrules` ở gốc dự án vẫn là định dạng cũ; nếu phải dùng, dán nội dung rule trên vào file đó, bỏ frontmatter.

## Windows

`scripts/setup.sh` và `scripts/py` là shell script POSIX. Dùng Git Bash/WSL; hoặc cài các dependency tương đương và gọi Python trực tiếp, ví dụ `py -3 scripts/new_carousel.py ...` rồi `py -3 scripts/render_all.py ...`. Cần đảm bảo `numpy`, `cv2`, `npx`, `ffmpeg`, `ffprobe` và browser của HyperFrames hoạt động trong cùng môi trường.
