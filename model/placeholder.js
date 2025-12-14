const mongoose = require("mongoose");
const express = require("express");
const app = express();
const path = require("path");

app.use(bodyParser.urlencoded({ extended: false }));
app.set("view engine", "ejs");
app.set("views", path.resolve(__dirname, "templates"));

app.get("/", async (req, res) =>{
    res.render('placeholder');
})