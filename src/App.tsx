import { useMemo, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { DiagnosticsSnapshot, TranslateResponse } from './types';
import { fallbackMockResponse, getMockResponse, resetMockCache, getMockScenes } from './mock';

type Page = 'home' | 'history' | 'terminology' | 'pinned' | 'privacy' | 'settings';

const navItems: { key: Page; label: string; icon: string }[] = [
  { key: 'home', label: '首页', icon: '🏠' },
  { key: 'history', label: '历史', icon: '📋' },
  { key: 'terminology', label: '术语库', icon: '📖' },
  { key: 'pinned', label: '固定区域', icon: '📌' },
  { key: 'privacy', label: '隐私', icon: '🔒' },
  { key: 'settings', label: '设置', icon: '⚙️' },
];

const scenes = getMockScenes();

const mockHistory = [
  { id:1,source:'Render Settings',target:'渲染设置',mode:'框选',engine:'mock',time:'2026-06-22 10:30:15'},{ id:2,source:'Subdivision Surface',target:'细分曲面',mode:'框选',engine:'mock',time:'2026-06-22 10:28:42'},{ id:3,source:'Permission Denied',target:'权限被拒绝',mode:'框选',engine:'sqlite-cache',time:'2026-06-22 10:25:11'},{ id:4,source:'Prompt Engineering',target:'提示词工程',mode:'悬停',engine:'mock',time:'2026-06-22 10:20:08'},{ id:5,source:'Preferences',target:'偏好设置',mode:'框选',engine:'mock',time:'2026-06-22 10:15:33'},{ id:6,source:'Export Preset',target:'导出预设',mode:'固定区域',engine:'mock',time:'2026-06-22 10:10:21'},{ id:7,source:'Ambient Occlusion',target:'环境光遮蔽',mode:'框选',engine:'sqlite-cache',time:'2026-06-22 10:05:47'},{ id:8,source:'Layer Style',target:'图层样式',mode:'悬停',engine:'mock',time:'2026-06-22 10:01:02'},{ id:9,source:'Mask Threshold',target:'蒙版阈值',mode:'框选',engine:'mock',time:'2026-06-22 09:55:38'},{ id:10,source:'Stroke Width',target:'描边宽度',mode:'固定区域',engine:'sqlite-cache',time:'2026-06-22 09:50:14'},
];

const mockTerms = [
  {source:'Render',target:'渲染'},{source:'Layer',target:'图层'},{source:'Mask',target:'蒙版'},{source:'Stroke',target:'描边'},{source:'Prompt',target:'提示词'},{source:'Subdivision',target:'细分'},{source:'Ambient Occlusion',target:'环境光遮蔽'},{source:'Preferences',target:'偏好设置'},{source:'Export Preset',target:'导出预设'},{source:'Drop Shadow',target:'投影'},
];

async function callSim(sceneName?:string): Promise<TranslateResponse> { try{return await invoke('simulate_region_translate',{request:{mode:'mock',targetLanguage:'zh-CN'}})}catch{return getMockResponse(sceneName)} }
async function callDiag(): Promise<DiagnosticsSnapshot> { try{return await invoke('get_diagnostics_snapshot')}catch{return{ok:true,ocrStatus:'browser-fallback',databaseStatus:'not-connected',privacyMode:true,screenCount:1,recentEvents:[{timestamp:new Date().toISOString(),level:'INFO',event:'prototype',message:'Fallback'}]}} }

export function App() {
  const [page,setPage]=useState<Page>('home');
  const [result,setResult]=useState<TranslateResponse|null>(null);
  const [loading,setLoading]=useState(false);
  const [diag,setDiag]=useState<DiagnosticsSnapshot|null>(null);
  const [sceneIdx,setSceneIdx]=useState(0);
  const [errMode,setErrMode]=useState(false);
  const [toast,setToast]=useState('');
  const [tc,setTc]=useState(0);
  const [tw,setTw]=useState(0);
  const [ch,setCh]=useState(0);
  const [dark,setDark]=useState(false);
  const [hSearch,setHSearch]=useState('');
  const [hFilter,setHFilter]=useState('all');
  const [engine,setEngine]=useState('mock');
  const [targetLang,setTargetLang]=useState('zh-CN');
  const [apiKey,setApiKey]=useState('');
  const [hoverDelay,setHoverDelay]=useState(700);
  const [hotkey,setHotkey]=useState('Alt+Q');
  const [svd,setSvd]=useState(false);

  const summary = useMemo(()=>{if(!result)return'等待翻译任务';if(!result.ok)return'翻译失败';const c=result.blocks.filter(b=>b.fromCache).length;return result.blocks.length+' 条 · '+result.elapsedMs+'ms · '+(c>0?c+' 缓存':result.mode)},[result]);

  async function handleDiag(){setDiag(await callDiag())}
  async function handleTrans(){
    if(errMode){setResult({ok:false,mode:'error',elapsedMs:0,blocks:[],error:'SL-OCR-001: OCR 服务未启动'});return}
    setLoading(true);
    try{const r=await callSim(scenes[sceneIdx]);setResult(r);setTc(c=>c+1);setTw(w=>w+(r.blocks?r.blocks.reduce((s,b)=>s+b.sourceText.length,0):0));setCh(h=>h+(r.blocks?r.blocks.filter(b=>b.fromCache).length:0))}
    finally{setLoading(false)}
  }
  function st(msg:string){setToast(msg);setTimeout(()=>setToast(''),2000)}
  
  const fh=mockHistory.filter(e=>{if(hFilter!=='all'&&e.mode!==hFilter)return false;if(hSearch&&!e.source.toLowerCase().includes(hSearch.toLowerCase())&&!e.target.includes(hSearch))return false;return true});

  return (
    <main className={"app-shell"+(dark?" dark":"")}>
      <aside className="sidebar">
        <div className="brand-block"><div className="brand-mark">译</div><div><div className="brand">ScreenLingua</div><div className="brand-subtitle">屏幕译 V0.9</div></div></div>
        <nav>{navItems.map(item=><button key={item.key} className={page===item.key?'active':''} onClick={()=>{setPage(item.key);setResult(null)}}><span className="nav-icon">{item.icon}</span>{item.label}</button>)}</nav>
        <div style={{display:'grid',gap:12,marginTop:'auto'}}>
          <button onClick={()=>setDark(v=>!v)} style={{border:'1px solid rgba(20,33,51,0.15)',borderRadius:14,padding:'12px',cursor:'pointer',background:dark?'#003983':'white',color:dark?'white':'#243447',fontSize:14,display:'flex',alignItems:'center',gap:8,justifyContent:'center'}}><span>{dark?'☀️':'🌙'}</span> {dark?'浅色模式':'深色模式'}</button>
          <div className="privacy-card"><strong>隐私模式</strong><span>默认不上传截图，仅上传 OCR 后文本。</span></div>
        </div>
      </aside>
      <div key={page} className="page-fade-in">
      {page==='home'&&<section className="content">
        <p className="eyebrow">Windows 系统级屏幕翻译助手</p>
        <h1>不只翻网页，直接翻译整个电脑屏幕。</h1>
        <p className="lead">框选、悬停、固定区域和缓存闭环，Mock 优先，逐层替换真实实现。</p><div className="shortcuts-bar"><span>⌨ Alt+Q 框选</span><span>Alt+W 固定</span><span>Alt+S 悬停</span><span>Ctrl+Shift+T 全屏</span></div>
        <div className="actions">
          <button className="primary" onClick={handleTrans} disabled={loading}>{loading?'翻译中...':'模拟框选翻译 Alt+Q'}</button>
          <button onClick={()=>{setSceneIdx(i=>(i+1)%scenes.length);setResult(null)}}>场景: {scenes[sceneIdx]}</button>
          <button onClick={()=>{setErrMode(v=>!v);setResult(null)}}>{errMode?'✓ 错误模式':'模拟错误'}</button>
          <button onClick={()=>{resetMockCache();st('缓存已清除')}}>清除缓存</button>
          <button onClick={handleDiag}>诊断检查</button>
        </div>
        {toast&&<div className="toast">{toast}</div>}
        <section className="status-grid">
          <article><span>场景</span><strong>{scenes[sceneIdx]}</strong><small>第 {tc+1} 次</small></article>
          <article><span>引擎</span><strong>Mock + Cache</strong><small>重复点击命中缓存</small></article>
          <article><span>状态</span><strong>{errMode?'错误模拟':'正常'}</strong><small>{errMode?'OCR 错误':'就绪'}</small></article>
        </section>
        <section className="stats-mini" style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginTop:28}}>
          {[{label:'翻译次数',v:tc},{label:'处理字数',v:tw},{label:'缓存命中',v:ch},{label:'引擎',v:'Mock'}].map((s,i)=><article key={i} style={{padding:16,background:'rgba(255,255,255,.75)',borderRadius:16,textAlign:'center'}}><span style={{fontSize:12,color:'#667085'}}>{s.label}</span><strong style={{fontSize:24,display:'block'}}>{s.v}</strong></article>)}
        </section>
        {diag&&<section className="diagnostics-panel"><div className="panel-header"><h2>诊断状态</h2><span>已检查</span></div><div className="diagnostics-grid"><div><span>OCR</span><strong>{diag.ocrStatus}</strong></div><div><span>数据库</span><strong>{diag.databaseStatus}</strong></div><div><span>隐私模式</span><strong>{diag.privacyMode?'开启':'关闭'}</strong></div><div><span>屏幕数量</span><strong>{diag.screenCount}</strong></div></div></section>}
        {result&&!result.ok&&<div className="error-banner"><strong>⚠ 翻译失败</strong><span>{result.error}</span><button onClick={()=>{setErrMode(false);setResult(null)}}>关闭错误模式</button></div>}
        {!result&&<div className="empty-state"><div className="empty-icon">🌐</div><h3>点击"模拟框选翻译"开始</h3><p>选择不同软件场景，重复点击观察缓存命中效果。</p><button className="primary" onClick={handleTrans}>开始翻译</button></div>}
        {result&&result.ok&&<section className="result-panel"><div className="panel-header"><h2>翻译结果</h2><span>{summary}</span></div>{result.blocks.map((b,i)=><div className="result-row" key={b.sourceText+'-'+i}><div className="source"><span>原文</span><strong>{b.sourceText}</strong></div><div className="target" onClick={()=>{navigator.clipboard.writeText(b.targetText);st('已复制: '+b.targetText)}} style={{cursor:'pointer'}} title="点击复制"><span>译文</span><strong>{b.targetText}</strong></div><div className="meta"><span>bbox [{b.bbox.join(', ')}]</span><span>{Math.round(b.confidence*100)}%</span><span className={b.fromCache?'cache-hit':''}>{b.fromCache?'⚡ 缓存命中':b.engine}</span></div></div>)}</section>}
      </section>}
      {page==='history'&&<section className="content"><p className="eyebrow">翻译历史</p><h1>历史记录</h1><p className="lead">查看所有翻译记录，支持搜索和按模式筛选。</p><div className="actions"><input className="search-input" placeholder="搜索原文或译文..." value={hSearch} onChange={e=>setHSearch(e.target.value)}/><select value={hFilter} onChange={e=>setHFilter(e.target.value)}><option value="all">全部模式</option><option value="框选">框选</option><option value="悬停">悬停</option><option value="固定区域">固定区域</option></select><button onClick={()=>{setHSearch('');setHFilter('all')}}>清除筛选</button></div><section className="result-panel"><div className="panel-header"><h2>共 {fh.length} 条记录</h2><button onClick={()=>{const csv='source,target,mode,engine,time\n'+fh.map(e=>[e.source,e.target,e.mode,e.engine,e.time].join(',')).join('\n');const blob=new Blob([csv],{type:'text/csv'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='screenlingua-history.csv';a.click();st('已导出 CSV')}} style={{border:'1px solid rgba(20,33,51,0.2)',borderRadius:10,padding:'8px 14px',background:'white',cursor:'pointer',fontSize:13}}>导出 CSV</button></div>{fh.length===0&&<div className="empty">暂无匹配记录。</div>}{fh.map(e=><div className="result-row" key={e.id}><div className="source"><span>原文</span><strong>{e.source}</strong></div><div className="target"><span>译文</span><strong>{e.target}</strong></div><div className="meta"><span>{e.mode}</span><span className={e.engine==='sqlite-cache'?'cache-hit':''}>{e.engine==='sqlite-cache'?'⚡ 缓存命中':e.engine}</span><span>{e.time}</span></div></div>)}</section></section>}
      {page==='settings'&&<section className="content"><p className="eyebrow">应用配置</p><h1>设置</h1><p className="lead">配置翻译引擎、快捷键和偏好设置（当前为 mock 演示）。</p><div className="settings-form"><label className="setting-row"><span>翻译引擎</span><select value={engine} onChange={e=>setEngine(e.target.value)}><option value="mock">Mock (演示)</option><option value="openai">OpenAI Compatible</option><option value="deepseek">DeepSeek</option><option value="argos">Local Argos Translate</option></select></label><label className="setting-row"><span>API Key</span><input type="password" placeholder="sk-..." value={apiKey} onChange={e=>setApiKey(e.target.value)}/></label><label className="setting-row"><span>目标语言</span><select value={targetLang} onChange={e=>setTargetLang(e.target.value)}><option value="zh-CN">简体中文</option><option value="zh-TW">繁体中文</option><option value="ja">日本語</option><option value="ko">한국어</option></select></label><label className="setting-row"><span>悬停延迟 (ms)</span><input type="number" value={hoverDelay} onChange={e=>setHoverDelay(Number(e.target.value))} min={200} max={3000} step={100}/></label><label className="setting-row"><span>框选快捷键</span><input value={hotkey} onChange={e=>setHotkey(e.target.value)}/></label><div className="actions" style={{padding:'16px 0 0',borderTop:'1px solid rgba(20,33,51,.08)'}}><button className="primary" onClick={()=>{setSvd(true);setTimeout(()=>setSvd(false),2000)}}>{svd?'✓ 已保存':'保存设置'}</button></div></div></section>}
      {page==='terminology'&&<section className="content"><p className="eyebrow">专业术语</p><h1>术语库</h1><p className="lead">管理专业术语映射，确保翻译一致性。</p><section className="result-panel"><div className="panel-header"><h2>共 {mockTerms.length} 条术语</h2></div>{mockTerms.map((t,i)=><div className="result-row" key={i}><div className="source"><span>原文</span><strong>{t.source}</strong></div><div className="target"><span>译法</span><strong>{t.target}</strong></div><div className="meta"><span>通用领域</span></div></div>)}</section></section>}
      {page==='pinned'&&<section className="content"><p className="eyebrow">实时翻译</p><h1>固定区域</h1><p className="lead">在屏幕上固定一个区域，持续监测文字变化并实时翻译。</p><div className="empty-state"><div className="empty-icon">📌</div><h3>暂无固定区域</h3><p>按 Alt+W 在屏幕上框选区域。</p><button className="primary">新建固定区域</button></div></section>}
      {page==='privacy'&&<section className="content"><p className="eyebrow">隐私保护</p><h1>隐私与安全</h1><p className="lead">本地优先、隐私保护的策略。</p><div className="privacy-grid"><article><h3>🔒 默认不上传截图</h3><p>OCR 在本地完成，仅上传纯文本，原始截图不离开设备。</p></article><article><h3>📋 应用黑名单</h3><p>可设置敏感应用列表，不在这些应用中激活翻译。</p></article><article><h3>🗄️ 本地存储</h3><p>缓存和历史存储在本地 SQLite，不上传云端。</p></article><article><h3>🛡️ 不注入进程</h3><p>通过截图+OCR 方式工作，不修改不注入第三方进程。</p></article></div></section>}
      </div>
    </main>
  );
}