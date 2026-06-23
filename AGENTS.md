# ScreenLingua / Screen-Translation-Assistant — 开发规范

## ⚠️ 项目当前已知问题（开工前必读）

| 问题 | 位置 | 严重程度 | 处理方式 |
|------|------|----------|----------|
| 大量代码极度压缩（无空格、单行函数、变量名缩写） | `src/App.tsx` 等前端文件 | 高 | 每改一个函数就展开格式化，不攒着 |
| `patch.diff` 内容不完整 | 根目录 | 中 | 废弃掉，用 git 管理变更 |
| 部分中文注释/字符串编码显示为乱码 | README_DEV.md, 前端 | 低 | 确保文件保存为 UTF-8，PowerShell 输出时注意编码 |
| `App.tsx` 疑似被截断 | `src/App.tsx` | 高 | 先补全再改，否则前端无法正常运行 |
| `call_ocr_sidecar()` 使用阻塞式 reqwest | `src-tauri/src/commands.rs` | 中 | Tauri command 里用阻塞 I/O 会卡 UI，需要改异步 |
| `TranslationCache` 每次调用都重新 open DB | `src-tauri/src/commands.rs` | 中 | 应该用 Tauri State 管理单例连接 |

> **铁律：每发现一个错误 → 立刻修 → 修完验证 → 不留尾巴。不要把问题拖到后面。**

---

## 一、代码风格：写得像人，别写得像 AI

下面这些是针对「被 AI 压缩过的代码」的反向规范。目标：**任何人类同事打开文件都能一眼看懂**。

### 1.1 通用规则

```
// ❌ 不要这样写（压缩风，看不懂）
const [tc,setTc]=useState(0);
async function handleTrans(){if(errMode){setResult(...);return}setLoading(true);try{...}finally{...}}

// ✅ 这样写（正常人风格）
const [translateCount, setTranslateCount] = useState(0);

async function handleTranslate() {
  if (errorMode) {
    setResult({ ok: false, mode: 'error', elapsedMs: 0, blocks: [], error: 'SL-OCR-001: OCR 服务未启动' });
    return;
  }
  setLoading(true);
  try {
    const response = await callSimulate(scenes[sceneIndex]);
    setResult(response);
  } finally {
    setLoading(false);
  }
}
```

- **变量名**：用完整单词，别缩写。`translateCount` 不是 `tc`，`errorMode` 不是 `errMode`，`sceneIndex` 不是 `sceneIdx`
- **空格**：操作符两边加空格，逗号后面加空格，冒号后面加空格
- **函数名**：动词 + 名词，完整描述。`handleTranslate` 不是 `handleTrans`，`setToastMessage` 不是 `st`
- **每行一个语句**：别把多个语句挤在一行
- **if/for/while 必须带大括号**：哪怕只有一行
- **return 后面换行**：`return` 语句独立一行

### 1.2 TypeScript / React

- 组件文件用 PascalCase：`App.tsx`、`TranslationPanel.tsx`
- 工具函数用 camelCase：`errorMap.ts`、`featureFlags.ts`
- 接口/类型用 PascalCase + 描述性名字：`TranslationBlock`、`DiagnosticsSnapshot`
- Props 用 interface 别用 inline type
- `useState` 变量和 setter 配对命名清晰：`[result, setResult]`
- 别在 JSX 里写复杂逻辑，提到函数里去
- Tailwind / 内联样式超过 5 个属性就抽成变量或 CSS class

### 1.3 Rust

- 模块文件 snake_case：`error_codes.rs`、`screen_geometry.rs` — 这你已经做对了 ✓
- 结构体 PascalCase：`TranslationCache`、`AppSettings`
- 字段 snake_case，前端通信用 `#[serde(rename = "camelCase")]`
- 用 `anyhow::Result` 或 `thiserror` 做错误传播，别直接 `.unwrap()`
- Tauri command 要返回 `Result<T, String>`，别 panic
- 注释写中文没问题，但保证文件 UTF-8 编码

### 1.4 文件组织

```
src/                    # 前端
  main.tsx              # 入口
  App.tsx               # 根组件
  core.ts               # 核心逻辑
  mock.ts               # mock 数据
  types.ts              # 类型定义
  lib/                  # 工具库
    errorMap.ts
    featureFlags.ts
  components/           # 拆分出去的组件（重构目标）
  hooks/                # 自定义 hooks（重构目标）

src-tauri/src/          # Rust 后端
  main.rs               # Tauri 入口
  commands.rs           # Tauri command 注册
  db.rs                 # 数据库
  translation.rs        # 翻译引擎
  capture.rs            # 屏幕捕获
  overlay.rs            # 悬浮窗
  error_codes.rs        # 错误码枚举
  diagnostics.rs        # 诊断
  settings.rs           # 设置
  privacy.rs            # 隐私
  hotkeys.rs            # 快捷键
  screen_geometry.rs    # 屏幕几何
  contracts.rs          # 接口合约
  cost_control.rs       # 成本控制
```

---

## 二、错误处理规范

项目已有 `SL-{模块}-{序号}` 错误码体系，很好，继续用。

### 2.1 新增错误的流程

1. 在 `src-tauri/src/error_codes.rs` 加枚举变体
2. 在 `src/lib/errorMap.ts` 加前端对应用户提示
3. 错误信息分三层：
   - `code`：机器可读（SL-XXX-XXX）
   - `title`：用户看到的短标题
   - `message`：详细说明
   - `action`：用户能做什么

### 2.2 错误修复的优先级

| 优先级 | 条件 | 动作 |
|--------|------|------|
| P0 | 编译不过 / 启动不了 | 立刻修，其他全停 |
| P1 | 核心功能挂了（OCR、翻译、截图） | 当天修 |
| P2 | UI 显示异常、边界 case | 本轮迭代修 |
| P3 | 优化、重构 | 排进 backlog |

---

## 三、Git 工作流

- **不要 `git commit`** 除非明确要求
- 用 `git log` 和 `git blame` 追溯历史
- `patch.diff` 废弃，变更直接改文件
- 禁止 force push 到 main

---

## 四、多智能体并行开发规范

当多个 agent 同时在这个仓库干活时，遵守以下规则：

### 4.1 分工原则

- **每个 agent 有明确的文件所有权**，不同 agent 不能同时改同一个文件
- 文件所有权按模块划分：
  - Agent A：`src/` 前端所有文件（`.tsx`, `.ts`, `.css`）
  - Agent B：`src-tauri/src/` Rust 后端
  - Agent C：`sidecars/`、`scripts/`、`fixtures/` 等辅助
- 如果必须交叉修改，A 改完后 B 再改，不要并行

### 4.2 协作规则

- 每个 agent 改完文件后，在最终回复里列出自己改过的文件路径
- agent 之间不要互相 revert 对方的修改
- 如果发现别人的修改和你的冲突：先读最新代码 → 适配你的修改 → 不覆盖别人的
- 避免重做别人已经完成的工作

### 4.3 agent 角色分配建议

| 角色 | 负责范围 | 触发条件 |
|------|----------|----------|
| explorer | 读代码、搜索、回答问题 | 需要了解代码结构但不改文件 |
| worker | 实现功能、修 bug、写测试 | 有明确的写文件任务 |
| reviewer | 代码审查、安全检查 | 任务完成后 review |

---

## 五、技术栈速查

| 层 | 技术 |
|----|------|
| 桌面框架 | Tauri 2.x |
| 前端 | React 18 + TypeScript + Vite |
| 后端 | Rust（stable） |
| 数据库 | SQLite（rusqlite） |
| OCR | Python sidecar（本地服务 127.0.0.1:8765） |
| 包管理 | pnpm（前端）、cargo（Rust） |

### 常用命令

```powershell
# 前端开发
cd C:\Users\ALEX\Documents\Screen-Translation-Assistant
pnpm install
pnpm dev

# 类型检查
pnpm check

# Tauri 完整启动
pnpm tauri:dev

# OCR mock 服务
cd sidecars\ocr_service
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python main.py
```
