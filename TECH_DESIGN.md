# 技术设计文档（V1.2 / MVP-Ready）

> 目标：保证你能在 Cursor 里按本文档直接生成可运行代码，并实现“看题面 -> 问问题 -> AI裁判 -> 猜答案 -> AI评分 -> 通关展示故事”的完整闭环。

---
## 1. 总体架构

采用 **Next.js（App Router）+ 前后端同仓** 的形式来满足 Vercel 部署便利性，同时对外提供 REST 风格 API。

- 前端：React + TypeScript + Tailwind
- 后端：Next.js API Routes（运行在 Node.js 环境）
- AI：DeepSeek / Claude（后端通过环境变量选择 provider）
- 状态：MVP 使用**内存 Map** 保存会话（不引入数据库）

---
## 2. 模块划分与职责

### 2.1 前端模块

- `HomePage`：显示规则摘要与“开始新游戏”
- `GamePage`：展示题面、对话历史、输入框、结果面板，并维护 `sessionId/status/messages`
- 组件拆分（MVP 必要即可）：
  - `QuestionCard`
  - `ChatHistory`
  - `InputBox`
  - `ControlBar`
  - `ResultPanel`

### 2.2 后端模块

- `questions`：静态题库（至少 5 题）
- `sessionStore`：内存会话存储（Map）
- `stateMachine`：会话状态机与后端校验（asking/guessing/success/ended）
- `aiJudge`：
  - `judgeQuestion`：Q&A 裁判（输出 JudgeLabel + 简短 answer）
  - `evaluateGuess`：评审（输出 score/label/comment/success，必要时返回 story）
- `llmClient`：对 DeepSeek / Claude 做统一封装（统一输入输出，后续可替换 provider）

---
## 3. 建议目录结构（Next.js App Router）

下面给出一套“写代码时最容易对齐”的目录建议：

```text
/
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
  styles/
    globals.css
```

说明：
- `app/page.tsx` 可以直接复用 `HomePage`，`app/game/page.tsx` 复用 `GamePage`。
- 若你不想使用 `components/`，也可以把组件都放进 `app/game` 目录，但结构会稍乱。

---
## 4. 数据模型（与 PRD_v1.2 强一致）

### 4.1 类型定义（`lib/types.ts`）

```ts
export type Question = {
  id: string
  title: string
  prompt: string
  story: string
  tags?: string[]
  difficulty?: 1 | 2 | 3 | 4 | 5
}

export type JudgeLabel =
  | "是的"
  | "不是"
  | "无关紧要"
  | "有一定关系"
  | "未提及"

export type GuessLabel =
  | "基本正确"
  | "部分正确"
  | "明显错误"

export type Message = {
  role: "user" | "assistant"
  content: string
  label?: JudgeLabel
  createdAt: number
}

export type Session = {
  sessionId: string
  questionId: string
  status: "asking" | "guessing" | "success" | "ended"
  history: Message[]
  createdAt: number
}
```

### 4.2 会话存储（`lib/sessionStore.ts`）

MVP：使用内存 Map。

```ts
const sessions = new Map<string, Session>()
```

注意：
- Vercel Serverless 可能导致冷启动后内存丢失；MVP 接受该不完美，但**保证单次请求链路内的流程正确**。
- 设计上可加一个“前端无需强依赖跨刷新”的提示（PRD 已说明不把会话丢失当失败条件）。

---
## 5. 会话状态机与后端校验（`lib/stateMachine.ts`）

### 5.1 状态转换

```text
[asking] → startGuess/或首次 guess → [guessing]
[guessing] → guess submit：
  -> success (score >= 80) -> [success]
  -> fail -> stay [guessing]
[success] -> ended
[ended] -> reject all
```

### 5.2 校验规则（必须在后端执行）

- `asking`：只允许 `question`，拒绝 `guess`
- `guessing`：只允许 `guess`，拒绝或不推荐 `question`
- `success/ended`：拒绝任何交互

建议：
- 在每个 API Route 开头先读取 session，再校验 status。
- 校验失败返回 `400`（或 `409`）并给出错误码，前端据此提示用户。

---
## 6. API 设计（Next.js API Routes）

以下接口与 PRD_v1.2 保持一致：以 `sessionId` 为中心。

### 6.1 创建会话

`POST /api/session`

Request：无或空 body

Response：

```json
{
  "sessionId": "xxx",
  "title": "题目标题",
  "prompt": "题面描述"
}
```

后端逻辑：
1. 随机挑选题目 `Question`
2. 生成 `sessionId`（UUID）
3. 初始化 `Session`：`status = "asking"`, `history=[]`
4. 写入 `sessionStore`
5. 返回 `title/prompt` 给前端

### 6.2 提问（裁判）

`POST /api/session/:id/question`

Request：

```json
{
  "question": "xxx"
}
```

Response：

```json
{
  "label": "是的",
  "answer": "一句不超过20字的解释",
  "history": [
    { "role": "user", "content": "xxx", "createdAt": 0 },
    { "role": "assistant", "content": "一句不超过20字的解释", "label": "是的", "createdAt": 0 }
  ]
}
```

后端逻辑：
1. 校验 session.status 必须是 `asking`
2. 将玩家问题写入 `history`（role=user）
3. 调用 `aiJudge.judgeQuestion(story, history, question)`
4. 写入裁判消息（role=assistant, label=JudgeLabel）
5. 返回裁判输出与（可选）更新后的 history

### 6.3 切换到猜答案阶段（可选接口）

PRD 允许可选：

`POST /api/session/:id/startGuess`

Response：

```json
{
  "status": "guessing"
}
```

实现建议：
- 为简化前端，可不暴露此接口：前端切换“我要猜答案”时直接调用 `/guess`，后端在 `guess` 时若 status=asking 则自动转为 `guessing`（但仍需符合状态机校验策略）。

### 6.4 猜答案（评审）

`POST /api/session/:id/guess`

Request：

```json
{
  "guess": "xxx"
}
```

Response（失败）：

```json
{
  "score": 45,
  "label": "部分正确",
  "comment": "简短评价",
  "success": false
}
```

Response（成功）：

```json
{
  "score": 85,
  "label": "基本正确",
  "comment": "已抓住核心逻辑",
  "success": true,
  "story": "完整故事（仅成功返回）"
}
```

后端逻辑：
1. 允许状态：
   - `guessing`：正常评审
   - `asking`：若你不提供 `startGuess` 接口，允许在这里将其置为 `guessing`
2. 调用 `aiJudge.evaluateGuess(story, guess)`
3. 若 `success=true`：置 session.status = `success`（再进入 ended）
4. 成功返回 `story`，失败不返回 `story`

---
## 7. LLM 调用设计（`lib/llmClient.ts` + `lib/aiJudge.ts`）

### 7.1 统一调用接口

建议让 `aiJudge` 不关心 provider，只关心结构化输入输出：

- `judgeQuestion(story, history, question) -> { label, answer }`
- `evaluateGuess(story, guess) -> { score, label, comment, success, story? }`

### 7.2 Prompt 组织（`lib/prompts.ts`）

- 裁判 Prompt：强制输出严格 JSON，字段仅包含 `label/answer`
- 评审 Prompt：强制输出严格 JSON，字段仅包含 `score/label/comment/success`
- 两者都必须强调“不剧透关键剧情/结局”

### 7.3 JSON 解析与容错（`lib/jsonUtil.ts`）

MVP 允许简单实现，但要考虑 LLM 可能输出了多余文本。

建议策略（按从简单到稳健）：
1. 尝试 `JSON.parse(text)`
2. 若失败：尝试提取第一个 `{ ... }` 子串再 parse
3. 仍失败：进行一次“修复 JSON”的重试（可选）

重试建议：
- 重试时只让模型“把你刚才的输出修成严格 JSON，不要改语义”，以降低成本和偏移风险。

---
## 8. 题库管理（`data/questions.ts`）

要求：
- 至少 5 题
- 每题字段：`id/title/prompt/story`，可选 `tags/difficulty`
- `story` 只用于后端给模型裁判/评审，不应在任何 API（失败态）直接返回

随机抽题：
- 使用内置数组随机选择
- 如需避免重复，可引入简单去重逻辑（MVP 先不做）

---
## 9. 前端数据流与状态（GamePage）

### 9.1 前端状态（PRD 强烈建议“别过度设计”）

- `sessionId: string`
- `status: "asking" | "guessing" | "success"`
- `messages: MessageLike[]`（展示用，可把 label 一并渲染）
- `input: string`
- `guessInput: string`（猜答案阶段）

### 9.2 用户交互流程

1. 点击“开始新游戏”
   - `POST /api/session`
   - 保存 `sessionId`，渲染 `title/prompt`
   - `status = "asking"`
2. 提问
   - 点击“提问”按钮
   - `POST /api/session/:id/question`
   - 把返回的裁判 `label/answer` 追加到 `messages`
3. 切换到“我要猜答案”
   - 前端将输入区切换到 guessInput
   - `status = "guessing"`（仅前端 UI 状态）
4. 提交猜测
   - `POST /api/session/:id/guess`
   - 若 `success=true`：展示返回 `story`，`status="success"`
   - 若失败：保持在 guess 阶段，继续输入

---
## 10. 错误处理规范（前后端）

### 10.1 后端错误响应格式（建议）

```json
{
  "error": {
    "code": "INVALID_STATUS" ,
    "message": "当前状态不允许该操作"
  }
}
```

常见错误码：
- `INVALID_STATUS`：状态不允许
- `SESSION_NOT_FOUND`：sessionId 不存在
- `LLM_OUTPUT_INVALID`：模型返回非预期 JSON
- `UPSTREAM_ERROR`：provider 调用失败

### 10.2 前端提示

- 对 `INVALID_STATUS/SESSION_NOT_FOUND`：提示用户重新开始
- 对 LLM 相关错误：提示“AI 暂时不可用，请稍后重试”

---
## 11. 环境变量（Vercel）

后端环境变量建议：

- `MODEL_PROVIDER`：固定为 `deepseek`（V1.2 选择 DeepSeek）
- `DEEPSEEK_API_KEY`
- `DEEPSEEK_BASE_URL`：默认 `https://api.deepseek.com`（可选，方便走代理/网关）
- `DEEPSEEK_MODEL`：默认 `deepseek-chat`（可选；也可用 `deepseek-reasoner`）
- `DEEPSEEK_MAX_TOKENS`：默认 512（可选）

安全要求：
- 前端绝不读取 API Key
- 在服务器端完成所有 LLM 调用

---
## 12. 部署注意事项（Vercel）

1. **内存 Map 存 session 属于 MVP 方案**：冷启动/扩缩容可能导致 session 丢失
2. 为满足 PRD 验收重点（“能玩完整一局”），保证一次会话内的流程稳定即可
3. 若你后续想做更稳，可将 sessionStore 替换为 KV/Redis，但这超出 V1.2 MVP 范围

---
## 13. MVP 验收对应的实现检查表

- 能点击开始游戏：实现 `POST /api/session`
- 能看到题面：返回 `title/prompt`
- 能连续问 >= 5 轮：`history` 每次追加并传入裁判 Prompt
- AI 返回符合标签规则：JudgeLabel/GuessLabel 受类型与 JSON schema 强制
- 能提交猜测：实现 `POST /api/session/:id/guess`
- 猜对后显示完整故事：仅 success 返回 `story`
- 不刷新也能完成一局：前端持有 `sessionId/status` 并顺序调用 API

---
## 14. DeepSeek API 接入规范（V1.2 固化）

### 14.1 基础信息

- **Base URL**：`https://api.deepseek.com`
- **Chat Completions**：`POST /chat/completions`
- **模型建议**
  - `deepseek-chat`：默认用于 MVP（输出更稳定、成本更低）
  - `deepseek-reasoner`：可选（推理更强，但会返回 `reasoning_content`，且部分参数/能力受限）

### 14.2 请求格式（后端到 DeepSeek）

HTTP Header：
- `Authorization: Bearer ${DEEPSEEK_API_KEY}`
- `Content-Type: application/json`

Body（示例，按 DeepSeek Chat Completions 兼容格式组织）：

```json
{
  "model": "deepseek-chat",
  "messages": [
    { "role": "system", "content": "系统提示词..." },
    { "role": "user", "content": "用户输入..." }
  ],
  "temperature": 0.2,
  "max_tokens": 512,
  "stream": false
}
```

注意：
- V1.2 **不使用 stream**（与 PRD 保持一致）。
- 为保证标签与结构化输出，`temperature` 建议低一些（例如 0.0～0.3）。

### 14.3 响应解析（从 DeepSeek 到业务层）

- 从 `choices[0].message.content` 读取文本结果（JSON 字符串或包含 JSON 的文本）。
- 若使用 `deepseek-reasoner`，可能包含 `reasoning_content`，但 **业务只使用最终 `content`**。
- 进入 `jsonUtil` 做严格 JSON 解析与必要的提取/修复重试（见第 7.3 节策略）。

### 14.4 选型约束（建议）

- **裁判与评审均使用 `deepseek-chat`** 作为 MVP 默认。
- 若后续想更强的推理能力：
  - 可仅在“猜答案评审”使用 `deepseek-reasoner`；
  - 但仍要求最终输出严格 JSON，且只取 `content` 解析。

