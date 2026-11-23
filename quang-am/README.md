# Tủ Đọc Quang Âm — GitHub Pages

Website tĩnh độc lập, không dùng Floot khi vận hành. Giao diện đọc, chuyển chương, dấu trang trên trình duyệt và lựa chọn nguồn truyện.

## Truy cập

https://accountinglms.github.io/quang-am/

## Tách thành repository riêng khi cần

Sao chép **toàn bộ tệp trong thư mục này** vào gốc repository mới, bật GitHub Pages từ nhánh \`main\` và thư mục \`/(root)\`. Liên kết CSS/JS, Service Worker, manifest đều dùng đường dẫn tương đối, không phải sửa khi chuyển thư mục.

## Giới hạn

- Nội dung truyện được mở tại TruyenHay hoặc Việt Nam Thư Quán. Không lưu trữ toàn văn của bên thứ ba.
- Ghi nhớ chương khi mở từ Tủ Đọc; không thể đọc vị trí cuộn/chương chuyển ngay trong website nguồn.
- Dấu trang được lưu trong localStorage, riêng cho từng tên miền và trình duyệt. Khi chuyển từ Floot, người đọc cần nhập một lần hoặc dùng URL có dạng \`?chapter=617&source=truyenhay&import=1\`.
- TruyenHay hiện có lỗi nút “Chương trước” có thể về chương 1; đây là lỗi của trang nguồn.
- GitHub Pages không có backend: tiêu đề chương 610–645 được đóng gói sẵn; số chương khác vẫn mở đúng URL nhưng chỉ hiện số chương trên Tủ Đọc.
- Ứng dụng có thể hoạt động khi offline để xem dấu trang; nội dung truyện trên website nguồn cần mạng.

## Kiểm tra

- \`node --check app.js\` và \`node --check sw.js\`
- Test trên iPhone: ghim ra màn hình chính bằng Safari → Share → Add to Home Screen.
- Mọi file tự chứa, không có cơ sở dữ liệu, secrets hoặc dependency build.
