import type { NavItem, Page } from "../types";

export const navItems: NavItem[] = [
  { key: "home", label: "控制台", icon: "⌂" },
  { key: "history", label: "历史", icon: "◷" },
  { key: "terminology", label: "术语库", icon: "◇" },
  { key: "pinned", label: "固定区域", icon: "⌖" },
  { key: "privacy", label: "隐私", icon: "◎" },
  { key: "settings", label: "设置", icon: "⚙" },
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

      <div className="sidebar-footer">
        <button className="theme-toggle" onClick={onToggleDark}>
          <span>{darkMode ? "☀" : "☾"}</span>
          {darkMode ? "浅色模式" : "深色模式"}
        </button>
        <div className="privacy-card">
          <strong>本地隐私</strong>
          <span>截图、OCR、翻译优先在本机完成。</span>
        </div>
      </div>
    </aside>
  );
}
