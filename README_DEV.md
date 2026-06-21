# ScreenLingua Scaffold 开发说明

这是给 CODEX 使用的最小工程骨架，不是最终成品。

## 推荐环境

- Windows 10/11
- Node.js 20+
- pnpm
- Rust stable
- Python 3.10+

## 启动 OCR mock

```powershell
cd scaffold\sidecars\ocr_service
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python main.py
```

健康检查：

```powershell
Invoke-RestMethod http://127.0.0.1:8765/health
```

## 启动前端/Tauri

```powershell
cd scaffold
pnpm install
pnpm dev
```

## 第一轮开发目标

让前端按钮调用 `simulate_region_translate`，并展示 mock 翻译结果。

## 注意

当前 Rust 代码是接口骨架，CODEX 需要补齐真实 Tauri 配置和 command 逻辑。
