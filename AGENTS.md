# Cursor 搭建指令（AI 海龟汤 MVP - V1.2）

本文档用于指导 Cursor 后续自动/半自动完成项目搭建与实现。请严格以 `PRD_V1_2.md` 为准，并与 `TECH_DESIGN.md` 保持一致。

---
## 1. 目标与成功标准（V1.2）

实现一个单人海龟汤 Web 游戏闭环：

1. 开始新游戏（随机抽题）
2. 展示题面（title + prompt）
3. 玩家多轮提问（AI 裁判：label + 不剧透回答）
4. 切换/提交猜答案（AI 评审：score + label + comment + success）
5. success 时展示完整故事并结束本局

验收必须满足（见 `PRD_V1_2.md` 第 13 节）：

- 能点击开始游戏
- 能看到题面
- 能连续问 >= 5 轮
- AI 返回符合标签规则（JudgeLabel）
- 能提交猜测（guessing）
- AI 返回评分 + GuessLabel
- 猜对后显示完整故事（来自成功响应）
- 不刷新也能完成一局（MVP 允许 session 丢失不视为失败，但单局流程必须通畅）

---
## 2. 技术栈与强约束（必须遵守）

### 2.1 技术栈（固定）

- 前端：React + TypeScript + Tailwind CSS
- 后端：Next.js（App Router）API Routes（Node 环境）
- AI：DeepSeek（固定 provider）
- 部署：Vercel

### 2.2 MVP 禁止项（写死）

禁止以下工程复杂度（避免 Cursor 生成过度设计）：

- 不做复杂状态管理（不引入 Redux / Zustand）
- 不做用户系统/账号体系
- 不做数据库（MVP 使用内存 Map 存 session）
- 不做流式响应（全部同步返回）
- 不做 websocket/长连接
- 前端不暴露任何 API Key

---
## 3. 代码生成的整体步骤（推荐顺序）

Cursor 在实现时按以下顺序推进（减少返工）：

1. 初始化 Next.js 项目（确保 App Router + TypeScript + Tailwind 可用）
2. 落地 `lib/types.ts`（Question/Session/Message/标签类型）
3. 落地题库：`data/questions.ts`（至少 5 题，含 title/prompt/story）
4. 落地后端会话层：
   - `lib/sessionStore.ts`：内存 Map
   - `lib/stateMachine.ts`：状态机校验（asking/guessing/success/ended）
5. 落地 LLM 层：
   - `lib/llmClient.ts`：对 DeepSeek 的统一调用
   - `lib/prompts.ts`：裁判/评审 Prompt（严格 JSON）
   - `lib/jsonUtil.ts`：严格 JSON 解析 + 简单修复重试策略
   - `lib/aiJudge.ts`：`judgeQuestion` / `evaluateGuess`
6. 实现 API 路由（按 TECH_DESIGN 的合同写）：
   - `POST /api/session`
   - `POST /api/session/:id/question`
   - `POST /api/session/:id/guess`
   - （可选）`POST /api/session/:id/startGuess`，但 MVP 可不暴露
7. 实现前端页面（按页面拆分建议）：
   - `HomePage`（开始游戏按钮）
   - `GamePage`（题面、对话历史、输入区、结果面板）
8. 将前端与 API 接起来，确保状态流转正确，并处理错误提示
9. 添加 `.env.example`（只列出后端需要的 DeepSeek 变量）
10. 本地跑通一局游戏，再考虑 Vercel 部署

---
## 4. 目录结构约定（与 TECH_DESIGN 一致）

建议目录结构（不强制，但文件命名与职责要一致）：

```text
app/
  page.tsx
  game/
    page.tsx
  api/
    session/
      route.ts
    session/
      [id]/
        question/
          route.ts
        guess/
          route.ts

components/
  HomePage.tsx
  GamePage.tsx
  QuestionCard.tsx
  ChatHistory.tsx
  InputBox.tsx
  ControlBar.tsx
  ResultPanel.tsx

data/
  questions.ts

lib/
  types.ts
  sessionStore.ts
  stateMachine.ts
  prompts.ts
  llmClient.ts
  aiJudge.ts
  jsonUtil.ts
```

---
## 5. API 合同（实现时不得偏离）

### 5.1 创建会话

- `POST /api/session`
- Response：

```json
{
  "sessionId": "xxx",
  "title": "题目标题",
  "prompt": "题面描述"
}
```

### 5.2 提问（裁判）

- `POST /api/session/:id/question`
- Request：

```json
{
  "question": "xxx"
}
```

- Response：

```json
{
  "label": "是的",
  "answer": "一句不超过20字的解释",
  "history": []
}
```

### 5.3 猜答案（评审）

- `POST /api/session/:id/guess`
- Request：

```json
{
  "guess": "xxx"
}
```

- Response（success=true）：

```json
{
  "score": 85,
  "label": "基本正确",
  "comment": "已抓住核心逻辑",
  "success": true,
  "story": "完整故事（仅成功返回）"
}
```

failure 时不返回 story（或返回 null，由实现决定，但前端必须容错）。

---
## 6. AI 提示词与 JSON 输出（必须严格执行）

### 6.1 裁判（Q&A）JSON schema

输出必须是严格 JSON（不得夹杂多余文本）：

```json
{
  "label": "是的 | 不是 | 无关紧要 | 有一定关系 | 未提及",
  "answer": "一句不超过20字的解释"
}
```

Prompt 组织要求：
- 强制不剧透，不复述完整故事
- answer 短、模糊但有帮助

### 6.2 评审（Guess）JSON schema

输出必须是严格 JSON：

```json
{
  "score": 0-100,
  "label": "基本正确 | 部分正确 | 明显错误",
  "comment": "简短评价（<=30字）",
  "success": true
}
```

判定规则：
- `score >= 80` => `success=true` 且 `label` 必须为“基本正确”

---
## 7. DeepSeek 接入（固定 provider）

### 7.1 环境变量（仅后端使用）

- `DEEPSEEK_API_KEY`
- `DEEPSEEK_BASE_URL`（默认 `https://api.deepseek.com`）
- `DEEPSEEK_MODEL`（默认 `deepseek-chat`；MVP 固定用 deepseek-chat 更稳）

安全要求：
- 不允许在前端出现 API Key
- 只在服务器端调用 DeepSeek

### 7.2 调用约束

- 不使用 stream（同步返回）
- temperature 建议低（0.0~0.3）以降低 JSON 偏移风险

---
## 8. 前端交互要求（GamePage）

状态：

- `status`：`asking | guessing | success`

流程：

1. `start new game`
   - 调用 `POST /api/session`
   - 保存 `sessionId`
   - status = `asking`
2. `提问`
   - status 必须在 `asking`（前端可限制按钮禁用）
   - 调用 `POST /api/session/:id/question`
   - 将 user 问题 + assistant 返回追加到 `messages`
3. `我要猜答案`
   - status = `guessing`
4. `提交猜测`
   - 调用 `POST /api/session/:id/guess`
   - 若 success：显示 story，status = `success`
   - 若失败：提示失败但允许继续提交

错误处理：
- session 不存在或状态错误：提示用户重新开始
- AI 不可用：提示稍后重试

---
## 9. 输出要求（给 Cursor 的“完成定义”）

当你完成后，请确保：

- `npm run dev` 能启动
- 在浏览器访问首页/游戏页能完成一局（至少 5 轮提问 + 1 次猜测）
- API 返回严格满足字段约定（前端不会因为字段名不一致而报错）
- AI 裁判/评审输出能稳定通过 JSON 解析（必要时 jsonUtil 做修复重试）

---
## 10. 后续扩展预留（但本次不做）

下一版可考虑：
- session 持久化（KV/Redis）
- 更强鲁棒性（去重、冷启动策略）
- 多人房间

本次 V1.2 不需要实现，但需要把设计留出可替换点（sessionStore 与 llmClient）。

