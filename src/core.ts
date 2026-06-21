export type OcrBlock = {
  text: string;
  bbox: [number, number, number, number];
  confidence: number;
};

export type TranslationResult = {
  sourceText: string;
  targetText: string;
  engine: string;
  cached: boolean;
};

const mockDictionary: Record<string, string> = {
  "Render Settings": "渲染设置",
  "Subdivision Surface": "细分曲面",
  "Permission Denied": "权限被拒绝",
  "Prompt Engineering": "提示词工程",
  "Preferences": "偏好设置",
  "Export Preset": "导出预设",
  "Ambient Occlusion": "环境光遮蔽"
};

export async function mockTranslate(texts: string[]): Promise<TranslationResult[]> {
  await new Promise((resolve) => setTimeout(resolve, 280));
  return texts.map((text) => ({
    sourceText: text,
    targetText: mockDictionary[text] ?? `【译】${text}`,
    engine: "mock",
    cached: false
  }));
}
