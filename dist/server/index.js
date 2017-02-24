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
var httpServer = _http2.default.createServer(app);
var socketIoServer = _socket2.default.listen(httpServer);

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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImluZGV4LmpzIl0sIm5hbWVzIjpbInBvcnQiLCJwcm9jZXNzIiwiZW52IiwiUE9SVCIsImFwcCIsImh0dHBTZXJ2ZXIiLCJjcmVhdGVTZXJ2ZXIiLCJzb2NrZXRJb1NlcnZlciIsImxpc3RlbiIsImZpbGUiLCJyZXNvbHZlIiwiX19kaXJuYW1lIiwic2VjcmV0cyIsImRvY3VtZW50ZGJfZW5kcG9pbnQiLCJnZXQiLCJkb2N1bWVudGRiX3ByaW1hcnlLZXkiLCJkb2N1bWVudGRiX2RhdGFiYXNlIiwiZG9jdW1lbnRkYl9jb2xsZWN0aW9uIiwiaXNibkRiQXBpS2V5IiwidXNlcm5hbWUiLCJwYXNzd29yZCIsImJvb2tMb29rdXAiLCJkb2N1bWVudGRiQ2xpZW50IiwiRG9jdW1lbnRDbGllbnQiLCJtYXN0ZXJLZXkiLCJkYXRhYmFzZVVybCIsImNvbGxlY3Rpb25VcmwiLCJhdXRoIiwicmVxIiwicmVzIiwibmV4dCIsInVuYXV0aG9yaXplZCIsInNldCIsInNlbmRTdGF0dXMiLCJ1c2VyIiwibmFtZSIsInBhc3MiLCJhZGRCb29rIiwiYm9vayIsIlByb21pc2UiLCJyZWplY3QiLCJjcmVhdGVEb2N1bWVudCIsImVycm9yIiwiZ2V0Qm9va3MiLCJxdWVyeURvY3VtZW50cyIsInRvQXJyYXkiLCJib29rcyIsImdldEJvb2tCeUlkIiwiaWQiLCJsZW5ndGgiLCJhZGRCb29rQnlJc2JuIiwiaXNibiIsImV4ZWN1dGUiLCJ0aGVuIiwidjQiLCJib3Jyb3dlZEZyb20iLCJib3Jyb3dlZE9uIiwiY2F0Y2giLCJib3Jyb3dCb29rIiwiYm9va0lkIiwiZG9jdW1lbnRVcmwiLCJkYXRlIiwiRGF0ZSIsImdldERhdGUiLCJnZXRNb250aCIsImdldEZ1bGxZZWFyIiwicmVwbGFjZURvY3VtZW50IiwicmVzdWx0IiwicmV0dXJuQm9vayIsInVzZSIsInN0YXRpYyIsIm9uIiwic29ja2V0IiwiY2xpZW50SXAiLCJyZXF1ZXN0IiwiY29ubmVjdGlvbiIsInJlbW90ZUFkZHJlc3Mi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RUFBd0IsVUFBQ3ZCLEVBQUQsRUFBS2IsSUFBTCxFQUFjO0FBQ2xDdUIsbUJBQVdWLEVBQVgsRUFBZWIsSUFBZixFQUNLa0IsSUFETCxDQUNVLGdCQUFRO0FBQ1Y5QywyQkFBZXlFLE9BQWYsQ0FBdUJDLElBQXZCLENBQTRCLGNBQTVCLEVBQTRDM0MsSUFBNUM7QUFDSCxTQUhMO0FBSUgsS0FMRDs7QUFPQWtDLFdBQU9ELEVBQVAsQ0FBVSxZQUFWLEVBQXdCLFVBQUN2QixFQUFELEVBQUtiLElBQUwsRUFBYztBQUNsQ2lDLG1CQUFXcEIsRUFBWCxFQUFlYixJQUFmLEVBQ0trQixJQURMLENBQ1UsZ0JBQVE7QUFDVjlDLDJCQUFleUUsT0FBZixDQUF1QkMsSUFBdkIsQ0FBNEIsY0FBNUIsRUFBNEMzQyxJQUE1QztBQUNILFNBSEw7QUFJSCxLQUxEO0FBTUgsQ0E3QkQ7O0FBK0JBakMsV0FBV0csTUFBWCxDQUFrQlIsSUFBbEIsRUFBd0IsWUFBTTtBQUMxQjZFLFlBQVFDLEdBQVIscUJBQThCOUUsSUFBOUI7QUFDSCxDQUZEIiwiZmlsZSI6ImluZGV4LmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGV4cHJlc3MgZnJvbSBcImV4cHJlc3NcIjtcbmltcG9ydCBodHRwIGZyb20gXCJodHRwXCI7XG5pbXBvcnQgcGF0aCBmcm9tIFwicGF0aFwiO1xuaW1wb3J0IHV1aWQgZnJvbSBcInV1aWRcIjtcbmltcG9ydCBkb2N1bWVudGRiIGZyb20gXCJkb2N1bWVudGRiXCI7XG5pbXBvcnQgbmNvbmYgZnJvbSBcIm5jb25mXCI7XG5pbXBvcnQgc29ja2V0SW8gZnJvbSBcInNvY2tldC5pb1wiO1xuaW1wb3J0IGJhc2ljQXV0aCBmcm9tIFwiYmFzaWMtYXV0aFwiO1xuaW1wb3J0IHsgQm9va0xvb2t1cCB9IGZyb20gXCIuL2Jvb2tMb29rdXBcIjtcblxuY29uc3QgcG9ydCA9IHByb2Nlc3MuZW52LlBPUlQgfHwgODA4MDtcbmNvbnN0IGFwcCA9IGV4cHJlc3MoKTtcbmNvbnN0IGh0dHBTZXJ2ZXIgPSBodHRwLmNyZWF0ZVNlcnZlcihhcHApO1xuY29uc3Qgc29ja2V0SW9TZXJ2ZXIgPSBzb2NrZXRJby5saXN0ZW4oaHR0cFNlcnZlcik7XG5cbm5jb25mLmZpbGUocGF0aC5yZXNvbHZlKF9fZGlybmFtZSArIFwiL3NlY3JldHMuanNvblwiKSkuZW52KCk7XG5jb25zdCBzZWNyZXRzID0ge1xuICAgIGRvY3VtZW50ZGJfZW5kcG9pbnQ6IG5jb25mLmdldChcImRvY3VtZW50ZGJfZW5kcG9pbnRcIiksXG4gICAgZG9jdW1lbnRkYl9wcmltYXJ5S2V5OiBuY29uZi5nZXQoXCJkb2N1bWVudGRiX3ByaW1hcnlLZXlcIiksXG4gICAgZG9jdW1lbnRkYl9kYXRhYmFzZTogbmNvbmYuZ2V0KFwiZG9jdW1lbnRkYl9kYXRhYmFzZVwiKSxcbiAgICBkb2N1bWVudGRiX2NvbGxlY3Rpb246IG5jb25mLmdldChcImRvY3VtZW50ZGJfY29sbGVjdGlvblwiKSxcbiAgICBpc2JuRGJBcGlLZXk6IG5jb25mLmdldChcImlzYm5EYkFwaUtleVwiKSxcbiAgICB1c2VybmFtZTogbmNvbmYuZ2V0KFwiYXV0aF91c2VybmFtZVwiKSxcbiAgICBwYXNzd29yZDogbmNvbmYuZ2V0KFwiYXV0aF9wYXNzd29yZFwiKVxufVxuXG5jb25zdCBib29rTG9va3VwID0gbmV3IEJvb2tMb29rdXAoc2VjcmV0cy5pc2JuRGJBcGlLZXkpO1xuY29uc3QgZG9jdW1lbnRkYkNsaWVudCA9IG5ldyBkb2N1bWVudGRiLkRvY3VtZW50Q2xpZW50KHNlY3JldHMuZG9jdW1lbnRkYl9lbmRwb2ludCwgeyBtYXN0ZXJLZXk6IHNlY3JldHMuZG9jdW1lbnRkYl9wcmltYXJ5S2V5IH0pO1xuY29uc3QgZGF0YWJhc2VVcmwgPSBgZGJzLyR7c2VjcmV0cy5kb2N1bWVudGRiX2RhdGFiYXNlfWA7XG5jb25zdCBjb2xsZWN0aW9uVXJsID0gYCR7ZGF0YWJhc2VVcmx9L2NvbGxzLyR7c2VjcmV0cy5kb2N1bWVudGRiX2NvbGxlY3Rpb259YDtcblxuY29uc3QgYXV0aCA9IChyZXEsIHJlcywgbmV4dCkgPT4ge1xuICAgIGZ1bmN0aW9uIHVuYXV0aG9yaXplZChyZXMpIHtcbiAgICAgICAgcmVzLnNldChcIldXVy1BdXRoZW50aWNhdGVcIiwgXCJCYXNpYyByZWFsbT1BdXRob3JpemF0aW9uIFJlcXVpcmVkXCIpO1xuICAgICAgICByZXR1cm4gcmVzLnNlbmRTdGF0dXMoNDAxKTtcbiAgICB9XG5cbiAgICBjb25zdCB1c2VyID0gYmFzaWNBdXRoKHJlcSk7XG5cbiAgICBpZiAoIXVzZXIgfHwgIXVzZXIubmFtZSB8fCAhdXNlci5wYXNzKSB7XG4gICAgICAgIHJldHVybiB1bmF1dGhvcml6ZWQocmVzKTtcbiAgICB9XG5cbiAgICBpZiAodXNlci5uYW1lID09PSBzZWNyZXRzLnVzZXJuYW1lICYmIHVzZXIucGFzcyA9PT0gc2VjcmV0cy5wYXNzd29yZCkge1xuICAgICAgICByZXR1cm4gbmV4dCgpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiB1bmF1dGhvcml6ZWQocmVzKTtcbiAgICB9XG59O1xuXG5mdW5jdGlvbiBhZGRCb29rKGJvb2spIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICBkb2N1bWVudGRiQ2xpZW50LmNyZWF0ZURvY3VtZW50KGNvbGxlY3Rpb25VcmwsIGJvb2ssIChlcnJvciwgYm9vaykgPT4ge1xuICAgICAgICAgICAgaWYgKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgcmVqZWN0KGVycm9yKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlc29sdmUoYm9vayk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0pO1xufVxuXG5mdW5jdGlvbiBnZXRCb29rcygpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICBkb2N1bWVudGRiQ2xpZW50LnF1ZXJ5RG9jdW1lbnRzKGNvbGxlY3Rpb25VcmwpLnRvQXJyYXkoKGVycm9yLCBib29rcykgPT4ge1xuICAgICAgICAgICAgaWYgKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgcmVqZWN0KGVycm9yKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlc29sdmUoYm9va3MpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9KTtcbn1cblxuZnVuY3Rpb24gZ2V0Qm9va0J5SWQoaWQpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICBkb2N1bWVudGRiQ2xpZW50LnF1ZXJ5RG9jdW1lbnRzKGNvbGxlY3Rpb25VcmwsIGBTRUxFQ1QgVkFMVUUgciBGUk9NIHJvb3QgciBXSEVSRSByLmlkID0gXCIke2lkfVwiYFxuICAgICAgICApLnRvQXJyYXkoKGVycm9yLCBib29rcykgPT4ge1xuICAgICAgICAgICAgaWYgKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgcmVqZWN0KGVycm9yKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGJvb2tzLmxlbmd0aCA9PSAxKSB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZShib29rc1swXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICByZWplY3QoXCJObyBkb2N1bWVudCBmb3VuZC5cIik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0pO1xufVxuXG5cblxuZnVuY3Rpb24gYWRkQm9va0J5SXNibihpc2JuKSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgYm9va0xvb2t1cC5leGVjdXRlKGlzYm4pXG4gICAgICAgICAgICAudGhlbihib29rID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoYm9vaykge1xuICAgICAgICAgICAgICAgICAgICBib29rLmlkID0gdXVpZC52NCgpO1xuICAgICAgICAgICAgICAgICAgICBib29rLmJvcnJvd2VkRnJvbSA9IFwiXCI7XG4gICAgICAgICAgICAgICAgICAgIGJvb2suYm9ycm93ZWRPbiA9IFwiXCI7XG4gICAgICAgICAgICAgICAgICAgIGFkZEJvb2soYm9vayk7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoYm9vayk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZWplY3QoXCJObyBib29rIGZvdW5kXCIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pLmNhdGNoKHJlamVjdCk7XG4gICAgfSk7XG59XG5cbmZ1bmN0aW9uIGJvcnJvd0Jvb2soYm9va0lkLCBuYW1lKSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgY29uc3QgZG9jdW1lbnRVcmwgPSBgJHtjb2xsZWN0aW9uVXJsfS9kb2NzLyR7Ym9va0lkfWA7XG5cbiAgICAgICAgZ2V0Qm9va0J5SWQoYm9va0lkKS50aGVuKGJvb2sgPT4ge1xuICAgICAgICAgICAgYm9vay5ib3Jyb3dlZEZyb20gPSBuYW1lO1xuICAgICAgICAgICAgY29uc3QgZGF0ZSA9IG5ldyBEYXRlKCk7XG4gICAgICAgICAgICBib29rLmJvcnJvd2VkT24gPSBgJHtkYXRlLmdldERhdGUoKX0uJHtkYXRlLmdldE1vbnRoKCkgKyAxfS4ke2RhdGUuZ2V0RnVsbFllYXIoKX1gO1xuICAgICAgICAgICAgZG9jdW1lbnRkYkNsaWVudC5yZXBsYWNlRG9jdW1lbnQoZG9jdW1lbnRVcmwsIGJvb2ssIChlcnJvciwgcmVzdWx0KSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnJvcik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHJlc3VsdCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pLmNhdGNoKGVycm9yID0+IHtcbiAgICAgICAgICAgIHJlamVjdChlcnJvcik7XG5cbiAgICAgICAgfSk7XG4gICAgfSk7XG59XG5cbmZ1bmN0aW9uIHJldHVybkJvb2soYm9va0lkKSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgY29uc3QgZG9jdW1lbnRVcmwgPSBgJHtjb2xsZWN0aW9uVXJsfS9kb2NzLyR7Ym9va0lkfWA7XG5cbiAgICAgICAgZ2V0Qm9va0J5SWQoYm9va0lkKS50aGVuKGJvb2sgPT4ge1xuICAgICAgICAgICAgYm9vay5ib3Jyb3dlZEZyb20gPSBcIlwiO1xuICAgICAgICAgICAgYm9vay5ib3Jyb3dlZE9uID0gXCJcIjtcbiAgICAgICAgICAgIGRvY3VtZW50ZGJDbGllbnQucmVwbGFjZURvY3VtZW50KGRvY3VtZW50VXJsLCBib29rLCAoZXJyb3IsIHJlc3VsdCkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChlcnJvcikge1xuICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyb3IpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShyZXN1bHQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KS5jYXRjaChlcnJvciA9PiB7XG4gICAgICAgICAgICByZWplY3QoZXJyb3IpO1xuXG4gICAgICAgIH0pO1xuICAgIH0pO1xufVxuXG5hcHAudXNlKFwiL1wiLCBhdXRoLCBleHByZXNzLnN0YXRpYyhwYXRoLnJlc29sdmUoX19kaXJuYW1lICsgXCIvLi4vcHVibGljXCIpKSk7XG5cbnNvY2tldElvU2VydmVyLm9uKFwiY29ubmVjdGlvblwiLCAoc29ja2V0KSA9PiB7XG4gICAgY29uc3QgY2xpZW50SXAgPSBzb2NrZXQucmVxdWVzdC5jb25uZWN0aW9uLnJlbW90ZUFkZHJlc3M7XG4gICAgY29uc29sZS5sb2coXCJDbGllbnQgY29ubmVjdGVkOlxcdFwiICsgY2xpZW50SXApO1xuXG4gICAgc29ja2V0Lm9uKFwiZ2V0Qm9va3NcIiwgKGNhbGxiYWNrKSA9PiB7XG4gICAgICAgIGdldEJvb2tzKCkudGhlbihib29rcyA9PiBjYWxsYmFjayhib29rcykpO1xuICAgIH0pO1xuXG4gICAgc29ja2V0Lm9uKFwiYWRkQm9va1wiLCAoaXNibiwgY2FsbGJhY2spID0+IHtcbiAgICAgICAgYWRkQm9va0J5SXNibihpc2JuKVxuICAgICAgICAgICAgLnRoZW4oYm9vayA9PiB7XG4gICAgICAgICAgICAgICAgc29ja2V0SW9TZXJ2ZXIuc29ja2V0cy5lbWl0KFwiYm9va0FkZGVkXCIsIGJvb2spO1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKCk7XG4gICAgICAgICAgICB9KS5jYXRjaChlcnJvciA9PiBjYWxsYmFjayhlcnJvcikpO1xuICAgIH0pO1xuXG4gICAgc29ja2V0Lm9uKFwiYm9ycm93Qm9va1wiLCAoaWQsIG5hbWUpID0+IHtcbiAgICAgICAgYm9ycm93Qm9vayhpZCwgbmFtZSlcbiAgICAgICAgICAgIC50aGVuKGJvb2sgPT4ge1xuICAgICAgICAgICAgICAgIHNvY2tldElvU2VydmVyLnNvY2tldHMuZW1pdChcImJvb2tCb3Jyb3dlZFwiLCBib29rKTtcbiAgICAgICAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgc29ja2V0Lm9uKFwicmV0dXJuQm9va1wiLCAoaWQsIG5hbWUpID0+IHtcbiAgICAgICAgcmV0dXJuQm9vayhpZCwgbmFtZSlcbiAgICAgICAgICAgIC50aGVuKGJvb2sgPT4ge1xuICAgICAgICAgICAgICAgIHNvY2tldElvU2VydmVyLnNvY2tldHMuZW1pdChcImJvb2tSZXR1cm5lZFwiLCBib29rKTtcbiAgICAgICAgICAgIH0pO1xuICAgIH0pO1xufSk7XG5cbmh0dHBTZXJ2ZXIubGlzdGVuKHBvcnQsICgpID0+IHtcbiAgICBjb25zb2xlLmxvZyhgbGlzdGVuaW5nIG9uICo6JHtwb3J0fWApO1xufSk7XG4iXX0=
