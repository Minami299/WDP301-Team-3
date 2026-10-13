const multer = require("multer");

const MAX_AVATAR_SIZE = 5 * 1024 * 1024;
const MIME_SIGNATURES = {
  "image/jpeg": (buffer) =>
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff,
  "image/png": (buffer) =>
    buffer.length >= 8 &&
    buffer
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  "image/webp": (buffer) =>
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP",
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_AVATAR_SIZE, files: 1 },
  fileFilter(req, file, callback) {
    if (!Object.hasOwn(MIME_SIGNATURES, file.mimetype)) {
      const error = new Error("Avatar must be a JPEG, PNG, or WebP image");
      error.statusCode = 415;
      return callback(error);
    }
    callback(null, true);
  },
});

const receiveAvatar = (req, res, next) => {
  upload.single("avatar")(req, res, (error) => {
    if (error) {
      return res
        .status(
          error.statusCode || (error.code === "LIMIT_FILE_SIZE" ? 413 : 400),
        )
        .json({
          success: false,
          message:
            error.code === "LIMIT_FILE_SIZE"
              ? "Avatar must be 5 MB or smaller"
              : error.message,
        });
    }
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "Avatar file is required" });
    }
    if (!MIME_SIGNATURES[req.file.mimetype](req.file.buffer)) {
      return res
        .status(415)
        .json({
          success: false,
          message: "Avatar file content does not match its image type",
        });
    }
    next();
  });
};

module.exports = { receiveAvatar };
