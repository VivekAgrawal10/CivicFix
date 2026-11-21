/**
 * Extract pagination parameters from query string.
 * @param {object} query - req.query
 * @returns {{ page: number, limit: number, skip: number }}
 */
const getPaginationParams = (query) => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 10));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

/**
 * Build pagination metadata for a response.
 * @param {number} total - total document count
 * @param {number} page  - current page
 * @param {number} limit - items per page
 * @returns {{ total: number, page: number, limit: number, totalPages: number }}
 */
const getPaginationMeta = (total, page, limit) => {
  return {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

module.exports = { getPaginationParams, getPaginationMeta };
