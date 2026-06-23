#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct CostBudget {
    pub daily_cloud_chars_budget: usize,
    pub used_chars_today: usize,
}

impl CostBudget {
    pub fn can_spend(&self, chars: usize) -> bool {
        self.used_chars_today.saturating_add(chars) <= self.daily_cloud_chars_budget
    }

    pub fn remaining(&self) -> usize {
        self.daily_cloud_chars_budget.saturating_sub(self.used_chars_today)
    }
}

pub fn estimate_chars(texts: &[String]) -> usize {
    texts.iter().map(|t| t.chars().count()).sum()
}

// ── 新增：用量记录 ──────────────────────────────────────────

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct UsageRecord {
    pub date: String,
    pub chars_used: usize,
    pub engine: String,
}

// ── 扩展 CostBudget ────────────────────────────────────────

impl CostBudget {
    /// 默认云端每日字符配额上限
    pub fn daily_cloud_char_limit() -> usize {
        50_000
    }

    /// 返回剩余预算百分比（0.0 ~ 100.0）
    pub fn remaining_percent(&self) -> f64 {
        if self.daily_cloud_chars_budget == 0 {
            return 0.0;
        }
        (self.remaining() as f64 / self.daily_cloud_chars_budget as f64) * 100.0
    }

    /// 当剩余百分比低于给定阈值时返回 true
    pub fn is_near_limit(&self, threshold_percent: f64) -> bool {
        self.remaining_percent() <= threshold_percent
    }
}

// ── 新增：用量追踪器 ──────────────────────────────────────

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct CostTracker {
    budget: CostBudget,
    history: Vec<UsageRecord>,
}

impl CostTracker {
    pub fn new(daily_cloud_chars_budget: usize) -> Self {
        Self {
            budget: CostBudget {
                daily_cloud_chars_budget,
                used_chars_today: 0,
            },
            history: Vec::new(),
        }
    }

    /// 记录一次用量，同时更新当日已用字符数
    pub fn record_usage(
        &mut self,
        date: impl Into<String>,
        chars_used: usize,
        engine: impl Into<String>,
    ) {
        self.budget.used_chars_today =
            self.budget.used_chars_today.saturating_add(chars_used);
        self.history.push(UsageRecord {
            date: date.into(),
            chars_used,
            engine: engine.into(),
        });
    }

    /// 重置当日计数
    pub fn reset_daily(&mut self) {
        self.budget.used_chars_today = 0;
    }

    /// 生成当日用量报告
    pub fn daily_report(&self) -> String {
        let remaining = self.budget.remaining();
        let pct = self.budget.remaining_percent();
        format!(
            "今日用量: {}/{} 字符 (剩余 {:.1}%, {} 字符)",
            self.budget.used_chars_today,
            self.budget.daily_cloud_chars_budget,
            pct,
            remaining,
        )
    }

    /// 序列化为 JSON 字符串（用于持久化）
    pub fn to_json(&self) -> String {
        serde_json::to_string(self).unwrap_or_else(|_| "{}".to_string())
    }

    /// 从 JSON 字符串反序列化
    pub fn from_json(json: &str) -> Result<Self, String> {
        serde_json::from_str(json).map_err(|e| e.to_string())
    }
}
