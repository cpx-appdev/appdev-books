import express from "express";
import http from "http";
import path from "path";

const port = process.env.PORT || 8080;
const app = express();
const httpServer = http.Server(app);

app.use("/", express.static(path.resolve(__dirname + "/../public")));

app.get("/books", (req, res) => {
    const books = [
        { id: "21", isbn: "", title: "Book 1", "borrowedFrom": "" },
        { id: "42", isbn: "", title: "Book 2", "borrowedFrom": "" }];

    res.json(books);
});

httpServer.listen(port, () => {
    console.log(`listening on *:${port}`);
});
