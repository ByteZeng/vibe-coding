# AI 海龟汤问答程序 PRD（V1.2 / MVP-Ready）

---
## 1. 产品定位（V1.2）

**一句话定义：**
一个“AI 充当裁判”的单人海龟汤推理 Web 游戏。

**核心体验闭环：**
> 看题面 → 问问题 → AI裁判回答 → 猜答案 → AI评分 → 是否通关

---
## 2. MVP 核心原则（确保 Cursor 快速落地）

为确保 Cursor 可快速生成代码，必须遵守：

* ❌ 不做复杂状态管理（不引入 Redux / Zustand）
* ❌ 不做用户系统
* ❌ 不做数据库（MVP 只要能完成一局）
* ❌ 不做流式响应（先简单同步返回）
* ✅ 所有逻辑可在“单实例 + 内存”跑通，优先保证“能玩完整一局”

---
## 3. 技术栈与部署约束（结合 V1.0 + V1.1）

### 3.1 技术栈

- **前端**：React + TypeScript + Tailwind CSS
- **后端**：Node.js（实现形式建议为 Next.js API Routes；如需可集成 Express）
- **AI**：DeepSeek / Claude（通过环境变量切换 provider）
- **部署**：Vercel

### 3.2 后端实现形式说明（避免冲突）

- 在 Vercel 上优先使用 **Next.js（App Router）API Routes** 作为后端入口（运行在 Node.js 环境）。
- 若你强烈希望使用 **Express**，允许在每个 API Route 里集成一个 Express app（仅 MVP，保持简单）。

---
## 4. 关键数据结构（强约束）

### 4.1 题库结构（强约束）

```ts
export type Question = {
  id: string
  title: string
  prompt: string // 题面（展示给玩家）
  story: string  // 完整故事（仅后端/AI可见）
  tags?: string[]
  difficulty?: 1 | 2 | 3 | 4 | 5
}
```

### 4.2 AI 回答标签（强约束）

```ts
export type JudgeLabel =
  | "是的"
  | "不是"
  | "无关紧要"
  | "有一定关系"
  | "未提及"
```

```ts
export type GuessLabel =
  | "基本正确"
  | "部分正确"
  | "明显错误"
```

### 4.3 会话结构（必须统一）

```ts
export type Message = {
  role: "user" | "assistant"
  content: string
  label?: JudgeLabel // 仅 Q&A 阶段 AI 回复带标签时使用
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

---
## 5. 游戏状态机（后端必须校验）

```text
[asking] → 点击“我要猜答案” → [guessing]

[guessing] → 提交猜测：
  → 成功（≥80）→ [success]
  → 失败 → 仍在 [guessing]

[success] → 游戏结束（可重新开局）
[ended] → 不再接受输入
```

### 5.1 状态校验规则（后端强制）

* `asking` 状态只能提交 `question`（不允许 guess）
* `guessing` 状态只能提交 `guess`（不允许 question；允许但不推荐可直接拒绝）
* `success/ended` 状态拒绝所有交互，返回明确错误或引导前端重新开始

---
## 6. 核心业务流程（V1.2）

### 6.1 创建会话

1. 用户点击“开始新游戏”
2. 后端从内置题库中随机抽题，创建 `sessionId`
3. 返回题目 `title` 与 `prompt`

### 6.2 提问阶段（asking）

1. 用户输入自然语言问题（中文优先）
2. 后端调用 AI 裁判：基于 `story` + `history` + `question`
3. AI 返回：
   - `label`（JudgeLabel）
   - `answer`（一句极简、不剧透解释）
4. 后端把用户问题与 AI 回答都写入 `history`
5. 前端展示最新消息，并允许用户继续提问或切换到“我要猜答案”

### 6.3 猜答案阶段（guessing）

1. 用户输入对完整故事的复述（自然语言）
2. 后端调用 AI 评审：基于 `story` + 玩家猜测文本
3. AI 返回：
   - `score`（0-100）
   - `label`（GuessLabel）
   - `comment`（<=30 字简短评价）
   - `success`（score >= 80）
   - `story`（仅当 `success` 时返回完整故事）
4. 若 `success`：后端把会话置为 `success`，前端展示完整故事并结束本局
5. 若失败：会话仍处于 `guessing`，允许再次提交猜测

---
## 7. AI 行为约束（V1.2：可执行 Prompt + JSON 输出）

> 注：后端负责组织输入并强制要求模型输出 JSON。前端只展示结果。

### 7.1 Q&A 裁判 Prompt（可直接用）

输入：
- 标准完整故事（仅后端/AI可见）
- 玩家问题
- 历史问答（由 `history` 组织）

输出格式（严格 JSON）：

```text
{
  "label": "是的 | 不是 | 无关紧要 | 有一定关系 | 未提及",
  "answer": "一句不超过20字的解释"
}
```

Prompt（建议作为系统提示或首段指令）：

```text
你是“海龟汤游戏裁判”。

你必须严格按照以下规则回答：

【输入】
- 完整故事（仅你可见）
- 玩家问题
- 历史问答

【输出格式】
必须输出严格 JSON（不要输出多余文本）：
{
  "label": "是的 | 不是 | 无关紧要 | 有一定关系 | 未提及",
  "answer": "一句不超过20字的解释"
}

【规则】
1. 不允许剧透关键剧情或结局
2. 不允许直接复述故事
3. 尽量使用“是/否”倾向的判断
4. answer 必须简短、模糊但有帮助
```

### 7.2 猜答案评估 Prompt（可直接用）

输出格式（严格 JSON）：

```text
{
  "score": 0-100,
  "label": "基本正确 | 部分正确 | 明显错误",
  "comment": "简短评价（<=30字）",
  "success": boolean
}
```

Prompt（建议作为系统提示或首段指令）：

```text
你是海龟汤评审。

【输入】
- 标准故事
- 玩家猜测（完整复述文本）

【输出格式】
必须输出严格 JSON（不要输出多余文本）：
{
  "score": 0-100,
  "label": "基本正确 | 部分正确 | 明显错误",
  "comment": "简短评价（<=30字）",
  "success": boolean
}

【评分标准】
- 人物/角色是否正确：30 分
- 关键事件/转折是否正确：40 分
- 因果逻辑是否合理：30 分

【判定】
score >= 80 视为 success = true，label 必须为“基本正确”
```

---
## 8. API 设计（Node.js + Express/Next.js 任一实现）

所有接口都以会话 `sessionId` 为中心，并强制后端进行状态校验。

### 8.1 创建会话

```http
POST /api/session
```

Response：

```json
{
  "sessionId": "xxx",
  "title": "题目标题",
  "prompt": "题面描述"
}
```

### 8.2 提问（Q&A）

```http
POST /api/session/:id/question
```

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
  "history": []
}
```

### 8.3 切换到猜答案阶段（可选）

如果前端需要显式切换状态，可提供一个显式接口；若实现上更简单，也可以在前端直接调用 `guess` 并由后端自动切换。

```http
POST /api/session/:id/startGuess
```

Response：

```json
{
  "status": "guessing"
}
```

### 8.4 猜答案（评审）

```http
POST /api/session/:id/guess
```

Request：

```json
{
  "guess": "xxx"
}
```

Response：

```json
{
  "score": 85,
  "label": "基本正确",
  "comment": "已抓住核心逻辑",
  "success": true,
  "story": "完整故事（仅成功返回）"
}
```

---
## 9. 前端结构（让 Cursor 更容易生成）

### 9.1 页面拆分（MVP）

```text
App
 ├── HomePage
 └── GamePage
      ├── QuestionCard
      ├── ChatHistory
      ├── InputBox
      ├── ControlBar
      └── ResultPanel
```

### 9.2 前端核心状态（避免过度设计）

```ts
const [sessionId, setSessionId]
const [status, setStatus] // asking | guessing | success
const [messages, setMessages]
const [input, setInput]
```

---
## 10. 题库要求

* 内置至少 5 道高质量题目
* 题目包含 `title / prompt / story`，并可选 `tags / difficulty`
* `story` 用于裁判与评审，不向前端直接暴露；仅当玩家通关时才在 guess 接口成功返回中展示

---
## 11. 环境变量与模型配置

使用环境变量管理：

* `MODEL_PROVIDER`（如 `deepseek` / `claude`）
* `DEEPSEEK_API_KEY` / `CLAUDE_API_KEY`
* 可能还包括对应的 `BASE_URL`（如 DeepSeek 自定义网关）

后端要求：

* 不在前端暴露任何 API Key
* 统一封装 LLM 调用层（例如 `lib/llmClient.ts`），对外暴露：
  - `judgeQuestion(story, history, question) -> {label, answer}`
  - `evaluateGuess(story, guess) -> {score, label, comment, success}`

---
## 12. 非功能性需求（MVP 范围内）

* 语言：中文优先，裁判回复简短、模糊但有帮助
* 不做用户鉴权
* 单局在“合理时间内”完成：不要求长时间保活/跨刷新持久化
* 为避免剧透，所有 AI 裁判/评审的输出都必须遵循 JSON schema 与字数限制

---
## 13. 本次交付验收标准（V1.2）

必须全部满足：

* ✅ 能点击开始游戏
* ✅ 能看到题面
* ✅ 能连续问 >= 5 轮问题
* ✅ AI 返回符合标签规则（JudgeLabel）
* ✅ 能提交猜测（guessing）
* ✅ AI 返回评分 + GuessLabel
* ✅ 猜对后显示完整故事（来自成功响应）
* ✅ 不刷新页面也能完成一局（MVP 允许会话丢失不作为失败条件，但单局必须通畅）

