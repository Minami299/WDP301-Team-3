const FILE_TYPES = {
  xlsx: { mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', signature: [0x50, 0x4b, 0x03, 0x04] },
  pdf: { mime: 'application/pdf', signature: [0x25, 0x50, 0x44, 0x46, 0x2d] },
};

export function reportErrorMessage(value, fallback) {
  if (value && typeof value === 'object' && typeof value.message === 'string') return value.message;
  if (typeof value !== 'string') return fallback;
  const message = value.trim();
  try { return reportErrorMessage(JSON.parse(message), fallback); } catch { /* Plain-text response. */ }
  // A proxy/login HTML page is not an export; do not display its markup.
  if (!message || /^\s*</.test(message)) return fallback;
  return message.slice(0, 500);
}

export async function validateReportDownload(blob, contentType, format) {
  const expected = FILE_TYPES[format];
  if (!expected) throw new Error('Định dạng báo cáo không hợp lệ.');
  const fallback = `Máy chủ không trả về file ${format === 'pdf' ? 'PDF' : 'Excel'} hợp lệ. Vui lòng kiểm tra backend và cấu hình API/proxy.`;
  if (!(blob instanceof Blob)) throw new Error(fallback);
  const mime = (contentType || blob.type || '').split(';')[0].trim().toLowerCase();
  const bytes = new Uint8Array(await blob.slice(0, 5).arrayBuffer());
  const signatureMatches = expected.signature.every((value, i) => bytes[i] === value);
  if ((mime === expected.mime || mime === 'application/octet-stream') && signatureMatches) return blob;
  const message = await blob.slice(0, 4096).text();
  const isTextError = mime.includes('json') || mime.startsWith('text/') || /^\s*[{<]/.test(message);
  throw new Error(isTextError ? reportErrorMessage(message, fallback) : fallback);
}
