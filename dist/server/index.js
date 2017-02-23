"use strict";

var _express = require("express");

var _express2 = _interopRequireDefault(_express);

var _http = require("http");

var _http2 = _interopRequireDefault(_http);

var _path = require("path");

var _path2 = _interopRequireDefault(_path);

var _uuid = require("uuid");

var _uuid2 = _interopRequireDefault(_uuid);

var _bodyParser = require("body-parser");

var _bodyParser2 = _interopRequireDefault(_bodyParser);

var _documentdb = require("documentdb");

var _documentdb2 = _interopRequireDefault(_documentdb);

var _nconf = require("nconf");

var _nconf2 = _interopRequireDefault(_nconf);

var _request = require("request");

var _request2 = _interopRequireDefault(_request);

var _socket = require("socket.io");

var _socket2 = _interopRequireDefault(_socket);

var _bookLookup = require("./bookLookup");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var port = process.env.PORT || 8080;
var app = (0, _express2.default)();
var httpServer = _http2.default.Server(app);
var socketIoServer = (0, _socket2.default)(httpServer, {
    pingTimeout: 2000,
    pingInterval: 2000
});

_nconf2.default.file(_path2.default.resolve(__dirname + "/secrets.json")).env();
var secrets = {
    documentdb_endpoint: _nconf2.default.get("documentdb_endpoint"),
    documentdb_primaryKey: _nconf2.default.get("documentdb_primaryKey"),
    documentdb_database: _nconf2.default.get("documentdb_database"),
    documentdb_collection: _nconf2.default.get("documentdb_collection"),
    isbnDbApiKey: _nconf2.default.get("isbnDbApiKey")
};

var bookLookup = new _bookLookup.BookLookup(secrets.isbnDbApiKey);
var documentdbClient = new _documentdb2.default.DocumentClient(secrets.documentdb_endpoint, { masterKey: secrets.documentdb_primaryKey });
var databaseUrl = "dbs/" + secrets.documentdb_database;
var collectionUrl = databaseUrl + "/colls/" + secrets.documentdb_collection;

function addBook(book) {
    return new Promise(function (resolve, reject) {
        documentdbClient.createDocument(collectionUrl, book, function (error, book) {
            if (error) {
                reject(error);
            } else {
                resolve(book);
            }
        });
    });
}

function getBooks() {
    return new Promise(function (resolve, reject) {
        documentdbClient.queryDocuments(collectionUrl).toArray(function (error, books) {
            if (error) {
                reject(error);
            } else {
                resolve(books);
            }
        });
    });
}

function getBookById(id) {
    return new Promise(function (resolve, reject) {
        documentdbClient.queryDocuments(collectionUrl, "SELECT VALUE r FROM root r WHERE r.id = \"" + id + "\"").toArray(function (error, books) {
            if (error) {
                reject(error);
            } else if (books.length == 1) {
                resolve(books[0]);
            } else {
                reject("No document found.");
            }
        });
    });
}

function addBookByIsbn(isbn) {
    return new Promise(function (resolve, reject) {
        bookLookup.execute(isbn).then(function (book) {
            if (book) {
                book.id = _uuid2.default.v4();
                book.borrowedFrom = "";
                book.borrowedOn = "";
                addBook(book);
                resolve(book);
            } else {
                reject("No book found");
            }
        }).catch(reject);
    });
}

function borrowBook(bookId, name) {
    return new Promise(function (resolve, reject) {
        var documentUrl = collectionUrl + "/docs/" + bookId;

        getBookById(bookId).then(function (book) {
            book.borrowedFrom = name;
            var date = new Date();
            book.borrowedOn = date.getDate() + "." + (date.getMonth() + 1) + "." + date.getFullYear();
            documentdbClient.replaceDocument(documentUrl, book, function (error, result) {
                if (error) {
                    reject(error);
                } else {
                    resolve(result);
                }
            });
        }).catch(function (error) {
            reject(error);
        });
    });
}

function returnBook(bookId) {
    return new Promise(function (resolve, reject) {
        var documentUrl = collectionUrl + "/docs/" + bookId;

        getBookById(bookId).then(function (book) {
            book.borrowedFrom = "";
            book.borrowedOn = "";
            documentdbClient.replaceDocument(documentUrl, book, function (error, result) {
                if (error) {
                    reject(error);
                } else {
                    resolve(result);
                }
            });
        }).catch(function (error) {
            reject(error);
        });
    });
}

// getBookById("21")
//     .then(book => {
//         console.dir(book);
//     })
//     .catch(error => console.log(error));

app.use(_bodyParser2.default.json());
app.use(_bodyParser2.default.urlencoded({ extended: true }));

app.use("/", _express2.default.static(_path2.default.resolve(__dirname + "/../public")));

// app.post("/addBook", (req, res) => {
//     addBookByIsbn(req.body.isbn)
//         .then(book => { socketIoServer.sockets.emit("bookAdded", book); res.sendStatus(200); })
//         .catch(() => { res.sendStatus(500); });
// });


app.get("/books", function (req, res) {
    getBooks().then(function (books) {
        return res.json(books);
    });
});

socketIoServer.on("connection", function (socket) {
    var clientIp = socket.request.connection.remoteAddress;
    console.log("Client connected:\t" + clientIp);

    socket.on("addBook", function (isbn, callback) {
        addBookByIsbn(isbn).then(function (book) {
            socketIoServer.sockets.emit("bookAdded", book);
            callback();
        }).catch(function (error) {
            return callback(error);
        });
    });

    socket.on("borrowBook", function (id, name) {
        borrowBook(id, name).then(function (book) {
            socketIoServer.sockets.emit("bookBorrowed", book);
        });
    });

    socket.on("returnBook", function (id, name) {
        returnBook(id, name).then(function (book) {
            socketIoServer.sockets.emit("bookReturned", book);
        });
    });
});

httpServer.listen(port, function () {
    console.log("listening on *:" + port);
});
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImluZGV4LmpzIl0sIm5hbWVzIjpbInBvcnQiLCJwcm9jZXNzIiwiZW52IiwiUE9SVCIsImFwcCIsImh0dHBTZXJ2ZXIiLCJTZXJ2ZXIiLCJzb2NrZXRJb1NlcnZlciIsInBpbmdUaW1lb3V0IiwicGluZ0ludGVydmFsIiwiZmlsZSIsInJlc29sdmUiLCJfX2Rpcm5hbWUiLCJzZWNyZXRzIiwiZG9jdW1lbnRkYl9lbmRwb2ludCIsImdldCIsImRvY3VtZW50ZGJfcHJpbWFyeUtleSIsImRvY3VtZW50ZGJfZGF0YWJhc2UiLCJkb2N1bWVudGRiX2NvbGxlY3Rpb24iLCJpc2JuRGJBcGlLZXkiLCJib29rTG9va3VwIiwiZG9jdW1lbnRkYkNsaWVudCIsIkRvY3VtZW50Q2xpZW50IiwibWFzdGVyS2V5IiwiZGF0YWJhc2VVcmwiLCJjb2xsZWN0aW9uVXJsIiwiYWRkQm9vayIsImJvb2siLCJQcm9taXNlIiwicmVqZWN0IiwiY3JlYXRlRG9jdW1lbnQiLCJlcnJvciIsImdldEJvb2tzIiwicXVlcnlEb2N1bWVudHMiLCJ0b0FycmF5IiwiYm9va3MiLCJnZXRCb29rQnlJZCIsImlkIiwibGVuZ3RoIiwiYWRkQm9va0J5SXNibiIsImlzYm4iLCJleGVjdXRlIiwidGhlbiIsInY0IiwiYm9ycm93ZWRGcm9tIiwiYm9ycm93ZWRPbiIsImNhdGNoIiwiYm9ycm93Qm9vayIsImJvb2tJZCIsIm5hbWUiLCJkb2N1bWVudFVybCIsImRhdGUiLCJEYXRlIiwiZ2V0RGF0ZSIsImdldE1vbnRoIiwiZ2V0RnVsbFllYXIiLCJyZXBsYWNlRG9jdW1lbnQiLCJyZXN1bHQiLCJyZXR1cm5Cb29rIiwidXNlIiwianNvbiIsInVybGVuY29kZWQiLCJleHRlbmRlZCIsInN0YXRpYyIsInJlcSIsInJlcyIsIm9uIiwic29ja2V0IiwiY2xpZW50SXAiLCJyZXF1ZXN0IiwiY29ubmVjdGlvbiIsInJlbW90ZUFkZHJlc3MiLCJjb25zb2xlIiwibG9nIiwiY2FsbGJhY2siLCJzb2NrZXRzIiwi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a0I3RSxJQUFsQixFQUF3QixZQUFNO0FBQzFCd0UsWUFBUUMsR0FBUixxQkFBOEJ6RSxJQUE5QjtBQUNILENBRkQiLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgZXhwcmVzcyBmcm9tIFwiZXhwcmVzc1wiO1xuaW1wb3J0IGh0dHAgZnJvbSBcImh0dHBcIjtcbmltcG9ydCBwYXRoIGZyb20gXCJwYXRoXCI7XG5pbXBvcnQgdXVpZCBmcm9tIFwidXVpZFwiO1xuaW1wb3J0IGJvZHlQYXJzZXIgZnJvbSBcImJvZHktcGFyc2VyXCI7XG5pbXBvcnQgZG9jdW1lbnRkYiBmcm9tIFwiZG9jdW1lbnRkYlwiO1xuaW1wb3J0IG5jb25mIGZyb20gXCJuY29uZlwiO1xuaW1wb3J0IHJlcXVlc3QgZnJvbSBcInJlcXVlc3RcIjtcbmltcG9ydCBzb2NrZXRJbyBmcm9tIFwic29ja2V0LmlvXCI7XG5pbXBvcnQgeyBCb29rTG9va3VwIH0gZnJvbSBcIi4vYm9va0xvb2t1cFwiO1xuXG5jb25zdCBwb3J0ID0gcHJvY2Vzcy5lbnYuUE9SVCB8fCA4MDgwO1xuY29uc3QgYXBwID0gZXhwcmVzcygpO1xuY29uc3QgaHR0cFNlcnZlciA9IGh0dHAuU2VydmVyKGFwcCk7XG5jb25zdCBzb2NrZXRJb1NlcnZlciA9IHNvY2tldElvKGh0dHBTZXJ2ZXIsIHtcbiAgICBwaW5nVGltZW91dDogMjAwMCxcbiAgICBwaW5nSW50ZXJ2YWw6IDIwMDBcbn0pO1xuXG5uY29uZi5maWxlKHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUgKyBcIi9zZWNyZXRzLmpzb25cIikpLmVudigpO1xuY29uc3Qgc2VjcmV0cyA9IHtcbiAgICBkb2N1bWVudGRiX2VuZHBvaW50OiBuY29uZi5nZXQoXCJkb2N1bWVudGRiX2VuZHBvaW50XCIpLFxuICAgIGRvY3VtZW50ZGJfcHJpbWFyeUtleTogbmNvbmYuZ2V0KFwiZG9jdW1lbnRkYl9wcmltYXJ5S2V5XCIpLFxuICAgIGRvY3VtZW50ZGJfZGF0YWJhc2U6IG5jb25mLmdldChcImRvY3VtZW50ZGJfZGF0YWJhc2VcIiksXG4gICAgZG9jdW1lbnRkYl9jb2xsZWN0aW9uOiBuY29uZi5nZXQoXCJkb2N1bWVudGRiX2NvbGxlY3Rpb25cIiksXG4gICAgaXNibkRiQXBpS2V5OiBuY29uZi5nZXQoXCJpc2JuRGJBcGlLZXlcIilcbn1cblxuY29uc3QgYm9va0xvb2t1cCA9IG5ldyBCb29rTG9va3VwKHNlY3JldHMuaXNibkRiQXBpS2V5KTtcbmNvbnN0IGRvY3VtZW50ZGJDbGllbnQgPSBuZXcgZG9jdW1lbnRkYi5Eb2N1bWVudENsaWVudChzZWNyZXRzLmRvY3VtZW50ZGJfZW5kcG9pbnQsIHsgbWFzdGVyS2V5OiBzZWNyZXRzLmRvY3VtZW50ZGJfcHJpbWFyeUtleSB9KTtcbmNvbnN0IGRhdGFiYXNlVXJsID0gYGRicy8ke3NlY3JldHMuZG9jdW1lbnRkYl9kYXRhYmFzZX1gO1xuY29uc3QgY29sbGVjdGlvblVybCA9IGAke2RhdGFiYXNlVXJsfS9jb2xscy8ke3NlY3JldHMuZG9jdW1lbnRkYl9jb2xsZWN0aW9ufWA7XG5cbmZ1bmN0aW9uIGFkZEJvb2soYm9vaykge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgIGRvY3VtZW50ZGJDbGllbnQuY3JlYXRlRG9jdW1lbnQoY29sbGVjdGlvblVybCwgYm9vaywgKGVycm9yLCBib29rKSA9PiB7XG4gICAgICAgICAgICBpZiAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICByZWplY3QoZXJyb3IpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZShib29rKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSk7XG59XG5cbmZ1bmN0aW9uIGdldEJvb2tzKCkge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgIGRvY3VtZW50ZGJDbGllbnQucXVlcnlEb2N1bWVudHMoY29sbGVjdGlvblVybCkudG9BcnJheSgoZXJyb3IsIGJvb2tzKSA9PiB7XG4gICAgICAgICAgICBpZiAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICByZWplY3QoZXJyb3IpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZShib29rcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0pO1xufVxuXG5mdW5jdGlvbiBnZXRCb29rQnlJZChpZCkge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgIGRvY3VtZW50ZGJDbGllbnQucXVlcnlEb2N1bWVudHMoY29sbGVjdGlvblVybCwgYFNFTEVDVCBWQUxVRSByIEZST00gcm9vdCByIFdIRVJFIHIuaWQgPSBcIiR7aWR9XCJgXG4gICAgICAgICkudG9BcnJheSgoZXJyb3IsIGJvb2tzKSA9PiB7XG4gICAgICAgICAgICBpZiAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICByZWplY3QoZXJyb3IpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoYm9va3MubGVuZ3RoID09IDEpIHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKGJvb2tzWzBdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlamVjdChcIk5vIGRvY3VtZW50IGZvdW5kLlwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSk7XG59XG5cblxuXG5mdW5jdGlvbiBhZGRCb29rQnlJc2JuKGlzYm4pIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICBib29rTG9va3VwLmV4ZWN1dGUoaXNibilcbiAgICAgICAgICAgIC50aGVuKGJvb2sgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChib29rKSB7XG4gICAgICAgICAgICAgICAgICAgIGJvb2suaWQgPSB1dWlkLnY0KCk7XG4gICAgICAgICAgICAgICAgICAgIGJvb2suYm9ycm93ZWRGcm9tID0gXCJcIjtcbiAgICAgICAgICAgICAgICAgICAgYm9vay5ib3Jyb3dlZE9uID0gXCJcIjtcbiAgICAgICAgICAgICAgICAgICAgYWRkQm9vayhib29rKTtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShib29rKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChcIk5vIGJvb2sgZm91bmRcIik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSkuY2F0Y2gocmVqZWN0KTtcbiAgICB9KTtcbn1cblxuZnVuY3Rpb24gYm9ycm93Qm9vayhib29rSWQsIG5hbWUpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICBjb25zdCBkb2N1bWVudFVybCA9IGAke2NvbGxlY3Rpb25Vcmx9L2RvY3MvJHtib29rSWR9YDtcblxuICAgICAgICBnZXRCb29rQnlJZChib29rSWQpLnRoZW4oYm9vayA9PiB7XG4gICAgICAgICAgICBib29rLmJvcnJvd2VkRnJvbSA9IG5hbWU7XG4gICAgICAgICAgICBjb25zdCBkYXRlID0gbmV3IERhdGUoKTtcbiAgICAgICAgICAgIGJvb2suYm9ycm93ZWRPbiA9IGAke2RhdGUuZ2V0RGF0ZSgpfS4ke2RhdGUuZ2V0TW9udGgoKSArIDF9LiR7ZGF0ZS5nZXRGdWxsWWVhcigpfWA7XG4gICAgICAgICAgICBkb2N1bWVudGRiQ2xpZW50LnJlcGxhY2VEb2N1bWVudChkb2N1bWVudFVybCwgYm9vaywgKGVycm9yLCByZXN1bHQpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycm9yKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUocmVzdWx0KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSkuY2F0Y2goZXJyb3IgPT4ge1xuICAgICAgICAgICAgcmVqZWN0KGVycm9yKTtcblxuICAgICAgICB9KTtcbiAgICB9KTtcbn1cblxuZnVuY3Rpb24gcmV0dXJuQm9vayhib29rSWQpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICBjb25zdCBkb2N1bWVudFVybCA9IGAke2NvbGxlY3Rpb25Vcmx9L2RvY3MvJHtib29rSWR9YDtcblxuICAgICAgICBnZXRCb29rQnlJZChib29rSWQpLnRoZW4oYm9vayA9PiB7XG4gICAgICAgICAgICBib29rLmJvcnJvd2VkRnJvbSA9IFwiXCI7XG4gICAgICAgICAgICBib29rLmJvcnJvd2VkT24gPSBcIlwiO1xuICAgICAgICAgICAgZG9jdW1lbnRkYkNsaWVudC5yZXBsYWNlRG9jdW1lbnQoZG9jdW1lbnRVcmwsIGJvb2ssIChlcnJvciwgcmVzdWx0KSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnJvcik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHJlc3VsdCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pLmNhdGNoKGVycm9yID0+IHtcbiAgICAgICAgICAgIHJlamVjdChlcnJvcik7XG5cbiAgICAgICAgfSk7XG4gICAgfSk7XG59XG5cbi8vIGdldEJvb2tCeUlkKFwiMjFcIilcbi8vICAgICAudGhlbihib29rID0+IHtcbi8vICAgICAgICAgY29uc29sZS5kaXIoYm9vayk7XG4vLyAgICAgfSlcbi8vICAgICAuY2F0Y2goZXJyb3IgPT4gY29uc29sZS5sb2coZXJyb3IpKTtcblxuYXBwLnVzZShib2R5UGFyc2VyLmpzb24oKSk7XG5hcHAudXNlKGJvZHlQYXJzZXIudXJsZW5jb2RlZCh7IGV4dGVuZGVkOiB0cnVlIH0pKTtcblxuYXBwLnVzZShcIi9cIiwgZXhwcmVzcy5zdGF0aWMocGF0aC5yZXNvbHZlKF9fZGlybmFtZSArIFwiLy4uL3B1YmxpY1wiKSkpO1xuXG4vLyBhcHAucG9zdChcIi9hZGRCb29rXCIsIChyZXEsIHJlcykgPT4ge1xuLy8gICAgIGFkZEJvb2tCeUlzYm4ocmVxLmJvZHkuaXNibilcbi8vICAgICAgICAgLnRoZW4oYm9vayA9PiB7IHNvY2tldElvU2VydmVyLnNvY2tldHMuZW1pdChcImJvb2tBZGRlZFwiLCBib29rKTsgcmVzLnNlbmRTdGF0dXMoMjAwKTsgfSlcbi8vICAgICAgICAgLmNhdGNoKCgpID0+IHsgcmVzLnNlbmRTdGF0dXMoNTAwKTsgfSk7XG4vLyB9KTtcblxuXG5hcHAuZ2V0KFwiL2Jvb2tzXCIsIChyZXEsIHJlcykgPT4ge1xuICAgIGdldEJvb2tzKCkudGhlbihib29rcyA9PiByZXMuanNvbihib29rcykpO1xufSk7XG5cbnNvY2tldElvU2VydmVyLm9uKFwiY29ubmVjdGlvblwiLCAoc29ja2V0KSA9PiB7XG4gICAgY29uc3QgY2xpZW50SXAgPSBzb2NrZXQucmVxdWVzdC5jb25uZWN0aW9uLnJlbW90ZUFkZHJlc3M7XG4gICAgY29uc29sZS5sb2coXCJDbGllbnQgY29ubmVjdGVkOlxcdFwiICsgY2xpZW50SXApO1xuXG4gICAgc29ja2V0Lm9uKFwiYWRkQm9va1wiLCAoaXNibiwgY2FsbGJhY2spID0+IHtcbiAgICAgICAgYWRkQm9va0J5SXNibihpc2JuKVxuICAgICAgICAgICAgLnRoZW4oYm9vayA9PiB7XG4gICAgICAgICAgICAgICAgc29ja2V0SW9TZXJ2ZXIuc29ja2V0cy5lbWl0KFwiYm9va0FkZGVkXCIsIGJvb2spO1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKCk7XG4gICAgICAgICAgICB9KS5jYXRjaChlcnJvciA9PiBjYWxsYmFjayhlcnJvcikpO1xuICAgIH0pO1xuXG4gICAgc29ja2V0Lm9uKFwiYm9ycm93Qm9va1wiLCAoaWQsIG5hbWUpID0+IHtcbiAgICAgICAgYm9ycm93Qm9vayhpZCwgbmFtZSlcbiAgICAgICAgICAgIC50aGVuKGJvb2sgPT4ge1xuICAgICAgICAgICAgICAgIHNvY2tldElvU2VydmVyLnNvY2tldHMuZW1pdChcImJvb2tCb3Jyb3dlZFwiLCBib29rKTtcbiAgICAgICAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgc29ja2V0Lm9uKFwicmV0dXJuQm9va1wiLCAoaWQsIG5hbWUpID0+IHtcbiAgICAgICAgcmV0dXJuQm9vayhpZCwgbmFtZSlcbiAgICAgICAgICAgIC50aGVuKGJvb2sgPT4ge1xuICAgICAgICAgICAgICAgIHNvY2tldElvU2VydmVyLnNvY2tldHMuZW1pdChcImJvb2tSZXR1cm5lZFwiLCBib29rKTtcbiAgICAgICAgICAgIH0pO1xuICAgIH0pO1xufSk7XG5cbmh0dHBTZXJ2ZXIubGlzdGVuKHBvcnQsICgpID0+IHtcbiAgICBjb25zb2xlLmxvZyhgbGlzdGVuaW5nIG9uICo6JHtwb3J0fWApO1xufSk7XG4iXX0=
