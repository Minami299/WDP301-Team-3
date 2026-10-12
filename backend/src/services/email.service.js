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

module.exports = { assertSmtpConfigured, sendOtpEmail };
