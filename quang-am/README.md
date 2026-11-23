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


## Bản 2.1 — Dấu trang được bảo vệ

- **Dấu trang chính** (`qa-reader.v1.chapter`) chỉ tự cập nhật khi mở đúng chương hiện tại hoặc tiến sang chương cao hơn từ Tủ Đọc. Mở xem chương cũ không tự ghi đè mốc đang đọc.
- **Mốc xa nhất từng mở** (`qa-reader.v1.max`) không giảm khi nhập chương thấp hơn; có nút quay lại mốc này. Mốc này chỉ là số chương cao nhất từng được mở hoặc lưu, **không chứng minh đã đọc hết**.
- **Khôi phục dấu trang trước** (`qa-reader.v2.previous`) giúp hoàn tác lần đổi mốc gần nhất.
- **Lịch sử mở chương** (`qa-reader.v2.recent`) lưu tối đa 12 bản ghi gần nhất trên thiết bị, không theo dõi các trang mở trực tiếp tại website nguồn.
- Nếu cố ý muốn chuyển mốc về chương cũ, sử dụng **Cập nhật dấu trang** thay vì chỉ nhấn mở chương đó.
- Tất cả dữ liệu được lưu cục bộ trên cùng trình duyệt/tên miền; không đồng bộ tự động giữa thiết bị, không thay đổi dữ liệu hay hạ tầng ICAEW LMS.

## Giai đoạn 2.2, 2.3, 2.4 — Trải nghiệm và độ tin cậy

### 2.2 — Trải nghiệm iPhone
- Thanh điều hướng nổi với nút Chương trước, Đọc tiếp và Chương sau có vùng bấm lớn. Không sử dụng cử chỉ vuốt để chuyển chương, tránh kích hoạt nhầm.
- Nút mở cùng số chương tại nguồn dự phòng mà không tự thay đổi nguồn ưu tiên TruyenHay.
- Cảnh báo mất kết nối; dấu trang vẫn hiển thị khi offline nhưng trang truyện ngoài vẫn cần mạng.

### 2.3 — Chuẩn bị tách hạ tầng
- Tất cả tài nguyên của Quang Âm dùng đường dẫn tương đối; có quy trình triển khai GitHub Pages riêng trong `quang-am/.github/workflows/pages.yml` và tài liệu `REPOSITORY_MIGRATION.md`.
- Repository Quang Âm **chưa được tạo** vì GitHub connector hiện không có hành động tạo repository. Chủ sở hữu phải tạo repository trống một lần; sau đó có thể chuyển toàn bộ thư mục sang root và bật GitHub Pages.
- Không sửa mã hay dữ liệu LMS; workflow kiểm tra nguồn được tạo riêng, không ghi hay thay đổi học liệu.

### 2.4 — Khả năng mang tiến độ sang thiết bị khác và độ tin cậy
- Xuất bản sao lưu JSON gồm dấu trang, mốc chương cao nhất, nguồn ưu tiên và lịch sử (không chứa nội dung truyện).
- Nhập sao lưu: kiểm tra định dạng, giới hạn kích thước, hiển thị bản xem trước và **chỉ thay đổi dấu trang sau khi người dùng xác nhận**; không cho mốc chương cao nhất giảm khi khôi phục.
- Giữ chức năng sao chép liên kết nhanh để chuyển số chương.
- Kiểm tra nguồn truyện theo lịch bằng GitHub Actions workflow `.github/workflows/quang-am-health.yml`; kết quả máy chủ có thể khác thiết bị người đọc, không tự thay đổi bản dịch khi lỗi.
- Bộ kiểm thử riêng `quang-am/tests/reader.test.cjs`, `node --test quang-am/tests/*.test.cjs` và workflow `.github/workflows/quang-am-tests.yml` kiểm tra độc lập với pipeline LMS.
- **Chưa phải đồng bộ đám mây tự động**: muốn có tự động đồng bộ giữa thiết bị cần repository riêng và backend riêng với cơ chế xác thực, RLS, chính sách chi phí; không dùng Supabase ICAEW LMS.

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
