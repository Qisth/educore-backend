const supabase = require("../config/supabase");

exports.uploadMateriFile = async (req, res) => {
  try {
    const file = req.file;
    const materiId = req.body.materiId;

    if (!file) {
      return res.status(400).json({ error: "File tidak ditemukan" });
    }

    const filePath = `materi/${materiId}/${Date.now()}-${file.originalname}`;

    const { error } = await supabase.storage
      .from("materi")
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (error) return res.status(500).json({ error: error.message });

    const publicUrl = supabase.storage
      .from("materi")
      .getPublicUrl(filePath).data.publicUrl;

    res.json({
      message: "Upload berhasil",
      file: {
        url: publicUrl,
        path: filePath,
        name: file.originalname,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.listMateriFiles = async (req, res) => {
  try {
    const materiId = req.params.id;

    const { data, error } = await supabase.storage
      .from("materi")
      .list(`materi/${materiId}`);

    if (error) return res.status(500).json({ error: error.message });

    const files = data.map((f) => ({
      name: f.name,
      url: supabase.storage.from("materi").getPublicUrl(`materi/${materiId}/${f.name}`).data.publicUrl,
      size: f.metadata?.size,
      created_at: f.created_at,
    }));

    res.json(files);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteMateriFile = async (req, res) => {
  try {
    const materiId = req.params.id;
    const fileId = req.params.fileId;

    const filePath = `materi/${materiId}/${fileId}`;

    const { error } = await supabase.storage
      .from("materi")
      .remove([filePath]);

    if (error) return res.status(500).json({ error: error.message });

    res.json({ message: "File berhasil dihapus" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
