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
