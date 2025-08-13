/**
 * FUCO Production System - JWT 認證測試
 * 測試新的 JWT 認證系統功能
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:8847';

// 測試用戶憑證
const testUsers = [
  { username: 'admin', password: 'admin123', role: 'admin' },
  { username: 'emp001', password: 'password', role: 'operator' },
  { username: 'supervisor', password: 'super123', role: 'supervisor' },
  { username: 'qc001', password: 'qc123', role: 'quality' }
];

async function testLogin(username, password) {
  try {
    console.log(`\n🔐 測試登入: ${username}`);
    
    const response = await axios.post(`${BASE_URL}/api/auth/login`, {
      username,
      password
    });
    
    if (response.data.success) {
      console.log('✅ 登入成功');
      console.log(`   用戶: ${response.data.user.name}`);
      console.log(`   角色: ${response.data.user.role}`);
      console.log(`   部門: ${response.data.user.department}`);
      console.log(`   權限: ${response.data.user.permissions.join(', ')}`);
      console.log(`   Token: ${response.data.token.substring(0, 50)}...`);
      return response.data.token;
    }
  } catch (error) {
    console.log('❌ 登入失敗');
    if (error.response) {
      console.log(`   錯誤: ${error.response.data.message}`);
      console.log(`   代碼: ${error.response.data.code}`);
    } else {
      console.log(`   錯誤: ${error.message}`);
    }
    return null;
  }
}

async function testProtectedEndpoint(token) {
  try {
    console.log('\n🛡️  測試受保護的端點');
    
    const response = await axios.get(`${BASE_URL}/api/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.data.success) {
      console.log('✅ 認證通過');
      console.log(`   用戶ID: ${response.data.user.id}`);
      console.log(`   用戶名: ${response.data.user.username}`);
      console.log(`   角色: ${response.data.user.role}`);
    }
  } catch (error) {
    console.log('❌ 認證失敗');
    if (error.response) {
      console.log(`   錯誤: ${error.response.data.message}`);
      console.log(`   代碼: ${error.response.data.code}`);
    }
  }
}

async function testTokenRefresh(token) {
  try {
    console.log('\n🔄 測試 Token 刷新');
    
    const response = await axios.post(`${BASE_URL}/api/auth/refresh`, {}, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.data.success) {
      console.log('✅ Token 刷新成功');
      console.log(`   新 Token: ${response.data.token.substring(0, 50)}...`);
      return response.data.token;
    }
  } catch (error) {
    console.log('❌ Token 刷新失敗');
    if (error.response) {
      console.log(`   錯誤: ${error.response.data.message}`);
      console.log(`   代碼: ${error.response.data.code}`);
    }
  }
  return null;
}

async function testInvalidCredentials() {
  try {
    console.log('\n🚫 測試錯誤憑證');
    
    await axios.post(`${BASE_URL}/api/auth/login`, {
      username: 'wronguser',
      password: 'wrongpass'
    });
    
    console.log('❌ 意外成功 - 應該要失敗');
  } catch (error) {
    if (error.response && error.response.status === 401) {
      console.log('✅ 正確拒絕錯誤憑證');
      console.log(`   錯誤: ${error.response.data.message}`);
      console.log(`   代碼: ${error.response.data.code}`);
    } else {
      console.log('❌ 意外錯誤');
      console.log(`   錯誤: ${error.message}`);
    }
  }
}

async function testUnauthorizedAccess() {
  try {
    console.log('\n🚫 測試未授權訪問');
    
    await axios.get(`${BASE_URL}/api/auth/me`);
    
    console.log('❌ 意外成功 - 應該要失敗');
  } catch (error) {
    if (error.response && error.response.status === 401) {
      console.log('✅ 正確拒絕未授權訪問');
      console.log(`   錯誤: ${error.response.data.message}`);
      console.log(`   代碼: ${error.response.data.code}`);
    } else {
      console.log('❌ 意外錯誤');
      console.log(`   錯誤: ${error.message}`);
    }
  }
}

async function runAllTests() {
  console.log('🧪 FUCO Production System - JWT 認證測試');
  console.log('='.repeat(50));
  
  // 測試健康檢查
  try {
    console.log('\n💓 測試伺服器健康狀態');
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    console.log('✅ 伺服器運行正常');
    console.log(`   狀態: ${healthResponse.data.status}`);
    console.log(`   版本: ${healthResponse.data.version}`);
  } catch (error) {
    console.log('❌ 伺服器無法連接');
    console.log('請確認伺服器已啟動在 port 8847');
    return;
  }
  
  // 測試所有用戶登入
  const tokens = {};
  for (const user of testUsers) {
    const token = await testLogin(user.username, user.password);
    if (token) {
      tokens[user.username] = token;
    }
  }
  
  // 測試受保護端點
  if (tokens.admin) {
    await testProtectedEndpoint(tokens.admin);
  }
  
  // 測試 Token 刷新
  if (tokens.admin) {
    const newToken = await testTokenRefresh(tokens.admin);
    if (newToken) {
      tokens.admin = newToken;
    }
  }
  
  // 測試錯誤情況
  await testInvalidCredentials();
  await testUnauthorizedAccess();
  
  console.log('\n🎉 JWT 認證測試完成');
  console.log('='.repeat(50));
}

if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = {
  testLogin,
  testProtectedEndpoint,
  testTokenRefresh,
  runAllTests
};
