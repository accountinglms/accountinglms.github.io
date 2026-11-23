# Tủ Đọc Quang Âm — GitHub Pages

Website tĩnh độc lập, không dùng Floot khi vận hành. Giao diện đọc, chuyển chương, dấu trang trên trình duyệt và lựa chọn nguồn truyện.

## Ranh giới dự án và quy tắc bảo trì

**Đây là hai website/sản phẩm khác nhau, chỉ dùng chung nền tảng GitHub để dễ quản lý:**

| Website | Vai trò | Đường dẫn |
| --- | --- | --- |
| ICAEW LMS | Học tập, kế toán – tài chính, luyện bài và theo dõi học tập | https://accountinglms.github.io/ |
| Tủ Đọc Quang Âm | Đọc truyện chữ, thư giãn, ghi nhớ chương đang đọc | https://accountinglms.github.io/quang-am/ |

**Phạm vi công việc:** Khi bảo trì Tủ Đọc Quang Âm, chỉ thay đổi tệp thuộc `quang-am/`. Không sửa bài học, điểm số, tài khoản, Supabase, chức năng LMS hoặc dữ liệu học tập. Khi bảo trì LMS, không tự ý thay đổi tính năng Tủ Đọc. Chỉ chỉnh tệp hạ tầng dùng chung (ví dụ quy trình đóng gói GitHub Pages) nếu thật sự cần để xuất bản và đã kiểm tra tác động hai website.

**Cách ly kỹ thuật hiện tại:** Cùng một repository và tên miền GitHub Pages nhưng ứng dụng ở hai đường dẫn khác nhau; Tủ Đọc có tài nguyên và Service Worker giới hạn trong `/quang-am/`. Trình duyệt vẫn chia sẻ vùng `localStorage` theo *origin* (không theo đường dẫn), vì vậy Tủ Đọc sử dụng riêng bộ khóa có tiền tố `qa-reader.`, không đọc/chỉnh dữ liệu học tập. Chưa phải là hai repository hoặc hai origin độc lập hoàn toàn. Nếu cần cách ly tuyệt đối, hãy chuyển `quang-am/` sang repository + tên miền riêng.

**Nguyên tắc sản phẩm:** Giữ nguyên bản truyện từ nguồn được phép liên kết (ưu tiên văn phong TruyenHay), không thay bằng tóm tắt; tối ưu đọc tiếp, chuyển chương, lưu dấu trang, trải nghiệm iPhone; không đưa tính năng học tập hay kế toán vào Tủ Đọc.

## Truy cập

https://accountinglms.github.io/quang-am/

## Tách thành repository riêng khi cần

Sao chép **toàn bộ tệp trong thư mục này** vào gốc repository mới, bật GitHub Pages từ nhánh \`main\` và thư mục \`/(root)\`. Liên kết CSS/JS, Service Worker, manifest đều dùng đường dẫn tương đối, không phải sửa khi chuyển thư mục.

## Giới hạn

- Nội dung truyện được mở tại TruyenHay hoặc Việt Nam Thư Quán. Không lưu trữ toàn văn của bên thứ ba.
- Ghi nhớ chương khi mở từ Tủ Đọc; không thể đọc vị trí cuộn/chương chuyển ngay trong website nguồn.
- Dấu trang được lưu trong localStorage, riêng theo tên miền và trình duyệt, bằng các khóa có tiền tố `qa-reader.`. Khi chuyển từ Floot, người đọc cần nhập một lần hoặc dùng URL có dạng \`?chapter=617&source=truyenhay&import=1\`.
- TruyenHay hiện có lỗi nút “Chương trước” có thể về chương 1; đây là lỗi của trang nguồn.
- GitHub Pages không có backend: tên chương được lấy từ tệp titles.json (2.560 mục) đóng gói tại GitHub; các chương chưa có dữ liệu vẫn mở đúng URL, chỉ hiện số chương trên Tủ Đọc.
- Ứng dụng có thể hoạt động khi offline để xem dấu trang; nội dung truyện trên website nguồn cần mạng.

## Kiểm tra

- \`node --check app.js\` và \`node --check sw.js\`
- Test trên iPhone: ghim ra màn hình chính bằng Safari → Share → Add to Home Screen.
- Mọi file tự chứa, không có cơ sở dữ liệu, secrets hoặc dependency build.
