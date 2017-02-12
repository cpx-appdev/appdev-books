import express from "express";
import http from "http";
import path from "path";
import uuid from "uuid";
import bodyParser from "body-parser";
import documentdb from "documentdb";
import nconf from "nconf";

const port = process.env.PORT || 8080;
const app = express();
const httpServer = http.Server(app);

nconf.file(path.resolve(__dirname + "/secrets.json")).env();
const secrets = {
    documentdb_endpoint: nconf.get("documentdb_endpoint"),
    documentdb_primaryKey: nconf.get("documentdb_primaryKey"),
    documentdb_database: nconf.get("documentdb_database"),
    documentdb_collection: nconf.get("documentdb_collection")
}

const documentdbClient = new documentdb.DocumentClient(secrets.documentdb_endpoint, { masterKey: secrets.documentdb_primaryKey });
const databaseUrl = `dbs/${secrets.documentdb_database}`;
const collectionUrl = `${databaseUrl}/colls/${secrets.documentdb_collection}`;

const books = [
    { id: "21", isbn: "978-3-86680-192-9", title: "Book 1", "borrowedFrom": "" },
    { id: "42", isbn: "978-3-86680-192-9", title: "Book 2", "borrowedFrom": "" },
    { id: "84", isbn: "978-3-86680-192-9", title: "Book 2", "borrowedFrom": "" }
];


function addBook(book) {
    return new Promise((resolve, reject) => {
        documentdbClient.createDocument(collectionUrl, book, (error, book) => {
            if (error) {
                reject(error);
            }
            else {
                resolve(book);
            }
        });
    });
}

function getBooks() {
    return new Promise((resolve, reject) => {
        documentdbClient.queryDocuments(collectionUrl).toArray((error, books) => {
            if (error) {
                reject(error);
            }
            else {
                resolve(books);
            }
        });
    });
}

function getBookById(id) {
    return new Promise((resolve, reject) => {
        documentdbClient.queryDocuments(collectionUrl, `SELECT VALUE r FROM root r WHERE r.id = "${id}"`
        ).toArray((error, books) => {
            if (error) {
                reject(error);
            }
            else if (books.length == 1) {
                resolve(books[0]);
            }
            else {
                reject("No document found.");
            }
        });
    });
}

// getBookById("21")
//     .then(book => {
//         console.dir(book);
//     })
//     .catch(error => console.log(error));

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
