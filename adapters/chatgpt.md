# Adapter: ChatGPT / Custom GPTs

## Nạp skill

1. Trong GPT builder, đặt phần thân `SKILL.md` (từ `# Live Carousel — Core Logic`) vào **Instructions**. Nếu giới hạn ô nhập không đủ, giữ Role, Context, Rules, Workflow, Output Format và chuyển phần chi tiết tham chiếu sang Knowledge.
2. Tải các file `references/*.md` cần cho mode dự định vào **Knowledge**. Instructions quy định hành vi; Knowledge là tài liệu tham khảo. Không cần tải các file font hay mã render vào Knowledge nếu phiên chỉ lập kế hoạch.
   Nếu muốn áp dụng thẩm mỹ của Premium Motion Video, tải thêm `premium-motion-video/SKILL.md` và các reference liên quan vào Knowledge, rồi yêu cầu GPT dùng nó theo hợp đồng carousel trong `SKILL.md`.
   Nếu user không có ảnh và muốn dùng thư viện phong cách, đưa thêm `gpt-image-2-style-library/SKILL.md` cùng reference phong cách liên quan vào Knowledge. Thư viện giúp chọn style và viết prompt; cần công cụ tạo ảnh riêng để xuất ảnh.
3. Khi dùng ChatGPT thông thường, dán `SKILL.md` vào đầu chat và đính kèm brief/ảnh. Yêu cầu model xác nhận nó có quyền đọc/ghi file và chạy shell hay không trước khi hứa xuất video.

## Prompt mẫu

```text
Áp dụng Live Carousel Core Logic cho idea "[idea]".
Trước tiên, đề xuất 5–10 chủ đề carousel khác nhau để tôi chọn.
Sau khi tôi chọn, hỏi tỷ lệ video, tone màu và ngôn ngữ đầu ra;
đưa brief để tôi duyệt. Chỉ sau khi tôi duyệt mới làm storyboard,
tài sản hình ảnh và render nếu môi trường hỗ trợ. Ghi rõ đầu ra nào
đã thực sự được render.
```

## Điều kiện thực thi

Một Custom GPT có Instructions/Knowledge không mặc nhiên có môi trường chạy local với Node, ffmpeg, Python hoặc quyền ghi vào máy người dùng. Dùng một runtime có các quyền đó để chạy `scripts/`. Không đưa API key hay dữ liệu riêng vào prompt công khai.
