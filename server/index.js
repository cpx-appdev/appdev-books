import express from "express";
import http from "http";
import path from "path";

const port = process.env.PORT || 8080;
const app = express();
const httpServer = http.Server(app);

app.use("/", express.static(path.resolve(__dirname + "/../public")));

app.get("/books", (req, res) => {
    const books = [
        { id: "1", title: "Book 1" },
        { id: "2", title: "Book 2" }];

    res.json(books);
});

httpServer.listen(port, () => {
    console.log(`listening on *:${port}`);
});
