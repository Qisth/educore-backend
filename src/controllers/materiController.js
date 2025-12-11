const supabase = require("../config/supabase");

// UPLOAD BANYAK FILE
exports.uploadMateriFiles = async (req, res) => {
  try {
    const materiId = req.body.materiId;
    const files = req.files;

    if (!files || files.length === 0) {
      return res.status(400).json({ error: "Tidak ada file yang diupload" });
    }

    const uploadedFiles = [];

    for (const file of files) {
      const filePath = `materi/${materiId}/${Date.now()}-${file.originalname}`;
      const { error } = await supabase.storage
        .from("materi")
        .upload(filePath, file.buffer, {
          contentType: file.mimetype,
          upsert: false,
        });

      if (error) return res.status(500).json({ error: error.message });

      const publicUrl = supabase.storage.from("materi").getPublicUrl(filePath).data.publicUrl;
      uploadedFiles.push({ name: file.originalname, url: publicUrl, path: filePath });
    }

    res.json({ message: "Upload berhasil", files: uploadedFiles });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// LIST FILE
exports.listMateriFiles = async (req, res) => {
  try {
    const materiId = req.params.materiId;

    const { data, error } = await supabase.storage.from("materi").list(`materi/${materiId}`);
    if (error) return res.status(500).json({ error: error.message });

    const files = data.map(f => ({
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

// GET PUBLIC URL / DOWNLOAD
exports.getMateriFileUrl = async (req, res) => {
  try {
    const { materiId, fileName } = req.params;
    const { data, error } = supabase.storage
      .from("materi")
      .getPublicUrl(`materi/${materiId}/${fileName}`);

    if (error) return res.status(500).json({ error: error.message });

    res.json({ url: data.publicUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE SINGLE FILE
exports.deleteMateriFile = async (req, res) => {
  try {
    const { materiId, fileName } = req.params;
    const filePath = `materi/${materiId}/${fileName}`;

    const { error } = await supabase.storage.from("materi").remove([filePath]);
    if (error) return res.status(500).json({ error: error.message });

    res.json({ message: "File berhasil dihapus" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE FOLDER
exports.deleteMateriFolder = async (req, res) => {
  try {
    const materiId = req.params.materiId;
    const { data, error } = await supabase.storage.from("materi").list(`materi/${materiId}`);
    if (error) return res.status(500).json({ error: error.message });

    const paths = data.map(f => `materi/${materiId}/${f.name}`);
    if (paths.length > 0) {
      const { error: deleteError } = await supabase.storage.from("materi").remove(paths);
      if (deleteError) return res.status(500).json({ error: deleteError.message });
    }

    res.json({ message: "Folder berhasil dihapus" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
