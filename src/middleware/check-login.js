const db = require("../config/db");
const { error } = require("../utils/response");

async function checkLogin(req, res, next) {
  try {
    const token = req.headers.authorization?.trim();
    if (!token) return error(res, 401, "Tidak ada token");

    const query = `
      SELECT id_akun, waktu_berakhir
      FROM sesi
      WHERE token = $1
      LIMIT 1
    `;
    const result = await db.query(query, [token]);
    if (result.rows.length === 0) return error(res, 401, "Token tidak valid");

    const session = result.rows[0];
    if (new Date(session.waktu_berakhir) < new Date()) {
      await pool.query("DELETE FROM sesi WHERE token = $1", [token]);
      return error(res, 401, "Token kedaluwarsa");
    }

    req.id_akun = session.id_akun;
    next();
  } catch (err) {
    return error(res, 500, err.message);
  }
}

module.exports = checkLogin;
