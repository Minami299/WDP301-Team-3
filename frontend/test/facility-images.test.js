import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getFacilityImageUrls } from '../src/utils/facilityImages.js';

const origin = 'https://api.example.test';

test('uses service photos when the attraction has no facility images', () => {
  assert.deepEqual(getFacilityImageUrls({
    primary_image: null, images: [],
    services: [{ photos: ['', null, '/uploads/activity.jpg'] }],
  }, origin), [`${origin}/uploads/activity.jpg`]);
});

test('prioritizes the cover and primary image, then valid gallery and service photos', () => {
  assert.deepEqual(getFacilityImageUrls({
    primary_image: '/cover.jpg',
    images: [
      null, { image_url: ' ' }, { image_url: 'javascript:invalid' },
      { image_url: '/gallery.jpg' }, { image_url: '/primary.jpg', is_primary: true },
      '/string-image.jpg',
    ],
    services: [{ photos: ['/gallery.jpg', '/service.jpg'] }],
  }, origin), ['/cover.jpg', '/primary.jpg', '/gallery.jpg', '/string-image.jpg', '/service.jpg'].map(path => origin + path));
});

test('resolves relative paths against the API origin and preserves external URLs', () => {
  assert.deepEqual(getFacilityImageUrls({ images: [
    ' uploads/relative.jpg ', '/uploads/root.jpg',
    'https://cdn.example.test/image.jpg', '//cdn.example.test/protocol-relative.jpg',
  ] }, origin), [
    `${origin}/uploads/relative.jpg`, `${origin}/uploads/root.jpg`,
    'https://cdn.example.test/image.jpg', 'https://cdn.example.test/protocol-relative.jpg',
  ]);
});

test('returns no image for missing or invalid image data', () => {
  for (const facility of [{}, { primary_image: ' ', images: [], services: [] }, {
    primary_image: {}, images: [null, {}, '', 'https://', 'file:///image.jpg'],
    services: [{ photos: [null, 42, 'data:text/html,invalid'] }],
  }]) {
    assert.deepEqual(getFacilityImageUrls(facility, origin), []);
  }
});
