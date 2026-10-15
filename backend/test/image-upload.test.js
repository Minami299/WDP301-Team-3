const { test, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
process.env.JWT_SECRET = 'image-upload-unit-test';
process.env.MONGODB_URI = 'mongodb://127.0.0.1/image-upload-not-connected';
process.env.CLOUDINARY_CLOUD_NAME = 'travelio-test';
const express = require('express');
const routes = require('../src/routes/upload.routes');
const storage = require('../src/services/avatar.service');
const { isUploadedImage, normalizeImageUrls, validateHotelImages } = require('../src/utils/cloudinaryImage');
const { normalizeService } = require('../src/services/vendorServiceFields');
const auth = require('../src/services/auth.service');
const { User } = require('../src/models');
const photo = 'https://res.cloudinary.com/travelio-test/image/upload/v1/travelio/attractions/services/photo.png';
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jq3sAAAAASUVORK5CYII=', 'base64');
afterEach(() => mock.restoreAll());

test('only HTTPS images from the configured Cloudinary cloud can be saved', () => {
  assert.equal(isUploadedImage(photo), true);
  assert.deepEqual(normalizeImageUrls([' ' + photo + ' '], 8), [photo]);
  for (const value of ['https://example.com/photo.jpg', photo.replace('https:', 'http:'), photo.replace('/travelio-test/', '/other-cloud/'), photo.replace('res.cloudinary.com/', 'res.cloudinary.com.evil.test/'), photo.replace('res.cloudinary.com/', 'evilres.cloudinary.com/'), photo.replace('/image/', '/raw/'), photo.replace('https://', 'https://user:pass@'), 'data:image/png;base64,abc', 'blob:local', null]) {
    assert.equal(isUploadedImage(value), false);
    assert.throws(() => normalizeImageUrls([value]), { statusCode: 400 });
  }
  assert.throws(() => normalizeImageUrls(Array(9).fill(photo), 8), { statusCode: 400 });
});
test('service validation and hotel registration reject pasted external image links', async () => {
  const service = { name: 'Vé tham quan', base_price: 150000, photos: [photo] };
  assert.deepEqual(normalizeService(service).photos, [photo]);
  assert.throws(() => normalizeService({ ...service, photos: ['https://example.com/image.jpg'] }), error => error.statusCode === 400 && error.errors[0].field === 'photos');
  assert.throws(() => validateHotelImages({ rooms: [{ photos: ['https://example.com/image.jpg'] }] }), error => error.errors[0].field === 'rooms.0.photos');
  mock.method(User, 'findOne', async () => null);
  const create = mock.method(User, 'create', async () => { throw Error('Must validate before creating an account'); });
  await assert.rejects(auth.register({ full_name: 'Hotel Test', email: 'hotel@example.com', password: 'Test123456', role_name: 'HOTEL_OWNER', facility_name: 'Hotel', facility_address: '123 Test', facility_city: 'Đà Nẵng', service_name: 'Phòng', service_price: 500000, photos: ['https://example.com/photo.jpg'] }), { statusCode: 400 });
  assert.equal(create.mock.callCount(), 0);
});

async function withApi(run) {
  const app = express(); app.use('/api/uploads', routes);
  const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  try { await run(`http://127.0.0.1:${server.address().port}/api/uploads/room-images`); }
  finally { await new Promise(resolve => server.close(resolve)); }
}
function form(files) {
  const body = new FormData();
  files.forEach(({ data = png, mime = 'image/png' }, index) => body.append('images', new Blob([data], { type: mime }), `photo-${index}.png`));
  return body;
}

test('multipart uploader validates bytes/type/size/count before calling Cloudinary', async () => {
  const upload = mock.method(storage, 'uploadBuffer', async () => ({ secureUrl: photo, publicId: 'test/photo' }));
  await withApi(async url => {
    for (const [body, status, query] of [[form([]), 400, ''], [form([{ mime: 'image/svg+xml' }]), 415, ''], [form([{ data: Buffer.from('not a PNG') }]), 415, ''], [form([{ data: Buffer.alloc(5 * 1024 * 1024 + 1) }]), 413, ''], [form(Array.from({ length: 9 }, () => ({}))), 400, '?type=TICKET']]) {
      const response = await fetch(url + query, { method: 'POST', body }); assert.equal(response.status, status, await response.text());
    }
    assert.equal(upload.mock.callCount(), 0);
  });
});
test('room and attraction uploads reuse the existing API and write to the right Cloudinary folders', async () => {
  const upload = mock.method(storage, 'uploadBuffer', async () => ({ secureUrl: photo, publicId: 'test/photo' }));
  await withApi(async url => {
    for (const [query, folder] of [['', 'travelio/rooms'], ['?type=TICKET', 'travelio/attractions']]) {
      const response = await fetch(url + query, { method: 'POST', body: form([{}]) });
      assert.equal(response.status, 201); assert.deepEqual((await response.json()).data, [photo]);
      assert.equal(upload.mock.calls.at(-1).arguments[3], folder);
    }
  });
});
test('a partial batch failure removes the images already uploaded and returns an error', async () => {
  let calls = 0;
  mock.method(storage, 'uploadBuffer', async () => { if (++calls === 2) throw Object.assign(Error('Cloudinary unavailable'), { statusCode: 502 }); return { secureUrl: photo, publicId: 'travelio/attractions/created-by-test' }; });
  const remove = mock.method(storage, 'deleteByPublicId', async () => {});
  await withApi(async url => {
    const response = await fetch(url + '?type=TICKET', { method: 'POST', body: form([{}, {}]) });
    assert.equal(response.status, 502); assert.equal((await response.json()).success, false);
    assert.equal(remove.mock.callCount(), 1); assert.equal(remove.mock.calls[0].arguments[0], 'travelio/attractions/created-by-test');
  });
});
test('frontend selection checks type/size/limit and only accepts uploaded image responses', async () => {
  const { validateImageFiles, isUploadedImage: accepts } = await import('../../frontend/src/utils/imageUpload.js');
  const file = { type: 'image/png', size: 1024 };
  assert.equal(validateImageFiles([file], 0, 8), '');
  assert.ok(validateImageFiles([file], 8, 8));
  assert.ok(validateImageFiles([{ ...file, size: 6 * 1024 * 1024 }]));
  assert.ok(validateImageFiles([{ ...file, type: 'image/svg+xml' }]));
  assert.ok(validateImageFiles([{ ...file, size: 0 }]));
  assert.equal(accepts(photo), true); assert.equal(accepts('https://example.com/photo.png'), false);
});
