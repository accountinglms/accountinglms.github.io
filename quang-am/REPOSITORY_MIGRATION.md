# Chuyển Tủ Đọc Quang Âm sang repository GitHub riêng

## Tình trạng

Ứng dụng đang được xuất bản ở https://accountinglms.github.io/quang-am/ và chỉ dùng mã trong thư mục `quang-am/`. Không có liên kết phụ thuộc mã học tập, tài khoản hay Supabase của ICAEW LMS.

**Không phải đã tách repository:** Tài khoản GitHub đang kết nối chưa có công cụ tạo repository mới. Không tự chuyển GitHub Pages của LMS sang repository khác, vì việc đó có thể làm hỏng LMS.

## Cách hoàn tất một lần khi tạo repository mới

1. Tạo một repository trống, ví dụ `Phuong301CP/tu-doc-quang-am`, với GitHub UI. Không chọn thêm README, license hoặc .gitignore để tránh xung đột.
2. Sao chép **nội dung bên trong** thư mục `quang-am/` sang **thư mục gốc** repository mới, giữ nguyên cây `.github/workflows/pages.yml` và `index.html` nằm ở root.
3. Trong Settings → Pages → Source, chọn **GitHub Actions**. Workflow riêng của Quang Âm sẽ xuất bản site khi push nhánh `main`.
4. Truy cập `https://Phuong301CP.github.io/tu-doc-quang-am/` nếu repository dùng tài khoản Phuong301CP và tên ví dụ nói trên (đường dẫn chỉ tồn tại sau khi tạo và deploy thành công).
5. Mở bản cũ, xuất **bản sao lưu tiến độ** ra tệp JSON; qua trang mới chọn **Nhập bản sao lưu** để mang theo dấu trang, lịch sử và nguồn ưu tiên.
6. Chỉ xóa hoặc chuyển hướng `/quang-am/` ở repository cũ sau khi kiểm tra bản mới trên điện thoại và máy tính. Không sửa mã nguồn ICAEW LMS.

## Tách biệt an toàn

- GitHub: repository, GitHub Actions, Pages và tên miền độc lập.
- Dữ liệu: các khóa lưu dấu trang mang tiền tố `qa-reader.`; việc đổi origin đòi hỏi xuất/nhập bản sao lưu một lần.
- Không kết nối cơ sở dữ liệu LMS; không dùng tên miền Supabase, khóa API hoặc tài khoản học tập của LMS.
- Nội dung truyện được mở tại TruyenHay (ưu tiên văn phong) hoặc Việt Nam Thư Quán (dự phòng); không lưu trữ toàn văn truyện.

## Đồng bộ tự động nhiều thiết bị

Tính năng sao lưu/nhập hiện có hoạt động mà không cần backend. Để đồng bộ *tự động* bằng tài khoản, phải có một dịch vụ dữ liệu **riêng cho Quang Âm**, với xác thực, RLS, chính sách xử lý dữ liệu và xác nhận chi phí trước khi tạo. Không tự ý dùng Supabase ICAEW LMS.
