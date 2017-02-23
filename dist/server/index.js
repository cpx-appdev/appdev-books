"use strict";

var _express = require("express");

var _express2 = _interopRequireDefault(_express);

var _http = require("http");

var _http2 = _interopRequireDefault(_http);

var _path = require("path");

var _path2 = _interopRequireDefault(_path);

var _uuid = require("uuid");

var _uuid2 = _interopRequireDefault(_uuid);

var _documentdb = require("documentdb");

var _documentdb2 = _interopRequireDefault(_documentdb);

var _nconf = require("nconf");

var _nconf2 = _interopRequireDefault(_nconf);

var _socket = require("socket.io");

var _socket2 = _interopRequireDefault(_socket);

var _basicAuth = require("basic-auth");

var _basicAuth2 = _interopRequireDefault(_basicAuth);

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
    isbnDbApiKey: _nconf2.default.get("isbnDbApiKey"),
    username: _nconf2.default.get("auth_username"),
    password: _nconf2.default.get("auth_password")
};

var bookLookup = new _bookLookup.BookLookup(secrets.isbnDbApiKey);
var documentdbClient = new _documentdb2.default.DocumentClient(secrets.documentdb_endpoint, { masterKey: secrets.documentdb_primaryKey });
var databaseUrl = "dbs/" + secrets.documentdb_database;
var collectionUrl = databaseUrl + "/colls/" + secrets.documentdb_collection;

var auth = function auth(req, res, next) {
    function unauthorized(res) {
        res.set("WWW-Authenticate", "Basic realm=Authorization Required");
        return res.sendStatus(401);
    }

    var user = (0, _basicAuth2.default)(req);

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

app.use("/", auth, _express2.default.static(_path2.default.resolve(__dirname + "/../public")));

socketIoServer.on("connection", function (socket) {
    var clientIp = socket.request.connection.remoteAddress;
    console.log("Client connected:\t" + clientIp);

    socket.on("getBooks", function (callback) {
        getBooks().then(function (books) {
            return callback(books);
        });
    });

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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImluZGV4LmpzIl0sIm5hbWVzIjpbInBvcnQiLCJwcm9jZXNzIiwiZW52IiwiUE9SVCIsImFwcCIsImh0dHBTZXJ2ZXIiLCJTZXJ2ZXIiLCJzb2NrZXRJb1NlcnZlciIsInBpbmdUaW1lb3V0IiwicGluZ0ludGVydmFsIiwiZmlsZSIsInJlc29sdmUiLCJfX2Rpcm5hbWUiLCJzZWNyZXRzIiwiZG9jdW1lbnRkYl9lbmRwb2ludCIsImdldCIsImRvY3VtZW50ZGJfcHJpbWFyeUtleSIsImRvY3VtZW50ZGJfZGF0YWJhc2UiLCJkb2N1bWVudGRiX2NvbGxlY3Rpb24iLCJpc2JuRGJBcGlLZXkiLCJ1c2VybmFtZSIsInBhc3N3b3JkIiwiYm9va0xvb2t1cCIsImRvY3VtZW50ZGJDbGllbnQiLCJEb2N1bWVudENsaWVudCIsIm1hc3RlcktleSIsImRhdGFiYXNlVXJsIiwiY29sbGVjdGlvblVybCIsImF1dGgiLCJyZXEiLCJyZXMiLCJuZXh0IiwidW5hdXRob3JpemVkIiwic2V0Iiwic2VuZFN0YXR1cyIsInVzZXIiLCJuYW1lIiwicGFzcyIsImFkZEJvb2siLCJib29rIiwiUHJvbWlzZSIsInJlamVjdCIsImNyZWF0ZURvY3VtZW50IiwiZXJyb3IiLCJnZXRCb29rcyIsInF1ZXJ5RG9jdW1lbnRzIiwidG9BcnJheSIsImJvb2tzIiwiZ2V0Qm9va0J5SWQiLCJpZCIsImxlbmd0aCIsImFkZEJvb2tCeUlzYm4iLCJpc2JuIiwiZXhlY3V0ZSIsInRoZW4iLCJ2NCIsImJvcnJvd2VkRnJvbSIsImJvcnJvd2VkT24iLCJjYXRjaCIsImJvcnJvd0Jvb2siLCJib29rSWQiLCJkb2N1bWVudFVybCIsImRhdGUiLCJEYXRlIiwiZ2V0RGF0ZSIsImdldE1vbnRoIiwiZ2V0RnVsbFllYXIiLCJyZXBsYWNlRG9jdW1lbnQiLCJyZXN1bHQiLCJyZXR1cm5Cb29rIiwidXNlIiwic3RhdGljIiwib24iLCJzb2NrZXQiLCJjbGllbnRJcCIsInJlcXVlc3QiLCJjb25uZWN0aW9uIiwicmVtb3RlQWRkcmVzcyIsImNvbnNvbGUiLCJsb2ciLCJjYWxsYmFjayIsInNvY2tldHMiLCJlbWl0IiwibGlzdGVuIl0sIm1hcHBpbmdzIjoiOztBQUFBOzs7O0FBQ0E7Ozs7QUFDQTs7OztBQUNBOzs7O0FBQ0E7Ozs7QUFDQTs7OztBQUNBOzs7O0FBQ0E7Ozs7QUFDQTs7OztBQUVBLElBQU1BLE9BQU9DLFFBQVFDLEdBQVIsQ0FBWUMsSUFBWixJQUFvQixJQUFqQztBQUNBLElBQU1DLE1BQU0sd0JBQVo7QUFDQSxJQUFNQyxhQUFhLGVBQUtDLE1BQUwsQ0FBWUYsR0FBWixDQUFuQjtBQUNBLElBQU1HLGlCQUFpQixzQkFBU0YsVUFBVCxFQUFxQjtBQUN4Q0csaUJBQWEsSUFEMkI7QUFFeENDLGtCQUFjO0FBRjBCLENBQXJCLENBQXZCOztBQUtBLGdCQUFNQyxJQUFOLENBQVcsZUFBS0MsT0FBTCxDQUFhQyxZQUFZLGVBQXpCLENBQVgsRUFBc0RWLEdBQXREO0FBQ0EsSUFBTVcsVUFBVTtBQUNaQyx5QkFBcUIsZ0JBQU1DLEdBQU4sQ0FBVSxxQkFBVixDQURUO0FBRVpDLDJCQUF1QixnQkFBTUQsR0FBTixDQUFVLHVCQUFWLENBRlg7QUFHWkUseUJBQXFCLGdCQUFNRixHQUFOLENBQVUscUJBQVYsQ0FIVDtBQUlaRywyQkFBdUIsZ0JBQU1ILEdBQU4sQ0FBVSx1QkFBVixDQUpYO0FBS1pJLGtCQUFjLGdCQUFNSixHQUFOLENBQVUsY0FBVixDQUxGO0FBTVpLLGNBQVUsZ0JBQU1MLEdBQU4sQ0FBVSxlQUFWLENBTkU7QUFPWk0sY0FBVSxnQkFBTU4sR0FBTixDQUFVLGVBQVY7QUFQRSxDQUFoQjs7QUFVQSxJQUFNTyxhQUFhLDJCQUFlVCxRQUFRTSxZQUF2QixDQUFuQjtBQUNBLElBQU1JLG1CQUFtQixJQUFJLHFCQUFXQyxjQUFmLENBQThCWCxRQUFRQyxtQkFBdEMsRUFBMkQsRUFBRVcsV0FBV1osUUFBUUcscUJBQXJCLEVBQTNELENBQXpCO0FBQ0EsSUFBTVUsdUJBQXFCYixRQUFRSSxtQkFBbkM7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QUFULENBQVQ7QUFBQSxTQUpiO0FBS0gsS0FORDs7QUFRQThCLFdBQU9ELEVBQVAsQ0FBVSxZQUFWLEVBQXdCLFVBQUN2QixFQUFELEVBQUtiLElBQUwsRUFBYztBQUNsQ3VCLG1CQUFXVixFQUFYLEVBQWViLElBQWYsRUFDS2tCLElBREwsQ0FDVSxnQkFBUTtBQUNWL0MsMkJBQWUwRSxPQUFmLENBQXVCQyxJQUF2QixDQUE0QixjQUE1QixFQUE0QzNDLElBQTVDO0FBQ0gsU0FITDtBQUlILEtBTEQ7O0FBT0FrQyxXQUFPRCxFQUFQLENBQVUsWUFBVixFQUF3QixVQUFDdkIsRUFBRCxFQUFLYixJQUFMLEVBQWM7QUFDbENpQyxtQkFBV3BCLEVBQVgsRUFBZWIsSUFBZixFQUNLa0IsSUFETCxDQUNVLGdCQUFRO0FBQ1YvQywyQkFBZTBFLE9BQWYsQ0FBdUJDLElBQXZCLENBQTRCLGNBQTVCLEVBQTRDM0MsSUFBNUM7QUFDSCxTQUhMO0FBSUgsS0FMRDtBQU1ILENBN0JEOztBQStCQWxDLFdBQVc4RSxNQUFYLENBQWtCbkYsSUFBbEIsRUFBd0IsWUFBTTtBQUMxQjhFLFlBQVFDLEdBQVIscUJBQThCL0UsSUFBOUI7QUFDSCxDQUZEIiwiZmlsZSI6ImluZGV4LmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGV4cHJlc3MgZnJvbSBcImV4cHJlc3NcIjtcbmltcG9ydCBodHRwIGZyb20gXCJodHRwXCI7XG5pbXBvcnQgcGF0aCBmcm9tIFwicGF0aFwiO1xuaW1wb3J0IHV1aWQgZnJvbSBcInV1aWRcIjtcbmltcG9ydCBkb2N1bWVudGRiIGZyb20gXCJkb2N1bWVudGRiXCI7XG5pbXBvcnQgbmNvbmYgZnJvbSBcIm5jb25mXCI7XG5pbXBvcnQgc29ja2V0SW8gZnJvbSBcInNvY2tldC5pb1wiO1xuaW1wb3J0IGJhc2ljQXV0aCBmcm9tIFwiYmFzaWMtYXV0aFwiO1xuaW1wb3J0IHsgQm9va0xvb2t1cCB9IGZyb20gXCIuL2Jvb2tMb29rdXBcIjtcblxuY29uc3QgcG9ydCA9IHByb2Nlc3MuZW52LlBPUlQgfHwgODA4MDtcbmNvbnN0IGFwcCA9IGV4cHJlc3MoKTtcbmNvbnN0IGh0dHBTZXJ2ZXIgPSBodHRwLlNlcnZlcihhcHApO1xuY29uc3Qgc29ja2V0SW9TZXJ2ZXIgPSBzb2NrZXRJbyhodHRwU2VydmVyLCB7XG4gICAgcGluZ1RpbWVvdXQ6IDIwMDAsXG4gICAgcGluZ0ludGVydmFsOiAyMDAwXG59KTtcblxubmNvbmYuZmlsZShwYXRoLnJlc29sdmUoX19kaXJuYW1lICsgXCIvc2VjcmV0cy5qc29uXCIpKS5lbnYoKTtcbmNvbnN0IHNlY3JldHMgPSB7XG4gICAgZG9jdW1lbnRkYl9lbmRwb2ludDogbmNvbmYuZ2V0KFwiZG9jdW1lbnRkYl9lbmRwb2ludFwiKSxcbiAgICBkb2N1bWVudGRiX3ByaW1hcnlLZXk6IG5jb25mLmdldChcImRvY3VtZW50ZGJfcHJpbWFyeUtleVwiKSxcbiAgICBkb2N1bWVudGRiX2RhdGFiYXNlOiBuY29uZi5nZXQoXCJkb2N1bWVudGRiX2RhdGFiYXNlXCIpLFxuICAgIGRvY3VtZW50ZGJfY29sbGVjdGlvbjogbmNvbmYuZ2V0KFwiZG9jdW1lbnRkYl9jb2xsZWN0aW9uXCIpLFxuICAgIGlzYm5EYkFwaUtleTogbmNvbmYuZ2V0KFwiaXNibkRiQXBpS2V5XCIpLFxuICAgIHVzZXJuYW1lOiBuY29uZi5nZXQoXCJhdXRoX3VzZXJuYW1lXCIpLFxuICAgIHBhc3N3b3JkOiBuY29uZi5nZXQoXCJhdXRoX3Bhc3N3b3JkXCIpXG59XG5cbmNvbnN0IGJvb2tMb29rdXAgPSBuZXcgQm9va0xvb2t1cChzZWNyZXRzLmlzYm5EYkFwaUtleSk7XG5jb25zdCBkb2N1bWVudGRiQ2xpZW50ID0gbmV3IGRvY3VtZW50ZGIuRG9jdW1lbnRDbGllbnQoc2VjcmV0cy5kb2N1bWVudGRiX2VuZHBvaW50LCB7IG1hc3RlcktleTogc2VjcmV0cy5kb2N1bWVudGRiX3ByaW1hcnlLZXkgfSk7XG5jb25zdCBkYXRhYmFzZVVybCA9IGBkYnMvJHtzZWNyZXRzLmRvY3VtZW50ZGJfZGF0YWJhc2V9YDtcbmNvbnN0IGNvbGxlY3Rpb25VcmwgPSBgJHtkYXRhYmFzZVVybH0vY29sbHMvJHtzZWNyZXRzLmRvY3VtZW50ZGJfY29sbGVjdGlvbn1gO1xuXG5jb25zdCBhdXRoID0gKHJlcSwgcmVzLCBuZXh0KSA9PiB7XG4gICAgZnVuY3Rpb24gdW5hdXRob3JpemVkKHJlcykge1xuICAgICAgICByZXMuc2V0KFwiV1dXLUF1dGhlbnRpY2F0ZVwiLCBcIkJhc2ljIHJlYWxtPUF1dGhvcml6YXRpb24gUmVxdWlyZWRcIik7XG4gICAgICAgIHJldHVybiByZXMuc2VuZFN0YXR1cyg0MDEpO1xuICAgIH1cblxuICAgIGNvbnN0IHVzZXIgPSBiYXNpY0F1dGgocmVxKTtcblxuICAgIGlmICghdXNlciB8fCAhdXNlci5uYW1lIHx8ICF1c2VyLnBhc3MpIHtcbiAgICAgICAgcmV0dXJuIHVuYXV0aG9yaXplZChyZXMpO1xuICAgIH1cblxuICAgIGlmICh1c2VyLm5hbWUgPT09IHNlY3JldHMudXNlcm5hbWUgJiYgdXNlci5wYXNzID09PSBzZWNyZXRzLnBhc3N3b3JkKSB7XG4gICAgICAgIHJldHVybiBuZXh0KCk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHVuYXV0aG9yaXplZChyZXMpO1xuICAgIH1cbn07XG5cbmZ1bmN0aW9uIGFkZEJvb2soYm9vaykge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgIGRvY3VtZW50ZGJDbGllbnQuY3JlYXRlRG9jdW1lbnQoY29sbGVjdGlvblVybCwgYm9vaywgKGVycm9yLCBib29rKSA9PiB7XG4gICAgICAgICAgICBpZiAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICByZWplY3QoZXJyb3IpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZShib29rKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSk7XG59XG5cbmZ1bmN0aW9uIGdldEJvb2tzKCkge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgIGRvY3VtZW50ZGJDbGllbnQucXVlcnlEb2N1bWVudHMoY29sbGVjdGlvblVybCkudG9BcnJheSgoZXJyb3IsIGJvb2tzKSA9PiB7XG4gICAgICAgICAgICBpZiAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICByZWplY3QoZXJyb3IpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZShib29rcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0pO1xufVxuXG5mdW5jdGlvbiBnZXRCb29rQnlJZChpZCkge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgIGRvY3VtZW50ZGJDbGllbnQucXVlcnlEb2N1bWVudHMoY29sbGVjdGlvblVybCwgYFNFTEVDVCBWQUxVRSByIEZST00gcm9vdCByIFdIRVJFIHIuaWQgPSBcIiR7aWR9XCJgXG4gICAgICAgICkudG9BcnJheSgoZXJyb3IsIGJvb2tzKSA9PiB7XG4gICAgICAgICAgICBpZiAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICByZWplY3QoZXJyb3IpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoYm9va3MubGVuZ3RoID09IDEpIHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKGJvb2tzWzBdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlamVjdChcIk5vIGRvY3VtZW50IGZvdW5kLlwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSk7XG59XG5cblxuXG5mdW5jdGlvbiBhZGRCb29rQnlJc2JuKGlzYm4pIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICBib29rTG9va3VwLmV4ZWN1dGUoaXNibilcbiAgICAgICAgICAgIC50aGVuKGJvb2sgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChib29rKSB7XG4gICAgICAgICAgICAgICAgICAgIGJvb2suaWQgPSB1dWlkLnY0KCk7XG4gICAgICAgICAgICAgICAgICAgIGJvb2suYm9ycm93ZWRGcm9tID0gXCJcIjtcbiAgICAgICAgICAgICAgICAgICAgYm9vay5ib3Jyb3dlZE9uID0gXCJcIjtcbiAgICAgICAgICAgICAgICAgICAgYWRkQm9vayhib29rKTtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShib29rKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChcIk5vIGJvb2sgZm91bmRcIik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSkuY2F0Y2gocmVqZWN0KTtcbiAgICB9KTtcbn1cblxuZnVuY3Rpb24gYm9ycm93Qm9vayhib29rSWQsIG5hbWUpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICBjb25zdCBkb2N1bWVudFVybCA9IGAke2NvbGxlY3Rpb25Vcmx9L2RvY3MvJHtib29rSWR9YDtcblxuICAgICAgICBnZXRCb29rQnlJZChib29rSWQpLnRoZW4oYm9vayA9PiB7XG4gICAgICAgICAgICBib29rLmJvcnJvd2VkRnJvbSA9IG5hbWU7XG4gICAgICAgICAgICBjb25zdCBkYXRlID0gbmV3IERhdGUoKTtcbiAgICAgICAgICAgIGJvb2suYm9ycm93ZWRPbiA9IGAke2RhdGUuZ2V0RGF0ZSgpfS4ke2RhdGUuZ2V0TW9udGgoKSArIDF9LiR7ZGF0ZS5nZXRGdWxsWWVhcigpfWA7XG4gICAgICAgICAgICBkb2N1bWVudGRiQ2xpZW50LnJlcGxhY2VEb2N1bWVudChkb2N1bWVudFVybCwgYm9vaywgKGVycm9yLCByZXN1bHQpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycm9yKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUocmVzdWx0KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSkuY2F0Y2goZXJyb3IgPT4ge1xuICAgICAgICAgICAgcmVqZWN0KGVycm9yKTtcblxuICAgICAgICB9KTtcbiAgICB9KTtcbn1cblxuZnVuY3Rpb24gcmV0dXJuQm9vayhib29rSWQpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICBjb25zdCBkb2N1bWVudFVybCA9IGAke2NvbGxlY3Rpb25Vcmx9L2RvY3MvJHtib29rSWR9YDtcblxuICAgICAgICBnZXRCb29rQnlJZChib29rSWQpLnRoZW4oYm9vayA9PiB7XG4gICAgICAgICAgICBib29rLmJvcnJvd2VkRnJvbSA9IFwiXCI7XG4gICAgICAgICAgICBib29rLmJvcnJvd2VkT24gPSBcIlwiO1xuICAgICAgICAgICAgZG9jdW1lbnRkYkNsaWVudC5yZXBsYWNlRG9jdW1lbnQoZG9jdW1lbnRVcmwsIGJvb2ssIChlcnJvciwgcmVzdWx0KSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnJvcik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHJlc3VsdCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pLmNhdGNoKGVycm9yID0+IHtcbiAgICAgICAgICAgIHJlamVjdChlcnJvcik7XG5cbiAgICAgICAgfSk7XG4gICAgfSk7XG59XG5cbmFwcC51c2UoXCIvXCIsIGF1dGgsIGV4cHJlc3Muc3RhdGljKHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUgKyBcIi8uLi9wdWJsaWNcIikpKTtcblxuc29ja2V0SW9TZXJ2ZXIub24oXCJjb25uZWN0aW9uXCIsIChzb2NrZXQpID0+IHtcbiAgICBjb25zdCBjbGllbnRJcCA9IHNvY2tldC5yZXF1ZXN0LmNvbm5lY3Rpb24ucmVtb3RlQWRkcmVzcztcbiAgICBjb25zb2xlLmxvZyhcIkNsaWVudCBjb25uZWN0ZWQ6XFx0XCIgKyBjbGllbnRJcCk7XG5cbiAgICBzb2NrZXQub24oXCJnZXRCb29rc1wiLCAoY2FsbGJhY2spID0+IHtcbiAgICAgICAgZ2V0Qm9va3MoKS50aGVuKGJvb2tzID0+IGNhbGxiYWNrKGJvb2tzKSk7XG4gICAgfSk7XG5cbiAgICBzb2NrZXQub24oXCJhZGRCb29rXCIsIChpc2JuLCBjYWxsYmFjaykgPT4ge1xuICAgICAgICBhZGRCb29rQnlJc2JuKGlzYm4pXG4gICAgICAgICAgICAudGhlbihib29rID0+IHtcbiAgICAgICAgICAgICAgICBzb2NrZXRJb1NlcnZlci5zb2NrZXRzLmVtaXQoXCJib29rQWRkZWRcIiwgYm9vayk7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgICAgICAgIH0pLmNhdGNoKGVycm9yID0+IGNhbGxiYWNrKGVycm9yKSk7XG4gICAgfSk7XG5cbiAgICBzb2NrZXQub24oXCJib3Jyb3dCb29rXCIsIChpZCwgbmFtZSkgPT4ge1xuICAgICAgICBib3Jyb3dCb29rKGlkLCBuYW1lKVxuICAgICAgICAgICAgLnRoZW4oYm9vayA9PiB7XG4gICAgICAgICAgICAgICAgc29ja2V0SW9TZXJ2ZXIuc29ja2V0cy5lbWl0KFwiYm9va0JvcnJvd2VkXCIsIGJvb2spO1xuICAgICAgICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICBzb2NrZXQub24oXCJyZXR1cm5Cb29rXCIsIChpZCwgbmFtZSkgPT4ge1xuICAgICAgICByZXR1cm5Cb29rKGlkLCBuYW1lKVxuICAgICAgICAgICAgLnRoZW4oYm9vayA9PiB7XG4gICAgICAgICAgICAgICAgc29ja2V0SW9TZXJ2ZXIuc29ja2V0cy5lbWl0KFwiYm9va1JldHVybmVkXCIsIGJvb2spO1xuICAgICAgICAgICAgfSk7XG4gICAgfSk7XG59KTtcblxuaHR0cFNlcnZlci5saXN0ZW4ocG9ydCwgKCkgPT4ge1xuICAgIGNvbnNvbGUubG9nKGBsaXN0ZW5pbmcgb24gKjoke3BvcnR9YCk7XG59KTtcbiJdfQ==
