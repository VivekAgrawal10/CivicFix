/** Translation — MySQL data access (table: translations). Stores a text plus its en/pa/hi renderings for an entity. */
const db = require('../config/mysql');
const { parseId, idStr, toDate, now, validationError, oneOf } = require('../db/util');

function toTranslation(row) {
  return {
    _id: idStr(row.id),
    entityId: idStr(row.entity_id),
    entityType: row.entity_type,
    originalText: row.original_text,
    originalLanguage: row.original_language,
    translations: { en: row.text_en || null, pa: row.text_pa || null, hi: row.text_hi || null },
    createdAt: toDate(row.created_at),
    updatedAt: toDate(row.updated_at),
  };
}

const Translation = {
  async create(d) {
    const errs = [];
    if (!d.entityId) errs.push('Entity ID is required');
    if (!d.entityType) errs.push('Entity type is required');
    if (!d.originalText) errs.push('Original text is required');
    if (!d.originalLanguage) errs.push('Original language is required');
    else if (!oneOf(d.originalLanguage, ['en', 'pa', 'hi'])) errs.push(`\`${d.originalLanguage}\` is not a valid enum value for path \`originalLanguage\`.`);
    if (errs.length) throw validationError(errs);
    const t = now();
    const tr = d.translations || {};
    const r = await db.query(
      `INSERT INTO translations (entity_id, entity_type, original_text, original_language, text_en, text_pa, text_hi, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [parseId(d.entityId, 'entityId'), String(d.entityType).trim(), d.originalText, d.originalLanguage, tr.en || null, tr.pa || null, tr.hi || null, t, t]);
    const rows = await db.query('SELECT * FROM translations WHERE id = ?', [r.insertId]);
    return toTranslation(rows[0]);
  },

  async findByEntity(entityId, entityType) {
    const rows = await db.query('SELECT * FROM translations WHERE entity_id = ? AND entity_type = ? ORDER BY id DESC', [parseId(entityId, 'entityId'), entityType]);
    return rows.map(toTranslation);
  },
};

module.exports = Translation;
