const cloudinary = require("cloudinary").v2;
const crypto = require("crypto");

const maskApiKey = (apiKey) =>
  apiKey ? `${apiKey.slice(0, 3)}***${apiKey.slice(-2)}` : null;

const redactMessage = (message) => {
  let safeMessage = String(message || "Cloudinary request failed");
  for (const secretName of ["CLOUDINARY_API_SECRET", "CLOUDINARY_API_KEY"]) {
    const secret = process.env[secretName];
    if (secret) safeMessage = safeMessage.split(secret).join("[redacted]");
  }
  return safeMessage
    .replace(/(api_secret\s*[=:]\s*)[^\s,&]+/gi, "$1[redacted]")
    .replace(/(signature\s*[=:]\s*)[^\s,&]+/gi, "$1[redacted]");
};

const cloudinaryErrorDetails = (error) => {
  const nested = error?.error;
  const httpCode =
    error?.http_code ||
    error?.httpCode ||
    nested?.http_code ||
    nested?.httpCode;
  const message =
    error?.message || nested?.message || "Cloudinary request failed";
  const normalizedMessage = `${message} ${nested?.message || ""}`.toLowerCase();
  let code = "CLOUDINARY_UPLOAD_FAILED";
  let clientMessage =
    "Avatar storage failed. Check Cloudinary logs and try again.";

  if (/invalid api[_ ]?key/.test(normalizedMessage)) {
    code = "CLOUDINARY_INVALID_API_KEY";
    clientMessage =
      "Cloudinary rejected the API Key. Check the Cloud Name and API Key pair.";
  } else if (
    /api[_ ]?secret mismatch|invalid signature/.test(normalizedMessage)
  ) {
    code = "CLOUDINARY_SIGNATURE_MISMATCH";
    clientMessage =
      "Cloudinary rejected the request signature. Check the API Secret matches this API Key.";
  } else if (
    /missing permissions|actions=.*create|permission denied/.test(
      normalizedMessage,
    )
  ) {
    code = "CLOUDINARY_CREATE_PERMISSION_MISSING";
    clientMessage =
      "This Cloudinary API Key is missing asset-create permission. Enable upload/create access for the key.";
  } else if (
    /account.{0,30}(disabled|suspend|restrict)|(?:disabled|suspended|restricted).{0,30}account/.test(
      normalizedMessage,
    )
  ) {
    code = "CLOUDINARY_ACCOUNT_RESTRICTED";
    clientMessage =
      "Cloudinary has restricted this account. Check account status or contact the Cloudinary administrator.";
  } else if (Number(httpCode) === 403) {
    code = "CLOUDINARY_UPLOAD_FORBIDDEN";
    clientMessage =
      "Cloudinary authenticated the account but denied image upload. Check upload permissions, account status, or plan restrictions.";
  }

  return {
    code,
    clientMessage,
    log: {
      message: redactMessage(message),
      http_code: error?.http_code || nested?.http_code,
      httpCode: error?.httpCode || nested?.httpCode,
      name: error?.name || nested?.name,
      nestedMessage: nested?.message
        ? redactMessage(nested.message)
        : undefined,
      requestId:
        error?.request_id ||
        error?.requestId ||
        nested?.request_id ||
        nested?.requestId ||
        null,
    },
  };
};

const assertConfigured = () => {
  const configuration = {
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
  };
  const placeholder = (value) =>
    !value || /^(your[-_ ]|replace[-_ ]|change[-_ ]|<)/i.test(value.trim());
  const missing = Object.entries(configuration)
    .filter(([, value]) => placeholder(value))
    .map(([key]) => key);
  if (missing.length) {
    const error = new Error(
      `Avatar storage is not configured with real credentials. Check: ${missing.join(", ")}`,
    );
    error.statusCode = 503;
    throw error;
  }
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
  const activeConfiguration = cloudinary.config();
  // console.info("Cloudinary runtime configuration", {
  //   cloudName: activeConfiguration.cloud_name,
  //   apiKeyMasked: maskApiKey(activeConfiguration.api_key),
  //   apiSecretLoaded: Boolean(activeConfiguration.api_secret),
  //   cloudinaryUrlPresent: Boolean(process.env.CLOUDINARY_URL),
  //   valuesMatchEnvironment:
  //     activeConfiguration.cloud_name === process.env.CLOUDINARY_CLOUD_NAME &&
  //     activeConfiguration.api_key === process.env.CLOUDINARY_API_KEY &&
  //     activeConfiguration.api_secret === process.env.CLOUDINARY_API_SECRET,
  // });
};

const uploadBuffer = async (
  buffer,
  userId,
  mimeType = "image/png",
  folder = "travelio/profiles",
) => {
  assertConfigured();
  const config = cloudinary.config();
  const parameters = {
    folder,
    invalidate: true,
    overwrite: false,
    public_id: `${String(userId)}/${crypto.randomUUID()}`,
    timestamp: Math.floor(Date.now() / 1000),
  };
  const signature = cloudinary.utils.api_sign_request(
    parameters,
    config.api_secret,
  );
  const form = new FormData();
  for (const [key, value] of Object.entries(parameters)) {
    form.append(key, String(value));
  }
  form.append("api_key", config.api_key);
  form.append("signature", signature);
  form.append("file", new Blob([buffer], { type: mimeType }), "avatar");

  let response;
  try {
    response = await fetch(
      `https://api.cloudinary.com/v1_1/${encodeURIComponent(config.cloud_name)}/image/upload`,
      { method: "POST", body: form },
    );
  } catch (error) {
    const details = cloudinaryErrorDetails(error);
    console.error("Cloudinary avatar upload failed", details.log);
    const uploadError = new Error(
      "Cannot connect to Cloudinary. Check the backend network connection and try again.",
    );
    uploadError.statusCode = 502;
    uploadError.code = "CLOUDINARY_NETWORK_ERROR";
    throw uploadError;
  }

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const providerError = new Error(
      body.error?.message || `Cloudinary returned HTTP ${response.status}`,
    );
    providerError.name = "CloudinaryUploadError";
    providerError.http_code = response.status;
    providerError.request_id =
      response.headers.get("x-cld-request-id") ||
      response.headers.get("x-request-id") ||
      undefined;
    const details = cloudinaryErrorDetails(providerError);
    console.error("Cloudinary avatar upload failed", details.log);
    const uploadError = new Error(details.clientMessage);
    uploadError.statusCode = 502;
    uploadError.code = details.code;
    throw uploadError;
  }

  return { secureUrl: body.secure_url, publicId: body.public_id };
};

const publicIdFromUrl = (imageUrl) => {
  if (!imageUrl) return null;
  try {
    const parsed = new URL(imageUrl);
    if (!parsed.hostname.endsWith("res.cloudinary.com")) return null;
    const uploadPath = parsed.pathname.split("/upload/")[1];
    if (!uploadPath) return null;
    const segments = uploadPath.split("/").filter(Boolean);
    if (/^v\d+$/.test(segments[0] || "")) segments.shift();
    if (!segments.length) return null;
    segments[segments.length - 1] = segments[segments.length - 1].replace(
      /\.[^.]+$/,
      "",
    );
    return segments.join("/");
  } catch {
    return null;
  }
};

const deleteByPublicId = async (publicId) => {
  if (!publicId) return;
  assertConfigured();
  await cloudinary.uploader.destroy(publicId, {
    resource_type: "image",
    invalidate: true,
  });
};

module.exports = {
  uploadBuffer,
  publicIdFromUrl,
  deleteByPublicId,
  cloudinaryErrorDetails,
};
