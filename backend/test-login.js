const axios = require('axios');

async function testLogin() {
  try {
    console.log('测试登录 API...');
    console.log('URL: http://localhost:5000/api/auth/login');
    console.log('邮箱: paul09@126.com');

    const response = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'paul09@126.com',
      password: '123456'  // 尝试常见密码
    });

    console.log('\n✅ 登录成功!');
    console.log('Token:', response.data.token);
    console.log('用户信息:', response.data.user);
  } catch (error) {
    if (error.response) {
      console.log('\n❌ 登录失败:');
      console.log('状态码:', error.response.status);
      console.log('错误信息:', error.response.data);
    } else {
      console.log('\n❌ 请求失败:', error.message);
      console.log('提示: 请确保后端服务正在运行 (npm run dev)');
    }
  }
}

testLogin();
