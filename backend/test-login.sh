#!/bin/bash

echo "测试登录 API..."
echo ""

response=$(curl -s -X POST 'http://localhost:5000/api/auth/login' \
  -H 'Content-Type: application/json' \
  -d '{"email":"paul09@126.com","password":"paul123456"}')

echo "$response"

if echo "$response" | grep -q '"token"'; then
  echo ""
  echo "✅ 登录成功!"
else
  echo ""
  echo "❌ 登录失败"
fi
