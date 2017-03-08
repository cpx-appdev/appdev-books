import express from "express";
import http from "http";
import path from "path";
import uuid from "uuid";
import documentdb from "documentdb";
import nconf from "nconf";
import socketIo from "socket.io";
import basicAuth from "basic-auth";
import { BookLookup } from "./bookLookup";
import fs from "fs";

const port = process.env.PORT || 8080;
const app = express();
const httpServer = http.createServer(app);
const socketIoServer = socketIo.listen(httpServer);

nconf.file(path.resolve(__dirname + "/secrets.json")).env();
const secrets = {
    documentdb_endpoint: nconf.get("documentdb_endpoint"),
    documentdb_primaryKey: nconf.get("documentdb_primaryKey"),
    documentdb_database: nconf.get("documentdb_database"),
    documentdb_collection: nconf.get("documentdb_collection"),
    isbnDbApiKey: nconf.get("isbnDbApiKey"),
    username: nconf.get("auth_username"),
    password: nconf.get("auth_password")
}

const bookLookup = new BookLookup(secrets.isbnDbApiKey);
const documentdbClient = new documentdb.DocumentClient(secrets.documentdb_endpoint, { masterKey: secrets.documentdb_primaryKey });
const databaseUrl = `dbs/${secrets.documentdb_database}`;
const collectionUrl = `${databaseUrl}/colls/${secrets.documentdb_collection}`;

const auth = (req, res, next) => {
    function unauthorized(res) {
        res.set("WWW-Authenticate", "Basic realm=Authorization Required");
        return res.sendStatus(401);
    }

    const user = basicAuth(req);

    if (!user || !user.name || !user.pass) {
        return unauthorized(res);
    }

    if (user.name === secrets.username && user.pass === secrets.password) {
        return next();
    } else {
        return unauthorized(res);
    }
};

function addBook(book) {
    return new Promise((resolve, reject) => {
        existsBook(book.isbn).then(existsAlready => {
            if (existsAlready) {
                reject("Book exists already");
                return;
            }

            documentdbClient.createDocument(collectionUrl, book, (error, book) => {
                if (error) {
                    reject(error);
                }
                else {
                    resolve(book);
                }
            });
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
                reject("No book found");
            }
        });
    });
}

function existsBook(isbn) {
    return new Promise((resolve, reject) => {
        documentdbClient.queryDocuments(collectionUrl, `SELECT VALUE r FROM root r WHERE r.isbn = "${isbn}"`
        ).toArray((error, books) => {
            if (error) {
                reject(error);
            }
            else {
                resolve(books.length == 1);
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

app.use("/", auth, express.static(path.resolve(__dirname + "/../public")));

app.get("/version", (req, res, next) => {
    fs.readFile(path.resolve(__dirname + "/../public/version.txt"), "utf8", (err, data) => {
        if (!err) {
            res.json({ version: data });
        }
        next();
    });
});

socketIoServer.on("connection", socket => {
    const clientIp = socket.request.connection.remoteAddress;
    console.log("Client connected:\t" + clientIp);

    socket.on("getBooks", callback => {
        getBooks().then(books => callback(books));
    });

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
