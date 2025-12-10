const fs = require("fs-extra");
const path = require("path");

const DATA_PATH = "./data/materi.json";

// Helper untuk ambil data
const getData = () => JSON.parse(fs.readFileSync(DATA_PATH));
const saveData = (data) =>
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));

// ➕ Upload
exports.uploadMateri = (req, res) => {
  const { mapel, kelas, folderName } = req.body;
  const files = req.files.map((f) => ({
    name: f.originalname,
    path: f.path,
  }));

  let data = getData();
  const materi = {
    id: Date.now(),
    folderName,
    mapel,
    kelas,
    uploadDate: Date.now(),
    files,
  };

  data.push(materi);
  saveData(data);

  res.json({ message: "Materi berhasil diupload", materi });
};

// 📄 List
exports.listMateri = (req, res) => {
  const { mapel, kelas } = req.params;
  const data = getData().filter((m) => m.mapel === mapel && m.kelas === kelas);
  res.json(data);
};

// ⬇ Download
exports.downloadFile = (req, res) => {
  const { materiId, fileIndex } = req.params;
  const data = getData();
  const materi = data.find((m) => m.id == materiId);
  if (!materi) return res.status(404).send("Materi tidak ditemukan");

  const file = materi.files[fileIndex];
  if (!file) return res.status(404).send("File tidak ditemukan");

  res.download(file.path, file.name);
};

// 🗑 Hapus file
exports.deleteFile = (req, res) => {
  const { materiId, fileIndex, mapel, kelas } = req.params;
  let data = getData();

  data = data.map((m) => {
    if (m.id == materiId && m.mapel == mapel && m.kelas == kelas) {
      const file = m.files[fileIndex];
      if (file) fs.removeSync(file.path);
      m.files.splice(fileIndex, 1);
    }
    return m;
  });

  saveData(data);
  res.json({ message: "File dihapus" });
};

// 🚮 Hapus folder
exports.deleteFolder = (req, res) => {
  const { materiId, mapel, kelas } = req.params;
  let data = getData();

  const materi = data.find(
    (m) => m.id == materiId && m.mapel == mapel && m.kelas == kelas
  );
  if (!materi) return res.status(404).send("Folder tidak ditemukan");

  materi.files.forEach((f) => fs.removeSync(f.path));
  data = data.filter((m) => m.id != materiId);

  saveData(data);

  res.json({ message: "Folder dihapus" });
};
