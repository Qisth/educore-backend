const express = require("express");
const router = express.Router();
const upload = require("../utils/multerConfig");
const {
  uploadMateriFiles,
  listMateriFiles,
  getMateriFileUrl,
  deleteMateriFile,
  deleteMateriFolder,
} = require("../controllers/materiController");

// UPLOAD FILE (banyak)
router.post("/upload", upload.array("files"), uploadMateriFiles);

// LIST FILE
router.get("/:materiId", listMateriFiles);

// GET DOWNLOAD URL
router.get("/download/:materiId/:fileName", getMateriFileUrl);

// DELETE SINGLE FILE
router.delete("/file/:materiId/:fileName", deleteMateriFile);

// DELETE FOLDER
router.delete("/folder/:materiId", deleteMateriFolder);

module.exports = router;
