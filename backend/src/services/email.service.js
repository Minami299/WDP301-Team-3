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

module.exports = { assertSmtpConfigured, sendOtpEmail, sendPartnerReviewEmail, sendPayoutEmail };
