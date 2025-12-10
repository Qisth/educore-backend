const express = require("express");
const router = express.Router();
const upload = require("../utils/multerConfig");
const {
  uploadMateri,
  listMateri,
  downloadFile,
  deleteFile,
  deleteFolder,
} = require("../controllers/materiController");

// UPLOAD FILE
router.post("/upload", upload.array("files"), uploadMateri);

// LIST FILE
router.get("/:mapel/:kelas", listMateri);

// DOWNLOAD FILE
router.get("/download/:materiId/:fileIndex", downloadFile);

// DELETE SINGLE FILE
router.delete("/file/:materiId/:fileIndex/:mapel/:kelas", deleteFile);

// DELETE FOLDER
router.delete("/folder/:materiId/:mapel/:kelas", deleteFolder);

module.exports = router;
