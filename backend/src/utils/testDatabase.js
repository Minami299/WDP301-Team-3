function assertTestDatabase(uri) {
  const name = new URL(uri).pathname.slice(1);
  if (!/(?:^|_)(?:test|demo|qa)$/.test(name)) {
    throw new Error('Seed/mock và script tạo dữ liệu QA chỉ được chạy trên database có hậu tố _test, _demo hoặc _qa; không được dùng database ứng dụng.');
  }
}

module.exports = { assertTestDatabase };
