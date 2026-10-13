# Adapter: Claude Code / CLI

Giữ cách dùng cũ: chép nguyên `live-carousel/` vào `~/.claude/skills/live-carousel/` (Windows: `%USERPROFILE%\.claude\skills\live-carousel`). Bắt đầu phiên Claude Code mới để môi trường đọc skill, rồi yêu cầu:

```text
Use live-carousel for my idea: [idea]. First suggest 5–10 distinct
carousel topics and wait for my choice. Then confirm aspect ratio,
palette, and on-video language in a brief. Produce and render only
after I approve that brief; inspect contact sheet, seams, and audio.
```

`INSTALL-PROMPT.md` được giữ làm hướng dẫn cài tự động cho Claude Code. Nó là adapter lịch sử, không phải Core Logic. Đọc và rà lại các đường dẫn, lệnh cài và quyền hệ thống trước khi chạy. Cài toolchain qua `bash scripts/setup.sh`; trên Windows cần Bash-capable shell. Nếu CLI không có quyền shell/network, thực hiện phần thiết kế và báo cáo giới hạn như `SKILL.md` quy định.

Nếu `premium-motion-video` cũng được cài cho Claude Code, yêu cầu dùng cả hai skill. Đọc `renderers/premium-motion-video.md` và cấu hình `PREMIUM_MOTION_TOOLKIT` trước khi chọn `--renderer premium`.

Nếu user không có ảnh và `gpt-image-2-style-library` có sẵn trong phiên, đọc nó sau khi brief được duyệt để đề xuất phong cách và prompt tạo ảnh. Việc tạo file ảnh cần một công cụ tạo ảnh riêng.
