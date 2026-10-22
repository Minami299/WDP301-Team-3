const express = require('express');
const multer = require('multer');
const { verifyToken } = require('../middlewares/authMiddleware');
const applications = require('../services/partnerApplication.service');
const policy = require('../services/partnerPolicy');

const router = express.Router();
const handle = (handler, status = 200) => async (req, res, next) => {
  try { res.status(status).json({ success: true, data: await handler(req) }); }
  catch (error) { next(error); }
};

router.get('/policy', (_req, res) => res.json({ success: true, data: {
  version: policy.TERMS_VERSION, terms: policy.TERMS,
  document_kinds: policy.DOCUMENT_KINDS, checklist: policy.CHECKS,
  notice: 'Chính sách demo Travelio, xét duyệt thủ công bằng tài liệu giả lập. Danh mục này không phải kết luận về giấy phép bắt buộc theo pháp luật Việt Nam.',
  // Proposal for the team to ratify; no scheduled deletion or migration runs here.
  retention_proposal: { draft_days: 30, rejected_days: 90, approved: 'During the partnership and the applicable retention period', automated_deletion: false },
} }));
router.use(verifyToken);
router.get('/mine', handle(req => applications.mine(req.user.id)));
router.put('/mine', handle(req => applications.save(req.user.id, req.body)));
router.post('/mine/submit', handle(req => applications.submit(req.user.id, req.body)));
const receiveDocument = multer({ storage: multer.memoryStorage(), limits: { fileSize: 3 * 1024 * 1024, files: 1, fields: 2, parts: 3, fieldSize: 100 } }).single('document');
router.post('/mine/documents', (req, res, next) => receiveDocument(req, res, error => {
  if (error) return next(policy.fail('Tài liệu không hợp lệ. Chọn một file PDF/PNG/JPEG tối đa 3 MB.'));
  next();
}), handle(req => applications.upload(req.user.id, req.body, req.file), 201));
router.delete('/mine/documents/:id', handle(req => applications.removeDocument(req.user.id, req.params.id, req.body)));
router.get('/documents/:id', async (req, res, next) => {
  try {
    const { metadata, data } = await applications.download(req.user, req.params.id);
    res.set({
      'Content-Type': metadata.mime, 'Content-Length': String(data.length),
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(metadata.name)}`,
      'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff',
    }).send(data);
  } catch (error) { next(error); }
});
router.get('/reviews', handle(req => applications.list(req.user, req.query)));
router.get('/reviews/:id', handle(req => applications.detail(req.user, req.params.id)));
router.post('/reviews/:id', handle(req => applications.review(req.user, req.params.id, req.body)));

module.exports = router;
