const mongoose = require("mongoose");
const express = require("express");
const app = express();
const path = require("path");
const portNumber = process.env.PORT || 7003;

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.set("view engine", "ejs");
app.set("views", path.resolve(__dirname, "..", "templates"));

app.get("/", async (req, res) => {
    res.render("placeholder");
});

app.listen(portNumber);
console.log(`main URL http://localhost:${portNumber}/`);