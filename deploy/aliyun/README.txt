阿里云部署教程（前端静态 + 后端 Express）
============================================
说明：本目录文件仅为示例，不参与项目构建；与 Vercel / Railway / Cloudflare 并行时，仅各平台环境变量不同。

一、服务器上的目录（与当前仓库一致）
------------------------------------
若使用「git clone <仓库地址>」且未加末尾的点，仓库会落在子目录 vibe-coding 下：

  /opt/haigui/vibe-coding/          ← 仓库根（含 src、backend、deploy 等）
  /opt/haigui/vibe-coding/backend/  ← Node 后端（server.js、package.json）

若希望代码直接在 /opt/haigui/ 下（无 vibe-coding 这一层），克隆时使用：
  cd /opt/haigui && git clone --depth 1 <仓库HTTPS> .

下文按「已存在 /opt/haigui/vibe-coding/」书写。

二、你已进行到「编辑 .env」之后：后端
------------------------------------
1）进入后端并安装依赖（仅首次或依赖变更时）

  cd /opt/haigui/vibe-coding/backend
  npm ci --omit=dev

2）用 vi 或 nano 编辑环境变量（与仓库中 backend/.env.example 对应）

  vi /opt/haigui/vibe-coding/backend/.env

  至少包含：
  - PORT=3001
  - HOST=0.0.0.0
  - DEEPSEEK_API_KEY=（密钥仅写在服务器，勿提交 Git）
  - DEEPSEEK_BASE_URL、DEEPSEEK_MODEL（可选，与本地一致即可）
  - CORS_ORIGINS= 浏览器访问前端的完整 origin，多个用英文逗号，无尾斜杠
    例：https://你的域名.com,http://localhost:5173

  vi 保存退出：Esc 后输入 :wq 回车

3）启动与开机自启（PM2）

  cd /opt/haigui/vibe-coding/backend
  pm2 start server.js --name haigui-api
  pm2 save
  pm2 startup
  （按屏幕提示执行一条 sudo 命令）

4）本机自检

  curl -s http://127.0.0.1:3001/api/test

  应返回 JSON。勿长期把 3001 暴露到公网，对外用 Nginx 80/443 反代。

5）可选：使用 pm2.ecosystem.cjs.example

  复制为 backend/ecosystem.config.cjs，其中 cwd 已写为
  /opt/haigui/vibe-coding/backend
  然后：pm2 start ecosystem.config.cjs

三、Nginx 反代 + HTTPS（对外域名）
------------------------------------
1）阿里云控制台「防火墙 / 安全组」放行 80、443（及 22 SSH）。
2）域名解析到服务器公网 IP；大陆域名对公网建站通常需备案（以控制台提示为准）。
3）参考本目录 nginx-api.conf.example，把 proxy_pass 指向 http://127.0.0.1:3001，
   server_name 改为你的 API 域名，证书路径改为实际上传路径。
4）测试：curl -s https://你的API域名/api/test

四、前端（静态资源）
------------------------------------
前端是 Vite 构建产物 dist/，不在服务器上跑 Node。

1）在本地或 CI 构建（构建时注入后端地址，无尾斜杠）：

  export VITE_API_BASE_URL=https://你的API域名
  npm ci && npm run build

2）部署方式任选其一：
  - 上传到 OSS 并开启静态网站托管，绑定域名与 HTTPS；或
  - 将 dist/ 内文件拷到本机 Nginx 的 root 目录，由 Nginx 提供静态访问。

3）将前端访问地址（https://...）加入后端 CORS_ORIGINS，保存后重启 PM2 或 reload 环境。

4）SPA 路由：Nginx/OSS 需配置「无匹配文件时回退到 index.html」（与 Cloudflare 上类似）。

五、与 Vercel + Railway 并存
------------------------------------
同一套代码：阿里云上单独配置 .env 与 CORS_ORIGINS；前端各环境各自设置 VITE_API_BASE_URL。
勿把服务器 .env 提交到 Git。
