const express = require("express");
const app = express();

app.get("/", (req, res) => {
  res.send("✅ Test backend running fine");
});

module.exports = app;
