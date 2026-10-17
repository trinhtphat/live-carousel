# Quy trình Live Carousel có duyệt của người dùng

Áp dụng cho bốn chế độ **Motion, Photo, World 2D, World 3D**. Quy trình này tạo các slide video lặp, có animation và âm thanh. Bản 4:5, 1080 × 1350 là cấu hình đã có sẵn; tỷ lệ khác cần điều chỉnh bố cục, vùng an toàn và kiểm tra render trước khi nhận là đã hỗ trợ.

## Luồng tổng thể

1. **Nghiên cứu và hỏi để tìm ý tưởng.** Dùng skill `brainstorming` để hỏi từng câu quan trọng về mục tiêu, người xem, chất liệu sẵn có và kết quả mong muốn. Kiểm tra nguồn cho các khẳng định thực tế. Với ý tưởng còn rộng, đề xuất **5–10 chủ đề đánh số**, mỗi chủ đề có một góc triển khai ngắn; chờ người dùng chọn số. Nếu chủ đề đã được chọn thì giữ nguyên.
2. **Kiểm kê hình ảnh, rồi chọn chế độ.** Hỏi người dùng có ảnh, logo, tài sản thương hiệu hay slide hoàn chỉnh chưa. Xem ảnh và thứ tự nếu đã có. Sau đó đề xuất chế độ sản xuất phù hợp; để người dùng chọn khi có nhiều chế độ hợp lý.
3. **Duyệt production brief.** Trình bày tỷ lệ, ngôn ngữ trên video, bộ nhận diện, chế độ, số lượng/thứ tự slide với **cover/hook ở đầu**, thời lượng, caption/CTA, nguồn hình và định hướng âm thanh. Ghi bản đã duyệt vào `BRIEF.md`.
4. **Duyệt storyboard và kế hoạch hình ảnh riêng.** Trình bày copy, bố cục, chuyển động, chuyển cảnh, nguồn ảnh, visual trigger, SFX dự kiến và BGM cho **từng slide**. Ghi vào `STORYBOARD.md` và `ASSET_PLAN.md`; chờ một lần duyệt riêng sau production brief.
5. **Duyệt một ảnh mẫu nếu cần tạo ảnh.** Đọc `gpt-image-2-style-library` và mẫu phong cách phù hợp khi skill có sẵn. Chỉ đề xuất thêm hướng hình ảnh nếu còn lựa chọn chưa rõ. Dùng công cụ tạo ảnh để làm **một ảnh đại diện**, cho người dùng xem kết quả thật và chờ duyệt rồi mới tạo cả bộ. Tiêu đề, nhãn infographic và CTA giữ dưới dạng chữ có thể sửa, nằm ngoài ảnh tạo bởi AI.
6. **Dựng và duyệt một cover hoàn chỉnh.** Cover phải có hình, animation, ít nhất một SFX hợp lệ từ thư viện gắn với visual trigger và BGM thấp hơn SFX. Render **một MP4 có tiếng** vào thư mục nháp riêng, kiểm tra rồi đưa người dùng xem. Nếu bị từ chối, sửa phần bị ảnh hưởng và duyệt lại cover.
7. **Hoàn thiện và bàn giao.** Sau khi cover được duyệt, dựng các slide còn lại, render MP4 cuối, kiểm tra hình/âm thanh/điểm lặp và bàn giao file theo thứ tự cùng caption, CTA, kết quả kiểm tra.

## Các điểm Human review

| Điểm dừng | Người dùng được xem | Điều kiện đi tiếp |
| --- | --- | --- |
| Chọn chủ đề | 5–10 chủ đề đánh số khi ý tưởng còn rộng | Chọn một số hoặc sửa yêu cầu |
| Chọn chế độ | Kiểm kê ảnh hiện có và đề xuất Motion/Photo/World | Chốt chế độ nếu còn nhiều lựa chọn |
| Production brief | `BRIEF.md` với cover/hook, slide arc, hình và âm thanh | Duyệt brief |
| Storyboard + image plan | `STORYBOARD.md` và `ASSET_PLAN.md` cho từng slide | Duyệt riêng hai kế hoạch |
| Ảnh mẫu, nếu tạo ảnh | Một ảnh thực tế và prompt/phong cách đi kèm | Duyệt ảnh mẫu trước khi tạo cả bộ |
| Cover/hook | Một MP4 hoàn chỉnh với animation, SFX và BGM | Duyệt cover trước khi render cuối |

Các quyết định đã duyệt được ghi vào tài liệu dự án để tiếp tục công việc mà không hỏi lại. Sự đồng ý rõ ràng trong hội thoại là căn cứ duyệt; việc có file hoặc chạy kiểm tra kỹ thuật không thay thế sự duyệt của người dùng. Khi thiếu dữ kiện quan trọng, hỏi người dùng thay vì tự đặt ra nội dung, tài sản hay quyết định.

## Hình ảnh và quyền sử dụng

- Ưu tiên hình người dùng đã cung cấp và giữ đúng thứ tự slide hoàn chỉnh. Ghi nguồn và trạng thái quyền sử dụng vào `ASSET_PLAN.md`.
- Nếu HTML/vector đủ thể hiện câu chuyện, có thể dùng đồ họa dựng trực tiếp theo kế hoạch đã duyệt. Nếu cần ảnh tạo mới, dùng style library để soạn prompt; **style library không tự render ảnh**.
- Nếu không có công cụ tạo ảnh, bàn giao prompt hoặc hướng dựng HTML/vector có ghi rõ chưa render. Không báo rằng ảnh đã được tạo khi mới có prompt.

## Âm thanh: SFX là trọng tâm

- **Mỗi slide**, kể cả cover nháp, phải có ít nhất một SFX nghe được từ `assets/sfx/`, được đăng ký trong `sfx_manifest.json`, có quyền sử dụng đã xác nhận và gắn với visual trigger đúng thời điểm. SFX tổng hợp chỉ được bổ sung, không thay thế yêu cầu này.
- Mỗi slide có BGM. Mixer tạo track BGM và SFX riêng, giữ các stem `.bgm.wav`, `.sfx.wav` và bản mix `.wav`. BGM được duck tại sự kiện SFX để âm thanh hiệu ứng nổi bật; vẫn phải nghe kiểm tra bản MP4 thật.
- Subtle/Smooth là mặc định. Game/Tech/Cinematic chỉ dùng khi người dùng yêu cầu rõ và được ghi vào brief. Tệp không rõ quyền sử dụng không được phát.
- Nếu thư viện chưa có SFX phù hợp, hỏi người dùng về nguồn âm thanh hoặc điều chỉnh sound plan; không lặng lẽ thay bằng SFX tổng hợp.

## Render nháp và render cuối

| Chế độ | Cover nháp | Đầu ra nháp |
| --- | --- | --- |
| Motion / Photo | `python scripts/render_all.py <project> --draft --only <cover-name>` | `<project>/renders/draft/slide-<cover-name>.mp4` |
| World 2D | Trong project: `node tools/capture.mjs video renders/draft/raw "1"`, sau đó `python <skill>/engines/world2d/scripts/add_sound.py <project> --only slide-01 --video-dir renders/draft/raw --output-dir renders/draft` | `<project>/renders/draft/slide-01.mp4` |
| World 3D | Trong project: `python tools/make_audio.py <cover-name>`, `node tools/render.mjs 1`, `node tools/mux.mjs 1 --draft` | `<project>/renders/draft/slide-<cover-name>.mp4` |

Lệnh nháp chỉ xử lý cover, không đòi hỏi audio plan của các slide sau và không ghi đè MP4 cuối. Với project Motion/Photo tạo trước bản cập nhật này, làm mới `audio/make_audio.py` và `audio/project_audio.py` từ template cùng chế độ trước khi dùng `--draft`.

Trước khi trình cover, kiểm tra frame đầu/giữa/cuối, chữ và vùng an toàn, thời điểm SFX, độ nổi bật so với BGM, nhịp animation và seam của vòng lặp. Sau khi cover được duyệt, render toàn bộ và kiểm tra lại từng MP4, stem, contact sheet, seam và thứ tự file. Chỉ báo những file và kiểm tra đã thực sự tạo/chạy. Nếu thiếu runtime render, bàn giao brief, storyboard, asset plan và prompt đã xác minh, ghi rõ MP4 chưa render.

## Trạng thái triển khai

Workflow và công cụ liên quan đã được cập nhật trong skill dùng chung. Bộ kiểm tra Python hiện có **24/24 ca đạt**, gồm kiểm tra SFX bắt buộc, BGM ducking, cover nháp tách khỏi output cuối và chọn riêng audio của cover ở cả bốn chế độ. Các tệp Python/Node thay đổi đã qua kiểm tra cú pháp. Môi trường triển khai chưa có `ffmpeg/ffprobe`, vì vậy chưa có bằng chứng render và nghe kiểm tra một MP4 thật trên máy đó.
