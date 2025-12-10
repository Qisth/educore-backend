const app = require("../src/app");
app.get('/', (req, res) => {
    res.status(200).send("Endpoint utama berhasil diakses melalui Vercel handler!");
});
module.exports = app;