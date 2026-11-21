/**
 * civicCreds.js
 * Gamification, Community Vouching & Anti-Spam Reward Engine for CivicFix.
 *
 * Coin Name: 🪙 CivicCreds (CC)
 * Reputation: CivicScore (0-100)
 */

const User = require('../models/User');

const REWARDS = {
  SUBMIT_REPORT: { amount: 25, action: 'Report Submitted', details: 'Earned for reporting a verified civic issue' },
  CONFIRM_ISSUE: { amount: 15, action: 'Community Vouch', details: 'Earned for confirming an active issue and preventing duplicate calls' },
  REPORT_RESOLVED: { amount: 50, action: 'Issue Resolved', details: 'Bonus awarded when your reported issue is fixed by municipal crew' },
  PENALTY_FAKE_CALL: { amount: -40, action: 'Frivolous Report Penalty', details: 'Deducted for frivolous, fake, or spam complaint' },
};

/**
 * Determine citizen tier based on total CivicCreds.
 * @param {number} creds
 * @returns {string} tier name
 */
const calculateTier = (creds) => {
  if (creds >= 750) return 'Platinum City Hero';
  if (creds >= 300) return 'Gold Civic Champion';
  if (creds >= 100) return 'Silver Guardian';
  return 'Bronze Citizen';
};

/**
 * Award or deduct CivicCreds for a user and update their tier & badges.
 * @param {string} userId
 * @param {string} rewardKey
 * @param {string} customDetails
 */
const DAILY_CAP = { SUBMIT_REPORT: 5, CONFIRM_ISSUE: 10 }; // anti-farming: max rewarded actions / 24h

/**
 * Award or deduct CivicCreds for a user and update their tier & badges.
 * Runs in a single MySQL transaction with the user row locked, so concurrent awards cannot be lost
 * and the daily cap cannot be bypassed by parallel requests.
 * @param {string} userId
 * @param {string} rewardKey
 * @param {string} customDetails
 */
const awardCivicCreds = async (userId, rewardKey, customDetails = null) => {
  try {
    const reward = REWARDS[rewardKey];
    if (!reward) return null;

    const cap = DAILY_CAP[rewardKey];
    let capped = false;

    const result = await User.applyCredsChange(userId, (user, recentActions) => {
      if (cap && recentActions.filter((a) => a === reward.action).length >= cap) {
        capped = true;
        return null;
      }
      const newBalance = Math.max(0, (user.civicCreds || 0) + reward.amount);
      let newScore = user.civicScore || 100;
      if (reward.amount < 0) newScore = Math.max(10, newScore - 20);
      else if (newScore < 100) newScore = Math.min(100, newScore + 2);

      const badges = [];
      if (newBalance >= 100) badges.push('Silver Guardian Badge');
      if (newBalance >= 300) badges.push('Gold Champion Badge');
      if (newBalance >= 750) badges.push('Platinum Hero Badge');

      return {
        amount: reward.amount,
        action: reward.action,
        details: customDetails || reward.details,
        civicCreds: newBalance,
        civicScore: newScore,
        citizenTier: calculateTier(newBalance),
        badges,
      };
    });

    if (capped) {
      return { success: false, capped: true, earnedAmount: 0, action: reward.action, message: 'Daily CivicCreds cap reached.' };
    }
    if (!result) return null;
    return {
      success: true,
      civicCreds: result.civicCreds,
      citizenTier: result.citizenTier,
      civicScore: result.civicScore,
      earnedAmount: reward.amount,
      action: reward.action,
    };
  } catch (err) {
    console.error('[CivicCreds] awardCivicCreds error:', err.message);
    return null;
  }
};

/**
 * Admin-made manual change (bonus or penalty). `amount` is a signed integer; the balance never drops below 0.
 * Logged in creds_history as "Admin Adjustment" with the admin's reason.
 */
const adjustCivicCreds = async (userId, amount, reason) => {
  const result = await User.applyCredsChange(userId, (user) => {
    const before = user.civicCreds || 0;
    const newBalance = Math.max(0, before + amount);
    const badges = [];
    if (newBalance >= 100) badges.push('Silver Guardian Badge');
    if (newBalance >= 300) badges.push('Gold Champion Badge');
    if (newBalance >= 750) badges.push('Platinum Hero Badge');
    return {
      amount: newBalance - before,
      action: 'Admin Adjustment',
      details: String(reason).slice(0, 480),
      civicCreds: newBalance,
      civicScore: user.civicScore || 100,
      citizenTier: calculateTier(newBalance),
      badges,
    };
  });
  return result;
};

module.exports = {
  REWARDS,
  DAILY_CAP,
  calculateTier,
  awardCivicCreds,
  adjustCivicCreds,
};
