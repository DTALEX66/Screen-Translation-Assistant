export type ScreenLinguaErrorCode =
  | 'SL-CAP-001'
  | 'SL-CAP-002'
  | 'SL-CAP-003'
  | 'SL-OCR-001'
  | 'SL-OCR-002'
  | 'SL-OCR-003'
  | 'SL-TR-001'
  | 'SL-TR-002'
  | 'SL-TR-003'
  | 'SL-DB-001'
  | 'SL-PRIV-001'
  | 'SL-APP-001';

export const errorMap: Record<ScreenLinguaErrorCode, { title: string; message: string; action: string }> = {
  'SL-CAP-001': { title: '无法捕获当前屏幕', message: '截图权限失败。', action: '请检查权限或尝试以管理员身份运行。' },
  'SL-CAP-002': { title: '当前窗口可能受保护', message: '该窗口可能受到系统、DRM 或安全策略限制。', action: '可以尝试手动复制文本翻译。' },
  'SL-CAP-003': { title: '显示缩放导致区域偏移', message: '当前 DPI 或多显示器坐标异常。', action: '请重新框选或执行显示校准。' },
  'SL-OCR-001': { title: 'OCR 服务未启动', message: '本地 OCR 服务未连接。', action: '请重启 OCR 服务或检查安全软件拦截。' },
  'SL-OCR-002': { title: '识别超时', message: 'OCR 处理时间过长。', action: '请缩小框选区域后重试。' },
  'SL-OCR-003': { title: '未发现可翻译文字', message: '当前区域没有识别到文字。', action: '可以放大页面或缩小框选范围。' },
  'SL-TR-001': { title: '未配置翻译引擎', message: '缺少 API key 或翻译引擎配置。', action: '已切换到 mock/local 模式。' },
  'SL-TR-002': { title: '翻译暂时失败', message: '翻译服务超时或返回异常。', action: '请重试或切换翻译引擎。' },
  'SL-TR-003': { title: '翻译额度不足', message: '当前每日字符预算已用尽。', action: '请启用本地模式或提高预算。' },
  'SL-DB-001': { title: '本地数据库不可用', message: 'SQLite 初始化或写入失败。', action: '请尝试重建数据库或查看诊断日志。' },
  'SL-PRIV-001': { title: '当前应用已被保护', message: '命中隐私黑名单。', action: 'ScreenLingua 不会识别或上传其中内容。' },
  'SL-APP-001': { title: '操作失败', message: '发生未知错误。', action: '请复制错误码并查看诊断日志。' },
};

export function toUserError(code: ScreenLinguaErrorCode) {
  return errorMap[code] ?? errorMap['SL-APP-001'];
}
