import express from "express";
import http from "http";
import path from "path";
import uuid from "uuid";
import bodyParser from "body-parser";

const port = process.env.PORT || 8080;
const app = express();
const httpServer = http.Server(app);

const books = [
    { id: "21", isbn: "978-3-86680-192-9", title: "Book 1", "borrowedFrom": "" },
    { id: "42", isbn: "978-3-86680-192-9", title: "Book 2", "borrowedFrom": "" }];

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use("/", express.static(path.resolve(__dirname + "/../public")));

app.post("/addBook", (req, res) => {
    books.push({ id: uuid.v4(), title: req.body.title, isbn: req.body.isbn });
    res.sendStatus(200);
});


app.get("/books", (req, res) => {
    res.json(books);
});

httpServer.listen(port, () => {
    console.log(`listening on *:${port}`);
});
