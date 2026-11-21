// Node owns the final XP ledger. Finalization is idempotent per report and
// credits the amount promised at submission, limited only by the reporter's daily cap.
export class XpLedger {
  constructor({ dailyCap = 300, now = () => new Date() } = {}) { this.entries = new Map(); this.daily = new Map(); this.dailyCap = dailyCap; this.now = now; }
  dayKey(reporterId) { return `${reporterId}|${this.now().toISOString().slice(0, 10)}`; }
  awardedToday(reporterId) { return this.daily.get(this.dayKey(reporterId)) ?? 0; }
  finalize(reportId, submittedRecommendation, reporterId = null) {
    if (this.entries.has(reportId)) return { credited: false, idempotent: true, entry: this.entries.get(reportId) };
    const promised = submittedRecommendation.breakdown.capped_total;
    const amount = reporterId == null ? promised : Math.max(0, Math.min(promised, this.dailyCap - this.awardedToday(reporterId)));
    const entry = { reportId, reporterId, amount, promised, capped_by_daily_limit: amount < promised, breakdown: submittedRecommendation.breakdown, event: 'verified' };
    this.entries.set(reportId, entry);
    if (reporterId != null) this.daily.set(this.dayKey(reporterId), this.awardedToday(reporterId) + amount);
    return { credited: amount > 0, idempotent: false, entry };
  }
}
