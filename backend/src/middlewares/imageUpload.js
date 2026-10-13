const multer = require("multer");

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_IMAGES = 10;
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
  limits: { fileSize: MAX_IMAGE_SIZE, files: MAX_IMAGES },
  fileFilter(req, file, callback) {
    if (!Object.hasOwn(MIME_SIGNATURES, file.mimetype)) {
      const error = new Error("Images must be JPEG, PNG, or WebP");
      error.statusCode = 415;
      return callback(error);
    }
    callback(null, true);
  },
});

const fail = (res, status, message) =>
  res.status(status).json({ success: false, message });

// Accepts 1..MAX_IMAGES files in the "images" field and validates magic bytes.
const receiveImages = (req, res, next) => {
  upload.array("images", MAX_IMAGES)(req, res, (error) => {
    if (error) {
      if (error.code === "LIMIT_FILE_SIZE") {
        return fail(res, 413, "Each image must be 5 MB or smaller");
      }
      if (error.code === "LIMIT_FILE_COUNT" || error.code === "LIMIT_UNEXPECTED_FILE") {
        return fail(res, 400, `Send at most ${MAX_IMAGES} files in the "images" field`);
      }
      return fail(res, error.statusCode || 400, error.message);
    }
    if (!req.files?.length) {
      return fail(res, 400, 'At least one image is required in the "images" field');
    }
    for (const file of req.files) {
      if (!MIME_SIGNATURES[file.mimetype](file.buffer)) {
        return fail(res, 415, `File ${file.originalname} content does not match its image type`);
      }
    }
    next();
  });
};

module.exports = { receiveImages };
