import { Link } from "react-router-dom";
import { IconMapPin } from "./Icons";

export default function Footer() {
  return (
    <footer className="bg-white border-t border-slate-200 pt-14 pb-8 font-body">
      <div className="max-w-[1440px] mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-xl bg-primary-500 flex items-center justify-center shadow-md shadow-primary-500/20">
                <IconMapPin size={16} className="text-white" />
              </div>
              <span className="font-heading font-800 text-slate-900 text-xl tracking-tight">
                travelio
              </span>
            </div>
            <p className="text-sm text-slate-500 leading-relaxed mb-4">
              Hành trình hoàn hảo, trải nghiệm đẳng cấp. Khám phá và đặt phòng khách sạn, khu nghỉ dưỡng, vé vui chơi & tour giải trí hàng đầu Việt Nam.
            </p>
          </div>
          <div>
            <h4 className="font-heading font-700 text-slate-800 text-sm mb-3">
              Về Travelio
            </h4>
            <ul className="space-y-2 text-sm text-slate-500">
              <li>
                <Link to="/" className="hover:text-primary-600 transition">
                  Giới thiệu
                </Link>
              </li>
              <li>
                <Link to="/" className="hover:text-primary-600 transition">
                  Tuyển dụng
                </Link>
              </li>
              <li>
                <Link to="/" className="hover:text-primary-600 transition">
                  Truyền thông & Báo chí
                </Link>
              </li>
              <li>
                <Link to="/" className="hover:text-primary-600 transition">
                  Cẩm nang du lịch
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-heading font-700 text-slate-800 text-sm mb-3">
              Hỗ trợ khách hàng
            </h4>
            <ul className="space-y-2 text-sm text-slate-500">
              <li>
                <Link to="/" className="hover:text-primary-600 transition">
                  Trung tâm trợ giúp
                </Link>
              </li>
              <li>
                <Link to="/" className="hover:text-primary-600 transition">
                  Quy định an toàn & bảo mật
                </Link>
              </li>
              <li>
                <Link to="/" className="hover:text-primary-600 transition">
                  Chính sách hoàn hủy & đổi lịch
                </Link>
              </li>
              <li>
                <Link to="/my-trips" className="hover:text-primary-600 transition">
                  Tra cứu vé điện tử QR
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-heading font-700 text-slate-800 text-sm mb-3">
              Hợp tác đối tác
            </h4>
            <ul className="space-y-2 text-sm text-slate-500">
              <li>
                <Link to="/vendor" className="hover:text-primary-600 transition">
                  Cổng thông tin đối tác
                </Link>
              </li>
              <li>
                <Link to="/vendor" className="hover:text-primary-600 transition">
                  Đăng ký cơ sở lưu trú
                </Link>
              </li>
              <li>
                <Link to="/vendor" className="hover:text-primary-600 transition">
                  Đăng ký vé khu vui chơi
                </Link>
              </li>
              <li>
                <Link to="/vendor/qr" className="hover:text-primary-600 transition">
                  Cổng soát vé QR Terminal
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between pt-6 border-t border-slate-100 text-xs text-slate-400">
          <div>&copy; 2026 Travelio Platform. Toàn bộ bản quyền được bảo lưu.</div>
          <div className="flex gap-4 mt-3 md:mt-0">
            <Link to="/" className="hover:text-primary-600 transition">
              Chính sách bảo mật
            </Link>
            <Link to="/" className="hover:text-primary-600 transition">
              Điều khoản dịch vụ
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
