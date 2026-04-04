阿里云后端部署（Express）— 使用说明

1. 将代码克隆到服务器，例如 /opt/haigui，在 backend 目录执行 npm ci --omit=dev。
2. 在 backend/.env 配置 DEEPSEEK_*、PORT=3001、HOST=0.0.0.0、CORS_ORIGINS（含你的前端 https 域名）。
3. 参考 pm2.ecosystem.cjs.example 复制为 ecosystem.config.cjs（或按其中参数直接 pm2 start）。
4. 参考 nginx-api.conf.example 配置 Nginx 反代到 127.0.0.1:3001，并配置 SSL。
5. 前端构建时设置 VITE_API_BASE_URL=https://你的 API 域名（无尾斜杠）。

以下文件仅为示例，不会被 Vite 或 Node 应用自动加载；修改它们不影响 Vercel / Railway 部署。
