const mongoose = require('mongoose');
const { User, Role, Facility, AuditLog } = require('../models');
const Application = require('../models/PartnerApplication');
const Document = require('../models/PartnerDocument');
const policy = require('./partnerPolicy');
const { permissionsOf } = require('../configs/permissions');
const { hashPassword } = require('../utils/password');
const { validatePartnerAccount } = require('./vendorRegistration.service');
const emailService = require('./email.service');
const authOtp = require('./authOtp.service');
const businessService = require('./partnerBusiness.service');

const assertId = id => { if (!mongoose.isValidObjectId(id)) throw policy.fail('Mã hồ sơ không hợp lệ'); };
const assertVersion = version => { if (!Number.isSafeInteger(version) || version < 0) throw policy.fail('Thiếu phiên bản hồ sơ hợp lệ'); };
const conflict = () => policy.fail('Hồ sơ đã thay đổi hoặc đã được xử lý. Vui lòng tải lại.', 409);
const summary = app => ({ id: app._id, status: app.status, role: app.role, version: app.version });
const account = async (id, session) => {
  const user = await User.findById(id).populate('role_id').session(session || null);
  if (!user || user.status !== 'ACTIVE') throw policy.fail('Tài khoản không hoạt động', 403);
  return user;
};
const assertApplicant = user => {
  if (user.role_id?.role_name !== 'CUSTOMER' || user.is_verified !== true) throw policy.fail('Vui lòng đăng nhập bằng tài khoản khách hàng đã xác minh email', 403);
};
const audit = async (actorId, app, action, previousStatus, session) => {
  // Store transition metadata only; no identity documents, credentials or profile snapshots.
  await AuditLog.create([{
    user_id: actorId, action, table_name: 'partner_applications', record_id: app._id,
    old_data: previousStatus ? { status: previousStatus } : null,
    new_data: { status: app.status, version: app.version },
  }], { session });
};
const ownerApplication = async (userId, session) => {
  const app = await Application.findOne({ user_id: userId }).session(session || null);
  if (!app) throw policy.fail('Không tìm thấy hồ sơ đối tác', 404);
  return app;
};
const assertEditable = app => { if (!policy.EDITABLE.includes(app.status)) throw policy.fail('Hồ sơ đã gửi hoặc kết thúc xét duyệt, không được chỉnh sửa', 409); };

async function register(payload) {
  const errors = validatePartnerAccount(payload);
  if (errors.length) throw policy.fail('Vui lòng kiểm tra thông tin tài khoản', 400, errors);
  const business = policy.normalizeBusiness(payload, payload.role_name);
  const email = payload.email.trim().toLowerCase();
  if (email.length > 320) throw policy.fail('Email quá dài', 400, [{ field: 'email', message: 'Email tối đa 320 ký tự' }]);
  if (await User.exists({ email })) throw policy.fail('Email đã được đăng ký. Vui lòng đăng nhập để tiếp tục hồ sơ.', 409, [{ field: 'email', message: 'Email đã được đăng ký' }]);
  emailService.assertSmtpConfigured();
  const role = await Role.findOne({ role_name: 'CUSTOMER' });
  if (!role) throw policy.fail('Vai trò CUSTOMER chưa được cấu hình', 503);
  const passwordHash = await hashPassword(payload.password);
  let user, app;
  try {
    await mongoose.connection.transaction(async session => {
      [user] = await User.create([{
        full_name: payload.full_name.trim(), email, password_hash: passwordHash,
        phone: business.phone, role_id: role._id, status: 'ACTIVE', is_verified: false,
      }], { session });
      [app] = await Application.create([{
        user_id: user._id, role: payload.role_name, business, status: 'DRAFT',
        history: [{ status: 'DRAFT', version: 0, at: new Date(), by: user._id }],
      }], { session });
      await audit(user._id, app, 'PARTNER_DRAFT_CREATED', null, session);
    });
  } catch (error) {
    if (error.code === 11000) throw policy.fail('Email hoặc hồ sơ đã tồn tại', 409);
    throw error;
  }
  let emailSent = true, delivery = { resendAfterSeconds: 60 };
  try { delivery = await authOtp.send(user, 'verification', 'verification'); }
  catch { emailSent = false; }
  return { verificationRequired: true, email, emailSent, ...delivery, registration: summary(app) };
}

async function startExisting(userId, payload) {
  if (payload.agree_terms !== true) throw policy.fail('Vui lòng đồng ý điều khoản tài khoản', 400, [{ field: 'agree_terms', message: 'Vui lòng đồng ý điều khoản' }]);
  const business = policy.normalizeBusiness(payload, payload.role_name);
  const user = await account(userId);
  assertApplicant(user);
  if (await Facility.exists({ vendor_id: userId })) throw policy.fail('Tài khoản đã có cơ sở kinh doanh', 409);
  const existing = await Application.findOne({ user_id: userId });
  if (existing) throw policy.fail('Tài khoản đã có hồ sơ. Mở mục Hồ sơ đối tác để tiếp tục.', 409);
  try {
    const app = await mongoose.connection.transaction(async session => {
      const [created] = await Application.create([{
        user_id: userId, role: payload.role_name, business, status: 'DRAFT',
        history: [{ status: 'DRAFT', version: 0, at: new Date(), by: userId }],
      }], { session });
      await audit(userId, created, 'PARTNER_DRAFT_CREATED', null, session);
      return created;
    });
    return { registration: summary(app) };
  } catch (error) {
    if (error.code === 11000) throw conflict();
    throw error;
  }
}

async function mine(userId) {
  const user = await account(userId);
  const app = await ownerApplication(userId);
  return { ...app.toObject(), applicant: { full_name: user.full_name, email: user.email, is_verified: user.is_verified } };
}

async function save(userId, payload) {
  assertVersion(payload.version);
  return mongoose.connection.transaction(async session => {
    const user = await account(userId, session);
    assertApplicant(user);
    const app = await ownerApplication(userId, session);
    assertEditable(app);
    const profile = policy.normalizeProfile(payload.profile ?? app.profile, app.role);
    const business = policy.normalizeBusiness(payload.business ?? app.business, app.role);
    const changes = { profile, business, consent: null };
    if (payload.consent && payload.consent.version === policy.TERMS_VERSION && policy.TERMS.every(term => payload.consent[term.key] === true)) {
      changes.consent = { version: policy.TERMS_VERSION, authority: true, agreement: true, privacy: true, at: new Date(), by: userId };
    }
    const updated = await Application.findOneAndUpdate({ _id: app._id, user_id: userId, status: { $in: policy.EDITABLE }, version: payload.version }, {
      $set: changes, $inc: { version: 1 },
      $push: { history: { status: app.status, version: payload.version + 1, at: new Date(), by: userId, reason: 'Cập nhật hồ sơ nháp' } },
    }, { new: true, runValidators: true, session });
    if (!updated) throw conflict();
    await audit(userId, updated, 'PARTNER_DRAFT_SAVED', app.status, session);
    return updated;
  });
}

async function submit(userId, payload) {
  assertVersion(payload.version);
  return mongoose.connection.transaction(async session => {
    const user = await account(userId, session);
    assertApplicant(user);
    const app = await ownerApplication(userId, session);
    assertEditable(app);
    policy.validateSubmission(app);
    const nextVersion = payload.version + 1;
    const updated = await Application.findOneAndUpdate({ _id: app._id, user_id: userId, status: { $in: policy.EDITABLE }, version: payload.version }, {
      $set: { status: 'PENDING', submitted_at: new Date(), submitted_email: user.email, submitted_version: nextVersion, review: null }, $inc: { version: 1 },
      $push: { history: { status: 'PENDING', version: nextVersion, at: new Date(), by: userId } },
    }, { new: true, runValidators: true, session });
    if (!updated) throw conflict();
    await audit(userId, updated, 'PARTNER_SUBMITTED', app.status, session);
    return updated;
  });
}

async function reviewer(actor, permission = 'users.lock', session) {
  const user = await account(actor.id, session);
  if (!['ADMIN', 'MANAGER'].includes(user.role_id?.role_name) || !permissionsOf(user.role_id).includes(permission)) throw policy.fail('Không có quyền xét duyệt hồ sơ đối tác', 403);
  return user;
}

async function list(actor, query) {
  await reviewer(actor);
  const filter = { status: query.status || 'PENDING' };
  if (!['PENDING', 'APPROVED', 'NEEDS_ADDITIONAL_INFO', 'REJECTED'].includes(filter.status)) throw policy.fail('Trạng thái không hợp lệ');
  if (query.role) { if (!policy.ROLES.includes(query.role)) throw policy.fail('Loại đối tác không hợp lệ'); filter.role = query.role; }
  const page = Math.max(1, Math.floor(Number(query.page) || 1));
  const limit = 15;
  const [items, total] = await Promise.all([
    Application.find(filter).select('user_id role status version submitted_at created_at review').populate('user_id', 'full_name email').sort({ submitted_at: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Application.countDocuments(filter),
  ]);
  return { items, total, page, pages: Math.max(1, Math.ceil(total / limit)) };
}

async function detail(actor, id) {
  assertId(id);
  await reviewer(actor);
  const app = await Application.findById(id).lean();
  if (!app) throw policy.fail('Không tìm thấy hồ sơ', 404);
  const user = await User.findById(app.user_id).select('full_name email is_verified status').lean();
  return { ...app, applicant: user };
}

async function review(actor, id, payload) {
  assertId(id); assertVersion(payload.version);
  const decision = payload.status;
  if (!['APPROVED', 'REJECTED', 'NEEDS_ADDITIONAL_INFO'].includes(decision)) throw policy.fail('Quyết định không hợp lệ');
  const reason = typeof payload.reason === 'string' ? payload.reason.trim() : '';
  if (reason.length > 1000 || (decision !== 'APPROVED' && !reason)) throw policy.fail('Vui lòng nhập lý do, tối đa 1000 ký tự');
  const extra = payload.required_documents ?? [];
  if (!Array.isArray(extra) || extra.some(kind => !policy.DOCUMENT_KINDS.includes(kind))) throw policy.fail('Loại tài liệu bổ sung không hợp lệ');
  if (decision !== 'NEEDS_ADDITIONAL_INFO' && extra.length) throw policy.fail('Chỉ yêu cầu tài liệu bổ sung trong quyết định cần bổ sung');
  let recipient;
  const result = await mongoose.connection.transaction(async session => {
    const staff = await reviewer(actor, 'users.lock', session);
    const app = await Application.findById(id).session(session);
    if (!app) throw policy.fail('Không tìm thấy hồ sơ', 404);
    if (String(app.user_id) === String(staff._id)) throw policy.fail('Không được tự xét duyệt hồ sơ', 403);
    if (app.status !== 'PENDING' || app.version !== payload.version || app.submitted_version !== app.version) throw conflict();
    const user = await account(app.user_id, session);
    assertApplicant(user);
    if (decision === 'APPROVED') {
      if (app.submitted_email !== user.email) throw policy.fail('Email đã thay đổi sau khi gửi hồ sơ. Yêu cầu bổ sung để đối tác gửi lại.', 409);
      policy.validateSubmission(app);
      if (!policy.CHECKS.every(key => payload.checklist?.[key] === true)) throw policy.fail('Phải hoàn tất từng mục kiểm tra trước khi duyệt');
    }
    const nextVersion = app.version + 1;
    const updated = await Application.findOneAndUpdate({ _id: id, status: 'PENDING', version: payload.version, submitted_version: payload.version }, {
      $set: {
        status: decision,
        required_documents: [...new Set([...app.required_documents, ...extra])],
        review: { by: staff._id, at: new Date(), reason, checklist: Object.fromEntries(policy.CHECKS.map(key => [key, payload.checklist?.[key] === true])), submitted_version: app.submitted_version },
      }, $inc: { version: 1 }, $push: { history: { status: decision, version: nextVersion, at: new Date(), by: staff._id, reason } },
    }, { new: true, runValidators: true, session });
    if (!updated) throw conflict();
    if (decision === 'APPROVED') {
      if (await Facility.exists({ vendor_id: user._id }).session(session)) throw policy.fail('Tài khoản đã có cơ sở. Vui lòng kiểm tra lại.', 409);
      const role = await Role.findOne({ role_name: app.role }).session(session);
      if (!role) throw policy.fail('Vai trò đối tác chưa được cấu hình', 503);
      const facility = await businessService.publishBusiness(user._id, app.role, app.business, session);
      const activated = await User.findOneAndUpdate({ _id: user._id, role_id: user.role_id._id, status: 'ACTIVE', is_verified: true }, { $set: {
        role_id: role._id, approvalStatus: 'APPROVED', approvalReviewedBy: staff._id, approvalReviewedAt: new Date(), rejectionReason: null,
      } }, { new: true, runValidators: true, session });
      if (!activated) throw conflict();
      updated.facility_id = facility._id;
      await updated.save({ session });
    }
    await audit(staff._id, updated, `PARTNER_${decision}`, app.status, session);
    recipient = { email: user.email, fullName: user.full_name, role: app.role };
    return updated;
  });
  let emailSent = true;
  try { await emailService.sendPartnerReviewEmail({ ...recipient, approved: decision === 'APPROVED', needsAdditionalInfo: decision === 'NEEDS_ADDITIONAL_INFO', reason }); }
  catch { emailSent = false; }
  return { application: result, emailSent };
}

function validateFile(file) {
  if (!file || !Buffer.isBuffer(file.buffer) || file.size !== file.buffer.length || file.size < 12 || file.size > 3 * 1024 * 1024) throw policy.fail('Mỗi tài liệu tối đa 3 MB');
  const bytes = file.buffer;
  const valid = (file.mimetype === 'application/pdf' && bytes.subarray(0, 5).toString() === '%PDF-' && bytes.subarray(-1024).includes(Buffer.from('%%EOF')))
    || (file.mimetype === 'image/png' && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])))
    || (file.mimetype === 'image/jpeg' && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 && bytes.at(-2) === 255 && bytes.at(-1) === 217);
  if (!valid) throw policy.fail('Chỉ nhận PDF, PNG hoặc JPEG đúng định dạng');
}

async function upload(userId, payload, file) {
  if (typeof payload.version !== 'string' || !/^\d+$/.test(payload.version)) throw policy.fail('Thiếu phiên bản hồ sơ hợp lệ');
  const version = Number(payload.version); assertVersion(version); validateFile(file);
  if (!policy.DOCUMENT_KINDS.includes(payload.kind)) throw policy.fail('Loại tài liệu không hợp lệ');
  return mongoose.connection.transaction(async session => {
    assertApplicant(await account(userId, session));
    const app = await ownerApplication(userId, session); assertEditable(app);
    if (app.documents.length >= 10 || app.documents.reduce((size, doc) => size + doc.size, 0) + file.size > 20 * 1024 * 1024) throw policy.fail('Tối đa 10 tài liệu, tổng dung lượng 20 MB');
    const documentId = new mongoose.Types.ObjectId();
    const metadata = { _id: documentId, kind: payload.kind, name: String(file.originalname || 'document').replace(/[\x00-\x1f\x7f\\/]/g, '_').slice(0, 160), mime: file.mimetype, size: file.size, uploaded_at: new Date() };
    const updated = await Application.findOneAndUpdate({ _id: app._id, user_id: userId, version, status: { $in: policy.EDITABLE } }, { $push: { documents: metadata }, $inc: { version: 1 } }, { new: true, runValidators: true, session });
    if (!updated) throw conflict();
    await Document.create([{ _id: documentId, application_id: app._id, data: file.buffer }], { session });
    await audit(userId, updated, 'PARTNER_DOCUMENT_UPLOADED', app.status, session);
    return updated;
  });
}

async function removeDocument(userId, documentId, payload) {
  assertId(documentId); assertVersion(payload.version);
  return mongoose.connection.transaction(async session => {
    assertApplicant(await account(userId, session));
    const app = await ownerApplication(userId, session); assertEditable(app);
    const updated = await Application.findOneAndUpdate({ _id: app._id, user_id: userId, version: payload.version, status: { $in: policy.EDITABLE }, 'documents._id': documentId }, { $pull: { documents: { _id: documentId } }, $inc: { version: 1 } }, { new: true, session });
    if (!updated) throw conflict();
    await Document.deleteOne({ _id: documentId, application_id: app._id }, { session });
    await audit(userId, updated, 'PARTNER_DOCUMENT_REMOVED', app.status, session);
    return updated;
  });
}

async function download(actor, documentId) {
  assertId(documentId);
  const app = await Application.findOne({ 'documents._id': documentId });
  if (!app) throw policy.fail('Không tìm thấy tài liệu', 404);
  if (String(app.user_id) !== String(actor.id)) await reviewer(actor);
  else await account(actor.id);
  const metadata = app.documents.find(doc => String(doc._id) === String(documentId));
  const document = await Document.findOne({ _id: documentId, application_id: app._id }).select('+data');
  if (!document) throw policy.fail('Không tìm thấy tài liệu', 404);
  return { metadata, data: document.data };
}

module.exports = { register, startExisting, mine, save, submit, list, detail, review, upload, removeDocument, download, validateFile };
