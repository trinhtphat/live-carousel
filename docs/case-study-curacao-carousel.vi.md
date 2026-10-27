# Case study: Live Carousel Curaçao — 7 slide

> Bản ghi quy trình và feedback từ dự án của anh Phát (16–23/10/2026). Đây là tài liệu hậu kiểm, **không** phải bằng chứng rằng các MP4 cũ đã được sửa lại hay đã đăng Instagram. Các quyết định duyệt trong hội thoại là nguồn sự thật; đường dẫn file chỉ là dấu vết sản xuất.

## Mục tiêu và đầu ra

- Khán giả: người xem quan tâm cocktail và bartender mới tìm hiểu orange liqueur.
- Mục tiêu: giải thích Curaçao, Triple Sec và Cointreau theo logic **nguồn gốc/nhóm sản phẩm/tên thương hiệu**, phá hiểu lầm “Curaçao luôn màu xanh”; khuyến khích lưu/chia sẻ.
- Bài chốt: **“Don't read the color. Read the label.”** Nội dung trên slide và caption bằng tiếng Anh; trao đổi/duyệt bằng tiếng Việt.
- Bảy video dọc 4:5, mỗi slide 1080 × 1350, 30 fps, khoảng 6 giây. Một bản ghép 42 giây để xem toàn mạch, nhưng **bộ đăng carousel là bảy MP4 tách riêng theo số 01–07**, không phải master 42 giây.
- Tone: premium editorial, F&B education; navy, travertine, cam và acid lime tiết chế. Tránh để slide Curaçao trở thành quảng cáo Cointreau.

## Diễn tiến và các quyết định của người dùng

| Mốc | Feedback/quyết định | Cách xử lý hoặc bài học |
| --- | --- | --- |
| Từ ý tưởng đến brief | Ban đầu 5 slide, sau đó duyệt thêm 2 thành 7; cần có số thứ tự và mạch kể rõ. | Khoá slide count và vai trò mỗi slide trước khi dựng. Không dùng tên file để suy ra thứ tự nội dung. |
| Ảnh → chữ | Duyệt từng ảnh GPT Image **trực tiếp trong chat**; chỉ sau đó mới thêm typography. Dùng **chính ảnh đã duyệt**, không tạo lại. Chỉ xuất PNG hoàn chỉnh ở giai đoạn delivery. | Lưu ID/đường dẫn và checksum của background được duyệt; tách lớp ảnh với lớp chữ để giữ khả năng sửa. Nếu ảnh review không hiện, xác minh file và đưa phương án xem khác, không báo “đã lưu vào Canva” khi chưa làm. |
| Slide 1–2 thử nghiệm | Thanh cam trên timeline phải chuyển động; chữ “Curaçao – Triple Sec – Cointreau” sáng khi playhead đi qua; có light trail, whoosh/tick/chime; BGM đi liền slide 1–2. | Các visual trigger phải trùng thời điểm SFX; BGM nền không lấn SFX. Chỉ mở rộng ra 7 slide sau khi bộ test được duyệt. |
| Slide 2 | Khung trắng trên background không khớp hệ navy/travertine. | Kiểm tra ảnh trong ngữ cảnh cả bộ, không chỉ từng frame riêng. |
| Slide 3 | Có cảm giác đang quảng cáo Cointreau trong khi nói về Curaçao; yêu cầu chai **Bols Curaçao**. | Product visual phải khớp chủ thể kiến thức. Chai Cointreau chỉ xuất hiện ở slide giải thích thương hiệu. Không tự tạo nhãn chai sai khi cần packshot thật. |
| Slide 4 | Không cần chai Triple Sec; tăng chuyển động của chữ. | Bỏ vật thể không phục vụ ý; dùng kinetic typography diễn đạt “classification”; áp dụng nhịp chữ được duyệt cho slide 5–7. |
| Slide 5 | Chữ **COINTREAU phải màu cam**, không phải acid lime; hình chai thêm flash/chớp sáng. | Duy trì vị trí và hình chai đã duyệt, tăng glint có kiểm soát. **Quy chuẩn màu Cointreau từ feedback mới nhất: `#FA4616`.** Không gọi một màu cam “gần giống” là đúng mã. File ORANGE-V3 đã render trước khi mã hex này được cung cấp: phải kiểm tra pixel/source hoặc sửa và render lại nếu cần khẳng định đạt `#FA4616`. Acid lime dành cho nhấn phụ, không thay màu chữ COINTREAU. |
| Slide 6 | Duyệt background ba ly clear/amber/blue trên nền navy/travertine; không tạo lại. | Nhấn lần lượt ba ly, reveal “NO.” acid lime và giữ thông điệp: màu xanh là lựa chọn màu, không định nghĩa cả nhóm. |
| Slide 7 | Duyệt ảnh nền một ly và cam; chốt mạch “READ THE LABEL.” | Dùng ảnh đã duyệt, chữ acid lime làm điểm kết và CTA save. Kiểm tra thông điệp chữ so với hình: ảnh thành phẩm là ly màu hổ phách/cam, không tự mô tả là rượu không màu. |
| Delivery | Người dùng cần file đăng riêng, không chỉ video ghép. Nhiều lần không mở được Preview/Download. | Xuất 01–07 MP4 rõ thứ tự; kiểm tra tồn tại, kích thước, codec, thời lượng, giải mã hết file rồi mới đưa link. Nếu link của nền tảng lỗi 404 dù file local hợp lệ, báo rõ giới hạn phân phối; không khẳng định người dùng đã tải được. |

## Mạch nội dung 7 slide đã duyệt

1. **Hook:** Curaçao / Triple Sec / Cointreau — same?
2. **Orange family:** cùng nền tảng hương cam nhưng tên gọi có vai trò khác.
3. **Curaçao origin:** tên khởi đầu từ địa danh; hình ảnh Curaçao thay vì Cointreau.
4. **Triple Sec:** phân loại/thuật ngữ sản phẩm, không phải một brand cụ thể.
5. **Cointreau:** một thương hiệu orange liqueur; chữ tên riêng màu cam và chai đúng tham chiếu.
6. **Color myth:** Curaçao không phải lúc nào cũng xanh; các phiên bản clear/amber/blue.
7. **Takeaway:** đừng chỉ đọc màu, hãy đọc nhãn; CTA lưu bài.

Không nên biến “cùng họ” thành khẳng định ba tên là một loại hoàn toàn tương đương; khi xuất bản, kiểm tra lại phát biểu kỹ thuật theo nhãn và nguồn đáng tin cậy.

## Thực tế sản xuất và sự cố cần tránh

- Ban đầu phát hành bản review 42 giây; người dùng nhắc **phải tách 7 slide để upload**. Delivery sau đó có bảy file `01-Hook.mp4` … `07-Read-The-Label.mp4`, mỗi file 6 giây, H.264/AAC, 1080 × 1350, 30 fps; từng file được kiểm tra decode. Bản master chỉ là phụ trợ.
- Slide 4 từng thiếu MP4 delivery dù source/audio có sẵn: render lại từ source được duyệt, không tự thiết kế lại.
- MP4 review Slide 3 có audio gần như im lặng: master 42 giây dùng lại mix gốc theo từng slide thay vì tin rằng track trong mọi review MP4 đều đủ. QA âm thanh từng slide và nghe điểm nối BGM trước khi giao.
- Dự án gặp lỗi Preview/Download phía ứng dụng, kể cả PNG/MP4 tồn tại trong Library; kiểm tra file local không chứng minh link chat mở được. Báo đúng tình trạng, cung cấp đường dẫn dự phòng khi có thể và lưu asset có thể truy xuất lại.
- Không trộn trạng thái **draft → approved background → approved motion → final delivery**. Mỗi lần feedback chỉ sửa phạm vi được yêu cầu; khóa những phần đã duyệt.
- Không đưa ảnh tạo sinh thay packshot brand thật nếu yêu cầu độ chính xác nhãn/hình chai. Với tài sản thương hiệu phải đối chiếu reference và quyền sử dụng.

## Checklist tái sử dụng cho dự án sau

1. Chốt learning outcome, 7 vai trò slide, claim cần kiểm chứng, palette, font, packshot và mã màu **Cointreau `#FA4616`** nếu dùng brand.
2. Kiểm kê ảnh gốc/ảnh đã duyệt; tạo background không chữ; review ảnh thật từng slide và ghi dấu nguồn; giữ nguyên background sau duyệt.
3. Thêm chữ dưới dạng lớp editable, rà bố cục/safe area và hình đúng chủ đề của slide.
4. Dựng chuyển động theo named visual triggers; SFX đúng trigger, BGM liên tục theo timeline; review slide test rồi lần lượt duyệt từng slide.
5. QA từng MP4: file tồn tại, 1080 × 1350, 30 fps, 6 giây, H.264/AAC, decode toàn bộ, frame đầu/cuối, chính tả, đọc rõ nhãn, âm lượng và seam. Kiểm tra *màu thực tế* nếu claim đúng hex.
6. Bàn giao **bảy MP4 đánh số** + caption + master review tùy chọn; xác nhận riêng khả năng mở link, không chỉ tính hợp lệ của bytes.

## Caption đã duyệt để tham chiếu

> Blue is a colour — not the category. Curaçao, Triple Sec and Cointreau are connected, but they are not the same thing. One began with an island. One became a classification. One is a specific brand. And Curaçao? It isn't always blue. The colour catches your eye. The label tells you the real story. Save this before choosing your next orange liqueur. 🍊

Caption ở đây là bản copy lịch sử, không phải bằng chứng đã đăng hoặc đã fact-check mọi cách diễn đạt.
