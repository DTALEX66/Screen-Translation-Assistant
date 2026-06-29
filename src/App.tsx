import { useState } from 'react';
import type { Page } from './types';
import {
  Sidebar,
  HomePage,
  HistoryPage,
  SettingsPage,
  TerminologyPage,
  PinnedPage,
  PrivacyPage,
} from './components';
import { useTranslate, useDiagnostics, useToast, useHistory, useGlossary, useSidecarStatus } from './hooks';
import type { HistoryEntry } from './hooks';

const mockHistory: HistoryEntry[] = [
  { id: 1, source: 'Render Settings', target: '渲染设置', mode: '框选', engine: 'mock', time: '2026-06-22 10:30:15' },
  { id: 2, source: 'Subdivision Surface', target: '细分曲面', mode: '框选', engine: 'mock', time: '2026-06-22 10:28:42' },
  { id: 3, source: 'Permission Denied', target: '权限被拒绝', mode: '框选', engine: 'sqlite-cache', time: '2026-06-22 10:25:11' },
  { id: 4, source: 'Prompt Engineering', target: '提示词工程', mode: '悬停', engine: 'mock', time: '2026-06-22 10:20:08' },
  { id: 5, source: 'Preferences', target: '偏好设置', mode: '框选', engine: 'mock', time: '2026-06-22 10:15:33' },
  { id: 6, source: 'Export Preset', target: '导出预设', mode: '固定区域', engine: 'mock', time: '2026-06-22 10:10:21' },
  { id: 7, source: 'Ambient Occlusion', target: '环境光遮蔽', mode: '框选', engine: 'sqlite-cache', time: '2026-06-22 10:05:47' },
  { id: 8, source: 'Layer Style', target: '图层样式', mode: '悬停', engine: 'mock', time: '2026-06-22 10:01:02' },
  { id: 9, source: 'Mask Threshold', target: '蒙版阈值', mode: '框选', engine: 'mock', time: '2026-06-22 09:55:38' },
  { id: 10, source: 'Stroke Width', target: '描边宽度', mode: '固定区域', engine: 'sqlite-cache', time: '2026-06-22 09:50:14' },
];

export function App() {
  const [page, setPage] = useState<Page>('home');
  const [darkMode, setDarkMode] = useState(false);
  const [engine, setEngine] = useState('local');
  const [targetLang, setTargetLang] = useState('zh-CN');
  const [apiKey, setApiKey] = useState('');
  const [hoverDelay, setHoverDelay] = useState(700);
  const [hotkey, setHotkey] = useState('Alt+Q');
  const [saved, setSaved] = useState(false);

  const { toast, showToast } = useToast();
  const translate = useTranslate({ onToast: showToast });
  const { diagnostics, handleDiagnostics } = useDiagnostics();
  const history = useHistory(mockHistory, { onToast: showToast });
  const glossary = useGlossary();
  const sidecarStatus = useSidecarStatus();

  function handleNavigatePage(targetPage: Page) {
    setPage(targetPage);
  }

  function handleToggleDarkMode() {
    setDarkMode((previous) => !previous);
  }

  function handleCopyTarget(text: string) {
    navigator.clipboard.writeText(text);
    showToast('已复制: ' + text);
  }

  function handleSaveSettings() {
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
    }, 2000);
  }

  return (
    <main className={'app-shell' + (darkMode ? ' dark' : '')}>
      <Sidebar
        page={page}
        onNavigate={handleNavigatePage}
        darkMode={darkMode}
        onToggleDark={handleToggleDarkMode}
      />

      <div className="content-area">
        {toast && <div className="toast">{toast}</div>}

        {page === 'home' && (
          <HomePage
            scenes={translate.scenes}
            sceneIndex={translate.sceneIndex}
            translateCount={translate.translateCount}
            totalWords={translate.totalWords}
            cacheHits={translate.cacheHits}
            loading={translate.loading}
            errorMode={translate.errorMode}
            result={translate.result}
            diagnostics={diagnostics}
            toast={toast}
            summary={translate.summary}
            sidecarStatus={sidecarStatus}
            onTranslate={translate.handleTranslate}
            onNextScene={translate.handleNextScene}
            onToggleErrorMode={translate.handleToggleErrorMode}
            onClearCache={translate.handleClearCache}
            onDiagnostics={handleDiagnostics}
            onCloseError={translate.handleCloseError}
            onCopyTarget={handleCopyTarget}
          />
        )}

        {page === 'history' && (
          <HistoryPage
            filteredHistory={history.filteredHistory}
            historySearch={history.historySearch}
            historyFilter={history.historyFilter}
            onHistorySearch={history.setHistorySearch}
            onHistoryFilter={history.setHistoryFilter}
            onClearFilter={history.handleClearFilter}
            onExportCSV={history.handleExportCSV}
          />
        )}

        {page === 'settings' && (
          <SettingsPage
            engine={engine}
            apiKey={apiKey}
            targetLang={targetLang}
            hoverDelay={hoverDelay}
            hotkey={hotkey}
            saved={saved}
            sidecarStatus={sidecarStatus}
            onEngineChange={setEngine}
            onApiKeyChange={setApiKey}
            onTargetLangChange={setTargetLang}
            onHoverDelayChange={setHoverDelay}
            onHotkeyChange={setHotkey}
            onSave={handleSaveSettings}
          />
        )}

        {page === 'terminology' && (
          <TerminologyPage
            terms={glossary.terms}
            brandReplacements={glossary.brandReplacements}
            path={glossary.path}
            loading={glossary.loading}
            saving={glossary.saving}
            error={glossary.error}
            source={glossary.source}
            onReload={glossary.reload}
            onSave={glossary.save}
          />
        )}

        {page === 'pinned' && <PinnedPage />}

        {page === 'privacy' && <PrivacyPage />}
      </div>
    </main>
  );
}
