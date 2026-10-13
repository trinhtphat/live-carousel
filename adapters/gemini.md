# Adapter: Gemini / Google AI Studio

## Nạp skill

1. Mở Run settings trong Google AI Studio và dán phần thân `SKILL.md` vào **System Instructions**.
2. Với motion mode, đưa `references/house-style.md`, `slide-recipes.md`, `engine-api.md`, `sound-design.md` vào context khi cần. Với photo mode, ưu tiên `photo-mode.md` và `render-qa.md`; thêm ảnh slide theo thứ tự.
   Nếu dùng Premium Motion Video, đưa thêm `premium-motion-video/SKILL.md` và reference liên quan vào context; giữ tỷ lệ đã duyệt, từng slide và vòng lặp của Live Carousel làm ràng buộc đầu ra. Template đi kèm hiện chỉ được xác minh ở 4:5.
   Nếu không có ảnh và muốn tham khảo thư viện phong cách, nạp thêm `gpt-image-2-style-library/SKILL.md` và phần style reference liên quan; cần công cụ tạo ảnh riêng để xuất file.
3. Với context dài, giữ tài liệu nguồn thành các phần có tên file rõ ràng. Đặt brief, yêu cầu cụ thể và tiêu chí đầu ra ở cuối phần context. Yêu cầu model nêu file nào nó đã sử dụng.

## Prompt mẫu

```text
Áp dụng Live Carousel Core Logic. Idea của tôi là [idea].
Hãy đề xuất 5–10 chủ đề carousel khác nhau và đợi tôi chọn.
Sau đó hỏi tỷ lệ video, tone màu và ngôn ngữ, rồi đưa brief để duyệt.
Chỉ sản xuất sau khi brief được duyệt; nếu thiếu runtime render,
ghi rõ đầu ra là bản thiết kế chưa xuất MP4.
```

Google AI Studio dạng chat không tự biến Instructions thành quyền truy cập filesystem hoặc các công cụ render. Với Gemini API hoặc một agent có shell, gắn cùng thư mục skill và thực hiện workflow trong `SKILL.md` ở runtime đó.
