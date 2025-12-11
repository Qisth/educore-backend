// routes/router.js
const router = require("express").Router();

// Controllers
const controller = require("../controllers/controller");
const materiController = require("../controllers/materiController");

// Middleware
const checkLogin = require("../middlewares/check-login");

// Security
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");

router.use(helmet());
router.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 120,
  })
);

// Multer untuk buffer upload
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });

// ===============================================
//                AUTH
// ===============================================

router.post("/login-siswa", controller.loginSiswa);
router.post("/login-guru", controller.loginGuru);
router.post("/logout", checkLogin, controller.logout);
router.post("/register-siswa", controller.registerSiswa);
router.post("/register-guru", controller.registerGuru);

// ===============================================
//                PROFIL
// ===============================================

router.get("/profil-siswa", checkLogin, controller.getProfilSiswa);
router.put("/edit-profil-siswa", checkLogin, controller.putProfilSiswa);
router.get("/profil-guru", checkLogin, controller.getProfilGuru);
router.put("/edit-profil-guru", checkLogin, controller.putProfilGuru);

// ===============================================
//                MAPEL & MATERI
// ===============================================

router.get("/matpel", checkLogin, controller.getMatpel);

router.get(
  "/materi-siswa/:subject/kelas",
  checkLogin,
  controller.getKelasMapelSiswa
);

router.get(
  "/materi-siswa/:subject/materi",
  checkLogin,
  controller.getMateriBySubject
);

// CRUD Materi (Guru)
router.post("/materi", checkLogin, controller.postMateri);
router.put("/materi/:id", checkLogin, controller.putMateri);
router.delete("/materi/:id", checkLogin, controller.delMateri);

// Belajar
router.get("/belajar/:subject/:materiId", checkLogin, controller.getDetailMateri);

// Tandai selesai
router.post("/materi/selesai", checkLogin, controller.doneMateriSiswa);

router.get("/guru/selesai", checkLogin, controller.getSiswaSelesai);

// Daftar siswa
router.get("/guru/siswa", checkLogin, controller.getAllSiswa);
router.get("/guru/siswa-login", checkLogin, controller.getSiswaAktif);

// Cek status selesai
router.get("/materi/:idMateri/selesai", checkLogin, controller.cekStatusMateri);

// ===============================================
//         UPLOAD / DELETE FILE SUPABASE
// ===============================================

// Upload single file → disimpan di Supabase Storage (materi bucket)
router.post(
  "/materi/upload",
  checkLogin,
  upload.single("file"),
  materiController.uploadMateriFiles
);

// List files pada materi tertentu
router.get(
  "/materi/:id/files",
  checkLogin,
  materiController.listMateriFiles
);

// Delete file
router.delete(
  "/materi/:id/files/:fileId",
  checkLogin,
  materiController.deleteMateriFile
);

module.exports = router;
