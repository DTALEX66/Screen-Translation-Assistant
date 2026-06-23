import type { Page, NavItem } from "../types";

export const navItems: NavItem[] = [
  { key: "home", label: "首页", icon: "🏠" },
  { key: "history", label: "历史", icon: "📵" },
  { key: "terminology", label: "术语库", icon: "📉" },
  { key: "pinned", label: "固定区域", icon: "📌" },
  { key: "privacy", label: "隐私", icon: "🔀" },
  { key: "settings", label: "设置", icon: "⚙️" },
];

interface SidebarProps {
  page: Page;
  onNavigate: (p: Page) => void;
  darkMode: boolean;
  onToggleDark: () => void;
}

export function Sidebar({ page, onNavigate, darkMode, onToggleDark }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="brand-block">
        <div className="brand-mark">译</div>
        <div>
          <div className="brand-name">ScreenLingua</div>
          <div className="brand-version">v0.1.0-alpha</div>
        </div>
      </div>
      <nav>
        {navItems.map(item => (
          <button
            key={item.key}
            className={page === item.key ? "active" : ""}
            onClick={() => { onNavigate(item.key); }}
          >
            <span className="nav-icon">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>
      <div style={{ display: "grid", gap: 12, marginTop: "auto" }}>
        <button
          onClick={onToggleDark}
          style={{
            border: "1px solid rgba(20,33,51,0.15)",
            borderRadius: 14,
            padding: "12px",
            cursor: "pointer",
            background: darkMode ? "#003983" : "white",
            color: darkMode ? "white" : "#243447",
            fontSize: 14,
            display: "flex",
            alignItems: "center",
            gap: 8,
            justifyContent: "center",
          }}
        >
          <span>{darkMode ? "☀️" : "🌙"}</span>
          {" "}
          {darkMode ? "浅色模式" : "深色模式"}
        </button>
        <div className="privacy-card">
          <strong>隐私模式</strong>
          <span>默认不上传截图，仅上传 OCR 文本。</span>
        </div>
      </div>
    </aside>
  );
}

