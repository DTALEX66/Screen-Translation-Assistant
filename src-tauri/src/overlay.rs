// V0.1 TODO: implement transparent always-on-top overlay window.
// Recommended model: one overlay window renders many blocks.

#[derive(Debug, Clone)]
pub enum OverlayMode {
    Bubble,
    RegionPanel,
    Inline,
    Subtitle,
}
