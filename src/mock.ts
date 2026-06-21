import type { TranslateResponse } from './types';

// Enhanced mock with cache tracking and multiple scenarios
const mockScenes: Record<string, { sourceText: string; targetText: string; bbox: [number,number,number,number]; confidence: number }[]> = {
  blender: [
    { sourceText: 'Render Settings', targetText: '渲染设置', bbox: [420, 180, 570, 212], confidence: 0.96 },
    { sourceText: 'Subdivision Surface', targetText: '细分曲面', bbox: [440, 260, 620, 292], confidence: 0.94 },
    { sourceText: 'Ambient Occlusion', targetText: '环境光遮蔽', bbox: [380, 340, 560, 372], confidence: 0.91 },
    { sourceText: 'Viewport Display', targetText: '视图显示', bbox: [410, 420, 590, 452], confidence: 0.93 },
  ],
  vscode: [
    { sourceText: 'Command Palette', targetText: '命令面板', bbox: [320, 160, 500, 192], confidence: 0.97 },
    { sourceText: 'Toggle Terminal', targetText: '切换终端', bbox: [340, 240, 510, 272], confidence: 0.95 },
    { sourceText: 'Debug Console', targetText: '调试控制台', bbox: [315, 320, 490, 352], confidence: 0.96 },
  ],
  docker: [
    { sourceText: 'Permission Denied', targetText: '权限被拒绝', bbox: [380, 200, 548, 232], confidence: 0.97 },
    { sourceText: 'Container Logs', targetText: '容器日志', bbox: [360, 280, 520, 312], confidence: 0.94 },
    { sourceText: 'Volume Mounts', targetText: '卷挂载', bbox: [370, 360, 530, 392], confidence: 0.92 },
  ],
  photoshop: [
    { sourceText: 'Layer Style', targetText: '图层样式', bbox: [290, 150, 430, 182], confidence: 0.98 },
    { sourceText: 'Blending Options', targetText: '混合选项', bbox: [300, 220, 470, 252], confidence: 0.96 },
    { sourceText: 'Stroke Width', targetText: '描边宽度', bbox: [310, 290, 460, 322], confidence: 0.95 },
    { sourceText: 'Drop Shadow', targetText: '投影', bbox: [305, 360, 450, 392], confidence: 0.97 },
  ],
};

const translationCache: Record<string, string> = {};

export function getMockResponse(sceneName?: string): TranslateResponse {
  const name = sceneName || 'blender';
  const scene = mockScenes[name] || mockScenes.blender;
  const blocks = scene.map((b) => {
    const fromCache = !!translationCache[b.sourceText];
    translationCache[b.sourceText] = b.targetText;
    return {
      sourceText: b.sourceText,
      targetText: b.targetText,
      bbox: b.bbox,
      confidence: b.confidence,
      fromCache,
      engine: fromCache ? 'sqlite-cache' : 'mock',
    };
  });
  return { ok: true, mode: 'mock', elapsedMs: 120 + Math.floor(Math.random() * 200), blocks };
}

export function resetMockCache() { for (const k of Object.keys(translationCache)) delete translationCache[k]; }
export function getMockScenes() { return Object.keys(mockScenes); }

export const fallbackMockResponse = getMockResponse('blender');
