const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE);
const pool = require("../config/db"); // Atau client PostgreSQL kamu

exports.uploadMateri = async (req, res) => {
  try {
    const { id_guru, id_matpel, id_kelas, nama, deskripsi, isi, catatan } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: "File wajib diupload" });
    }

    const file = req.file;
    const filePath = `materi/${Date.now()}_${file.originalname}`;

    // 1. Upload file ke Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from("materi")
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: true,
      });

    if (uploadError) throw uploadError;

    // 2. Generate public URL
    const { data: publicUrl } = supabase.storage
      .from("materi")
      .getPublicUrl(filePath);

    const url_media = publicUrl.publicUrl;

    // 3. Simpan metadata ke DB
    const query = `
      INSERT INTO materi 
      (id_guru, id_matpel, id_kelas, nama, deskripsi, isi, catatan, url_media)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING *
    `;

    const values = [
      id_guru,
      id_matpel,
      id_kelas,
      nama,
      deskripsi || null,
      isi || null,
      catatan || null,
      url_media
    ];

    const { rows } = await pool.query(query, values);

    res.json({
      message: "Materi berhasil ditambahkan",
      materi: rows[0],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Gagal menambahkan materi" });
  }
};

exports.listMateri = async (req, res) => {
  const { id_matpel, id_kelas } = req.params;

  const query = `
    SELECT * FROM materi
    WHERE id_matpel = $1 AND id_kelas = $2
    ORDER BY tanggal_pembuatan DESC
  `;

  const { rows } = await pool.query(query, [id_matpel, id_kelas]);

  res.json(rows);
};

exports.deleteMateri = async (req, res) => {
  const { id } = req.params;

  const { rows } = await db.query("SELECT url_media FROM materi WHERE id = $1", [id]);
  if (!rows.length) return res.status(404).json({ error: "Materi tidak ditemukan" });

  const url = rows[0].url_media;

  const filePath = url.split("/storage/v1/object/public/materi/")[1];

  await supabase.storage.from("materi").remove([filePath]);

  await pool.query("DELETE FROM materi WHERE id = $1", [id]);

  res.json({ message: "Materi dihapus" });
};
