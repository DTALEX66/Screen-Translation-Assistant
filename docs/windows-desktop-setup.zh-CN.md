# Windows 桌面端环境安装

这份说明用于把浏览器预览版继续推进到 Tauri 桌面版。

## 当前需要的工具

- Node.js 20.19+ 或 22.12+
- pnpm
- Python 3.10+
- Rust stable / Cargo
- Visual Studio Build Tools，安装 C++ 构建工具
- App Installer / winget，推荐用于一键安装以上工具

## 先检查

```powershell
cd "D:\Project Directory\Screen-Translation-Assistant"
pnpm env:check
```

如果系统 Node 还是旧版本，但机器里有其他可用的新 Node，可以先用兼容命令继续跑前端：

```powershell
pnpm node:compat
pnpm dev:ensure
pnpm sidecar:ensure
pnpm tauri:prepare
pnpm dev:compat
pnpm build:compat
```

如果提示 `winget not found`，先运行：

```powershell
pnpm env:winget:check
```

如果机器没有 App Installer，可以打开官方安装页：

```powershell
pnpm env:open-prereqs
```

先安装 App Installer，然后重新打开 PowerShell。

## 推荐安装路径

App Installer / winget 可用后运行：

```powershell
cd "D:\Project Directory\Screen-Translation-Assistant"
pnpm env:install
```

这个命令会通过 winget 安装：

- Node.js LTS
- Rustup / Rust stable
- Visual Studio 2022 Build Tools C++ 工作负载

安装完成后重新打开 PowerShell，再检查：

```powershell
pnpm env:check
```

## 手动安装路径

如果不能使用 winget，就按 `pnpm env:open-prereqs` 打开的页面手动安装：

1. App Installer / winget
2. Node.js LTS
3. Rustup
4. Visual Studio Build Tools，勾选 C++ build tools / VCTools

每装完一轮都建议重新打开 PowerShell，然后跑：

```powershell
pnpm env:check
```

## 运行桌面端

本地 sidecar 单独开一个终端：

```powershell
cd "D:\Project Directory\Screen-Translation-Assistant"
pnpm sidecar
```

桌面端另开一个终端：

```powershell
cd "D:\Project Directory\Screen-Translation-Assistant"
pnpm tauri:dev
```

`pnpm tauri:dev` 会先运行 `pnpm tauri:prepare`，自动复用或启动本地 sidecar 和 Vite 前端。

服务状态和停止：

```powershell
pnpm services:status
pnpm services:stop:dry
pnpm services:stop
```

打包：

```powershell
pnpm tauri:build
```

## 真机验收

安装 Rust/Cargo 和 Visual Studio Build Tools C++ 后运行：

```powershell
pnpm test:real-machine
```

带截图回归：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\real_machine_test.ps1 -ImageDir "D:\测试截图" -Image "D:\ScreenShot_2026-06-28_163226_974.png"
```

验收通过后启动桌面端：

```powershell
pnpm tauri:dev
```

## 常见卡点

- `Node.js 16.13.1 is too old`：系统 PATH 里旧 Node 排在前面，安装新版 Node 后重新打开 PowerShell。
- `rustc` 或 `cargo` 缺失：安装 Rustup 后重新打开 PowerShell。
- `Visual Studio Build Tools C++` 缺失：重新打开 Visual Studio Installer，给 Build Tools 增加 C++ 构建工具。
- `winget` 缺失：安装 App Installer；如果已安装但命令仍不可用，运行 `pnpm env:winget:register`。
