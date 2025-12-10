// services/service.js
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const pool = require("../config/db");
const logger = require("../utils/logger");

function validateEmail(email) {
  return typeof email === "string" && /\S+@\S+\.\S+/.test(email);
}

function validatePassword(pw) {
  if (typeof pw !== "string" || pw.length < 8) return false;

  // Minimal harus ada:
  // - 1 huruf besar
  // - 1 huruf kecil
  // - 1 angka
  const hasUpperCase = /[A-Z]/.test(pw);
  const hasLowerCase = /[a-z]/.test(pw);
  const hasNumber = /[0-9]/.test(pw);

  return hasUpperCase && hasLowerCase && hasNumber;
}

function validateRole(role) {
  return role === "siswa" || role === "guru";
}

async function handleLogin(data, role) {
  const { email, password } = data;
  logger.info(`Login attempt - email=${email}, role=${role}`);

  if (!validateEmail(email)) {
    logger.warn("Email validation failed", { email });
    throw new Error("Invalid email format");
  }

  if (!validatePassword(password)) {
    logger.warn("Password validation failed", {
      passwordLength: password?.length,
    });
    throw new Error(
      "Password must be at least 8 characters with uppercase, lowercase, and number"
    );
  }

  if (!validateRole(role)) {
    logger.warn("Role validation failed", { role });
    throw new Error("Invalid role");
  }

  let client;
  try {
    logger.debug("Attempting database connection...");
    client = await pool.connect();
    logger.debug("Database connection successful");
  } catch (connectErr) {
    logger.error("Database connection error", { error: connectErr.message });
    throw new Error(
      "Database connection failed. Please check database configuration."
    );
  }

  try {
    const q = `SELECT id, email, password, role FROM akun WHERE email = $1 AND role = $2 LIMIT 1`;
    const res = await client.query(q, [email, role]);
    logger.debug("Login query result", { rowCount: res.rows.length });
    if (res.rows.length === 0) return null;

    const user = res.rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return null;

    const token = crypto.randomBytes(32).toString("hex");
    logger.info("Login successful", {
      userId: user.id,
      email: user.email,
      role: user.role,
    });
    await client.query(
      `INSERT INTO sesi (token, id_akun, waktu_berakhir) VALUES ($1, $2, DEFAULT)`,
      [token, user.id]
    );

    return { token, user: { id: user.id, email: user.email, role: user.role } };
  } catch (err) {
    logger.error("Login service error", {
      error: err.message,
      stack: err.stack,
    });
    throw err;
  } finally {
    if (client) client.release();
  }
}

async function handleRegister(data, role) {
  const { email, password } = data;
  if (
    !validateEmail(email) ||
    !validatePassword(password) ||
    !validateRole(role)
  ) {
    throw new Error("Invalid input");
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const cek = `SELECT id FROM akun WHERE email = $1 LIMIT 1`;
    const sudah = await client.query(cek, [email]);
    if (sudah.rows.length > 0) {
      await client.query("ROLLBACK");
      return null;
    }

    const hashed = await bcrypt.hash(password, 10);
    const ins = `INSERT INTO akun (email, password, role, foto_profil) VALUES ($1,$2,$3,$4) RETURNING id,email,role,foto_profil`;
    const res = await client.query(ins, [
      email,
      hashed,
      role,
      data.fotoProfil || null,
    ]);
    const newUser = res.rows[0];

    if (role === "siswa") {
      await client.query(
        `INSERT INTO siswa (id_akun, tingkat, ortu_wali, telp_ortu_wali, nama) VALUES ($1,$2,$3,$4,$5)`,
        [newUser.id, data.tingkat, data.ortuWali, data.telpOrtuWali, data.nama]
      );
    } else if (role === "guru") {
      await client.query(
        `INSERT INTO guru (id_akun, nama, alamat, provinsi_alamat, kota_alamat) VALUES ($1,$2,$3,$4,$5)`,
        [
          newUser.id,
          data.nama,
          data.alamat || null,
          data.provinsi || null,
          data.kota || null,
        ]
      );
    } else {
      await client.query("ROLLBACK");
      throw new Error("Unknown role");
    }

    await client.query("COMMIT");
    return newUser;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    logger.error("Register service error", {
      error: err.message,
      stack: err.stack,
    });
    throw err;
  } finally {
    client.release();
  }
}

async function tampilkanProfil(idAkun, role) {
  if (!idAkun || !validateRole(role)) return null;
  const q =
    role === "siswa"
      ? `SELECT * FROM siswa WHERE id_akun = $1 LIMIT 1`
      : `SELECT * FROM guru WHERE id_akun = $1 LIMIT 1`;

  const res = await pool.query(q, [idAkun]);
  return res.rows[0] || null;
}

async function tampilkanMatpel() {
  const res = await pool.query("SELECT * FROM matpel ORDER BY nama ASC");
  return res.rows;
}

async function tampilkanKelas(idSiswa, subject) {
  if (!idSiswa || !subject) return null;
  const q = `
    SELECT k.nama AS kelas, dk.progres
    FROM detail_kelas dk
    JOIN kelas k ON dk.id_kelas = k.id
    JOIN matpel mp ON dk.id_matpel = mp.id
    WHERE dk.id_siswa = $1 AND LOWER(mp.nama) = LOWER($2)
    ORDER BY dk.tgl_masuk DESC
  `;
  const res = await pool.query(q, [idSiswa, subject]);
  return res.rows;
}

async function tampilkanMateri(idKelas) {
  console.log("tampilkanMateri called with idKelas:", idKelas);
  if (!idKelas) {
    console.log("No idKelas provided, returning empty array");
    return [];
  }

  let client;
  try {
    client = await pool.connect();
    
    // Query 1: Coba exact match dulu
    let q = `SELECT * FROM materi WHERE id_kelas = $1 ORDER BY tanggal_pembuatan DESC`;
    console.log("Executing query:", q, "with param:", idKelas);
    let res = await client.query(q, [idKelas]);
    console.log("Exact match query returned", res.rows.length, "rows");
    
    // Jika tidak ada hasil dan idKelas format "kelas-X", coba cari berdasarkan no_kelas
    if (res.rows.length === 0 && idKelas.startsWith('kelas-')) {
      const kelasNumber = parseInt(idKelas.replace('kelas-', ''));
      console.log("Trying alternative query with kelasNumber:", kelasNumber);
      
      // Query berdasarkan no_kelas di tabel kelas
      const altQ = `
        SELECT m.* FROM materi m 
        JOIN kelas k ON m.id_kelas = k.id 
        WHERE k.no_kelas = $1 
        ORDER BY m.tanggal_pembuatan DESC
      `;
      res = await client.query(altQ, [kelasNumber]);
      console.log("Alternative query (by no_kelas) returned", res.rows.length, "rows");
    }
    
    // Jika masih tidak ada, tampilkan nilai id_kelas yang ada untuk debugging
    if (res.rows.length === 0) {
      const debugQ = `SELECT DISTINCT id_kelas FROM materi ORDER BY id_kelas LIMIT 20`;
      const debugRes = await client.query(debugQ);
      console.log("⚠️ No materi found! Available id_kelas values in database:", 
        debugRes.rows.map(r => r.id_kelas));
    }
    
    return res.rows;
  } catch (err) {
    logger.error("tampilkanMateri error", {
      error: err.message,
      kelasId: idKelas,
    });
    throw err;
  } finally {
    if (client) client.release();
  }
}

// Ambil daftar siswa yang menandai materi selesai untuk guru tertentu
async function getSiswaSelesaiByGuru(idGuru) {
  if (!idGuru) return [];
  const q = `
    SELECT p.id AS pembelajaran_id,
           s.id AS id_siswa,
           s.nama AS nama_siswa,
           mp.nama AS nama_matpel,
           m.id_kelas AS kelas
    FROM pembelajaran p
    JOIN siswa s ON p.id_siswa = s.id
    JOIN materi m ON p.id_materi = m.id
    JOIN matpel mp ON m.id_matpel = mp.id
    WHERE p.selesai = true AND m.id_guru = $1
    ORDER BY p.id DESC
  `;
  const res = await pool.query(q, [idGuru]);
  return res.rows;
}

async function tampilkanDetailMateri(id) {
  if (!id) return null;
  const q = `SELECT * FROM materi WHERE id = $1 LIMIT 1`;
  const res = await pool.query(q, [id]);
  return res.rows[0] || null;
}

// Ambil daftar semua siswa yang terdaftar (untuk guru)
async function getDaftarSiswa() {
  const q = `
    SELECT 
      s.id,
      s.nama,
      a.email,
      s.tingkat,
      s.nama_sekolah,
      s.kota_sekolah,
      s.provinsi_sekolah,
      a.created_at AS tanggal_daftar
    FROM siswa s
    JOIN akun a ON s.id_akun = a.id
    ORDER BY a.created_at DESC
  `;
  const res = await pool.query(q);
  return res.rows;
}

// Ambil daftar siswa yang login ke sistem (memiliki sesi aktif)
async function getSiswaLogin() {
  const q = `
    SELECT 
      s.id,
      s.nama,
      a.email,
      s.tingkat,
      se.waktu_berakhir AS sesi_berakhir
    FROM siswa s
    JOIN akun a ON s.id_akun = a.id
    JOIN sesi se ON a.id = se.id_akun
    WHERE se.waktu_berakhir > NOW()
    ORDER BY se.waktu_berakhir DESC
  `;
  const res = await pool.query(q);
  return res.rows;
}

async function tambahMateri(data) {
  const { guruId, matpelId, kelasId, nama, deskripsi, isi, catatan, urlMedia } =
    data;
  
  console.log("=== tambahMateri received data ===");
  console.log("guruId:", guruId, "type:", typeof guruId);
  console.log("matpelId:", matpelId, "type:", typeof matpelId);
  console.log("kelasId:", kelasId, "type:", typeof kelasId);
  console.log("nama:", nama, "type:", typeof nama);
  
  if (!guruId || !matpelId || !kelasId || !nama) {
    console.error("❌ Missing required fields!");
    console.error("guruId:", guruId, "matpelId:", matpelId, "kelasId:", kelasId, "nama:", nama);
    throw new Error("Missing required fields");
  }

  let client;
  try {
    client = await pool.connect();
    const q = `INSERT INTO materi (id_guru,id_matpel,id_kelas,nama,deskripsi,isi,catatan,url_media) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`;
    console.log("Executing INSERT query with values:", [guruId, matpelId, kelasId, nama]);
    const res = await client.query(q, [
      guruId,
      matpelId,
      kelasId,
      nama,
      deskripsi || null,
      isi || null,
      catatan || null,
      urlMedia || null,
    ]);
    console.log("✅ Materi inserted successfully, id:", res.rows[0].id);
    return res.rows[0];
  } catch (err) {
    console.error("❌ Database insert error:", err.message);
    logger.error("tambahMateri error", { error: err.message, data });
    throw err;
  } finally {
    if (client) client.release();
  }
}

async function updateProfil(idAkun, role, data) {
  if (!idAkun || !validateRole(role)) {
    throw new Error("Invalid parameters");
  }

  const {
    nama,
    provinsiAlamat,
    kotaAlamat,
    alamat,
    tingkat,
    ortuWali,
    telpOrtuWali,
    provinsiSekolah,
    kotaSekolah,
    namaSekolah,
    fotoProfil,
  } = data;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    if (role === "siswa") {
      const q = `
        UPDATE siswa
        SET nama = $1,
            provinsi_alamat = $2,
            kota_alamat = $3,
            alamat = $4,
            tingkat = $5,
            ortu_wali = $6,
            telp_ortu_wali = $7,
            provinsi_sekolah = $8,
            kota_sekolah = $9,
            nama_sekolah = $10,
            updated_at = NOW()
        WHERE id_akun = $11
        RETURNING *
      `;
      const res = await client.query(q, [
        nama,
        provinsiAlamat || null,
        kotaAlamat || null,
        alamat || null,
        tingkat,
        ortuWali,
        telpOrtuWali,
        provinsiSekolah || null,
        kotaSekolah || null,
        namaSekolah || null,
        idAkun,
      ]);

      if (res.rows.length === 0) {
        await client.query("ROLLBACK");
        return null;
      }

      if (fotoProfil) {
        const q2 = `UPDATE akun SET foto_profil = $1, updated_at = NOW() WHERE id = $2`;
        await client.query(q2, [fotoProfil, idAkun]);
      }

      await client.query("COMMIT");
      return res.rows[0];
    }

    if (role === "guru") {
      const q = `
        UPDATE guru
        SET nama = $1,
            provinsi_alamat = $2,
            kota_alamat = $3,
            alamat = $4,
            updated_at = NOW()
        WHERE id_akun = $5
        RETURNING *
      `;
      const res = await client.query(q, [
        nama,
        provinsiAlamat || null,
        kotaAlamat || null,
        alamat || null,
        idAkun,
      ]);

      if (res.rows.length === 0) {
        await client.query("ROLLBACK");
        return null;
      }

      if (fotoProfil) {
        const q2 = `UPDATE akun SET foto_profil = $1, updated_at = NOW() WHERE id = $2`;
        await client.query(q2, [fotoProfil, idAkun]);
      }

      await client.query("COMMIT");
      return res.rows[0];
    }

    await client.query("COMMIT");
    return null;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    logger.error("Update profil error", { error: err.message, idAkun, role });
    throw err;
  } finally {
    client.release();
  }
}

async function updateMateri(id, data) {
  if (!id) return null;

  let client;
  try {
    client = await pool.connect();
    const q = `UPDATE materi SET id_matpel=$1,id_kelas=$2,nama=$3,deskripsi=$4,isi=$5,catatan=$6,url_media=$7 WHERE id=$8 RETURNING *`;
    const res = await client.query(q, [
      data.matpelId,
      data.kelasId,
      data.nama,
      data.deskripsi,
      data.isi,
      data.catatan,
      data.urlMedia,
      id,
    ]);
    return res.rows[0] || null;
  } catch (err) {
    logger.error("updateMateri error", { error: err.message, idMateri, data });
    throw err;
  } finally {
    if (client) client.release();
  }
}

async function deleteMateri(id) {
  if (!id) return null;

  let client;
  try {
    client = await pool.connect();
    const q = `DELETE FROM materi WHERE id = $1 RETURNING *`;
    const res = await client.query(q, [id]);
    return res.rows[0] || null;
  } catch (err) {
    logger.error("deleteMateri error", { error: err.message, idMateri: id });
    throw err;
  } finally {
    if (client) client.release();
  }
}

async function tandaiMateriSelesai(idSiswa, idMateri) {
  if (!idSiswa || !idMateri) throw new Error("Missing parameters");

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Pastikan materi ada
    const cekMateri = await client.query(
      `SELECT * FROM materi WHERE id = $1 LIMIT 1`,
      [idMateri]
    );
    if (cekMateri.rows.length === 0) {
      await client.query("ROLLBACK");
      return null;
    }

    // Cek apakah siswa ini ada dan valid
    const cekSiswa = await client.query(
      `SELECT * FROM siswa WHERE id = $1 LIMIT 1`,
      [idSiswa]
    );
    if (cekSiswa.rows.length === 0) {
      await client.query("ROLLBACK");
      return null;
    }

    // Tandai selesai / upsert
    const q = `
      INSERT INTO pembelajaran (id_siswa, id_materi, selesai)
      VALUES ($1, $2, TRUE)
      ON CONFLICT (id_siswa, id_materi)
      DO UPDATE SET selesai = TRUE
      RETURNING *
    `;

    const res = await client.query(q, [idSiswa, idMateri]);
    await client.query("COMMIT");

    return res.rows[0];
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    logger.error("Tandai materi selesai error", {
      error: err.message,
      idSiswa,
      idMateri,
    });
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  handleLogin,
  handleRegister,
  tampilkanProfil,
  tampilkanMatpel,
  tampilkanKelas,
  tampilkanMateri,
  tampilkanDetailMateri,
  tambahMateri,
  updateProfil,
  updateMateri,
  deleteMateri,
  tandaiMateriSelesai,
  getDaftarSiswa,
  getSiswaLogin,
  getSiswaSelesaiByGuru,
};
