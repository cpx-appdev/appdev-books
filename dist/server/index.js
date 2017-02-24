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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImluZGV4LmpzIl0sIm5hbWVzIjpbInBvcnQiLCJwcm9jZXNzIiwiZW52IiwiUE9SVCIsImFwcCIsImh0dHBTZXJ2ZXIiLCJjcmVhdGVTZXJ2ZXIiLCJzb2NrZXRJb1NlcnZlciIsImxpc3RlbiIsImZpbGUiLCJyZXNvbHZlIiwiX19kaXJuYW1lIiwic2VjcmV0cyIsImRvY3VtZW50ZGJfZW5kcG9pbnQiLCJnZXQiLCJkb2N1bWVudGRiX3ByaW1hcnlLZXkiLCJkb2N1bWVudGRiX2RhdGFiYXNlIiwiZG9jdW1lbnRkYl9jb2xsZWN0aW9uIiwiaXNibkRiQXBpS2V5IiwidXNlcm5hbWUiLCJwYXNzd29yZCIsImJvb2tMb29rdXAiLCJkb2N1bWVudGRiQ2xpZW50IiwiRG9jdW1lbnRDbGllbnQiLCJtYXN0ZXJLZXkiLCJkYXRhYmFzZVVybCIsImNvbGxlY3Rpb25VcmwiLCJhdXRoIiwicmVxIiwicmVzIiwibmV4dCIsInVuYXV0aG9yaXplZCIsInNldCIsInNlbmRTdGF0dXMiLCJ1c2VyIiwibmFtZSIsInBhc3MiLCJhZGRCb29rIiwiYm9vayIsIlByb21pc2UiLCJyZWplY3QiLCJjcmVhdGVEb2N1bWVudCIsImVycm9yIiwiZ2V0Qm9va3MiLCJxdWVyeURvY3VtZW50cyIsInRvQXJyYXkiLCJib29rcyIsImdldEJvb2tCeUlkIiwiaWQiLCJsZW5ndGgiLCJhZGRCb29rQnlJc2JuIiwiaXNibiIsImV4ZWN1dGUiLCJ0aGVuIiwidjQiLCJib3Jyb3dlZEZyb20iLCJib3Jyb3dlZE9uIiwiY2F0Y2giLCJib3Jyb3dCb29rIiwiYm9va0lkIiwiZG9jdW1lbnRVcmwiLCJkYXRlIiwiRGF0ZSIsImdldERhdGUiLCJnZXRNb250aCIsImdldEZ1bGxZZWFyIiwicmVwbGFjZURvY3VtZW50IiwicmVzdWx0IiwicmV0dXJuQm9vayIsInVzZSIsInN0YXRpYyIsIm9uIiwiY2xpZW50SXAiLCJzb2NrZXQiLCJyZXF1ZXN0IiwiY29ubmVjdGlvbiIsInJlbW90ZUFkZHJlc3Mi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QUtiLElBQUwsRUFBYztBQUNsQ3VCLG1CQUFXVixFQUFYLEVBQWViLElBQWYsRUFDS2tCLElBREwsQ0FDVSxnQkFBUTtBQUNWOUMsMkJBQWV5RSxPQUFmLENBQXVCQyxJQUF2QixDQUE0QixjQUE1QixFQUE0QzNDLElBQTVDO0FBQ0gsU0FITDtBQUlILEtBTEQ7O0FBT0FtQyxXQUFPRixFQUFQLENBQVUsWUFBVixFQUF3QixVQUFDdkIsRUFBRCxFQUFLYixJQUFMLEVBQWM7QUFDbENpQyxtQkFBV3BCLEVBQVgsRUFBZWIsSUFBZixFQUNLa0IsSUFETCxDQUNVLGdCQUFRO0FBQ1Y5QywyQkFBZXlFLE9BQWYsQ0FBdUJDLElBQXZCLENBQTRCLGNBQTVCLEVBQTRDM0MsSUFBNUM7QUFDSCxTQUhMO0FBSUgsS0FMRDtBQU1ILENBN0JEOztBQStCQWpDLFdBQVdHLE1BQVgsQ0FBa0JSLElBQWxCLEVBQXdCLFlBQU07QUFDMUI2RSxZQUFRQyxHQUFSLHFCQUE4QjlFLElBQTlCO0FBQ0gsQ0FGRCIsImZpbGUiOiJpbmRleC5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBleHByZXNzIGZyb20gXCJleHByZXNzXCI7XG5pbXBvcnQgaHR0cCBmcm9tIFwiaHR0cFwiO1xuaW1wb3J0IHBhdGggZnJvbSBcInBhdGhcIjtcbmltcG9ydCB1dWlkIGZyb20gXCJ1dWlkXCI7XG5pbXBvcnQgZG9jdW1lbnRkYiBmcm9tIFwiZG9jdW1lbnRkYlwiO1xuaW1wb3J0IG5jb25mIGZyb20gXCJuY29uZlwiO1xuaW1wb3J0IHNvY2tldElvIGZyb20gXCJzb2NrZXQuaW9cIjtcbmltcG9ydCBiYXNpY0F1dGggZnJvbSBcImJhc2ljLWF1dGhcIjtcbmltcG9ydCB7IEJvb2tMb29rdXAgfSBmcm9tIFwiLi9ib29rTG9va3VwXCI7XG5cbmNvbnN0IHBvcnQgPSBwcm9jZXNzLmVudi5QT1JUIHx8IDgwODA7XG5jb25zdCBhcHAgPSBleHByZXNzKCk7XG5jb25zdCBodHRwU2VydmVyID0gaHR0cC5jcmVhdGVTZXJ2ZXIoYXBwKTtcbmNvbnN0IHNvY2tldElvU2VydmVyID0gc29ja2V0SW8ubGlzdGVuKGh0dHBTZXJ2ZXIpO1xuXG5uY29uZi5maWxlKHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUgKyBcIi9zZWNyZXRzLmpzb25cIikpLmVudigpO1xuY29uc3Qgc2VjcmV0cyA9IHtcbiAgICBkb2N1bWVudGRiX2VuZHBvaW50OiBuY29uZi5nZXQoXCJkb2N1bWVudGRiX2VuZHBvaW50XCIpLFxuICAgIGRvY3VtZW50ZGJfcHJpbWFyeUtleTogbmNvbmYuZ2V0KFwiZG9jdW1lbnRkYl9wcmltYXJ5S2V5XCIpLFxuICAgIGRvY3VtZW50ZGJfZGF0YWJhc2U6IG5jb25mLmdldChcImRvY3VtZW50ZGJfZGF0YWJhc2VcIiksXG4gICAgZG9jdW1lbnRkYl9jb2xsZWN0aW9uOiBuY29uZi5nZXQoXCJkb2N1bWVudGRiX2NvbGxlY3Rpb25cIiksXG4gICAgaXNibkRiQXBpS2V5OiBuY29uZi5nZXQoXCJpc2JuRGJBcGlLZXlcIiksXG4gICAgdXNlcm5hbWU6IG5jb25mLmdldChcImF1dGhfdXNlcm5hbWVcIiksXG4gICAgcGFzc3dvcmQ6IG5jb25mLmdldChcImF1dGhfcGFzc3dvcmRcIilcbn1cblxuY29uc3QgYm9va0xvb2t1cCA9IG5ldyBCb29rTG9va3VwKHNlY3JldHMuaXNibkRiQXBpS2V5KTtcbmNvbnN0IGRvY3VtZW50ZGJDbGllbnQgPSBuZXcgZG9jdW1lbnRkYi5Eb2N1bWVudENsaWVudChzZWNyZXRzLmRvY3VtZW50ZGJfZW5kcG9pbnQsIHsgbWFzdGVyS2V5OiBzZWNyZXRzLmRvY3VtZW50ZGJfcHJpbWFyeUtleSB9KTtcbmNvbnN0IGRhdGFiYXNlVXJsID0gYGRicy8ke3NlY3JldHMuZG9jdW1lbnRkYl9kYXRhYmFzZX1gO1xuY29uc3QgY29sbGVjdGlvblVybCA9IGAke2RhdGFiYXNlVXJsfS9jb2xscy8ke3NlY3JldHMuZG9jdW1lbnRkYl9jb2xsZWN0aW9ufWA7XG5cbmNvbnN0IGF1dGggPSAocmVxLCByZXMsIG5leHQpID0+IHtcbiAgICBmdW5jdGlvbiB1bmF1dGhvcml6ZWQocmVzKSB7XG4gICAgICAgIHJlcy5zZXQoXCJXV1ctQXV0aGVudGljYXRlXCIsIFwiQmFzaWMgcmVhbG09QXV0aG9yaXphdGlvbiBSZXF1aXJlZFwiKTtcbiAgICAgICAgcmV0dXJuIHJlcy5zZW5kU3RhdHVzKDQwMSk7XG4gICAgfVxuXG4gICAgY29uc3QgdXNlciA9IGJhc2ljQXV0aChyZXEpO1xuXG4gICAgaWYgKCF1c2VyIHx8ICF1c2VyLm5hbWUgfHwgIXVzZXIucGFzcykge1xuICAgICAgICByZXR1cm4gdW5hdXRob3JpemVkKHJlcyk7XG4gICAgfVxuXG4gICAgaWYgKHVzZXIubmFtZSA9PT0gc2VjcmV0cy51c2VybmFtZSAmJiB1c2VyLnBhc3MgPT09IHNlY3JldHMucGFzc3dvcmQpIHtcbiAgICAgICAgcmV0dXJuIG5leHQoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gdW5hdXRob3JpemVkKHJlcyk7XG4gICAgfVxufTtcblxuZnVuY3Rpb24gYWRkQm9vayhib29rKSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgZG9jdW1lbnRkYkNsaWVudC5jcmVhdGVEb2N1bWVudChjb2xsZWN0aW9uVXJsLCBib29rLCAoZXJyb3IsIGJvb2spID0+IHtcbiAgICAgICAgICAgIGlmIChlcnJvcikge1xuICAgICAgICAgICAgICAgIHJlamVjdChlcnJvcik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKGJvb2spO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9KTtcbn1cblxuZnVuY3Rpb24gZ2V0Qm9va3MoKSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgZG9jdW1lbnRkYkNsaWVudC5xdWVyeURvY3VtZW50cyhjb2xsZWN0aW9uVXJsKS50b0FycmF5KChlcnJvciwgYm9va3MpID0+IHtcbiAgICAgICAgICAgIGlmIChlcnJvcikge1xuICAgICAgICAgICAgICAgIHJlamVjdChlcnJvcik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKGJvb2tzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSk7XG59XG5cbmZ1bmN0aW9uIGdldEJvb2tCeUlkKGlkKSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgZG9jdW1lbnRkYkNsaWVudC5xdWVyeURvY3VtZW50cyhjb2xsZWN0aW9uVXJsLCBgU0VMRUNUIFZBTFVFIHIgRlJPTSByb290IHIgV0hFUkUgci5pZCA9IFwiJHtpZH1cImBcbiAgICAgICAgKS50b0FycmF5KChlcnJvciwgYm9va3MpID0+IHtcbiAgICAgICAgICAgIGlmIChlcnJvcikge1xuICAgICAgICAgICAgICAgIHJlamVjdChlcnJvcik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChib29rcy5sZW5ndGggPT0gMSkge1xuICAgICAgICAgICAgICAgIHJlc29sdmUoYm9va3NbMF0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVqZWN0KFwiTm8gZG9jdW1lbnQgZm91bmQuXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9KTtcbn1cblxuXG5cbmZ1bmN0aW9uIGFkZEJvb2tCeUlzYm4oaXNibikge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgIGJvb2tMb29rdXAuZXhlY3V0ZShpc2JuKVxuICAgICAgICAgICAgLnRoZW4oYm9vayA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGJvb2spIHtcbiAgICAgICAgICAgICAgICAgICAgYm9vay5pZCA9IHV1aWQudjQoKTtcbiAgICAgICAgICAgICAgICAgICAgYm9vay5ib3Jyb3dlZEZyb20gPSBcIlwiO1xuICAgICAgICAgICAgICAgICAgICBib29rLmJvcnJvd2VkT24gPSBcIlwiO1xuICAgICAgICAgICAgICAgICAgICBhZGRCb29rKGJvb2spO1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKGJvb2spO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KFwiTm8gYm9vayBmb3VuZFwiKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KS5jYXRjaChyZWplY3QpO1xuICAgIH0pO1xufVxuXG5mdW5jdGlvbiBib3Jyb3dCb29rKGJvb2tJZCwgbmFtZSkge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgIGNvbnN0IGRvY3VtZW50VXJsID0gYCR7Y29sbGVjdGlvblVybH0vZG9jcy8ke2Jvb2tJZH1gO1xuXG4gICAgICAgIGdldEJvb2tCeUlkKGJvb2tJZCkudGhlbihib29rID0+IHtcbiAgICAgICAgICAgIGJvb2suYm9ycm93ZWRGcm9tID0gbmFtZTtcbiAgICAgICAgICAgIGNvbnN0IGRhdGUgPSBuZXcgRGF0ZSgpO1xuICAgICAgICAgICAgYm9vay5ib3Jyb3dlZE9uID0gYCR7ZGF0ZS5nZXREYXRlKCl9LiR7ZGF0ZS5nZXRNb250aCgpICsgMX0uJHtkYXRlLmdldEZ1bGxZZWFyKCl9YDtcbiAgICAgICAgICAgIGRvY3VtZW50ZGJDbGllbnQucmVwbGFjZURvY3VtZW50KGRvY3VtZW50VXJsLCBib29rLCAoZXJyb3IsIHJlc3VsdCkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChlcnJvcikge1xuICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyb3IpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShyZXN1bHQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KS5jYXRjaChlcnJvciA9PiB7XG4gICAgICAgICAgICByZWplY3QoZXJyb3IpO1xuXG4gICAgICAgIH0pO1xuICAgIH0pO1xufVxuXG5mdW5jdGlvbiByZXR1cm5Cb29rKGJvb2tJZCkge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgIGNvbnN0IGRvY3VtZW50VXJsID0gYCR7Y29sbGVjdGlvblVybH0vZG9jcy8ke2Jvb2tJZH1gO1xuXG4gICAgICAgIGdldEJvb2tCeUlkKGJvb2tJZCkudGhlbihib29rID0+IHtcbiAgICAgICAgICAgIGJvb2suYm9ycm93ZWRGcm9tID0gXCJcIjtcbiAgICAgICAgICAgIGJvb2suYm9ycm93ZWRPbiA9IFwiXCI7XG4gICAgICAgICAgICBkb2N1bWVudGRiQ2xpZW50LnJlcGxhY2VEb2N1bWVudChkb2N1bWVudFVybCwgYm9vaywgKGVycm9yLCByZXN1bHQpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycm9yKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUocmVzdWx0KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSkuY2F0Y2goZXJyb3IgPT4ge1xuICAgICAgICAgICAgcmVqZWN0KGVycm9yKTtcblxuICAgICAgICB9KTtcbiAgICB9KTtcbn1cblxuYXBwLnVzZShcIi9cIiwgYXV0aCwgZXhwcmVzcy5zdGF0aWMocGF0aC5yZXNvbHZlKF9fZGlybmFtZSArIFwiLy4uL3B1YmxpY1wiKSkpO1xuXG5zb2NrZXRJb1NlcnZlci5vbihcImNvbm5lY3Rpb25cIiwgc29ja2V0ID0+IHtcbiAgICBjb25zdCBjbGllbnRJcCA9IHNvY2tldC5yZXF1ZXN0LmNvbm5lY3Rpb24ucmVtb3RlQWRkcmVzcztcbiAgICBjb25zb2xlLmxvZyhcIkNsaWVudCBjb25uZWN0ZWQ6XFx0XCIgKyBjbGllbnRJcCk7XG5cbiAgICBzb2NrZXQub24oXCJnZXRCb29rc1wiLCBjYWxsYmFjayA9PiB7XG4gICAgICAgIGdldEJvb2tzKCkudGhlbihib29rcyA9PiBjYWxsYmFjayhib29rcykpO1xuICAgIH0pO1xuXG4gICAgc29ja2V0Lm9uKFwiYWRkQm9va1wiLCAoaXNibiwgY2FsbGJhY2spID0+IHtcbiAgICAgICAgYWRkQm9va0J5SXNibihpc2JuKVxuICAgICAgICAgICAgLnRoZW4oYm9vayA9PiB7XG4gICAgICAgICAgICAgICAgc29ja2V0SW9TZXJ2ZXIuc29ja2V0cy5lbWl0KFwiYm9va0FkZGVkXCIsIGJvb2spO1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKCk7XG4gICAgICAgICAgICB9KS5jYXRjaChlcnJvciA9PiBjYWxsYmFjayhlcnJvcikpO1xuICAgIH0pO1xuXG4gICAgc29ja2V0Lm9uKFwiYm9ycm93Qm9va1wiLCAoaWQsIG5hbWUpID0+IHtcbiAgICAgICAgYm9ycm93Qm9vayhpZCwgbmFtZSlcbiAgICAgICAgICAgIC50aGVuKGJvb2sgPT4ge1xuICAgICAgICAgICAgICAgIHNvY2tldElvU2VydmVyLnNvY2tldHMuZW1pdChcImJvb2tCb3Jyb3dlZFwiLCBib29rKTtcbiAgICAgICAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgc29ja2V0Lm9uKFwicmV0dXJuQm9va1wiLCAoaWQsIG5hbWUpID0+IHtcbiAgICAgICAgcmV0dXJuQm9vayhpZCwgbmFtZSlcbiAgICAgICAgICAgIC50aGVuKGJvb2sgPT4ge1xuICAgICAgICAgICAgICAgIHNvY2tldElvU2VydmVyLnNvY2tldHMuZW1pdChcImJvb2tSZXR1cm5lZFwiLCBib29rKTtcbiAgICAgICAgICAgIH0pO1xuICAgIH0pO1xufSk7XG5cbmh0dHBTZXJ2ZXIubGlzdGVuKHBvcnQsICgpID0+IHtcbiAgICBjb25zb2xlLmxvZyhgbGlzdGVuaW5nIG9uICo6JHtwb3J0fWApO1xufSk7XG4iXX0=
