#!/bin/bash
set -e

# NetToolKit 统计服务端部署脚本
# 用法: ./deploy.sh

SERVER="neo@neowong.eu.org"
REMOTE_DIR="/opt/net-toolkit-stats"

echo "=== 部署 NetToolKit 统计服务端 ==="

# 打包
echo "打包文件..."
tar czf /tmp/net-toolkit-stats.tar.gz \
  --exclude='node_modules' \
  --exclude='data' \
  --exclude='.env' \
  -C . .

# 上传
echo "上传到服务器..."
scp /tmp/net-toolkit-stats.tar.gz $SERVER:/tmp/

# 部署
echo "部署..."
ssh $SERVER << 'EOF'
  mkdir -p /opt/net-toolkit-stats
  cd /opt/net-toolkit-stats
  tar xzf /tmp/net-toolkit-stats.tar.gz
  rm /tmp/net-toolkit-stats.tar.gz

  # 首次部署：生成随机密钥
  if [ ! -f .env ]; then
    JWT_SECRET=$(openssl rand -hex 32)
    ADMIN_PASSWORD=$(openssl rand -base64 16)
    cat > .env << ENVEOF
JWT_SECRET=$JWT_SECRET
ADMIN_PASSWORD=$ADMIN_PASSWORD
ENVEOF
    echo "=== 首次部署，已生成管理员密码 ==="
    echo "管理后台: https://neowong.eu.org/nettoolkit-stats/"
    echo "用户名: root"
    echo "密码: $ADMIN_PASSWORD"
    echo "请妥善保存！"
  fi

  source .env
  export JWT_SECRET ADMIN_PASSWORD

  # 启动
  docker compose down 2>/dev/null || true
  docker compose up -d --build

  echo "=== 部署完成 ==="
  echo "Dashboard: https://neowong.eu.org/nettoolkit-stats/"
EOF
