/**
 * 測試和生成 bcrypt 密碼哈希
 */

const bcrypt = require('bcryptjs');

// 測試密碼
const passwords = [
  { username: 'admin', password: 'admin123' },
  { username: 'emp001', password: 'password' },
  { username: 'supervisor', password: 'super123' },
  { username: 'qc001', password: 'qc123' }
];

async function generateHashes() {
  console.log('🔐 生成正確的密碼哈希值:\n');
  
  for (const user of passwords) {
    const hash = await bcrypt.hash(user.password, 10);
    console.log(`${user.username}:`);
    console.log(`  密碼: ${user.password}`);
    console.log(`  哈希: ${hash}`);
    
    // 驗證哈希是否正確
    const isValid = await bcrypt.compare(user.password, hash);
    console.log(`  驗證: ${isValid ? '✅ 正確' : '❌ 錯誤'}\n`);
  }
}

async function testExistingHashes() {
  console.log('🧪 測試現有哈希值:\n');
  
  const existingHashes = {
    'admin': '$2a$10$rOy8KqZ1kMF8x9zW2YmKx.ULFqYkZ9JjQ8K2R4kLsYGpK4YzF5K6u',
    'emp001': '$2a$10$N9qo8uLOickgx2ZMRZoMo.AECWQWfNLHQ4kxYq4y4K4VQF4h8qz1K',
    'supervisor': '$2a$10$K7fCO8k4Qxl4H0dOEPzQyOqP8O9B0PQ3r1M.Nq5N6QrOEU8.Z9K2E',
    'qc001': '$2a$10$M8B0dH4E9Q5K.z2L3U6Y1eqo8xP9C0Q1rZ5mN4pQ.xR1D2E3F4G5H'
  };
  
  for (const user of passwords) {
    const hash = existingHashes[user.username];
    const isValid = await bcrypt.compare(user.password, hash);
    console.log(`${user.username} (${user.password}):`);
    console.log(`  現有哈希: ${hash}`);
    console.log(`  驗證結果: ${isValid ? '✅ 正確' : '❌ 錯誤'}\n`);
  }
}

async function runTests() {
  console.log('🔍 BCrypt 密碼測試');
  console.log('='.repeat(50));
  
  await testExistingHashes();
  console.log('='.repeat(50));
  await generateHashes();
}

if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { generateHashes, testExistingHashes };
