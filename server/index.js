import express from "express";
import http from "http";
import path from "path";
import uuid from "uuid";
import bodyParser from "body-parser";
import documentdb from "documentdb";
import nconf from "nconf";
import request from "request";
import socketIo from "socket.io";
import { BookLookup } from "./bookLookup";

const port = process.env.PORT || 8080;
const app = express();
const httpServer = http.Server(app);
const socketIoServer = socketIo(httpServer, {
    pingTimeout: 2000,
    pingInterval: 2000
});

nconf.file(path.resolve(__dirname + "/secrets.json")).env();
const secrets = {
    documentdb_endpoint: nconf.get("documentdb_endpoint"),
    documentdb_primaryKey: nconf.get("documentdb_primaryKey"),
    documentdb_database: nconf.get("documentdb_database"),
    documentdb_collection: nconf.get("documentdb_collection"),
    isbnDbApiKey: nconf.get("isbnDbApiKey")
}

const bookLookup = new BookLookup(secrets.isbnDbApiKey);
const documentdbClient = new documentdb.DocumentClient(secrets.documentdb_endpoint, { masterKey: secrets.documentdb_primaryKey });
const databaseUrl = `dbs/${secrets.documentdb_database}`;
const collectionUrl = `${databaseUrl}/colls/${secrets.documentdb_collection}`;

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



function addBookByIsbn(isbn) {
    return new Promise((resolve, reject) => {
        bookLookup.execute(isbn)
            .then(book => {
                if (book) {
                    book.id = uuid.v4();
                    book.borrowedFrom = "";
                    book.borrowedOn = "";
                    addBook(book);
                    resolve(book);
                }
                else {
                    reject("No book found");
                }
            }).catch(reject);
    });
}

function borrowBook(bookId, name) {
    return new Promise((resolve, reject) => {
        const documentUrl = `${collectionUrl}/docs/${bookId}`;

        getBookById(bookId).then(book => {
            book.borrowedFrom = name;
            const date = new Date();
            book.borrowedOn = `${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()}`;
            documentdbClient.replaceDocument(documentUrl, book, (error, result) => {
                if (error) {
                    reject(error);
                }
                else {
                    resolve(result);
                }
            });
        }).catch(error => {
            reject(error);

        });
    });
}

function returnBook(bookId) {
    return new Promise((resolve, reject) => {
        const documentUrl = `${collectionUrl}/docs/${bookId}`;

        getBookById(bookId).then(book => {
            book.borrowedFrom = "";
            book.borrowedOn = "";
            documentdbClient.replaceDocument(documentUrl, book, (error, result) => {
                if (error) {
                    reject(error);
                }
                else {
                    resolve(result);
                }
            });
        }).catch(error => {
            reject(error);

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

// app.post("/addBook", (req, res) => {
//     addBookByIsbn(req.body.isbn)
//         .then(book => { socketIoServer.sockets.emit("bookAdded", book); res.sendStatus(200); })
//         .catch(() => { res.sendStatus(500); });
// });


app.get("/books", (req, res) => {
    getBooks().then(books => res.json(books));
});

socketIoServer.on("connection", (socket) => {
    const clientIp = socket.request.connection.remoteAddress;
    console.log("Client connected:\t" + clientIp);

    socket.on("addBook", (isbn, callback) => {
        addBookByIsbn(isbn)
            .then(book => {
                socketIoServer.sockets.emit("bookAdded", book);
                callback();
            }).catch(error => callback(error));
    });

    socket.on("borrowBook", (id, name) => {
        borrowBook(id, name)
            .then(book => {
                socketIoServer.sockets.emit("bookBorrowed", book);
            });
    });

    socket.on("returnBook", (id, name) => {
        returnBook(id, name)
            .then(book => {
                socketIoServer.sockets.emit("bookReturned", book);
            });
    });
});

httpServer.listen(port, () => {
    console.log(`listening on *:${port}`);
});
