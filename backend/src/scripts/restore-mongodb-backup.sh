#!/bin/bash

# MongoDB 数据恢复脚本
# 使用方法: ./restore-mongodb-backup.sh <backup-directory>

BACKUP_DIR=$1
DB_NAME="ess-platform"

if [ -z "$BACKUP_DIR" ]; then
  echo "错误: 请提供备份目录路径"
  echo "使用方法: ./restore-mongodb-backup.sh <backup-directory>"
  exit 1
fi

if [ ! -d "$BACKUP_DIR" ]; then
  echo "错误: 备份目录不存在: $BACKUP_DIR"
  exit 1
fi

echo "正在从备份恢复 MongoDB 数据库..."
echo "备份目录: $BACKUP_DIR"
echo "数据库名: $DB_NAME"
echo ""

# 恢复数据库
mongorestore --db $DB_NAME $BACKUP_DIR/$DB_NAME

if [ $? -eq 0 ]; then
  echo ""
  echo "✓ 数据库恢复成功"
else
  echo ""
  echo "✗ 数据库恢复失败"
  exit 1
fi
