export type FeatureFlags = {
  mockOcr: boolean;
  mockTranslation: boolean;
  localCache: boolean;
  history: boolean;
  privacyBlacklist: boolean;
  realCapture: boolean;
  realPaddleOcr: boolean;
  cloudTranslation: boolean;
  hoverTranslate: boolean;
  pinnedRegionLive: boolean;
  debugScreenshotSave: boolean;
  audioCaption: boolean;
  browserExtensionBridge: boolean;
};

export const defaultFeatureFlags: FeatureFlags = {
  mockOcr: true,
  mockTranslation: true,
  localCache: true,
  history: true,
  privacyBlacklist: true,
  realCapture: false,
  realPaddleOcr: false,
  cloudTranslation: false,
  hoverTranslate: false,
  pinnedRegionLive: false,
  debugScreenshotSave: false,
  audioCaption: false,
  browserExtensionBridge: false,
};

export function isEnabled(flags: FeatureFlags, key: keyof FeatureFlags): boolean {
  return Boolean(flags[key]);
}
