import express from "express";
import cors from "cors";
import fs from "fs";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";

// Fix __dirname pada ES Module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// Folder untuk menyimpan file upload
const uploadFolder = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadFolder)) {
  fs.mkdirSync(uploadFolder);
}

// SETUP MULTER
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadFolder);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "_" + file.originalname);
  },
});
const upload = multer({ storage });

// Lokasi materi.json
const MATERI_FILE = path.join(__dirname, "data", "materi.json");

// Helper baca & simpan
const readDB = () => {
  return JSON.parse(fs.readFileSync(MATERI_FILE));
};
const writeDB = (data) => {
  fs.writeFileSync(MATERI_FILE, JSON.stringify(data, null, 2));
};

// 💡 GET semua materi
app.get("/api/materi", (req, res) => {
  res.json(readDB());
});

// 💡 POST — tambah materi + upload file
app.post("/api/materi", upload.array("files"), (req, res) => {
  const { matpel, kelas, title } = req.body;
  const db = readDB();

  const newMateri = {
    id: Date.now(),
    matpel,
    kelas,
    title,
    files: req.files.map((file) => ({
      name: file.originalname,
      url: `/uploads/${file.filename}`,
    })),
  };

  db.push(newMateri);
  writeDB(db);
  res.json(newMateri);
});

// 💡 Endpoint static untuk akses file
app.use("/uploads", express.static(uploadFolder));

// 💡 DELETE — hapus file tertentu
app.delete("/api/materi/:id/files/:index", (req, res) => {
  const { id, index } = req.params;
  const db = readDB();
  const materi = db.find((m) => m.id == id);

  if (!materi) return res.status(404).json({ msg: "Materi tidak ditemukan" });

  // ambil file fisik
  const deleted = materi.files[index];
  if (!deleted) return res.status(404).json({ msg: "File tidak ada" });

  // hapus file di server
  const filePath = path.join(uploadFolder, deleted.url.split("/").at(-1));
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

  // update data
  materi.files.splice(index, 1);
  writeDB(db);

  res.json({ msg: "File dihapus" });
});

// 🚀 Start server PORT 6000
app.listen(6000, () =>
  console.log("Backend berjalan di http://localhost:6000")
);
