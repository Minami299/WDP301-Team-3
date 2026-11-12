const nodemailer = require("nodemailer");

const SMTP_KEYS = [
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_USER",
  "SMTP_PASSWORD",
  "SMTP_FROM",
];

const assertSmtpConfigured = () => {
  const missing = SMTP_KEYS.filter((key) => !process.env[key]);
  if (missing.length) {
    const error = new Error(
      `Email service is not configured. Missing: ${missing.join(", ")}`,
    );
    error.statusCode = 503;
    error.code = "SMTP_NOT_CONFIGURED";
    throw error;
  }
};

const sendOtpEmail = async (email, otp, purpose) => {
  assertSmtpConfigured();
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM } =
    process.env;
  const smtpPort = Number(SMTP_PORT);
  const isGmail = SMTP_HOST.toLowerCase() === "smtp.gmail.com";

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: smtpPort,
    secure: smtpPort === 465,
    requireTLS: smtpPort === 587,
    auth: {
      user: SMTP_USER,
      pass: isGmail ? SMTP_PASSWORD.replace(/\s/g, "") : SMTP_PASSWORD,
    },
  });
  const emailPurpose = {
    verification: {
      subject: "Verify your Travelio email",
      label: "verification",
    },
    "password reset": {
      subject: "Reset your Travelio password",
      label: "password reset",
    },
    "email change": {
      subject: "Confirm your new Travelio email",
      label: "email change verification",
    },
  }[purpose];
  if (!emailPurpose) throw new Error("Unsupported email OTP purpose");
  const text = `Travelio\n\nYour ${emailPurpose.label} code is:\n\n${otp}\n\nThis code will expire in 5 minutes.`;

  try {
    await transporter.sendMail({
      from: isGmail ? { name: "Travelio", address: SMTP_USER } : SMTP_FROM,
      to: email,
      subject: emailPurpose.subject,
      text,
    });
  } catch (error) {
    console.error("SMTP delivery failed", {
      code: error.code,
      responseCode: error.responseCode,
      command: error.command,
    });
    throw error;
  }
};

const sendPartnerReviewEmail = async ({ email, fullName, role, approved, needsAdditionalInfo, reason }) => {
  assertSmtpConfigured();
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM } = process.env;
  const smtpPort = Number(SMTP_PORT);
  const isGmail = SMTP_HOST.toLowerCase() === "smtp.gmail.com";
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: smtpPort,
    secure: smtpPort === 465,
    requireTLS: smtpPort === 587,
    auth: { user: SMTP_USER, pass: isGmail ? SMTP_PASSWORD.replace(/\s/g, "") : SMTP_PASSWORD },
  });
  const partner = role === "HOTEL_OWNER" ? "Hotel Owner" : "Attraction Vendor";
  const text = needsAdditionalInfo
    ? `Travelio\n\nXin chào ${fullName},\n\nHồ sơ ${partner} cần bổ sung thông tin:\n${reason}\n\nVui lòng đăng nhập và mở mục Hồ sơ đối tác để cập nhật, sau đó gửi xét duyệt lại.\n\nĐội ngũ Travelio`
    : approved
    ? `Travelio\n\nXin chào ${fullName},\n\nHồ sơ đăng ký ${partner} của bạn đã được phê duyệt. Bạn có thể đăng nhập và bắt đầu quản lý cơ sở kinh doanh của mình.\n\nTrân trọng,\nĐội ngũ Travelio`
    : `Travelio\n\nXin chào ${fullName},\n\nRất tiếc, hồ sơ đăng ký ${partner} của bạn đã bị từ chối.\nLý do: ${reason}\n\nNếu cần hỗ trợ, vui lòng liên hệ đội ngũ Travelio.\n\nTrân trọng,\nĐội ngũ Travelio`;
  await transporter.sendMail({
    from: isGmail ? { name: "Travelio", address: SMTP_USER } : SMTP_FROM,
    to: email,
    subject: needsAdditionalInfo ? "Hồ sơ đối tác Travelio cần bổ sung" : approved ? "Hồ sơ đối tác Travelio đã được phê duyệt" : "Hồ sơ đối tác Travelio bị từ chối",
    text,
  });
};

const formatVnd = (value) => `${Math.round(Number(value) || 0).toLocaleString("vi-VN")} VND`;

const sendPayoutEmail = async ({ email, fullName, status, amount, reason, reference }) => {
  assertSmtpConfigured();
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM } = process.env;
  const smtpPort = Number(SMTP_PORT);
  const isGmail = SMTP_HOST.toLowerCase() === "smtp.gmail.com";
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: smtpPort,
    secure: smtpPort === 465,
    requireTLS: smtpPort === 587,
    auth: { user: SMTP_USER, pass: isGmail ? SMTP_PASSWORD.replace(/\s/g, "") : SMTP_PASSWORD },
  });
  const content = {
    APPROVED: {
      subject: "Yêu cầu quyết toán Travelio đã được duyệt",
      body: `Yêu cầu quyết toán ${formatVnd(amount)} của bạn đã được duyệt. Travelio sẽ chuyển khoản và thông báo khi hoàn tất.`,
    },
    REJECTED: {
      subject: "Yêu cầu quyết toán Travelio bị từ chối",
      body: `Yêu cầu quyết toán ${formatVnd(amount)} của bạn đã bị từ chối.\nLý do: ${reason}\nCác đơn trong yêu cầu đã được trả về để bạn gửi lại.`,
    },
    PAID: {
      subject: "Travelio đã chuyển khoản quyết toán",
      body: `Travelio đã chuyển ${formatVnd(amount)} vào tài khoản ngân hàng bạn đăng ký.\nMã giao dịch: ${reference}`,
    },
  }[status];
  if (!content) throw new Error("Unsupported payout email status");
  await transporter.sendMail({
    from: isGmail ? { name: "Travelio", address: SMTP_USER } : SMTP_FROM,
    to: email,
    subject: content.subject,
    text: `Travelio\n\nXin chào ${fullName},\n\n${content.body}\n\nTrân trọng,\nĐội ngũ Travelio`,
  });
};

const formatDateVi = (date) => {
  if (!date) return "";
  const d = new Date(date);
  return isNaN(d.getTime()) ? String(date) : d.toLocaleDateString("vi-VN");
};

const formatDateTimeVi = (date) => {
  if (!date) return "";
  const d = new Date(date);
  return isNaN(d.getTime()) ? String(date) : d.toLocaleString("vi-VN");
};

const requestTypeToLabel = (type) => {
  switch (type) {
    case "CHANGE_DATE":
      return "Đổi ngày lưu trú";
    case "REFUND":
      return "Hủy phòng & Hoàn tiền";
    case "CANCEL":
    default:
      return "Hủy phòng";
  }
};

const sendCancellationRequestEmail = async ({
  customerEmail,
  guestName,
  vendorEmail,
  vendorName,
  bookingCode,
  facilityName,
  serviceName,
  type,
  reason,
  oldDate,
  newDate,
  refundMethod,
  refundBankName,
  refundAccountNumber,
  refundAccountName,
}) => {
  try {
    assertSmtpConfigured();
  } catch (err) {
    console.warn("[Email Notification] SMTP chưa được cấu hình, bỏ qua gửi email:", err.message);
    return;
  }

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM } = process.env;
  const smtpPort = Number(SMTP_PORT);
  const isGmail = SMTP_HOST.toLowerCase() === "smtp.gmail.com";
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: smtpPort,
    secure: smtpPort === 465,
    requireTLS: smtpPort === 587,
    auth: { user: SMTP_USER, pass: isGmail ? SMTP_PASSWORD.replace(/\s/g, "") : SMTP_PASSWORD },
  });
  const sender = isGmail ? { name: "Travelio", address: SMTP_USER } : SMTP_FROM;

  const typeLabel = requestTypeToLabel(type);
  const formattedOldDate = formatDateVi(oldDate);
  const formattedNewDate = formatDateVi(newDate);

  // 1. Gửi thông báo đến email khách hàng đã đăng ký
  if (customerEmail) {
    const subject = `[Travelio] Tiếp nhận yêu cầu ${typeLabel} - Đơn #${bookingCode}`;
    const text = `Travelio - Thông Báo Tiếp Nhận Yêu Cầu

Kính gửi Quý khách ${guestName || "Quý khách"},

Hệ thống Travelio đã ghi nhận yêu cầu ${typeLabel} của Quý khách cho đơn đặt phòng #${bookingCode}.

THÔNG TIN CHI TIẾT:
- Mã đơn đặt phòng: ${bookingCode}
- Cơ sở lưu trú: ${facilityName || "Khách sạn đối tác"}
${serviceName ? `- Loại phòng / Dịch vụ: ${serviceName}\n` : ""}${formattedOldDate ? `- Ngày lưu trú ban đầu: ${formattedOldDate}\n` : ""}- Loại yêu cầu: ${typeLabel}
${type === "CHANGE_DATE" && formattedNewDate ? `- Ngày mới mong muốn: ${formattedNewDate}\n` : ""}${type === "REFUND" ? `- Hoàn tiền qua: ${refundMethod === "POINTS" ? "Điểm thưởng Travelio" : `Chuyển khoản (${refundBankName || ""} - STK: ${refundAccountNumber || ""} - Chủ TK: ${refundAccountName || ""})`}\n` : ""}- Lý do yêu cầu: ${reason || "Không có"}
- Thời gian gửi yêu cầu: ${formatDateTimeVi(new Date())}
- Trạng thái: Đang chờ đối tác xử lý (PENDING)

Yêu cầu của Quý khách đã được gửi tới Ban quản lý cơ sở lưu trú để xem xét. Chúng tôi sẽ gửi thông báo kết quả ngay khi có quyết định.

Trân trọng,
Đội ngũ Chăm sóc khách hàng Travelio`;

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #1e3a8a, #2563eb); padding: 24px; color: #ffffff;">
          <h1 style="margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">travelio</h1>
          <p style="margin: 6px 0 0 0; font-size: 13px; opacity: 0.9;">Thông báo tiếp nhận yêu cầu ${typeLabel}</p>
        </div>
        <div style="padding: 24px; color: #1e293b; font-size: 14px; line-height: 1.6;">
          <p style="margin-top: 0;">Kính gửi <strong>${guestName || "Quý khách"}</strong>,</p>
          <p>Hệ thống Travelio đã tiếp nhận <strong>yêu cầu ${typeLabel}</strong> của Quý khách cho đơn đặt phòng <span style="background: #f1f5f9; padding: 2px 8px; border-radius: 6px; font-weight: 700; color: #2563eb;">#${bookingCode}</span>.</p>
          
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin: 20px 0;">
            <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 12px; letter-spacing: 0.5px;">Chi tiết yêu cầu</div>
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
              <tr><td style="padding: 6px 0; color: #64748b; width: 40%;">Mã đơn hàng:</td><td style="padding: 6px 0; font-weight: 600; color: #0f172a;">${bookingCode}</td></tr>
              <tr><td style="padding: 6px 0; color: #64748b;">Cơ sở lưu trú:</td><td style="padding: 6px 0; font-weight: 600; color: #0f172a;">${facilityName || "Khách sạn đối tác"}</td></tr>
              ${serviceName ? `<tr><td style="padding: 6px 0; color: #64748b;">Loại phòng:</td><td style="padding: 6px 0; font-weight: 600; color: #0f172a;">${serviceName}</td></tr>` : ""}
              ${formattedOldDate ? `<tr><td style="padding: 6px 0; color: #64748b;">Ngày lưu trú hiện tại:</td><td style="padding: 6px 0; font-weight: 600; color: #0f172a;">${formattedOldDate}</td></tr>` : ""}
              <tr><td style="padding: 6px 0; color: #64748b;">Loại yêu cầu:</td><td style="padding: 6px 0; font-weight: 700; color: #2563eb;">${typeLabel}</td></tr>
              ${type === "CHANGE_DATE" && formattedNewDate ? `<tr><td style="padding: 6px 0; color: #64748b;">Ngày mới mong muốn:</td><td style="padding: 6px 0; font-weight: 700; color: #059669;">${formattedNewDate}</td></tr>` : ""}
              ${type === "REFUND" ? `<tr><td style="padding: 6px 0; color: #64748b;">Phương thức hoàn:</td><td style="padding: 6px 0; font-weight: 600; color: #0f172a;">${refundMethod === "POINTS" ? "Điểm thưởng Travelio" : `Ngân hàng ${refundBankName || ""} (${refundAccountNumber || ""})`}</td></tr>` : ""}
              <tr><td style="padding: 6px 0; color: #64748b;">Lý do:</td><td style="padding: 6px 0; color: #334155;">${reason || "Không có"}</td></tr>
              <tr><td style="padding: 6px 0; color: #64748b;">Thời gian gửi:</td><td style="padding: 6px 0; color: #334155;">${formatDateTimeVi(new Date())}</td></tr>
              <tr><td style="padding: 6px 0; color: #64748b;">Trạng thái:</td><td style="padding: 6px 0;"><span style="background: #fef3c7; color: #92400e; padding: 2px 8px; border-radius: 6px; font-weight: 700; font-size: 12px;">Đang chờ đối tác xử lý</span></td></tr>
            </table>
          </div>

          <p style="color: #64748b; font-size: 13px;">Yêu cầu của Quý khách đã được chuyển tới Ban quản lý của <strong>${facilityName || "cơ sở lưu trú"}</strong>. Chúng tôi sẽ gửi email thông báo kết quả ngay khi đối tác phê duyệt hoặc phản hồi.</p>
        </div>
        <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 24px; text-align: center; color: #94a3b8; font-size: 11px;">
          © ${new Date().getFullYear()} Travelio. Nền tảng đặt phòng khách sạn và dịch vụ du lịch trực tuyến.
        </div>
      </div>
    `;

    try {
      await transporter.sendMail({ from: sender, to: customerEmail, subject, text, html });
    } catch (err) {
      console.error("[Email Notification Error] Gửi mail cho khách hàng thất bại:", err.message);
    }
  }

  // 2. Gửi thông báo đến đối tác / chủ khách sạn
  if (vendorEmail) {
    const vendorSubject = `[Travelio Đối Tác] Có yêu cầu ${typeLabel} mới - Đơn #${bookingCode}`;
    const vendorText = `Travelio - Thông Báo Dành Cho Đối Tác

Kính gửi ${vendorName || "Quý đối tác"},

Cơ sở lưu trú ${facilityName || "của bạn"} vừa nhận được một yêu cầu ${typeLabel} từ khách hàng ${guestName || "Khách hàng"} cho đơn đặt phòng #${bookingCode}.

THÔNG TIN CHI TIẾT:
- Mã đơn đặt phòng: ${bookingCode}
- Tên khách hàng: ${guestName || "Khách hàng"}
${serviceName ? `- Loại phòng / Dịch vụ: ${serviceName}\n` : ""}${formattedOldDate ? `- Ngày lưu trú hiện tại: ${formattedOldDate}\n` : ""}- Loại yêu cầu: ${typeLabel}
${type === "CHANGE_DATE" && formattedNewDate ? `- Ngày khách muốn đổi sang: ${formattedNewDate}\n` : ""}- Lý do yêu cầu: ${reason || "Không có"}
- Thời gian gửi: ${formatDateTimeVi(new Date())}

Vui lòng đăng nhập kênh Quản lý đối tác (Extranet) Travelio tại mục "Yêu cầu hủy / đổi ngày" để xem xét và xử lý yêu cầu cho khách hàng.

Trân trọng,
Hệ thống Quản lý Đối tác Travelio`;

    const vendorHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #0f172a, #1e293b); padding: 24px; color: #ffffff;">
          <h1 style="margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">travelio <span style="font-size: 12px; font-weight: 600; color: #38bdf8; text-transform: uppercase;">Đối tác</span></h1>
          <p style="margin: 6px 0 0 0; font-size: 13px; opacity: 0.9;">Có yêu cầu ${typeLabel} mới từ khách hàng</p>
        </div>
        <div style="padding: 24px; color: #1e293b; font-size: 14px; line-height: 1.6;">
          <p style="margin-top: 0;">Kính gửi <strong>${vendorName || "Quý đối tác"}</strong>,</p>
          <p>Cơ sở lưu trú <strong>${facilityName || "của bạn"}</strong> vừa nhận được một <strong>yêu cầu ${typeLabel}</strong> từ khách hàng <strong>${guestName || "Khách hàng"}</strong> cho đơn hàng <span style="background: #f1f5f9; padding: 2px 8px; border-radius: 6px; font-weight: 700; color: #0284c7;">#${bookingCode}</span>.</p>
          
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin: 20px 0;">
            <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 12px; letter-spacing: 0.5px;">Thông tin yêu cầu từ khách</div>
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
              <tr><td style="padding: 6px 0; color: #64748b; width: 40%;">Mã đơn hàng:</td><td style="padding: 6px 0; font-weight: 600; color: #0f172a;">${bookingCode}</td></tr>
              <tr><td style="padding: 6px 0; color: #64748b;">Khách hàng:</td><td style="padding: 6px 0; font-weight: 600; color: #0f172a;">${guestName || "Khách hàng"}</td></tr>
              ${serviceName ? `<tr><td style="padding: 6px 0; color: #64748b;">Loại phòng:</td><td style="padding: 6px 0; font-weight: 600; color: #0f172a;">${serviceName}</td></tr>` : ""}
              ${formattedOldDate ? `<tr><td style="padding: 6px 0; color: #64748b;">Ngày lưu trú hiện tại:</td><td style="padding: 6px 0; font-weight: 600; color: #0f172a;">${formattedOldDate}</td></tr>` : ""}
              <tr><td style="padding: 6px 0; color: #64748b;">Loại yêu cầu:</td><td style="padding: 6px 0; font-weight: 700; color: #0284c7;">${typeLabel}</td></tr>
              ${type === "CHANGE_DATE" && formattedNewDate ? `<tr><td style="padding: 6px 0; color: #64748b;">Ngày khách muốn đổi:</td><td style="padding: 6px 0; font-weight: 700; color: #059669;">${formattedNewDate}</td></tr>` : ""}
              <tr><td style="padding: 6px 0; color: #64748b;">Lý do của khách:</td><td style="padding: 6px 0; color: #334155;">${reason || "Không có"}</td></tr>
              <tr><td style="padding: 6px 0; color: #64748b;">Thời gian gửi:</td><td style="padding: 6px 0; color: #334155;">${formatDateTimeVi(new Date())}</td></tr>
            </table>
          </div>

          <p style="color: #64748b; font-size: 13px;">Vui lòng truy cập kênh Quản lý đối tác Travelio (Extranet) mục <strong>Yêu cầu hủy phòng / Đổi ngày</strong> để xem xét và phản hồi cho khách hàng.</p>
        </div>
        <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 24px; text-align: center; color: #94a3b8; font-size: 11px;">
          © ${new Date().getFullYear()} Travelio Partner Network.
        </div>
      </div>
    `;

    try {
      await transporter.sendMail({ from: sender, to: vendorEmail, subject: vendorSubject, text: vendorText, html: vendorHtml });
    } catch (err) {
      console.error("[Email Notification Error] Gửi mail cho đối tác thất bại:", err.message);
    }
  }
};

const sendCancellationDecisionEmail = async ({
  customerEmail,
  guestName,
  bookingCode,
  facilityName,
  serviceName,
  type,
  status,
  decisionReason,
  newDate,
  refundPointsAmount,
}) => {
  if (!customerEmail) return;

  try {
    assertSmtpConfigured();
  } catch (err) {
    console.warn("[Email Notification] SMTP chưa được cấu hình, bỏ qua gửi email:", err.message);
    return;
  }

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM } = process.env;
  const smtpPort = Number(SMTP_PORT);
  const isGmail = SMTP_HOST.toLowerCase() === "smtp.gmail.com";
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: smtpPort,
    secure: smtpPort === 465,
    requireTLS: smtpPort === 587,
    auth: { user: SMTP_USER, pass: isGmail ? SMTP_PASSWORD.replace(/\s/g, "") : SMTP_PASSWORD },
  });
  const sender = isGmail ? { name: "Travelio", address: SMTP_USER } : SMTP_FROM;

  const typeLabel = requestTypeToLabel(type);
  const isApproved = status === "APPROVED";
  const formattedNewDate = formatDateVi(newDate);

  const subject = isApproved
    ? `[Travelio] Yêu cầu ${typeLabel} cho đơn #${bookingCode} ĐÃ ĐƯỢC CHẤP THUẬN`
    : `[Travelio] Yêu cầu ${typeLabel} cho đơn #${bookingCode} KHÔNG ĐƯỢC CHẤP THUẬN`;

  let decisionDetail = "";
  if (isApproved) {
    if (type === "CHANGE_DATE") {
      decisionDetail = `Ngày lưu trú mới của Quý khách đã được cập nhật thành công: ${formattedNewDate}.`;
    } else if (type === "REFUND") {
      decisionDetail = `Đơn đặt phòng #${bookingCode} đã được hủy thành công.${refundPointsAmount ? ` Quý khách được hoàn ${refundPointsAmount.toLocaleString("vi-VN")} điểm thưởng vào tài khoản Travelio.` : " Tiền hoàn đang được tiến hành xử lý chuyển khoản."}`;
    } else {
      decisionDetail = `Đơn đặt phòng #${bookingCode} đã được hủy thành công.`;
    }
  } else {
    decisionDetail = `Rất tiếc, đối tác không thể chấp thuận yêu cầu này.\nLý do từ đối tác: ${decisionReason || "Không có lý do cụ thể"}.\nĐơn đặt phòng của Quý khách vẫn giữ nguyên hiệu lực theo lịch trình ban đầu.`;
  }

  const text = `Travelio - Thông Báo Kết Quả Xử Lý Yêu Cầu

Kính gửi Quý khách ${guestName || "Quý khách"},

Ban quản lý ${facilityName || "cơ sở lưu trú"} đã có kết quả xử lý đối với yêu cầu ${typeLabel} cho đơn đặt phòng #${bookingCode}.

KẾT QUẢ: ${isApproved ? "ĐÃ ĐƯỢC CHẤP THUẬN (APPROVED)" : "TỪ CHỐI (REJECTED)"}

${decisionDetail}

Nếu Quý khách có bất kỳ thắc mắc nào, vui lòng liên hệ đội ngũ hỗ trợ khách hàng của Travelio.

Trân trọng,
Đội ngũ Chăm sóc khách hàng Travelio`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
      <div style="background: ${isApproved ? "linear-gradient(135deg, #065f46, #059669)" : "linear-gradient(135deg, #991b1b, #dc2626)"}; padding: 24px; color: #ffffff;">
        <h1 style="margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">travelio</h1>
        <p style="margin: 6px 0 0 0; font-size: 13px; opacity: 0.9;">Kết quả xử lý yêu cầu ${typeLabel}</p>
      </div>
      <div style="padding: 24px; color: #1e293b; font-size: 14px; line-height: 1.6;">
        <p style="margin-top: 0;">Kính gửi <strong>${guestName || "Quý khách"}</strong>,</p>
        <p>Ban quản lý <strong>${facilityName || "cơ sở lưu trú"}</strong> đã có kết quả xử lý đối với <strong>yêu cầu ${typeLabel}</strong> của Quý khách cho đơn hàng <span style="background: #f1f5f9; padding: 2px 8px; border-radius: 6px; font-weight: 700;">#${bookingCode}</span>.</p>
        
        <div style="background: ${isApproved ? "#f0fdf4" : "#fff1f2"}; border: 1px solid ${isApproved ? "#bbf7d0" : "#fecdd3"}; border-radius: 12px; padding: 16px; margin: 20px 0;">
          <div style="font-size: 14px; font-weight: 700; color: ${isApproved ? "#166534" : "#991b1b"}; margin-bottom: 8px;">
            ${isApproved ? "ĐÃ ĐƯỢC CHẤP THUẬN" : "KHÔNG ĐƯỢC CHẤP THUẬN"}
          </div>
          <div style="font-size: 13px; color: #334155; line-height: 1.5;">
            ${decisionDetail.replace(/\n/g, "<br/>")}
          </div>
        </div>

        <p style="color: #64748b; font-size: 13px;">Nếu Quý khách có bất kỳ thắc mắc hoặc cần hỗ trợ thêm, vui lòng liên hệ trung tâm hỗ trợ khách hàng của Travelio.</p>
      </div>
      <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 24px; text-align: center; color: #94a3b8; font-size: 11px;">
        © ${new Date().getFullYear()} Travelio. All rights reserved.
      </div>
    </div>
  `;

  try {
    await transporter.sendMail({ from: sender, to: customerEmail, subject, text, html });
  } catch (err) {
    console.error("[Email Notification Error] Gửi mail kết quả xử lý thất bại:", err.message);
  }
};

module.exports = {
  assertSmtpConfigured,
  sendOtpEmail,
  sendPartnerReviewEmail,
  sendPayoutEmail,
  sendCancellationRequestEmail,
  sendCancellationDecisionEmail,
};
