// routes/router.js
const router = require("express").Router();

// Controllers
const controller = require("../controllers/controller");

// Middleware
const checkLogin = require("../middlewares/check-login");

// Security utils (opsional tapi direkomendasikan untuk tetap aman)
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");

// ───────────── GLOBAL SECURITY ─────────────
router.use(helmet()); // hardening HTTP header
router.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 120,
  })
);

// ───────────── AUTH ROUTES ─────────────
router.post("/login-siswa", controller.loginSiswa);
router.post("/login-guru", controller.loginGuru);
router.post("/logout", checkLogin, controller.logout);
router.post("/register-siswa", controller.registerSiswa);
router.post("/register-guru", controller.registerGuru);

// ───────────── PROTECTED PROFIL ─────────────
router.get("/profil-siswa", checkLogin, controller.getProfilSiswa);
router.put("/edit-profil-siswa", checkLogin, controller.putProfilSiswa);
router.get("/profil-guru", checkLogin, controller.getProfilGuru);
router.put("/edit-profil-guru", checkLogin, controller.putProfilGuru);

// ───────────── MATA PELAJARAN ─────────────
router.get("/matpel", checkLogin, controller.getMatpel);

// Ambil kelas yang diikuti siswa pada suatu mapel
router.get(
  "/materi-siswa/:subject/kelas",
  checkLogin,
  controller.getKelasMapelSiswa
);

// Materi berdasarkan mapel (query: ?kelas=xxx)
router.get(
  "/materi-siswa/:subject/materi",
  checkLogin,
  controller.getMateriBySubject
);

// ───────────── MATERI CRUD (GURU) ─────────────
router.post("/materi", checkLogin, controller.postMateri);
router.put("/materi/:id", checkLogin, controller.putMateri);
router.delete("/materi/:id", checkLogin, controller.delMateri);

// ───────────── BELAJAR ─────────────
router.get(
  "/belajar/:subject/:materiId",
  checkLogin,
  controller.getDetailMateri
);

// Tandai selesai
router.post("/materi/selesai", checkLogin, controller.doneMateriSiswa);

// Guru: daftar siswa yang telah selesai (sidebar)
router.get("/guru/selesai", checkLogin, controller.getSiswaSelesai);

// ───────────── DATA SISWA (GURU) ─────────────
// Guru: lihat semua siswa yang terdaftar
router.get("/guru/siswa", checkLogin, controller.getAllSiswa);

// Guru: lihat siswa yang sedang login (sesi aktif)
router.get("/guru/siswa-login", checkLogin, controller.getSiswaAktif);

// Cek status selesai
router.get("/materi/:idMateri/selesai", checkLogin, controller.cekStatusMateri);

// Download materi (file) — siswa dapat mengunduh file yang diupload guru
router.get("/materi/:id/download", checkLogin, controller.downloadMateri);

// Download single file by path (query param `path`) - public (no DB required)
router.get("/files/download", controller.downloadFile);

// ───────────── UPLOADS / FILE MANAGEMENT (GURU) ─────────────
const multer = require("multer");
const fs = require("fs");
const path = require("path");

// ensure tmp upload folder exists
const tmpDir = path.join(__dirname, "..", "..", "uploads", "_tmp");
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

const upload = multer(); // no dest → keeps file in memory as buffer

// List folders (public)
router.get("/uploads/folders", controller.listFolders);

// List files in a folder (public)
router.get("/uploads/files/:folder", controller.listFiles);

router.post("/uploads/upload", upload.single("file"), controller.uploadFileSupabase);

// Download specific file in folder (public)
router.get("/uploads/download/:folder/:file", controller.downloadFolderFile);

// Delete file (public for now; limit later)
router.delete("/uploads/delete/:folder/:file", controller.deleteFile);

// Delete folder (recursive)
router.delete("/uploads/delete-folder/:folder", controller.deleteFolder);

module.exports = router;
