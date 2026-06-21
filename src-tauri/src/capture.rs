// V0.1 TODO: implement Windows region capture.
// Keep this module isolated so screenshot backends can be replaced.

#[derive(Debug, Clone)]
pub struct CaptureRegion {
    pub x: i32,
    pub y: i32,
    pub width: i32,
    pub height: i32,
    pub display_id: Option<String>,
}
