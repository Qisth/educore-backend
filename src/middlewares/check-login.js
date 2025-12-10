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
      await db.query("DELETE FROM sesi WHERE token = $1", [token]);
      return error(res, 401, "Token kedaluwarsa");
    }

    req.id_akun = session.id_akun;

    // Get user role and profile ID
    const akunQuery = await db.query("SELECT role FROM akun WHERE id = $1", [
      session.id_akun,
    ]);
    if (akunQuery.rows.length > 0) {
      const role = akunQuery.rows[0].role;
      req.role = role;

      // Get profile ID from guru or siswa table
      if (role === "guru") {
        const guruQuery = await db.query(
          "SELECT id FROM guru WHERE id_akun = $1",
          [session.id_akun]
        );
        req.id_userProfil = guruQuery.rows[0]?.id || null;
      } else if (role === "siswa") {
        const siswaQuery = await db.query(
          "SELECT id FROM siswa WHERE id_akun = $1",
          [session.id_akun]
        );
        req.id_userProfil = siswaQuery.rows[0]?.id || null;
      }
    }

    next();
  } catch (err) {
    console.error("checkLogin middleware error:", err.message);
    return error(res, 500, err.message);
  }
}

module.exports = checkLogin;
