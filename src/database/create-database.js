const pool = require("../config/db");

// Buat tabel yang diperlukan
const createTables = async () => {
  try {
    // jika variabel lingkungan DB belum diatur, lewati pembuatan tabel
    if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_NAME) {
      console.log("DB env not configured — skipping createTables");
      return;
    }
    // Buat enum user_role
    await pool.query(`
      DO $$
      BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
              CREATE TYPE user_role AS ENUM ('siswa', 'guru');
          END IF;
      END $$ LANGUAGE plpgsql;
    `);

    // Buat tabel akun
    await pool.query(`
      CREATE TABLE IF NOT EXISTS akun (
        id SERIAL PRIMARY KEY,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role user_role NOT NULL,
        foto_profil TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // Buat tabel sesi
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sesi (
        token TEXT PRIMARY KEY,
        id_akun INT NOT NULL REFERENCES akun(id),
        waktu_berakhir TIMESTAMP NOT NULL DEFAULT NOW() + INTERVAL '7 days'
      );
    `);

    // Buat tabel siswa
    await pool.query(`
      CREATE TABLE IF NOT EXISTS siswa (
        id SERIAL PRIMARY KEY,
        id_akun INT NOT NULL REFERENCES akun(id),
        nama VARCHAR(100) UNIQUE NOT NULL,
        provinsi_alamat VARCHAR(100),
        kota_alamat VARCHAR(100),
        alamat TEXT,
        provinsi_sekolah VARCHAR(100),
        kota_sekolah VARCHAR(100),
        nama_sekolah VARCHAR(100),
        tingkat VARCHAR(3) NOT NULL,
        ortu_wali VARCHAR(100) NOT NULL,
        telp_ortu_wali VARCHAR(14) NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // Buat tabel guru
    await pool.query(`
      CREATE TABLE IF NOT EXISTS guru (
        id SERIAL PRIMARY KEY,
        id_akun INT NOT NULL REFERENCES akun(id),
        nama VARCHAR(100) UNIQUE NOT NULL,
        provinsi_alamat VARCHAR(100),
        kota_alamat VARCHAR(100),
        alamat TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // Buat tabel mata pelajaran
    await pool.query(`
      CREATE TABLE IF NOT EXISTS matpel (
        id SERIAL PRIMARY KEY,
        nama VARCHAR(100) NOT NULL,
        url_gambar TEXT
      );
    `);

    // Buat tabel kelas
    await pool.query(`
      CREATE TABLE IF NOT EXISTS kelas (
        id VARCHAR(100) PRIMARY KEY,
        nama VARCHAR(100) NOT NULL,
        no_kelas INT CHECK (no_kelas BETWEEN 1 AND 12),
        tingkat VARCHAR(3) NOT NULL
      );
    `);

    // Buat tabel materi
    await pool.query(`
      CREATE TABLE IF NOT EXISTS materi (
        id SERIAL PRIMARY KEY,
        id_guru INT NOT NULL REFERENCES guru(id),
        id_matpel INT NOT NULL REFERENCES matpel(id),
        id_kelas VARCHAR(100) NOT NULL REFERENCES kelas(id),
        nama VARCHAR(100) NOT NULL,
        deskripsi TEXT,
        isi TEXT,
        catatan TEXT,
        url_media TEXT,
        tanggal_pembuatan DATE DEFAULT CURRENT_DATE
      );
    `);

    // Buat tabel pembelajaran
    await pool.query(`
      CREATE TABLE IF NOT EXISTS pembelajaran (
        id SERIAL PRIMARY KEY,
        id_siswa INT NOT NULL REFERENCES siswa(id),
        id_materi INT NOT NULL REFERENCES materi(id),
        selesai BOOLEAN DEFAULT false,
        UNIQUE (id_siswa, id_materi)
      );
    `);

    // Buat tabel detail kelas
    await pool.query(`
      CREATE TABLE IF NOT EXISTS detail_kelas (
        id SERIAL PRIMARY KEY,
        id_siswa INT NOT NULL REFERENCES siswa(id),
        id_matpel INT NOT NULL REFERENCES matpel(id),
        id_kelas VARCHAR(100) NOT NULL REFERENCES kelas(id),
        tgl_masuk DATE DEFAULT CURRENT_DATE,
        progres INT CHECK (progres BETWEEN 0 AND 100)
      );
    `);

    console.log("Tables created successfully");
  } catch (err) {
    console.log("Error creating tables:", err);
  }
};

// Buat index
const createIndexes = async () => {
  try {
    if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_NAME) {
      console.log("DB env not configured — skipping createIndexes");
      return;
    }
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_akun_email ON akun(email);
      CREATE INDEX IF NOT EXISTS idx_sesi_id_akun ON sesi(id_akun);
      CREATE INDEX IF NOT EXISTS idx_detail_kelas_siswa ON detail_kelas(id_siswa);
      CREATE INDEX IF NOT EXISTS idx_materi_kelas ON materi(id_kelas);
      CREATE INDEX IF NOT EXISTS idx_pembelajaran_siswa ON pembelajaran(id_siswa);
    `);

    console.log("Indexes created successfully");
  } catch (err) {
    console.log("Error creating indexes:", err);
  }
};

// Insert sample data if tables are empty
const insertSampleData = async () => {
  try {
    if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_NAME) {
      return;
    }

    // Check if matpel table is empty
    const matpelCount = await pool.query("SELECT COUNT(*) FROM matpel");
    if (parseInt(matpelCount.rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO matpel (nama, url_gambar) VALUES 
        ('Matematika', '/images/matematika.png'),
        ('Fisika', '/images/fisika.png'),
        ('Kimia', '/images/kimia.png'),
        ('Biologi', '/images/biologi.png'),
        ('Bahasa Indonesia', '/images/bahasa-indonesia.png'),
        ('Bahasa Inggris', '/images/bahasa-inggris.png')
      `);
      console.log("Sample matpel data inserted");
    }

    // Check if kelas table is empty
    const kelasCount = await pool.query("SELECT COUNT(*) FROM kelas");
    if (parseInt(kelasCount.rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO kelas (id, nama, no_kelas, tingkat) VALUES 
        ('10A', 'Kelas 10 A', 10, 'SMA'),
        ('10B', 'Kelas 10 B', 10, 'SMA'),
        ('11A', 'Kelas 11 A', 11, 'SMA'),
        ('11B', 'Kelas 11 B', 11, 'SMA'),
        ('12A', 'Kelas 12 A', 12, 'SMA')
      `);
      console.log("Sample kelas data inserted");
    }
  } catch (err) {
    console.log("Error inserting sample data:", err.message);
  }
};

module.exports = { createTables, createIndexes, insertSampleData };
