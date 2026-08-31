const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Serve i file statici dalla cartella 'public'
app.use(express.static(path.join(__dirname, "public")));

// Rotta principale di fallback
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server avviato sulla porta ${PORT}`);
});
