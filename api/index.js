const path = require("path");
const fs = require("fs");
const app = require("../src/app");

app.get('/', (req, res) => {
    res.status(200).send("Endpoint utama berhasil diakses melalui Vercel handler!");
});

app.get("/favicon.ico", (req, res) => {
  const faviconPath = path.join(__dirname, "public", "favicon.ico");

  // Cek apakah file ada
  if (fs.existsSync(faviconPath)) {
    return res.sendFile(faviconPath);
  }

  // Jika tidak ada, kembalikan 204 No Content
  res.status(204).end();
});

app.get("/favicon.png", (req, res) => {
  const faviconPath = path.join(__dirname, "public", "favicon.png");

  // Cek apakah file ada
  if (fs.existsSync(faviconPath)) {
    return res.sendFile(faviconPath);
  }

  // Jika tidak ada, kembalikan 204 No Content
  res.status(204).end();
});

module.exports = app;