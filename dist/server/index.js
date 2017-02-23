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
        return res.send(401);
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

app.use(_bodyParser2.default.json());
app.use(_bodyParser2.default.urlencoded({ extended: true }));

app.use("/", auth, _express2.default.static(_path2.default.resolve(__dirname + "/../public")));

app.get("/books", auth, function (req, res) {
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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImluZGV4LmpzIl0sIm5hbWVzIjpbInBvcnQiLCJwcm9jZXNzIiwiZW52IiwiUE9SVCIsImFwcCIsImh0dHBTZXJ2ZXIiLCJTZXJ2ZXIiLCJzb2NrZXRJb1NlcnZlciIsInBpbmdUaW1lb3V0IiwicGluZ0ludGVydmFsIiwiZmlsZSIsInJlc29sdmUiLCJfX2Rpcm5hbWUiLCJzZWNyZXRzIiwiZG9jdW1lbnRkYl9lbmRwb2ludCIsImdldCIsImRvY3VtZW50ZGJfcHJpbWFyeUtleSIsImRvY3VtZW50ZGJfZGF0YWJhc2UiLCJkb2N1bWVudGRiX2NvbGxlY3Rpb24iLCJpc2JuRGJBcGlLZXkiLCJ1c2VybmFtZSIsInBhc3N3b3JkIiwiYm9va0xvb2t1cCIsImRvY3VtZW50ZGJDbGllbnQiLCJEb2N1bWVudENsaWVudCIsIm1hc3RlcktleSIsImRhdGFiYXNlVXJsIiwiY29sbGVjdGlvblVybCIsImF1dGgiLCJyZXEiLCJyZXMiLCJuZXh0IiwidW5hdXRob3JpemVkIiwic2V0Iiwic2VuZCIsInVzZXIiLCJuYW1lIiwicGFzcyIsImFkZEJvb2siLCJib29rIiwiUHJvbWlzZSIsInJlamVjdCIsImNyZWF0ZURvY3VtZW50IiwiZXJyb3IiLCJnZXRCb29rcyIsInF1ZXJ5RG9jdW1lbnRzIiwidG9BcnJheSIsImJvb2tzIiwiZ2V0Qm9va0J5SWQiLCJpZCIsImxlbmd0aCIsImFkZEJvb2tCeUlzYm4iLCJpc2JuIiwiZXhlY3V0ZSIsInRoZW4iLCJ2NCIsImJvcnJvd2VkRnJvbSIsImJvcnJvd2VkT24iLCJjYXRjaCIsImJvcnJvd0Jvb2siLCJib29rSWQiLCJkb2N1bWVudFVybCIsImRhdGUiLCJEYXRlIiwiZ2V0RGF0ZSIsImdldE1vbnRoIiwiZ2V0RnVsbFllYXIiLCJyZXBsYWNlRG9jdW1lbnQiLCJyZXN1bHQiLCJyZXR1cm5Cb29rIiwidXNlIiwianNvbiIsInVybGVuY29kZWQiLCJleHRlbmRlZCIsInN0YXRpYyIsIm9uIiwic29ja2V0IiwiY2xpZW50SXAiLCJyZXF1ZXN0IiwiY29ubmVjdGlvbiIsInJlbW90ZUFkZHJlc3MiLCJjb25zb2xlIiwibG9nIiwiY2FsbGJhY2siLCJzb2NrZXRzIiwiZW1pdCIsImxpc3RlbiJdLCJtYXBwaW5ncyI6Ijs7QUFBQTs7OztBQUNBOzs7O0FBQ0E7Ozs7QUFDQTs7OztBQUNBOzs7O0FBQ0E7Ozs7QUFDQTs7OztBQUNBOzs7O0FBQ0E7Ozs7QUFDQTs7OztBQUVBLElBQU1BLE9BQU9DLFFBQVFDLEdBQVIsQ0FBWUMsSUFBWixJQUFvQixJQUFqQztBQUNBLElBQU1DLE1BQU0sd0JBQVo7QUFDQSxJQUFNQyxhQUFhLGVBQUtDLE1BQUwsQ0FBWUYsR0FBWixDQUFuQjtBQUNBLElBQU1HLGlCQUFpQixzQkFBU0YsVUFBVCxFQUFxQjtBQUN4Q0csaUJBQWEsSUFEMkI7QUFFeENDLGtCQUFjO0FBRjBCLENBQXJCLENBQXZCOztBQUtBLGdCQUFNQyxJQUFOLENBQVcsZUFBS0MsT0FBTCxDQUFhQyxZQUFZLGVBQXpCLENBQVgsRUFBc0RWLEdBQXREO0FBQ0EsSUFBTVcsVUFBVTtBQUNaQyx5QkFBcUIsZ0JBQU1DLEdBQU4sQ0FBVSxxQkFBVixDQURUO0FBRVpDLDJCQUF1QixnQkFBTUQsR0FBTixDQUFVLHVCQUFWLENBRlg7QUFHWkUseUJBQXFCLGdCQUFNRixHQUFOLENBQVUscUJBQVYsQ0FIVDtBQUlaRywyQkFBdUIsZ0JBQU1ILEdBQU4sQ0FBVSx1QkFBVixDQUpYO0FBS1pJLGtCQUFjLGdCQUFNSixHQUFOLENBQVUsY0FBVixDQUxGO0FBTVpLLGNBQVUsZ0JBQU1MLEdBQU4sQ0FBVSxlQUFWLENBTkU7QUFPWk0sY0FBVSxnQkFBTU4sR0FBTixDQUFVLGVBQVY7QUFQRSxDQUFoQjs7QUFVQSxJQUFNTyxhQUFhLDJCQUFlVCxRQUFRTSxZQUF2QixDQUFuQjtBQUNBLElBQU1JLG1CQUFtQixJQUFJLHFCQUFXQyxjQUFmLENBQThCWCxRQUFRQyxtQkFBdEMsRUFBMkQsRUFBRVcsV0FBV1osUUFBUUcscUJBQXJCLEVBQTNELENBQXpC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QUQsRUFBTytCLFFBQVAsRUFBb0I7QUFDckNoQyxzQkFBY0MsSUFBZCxFQUNLRSxJQURMLENBQ1UsZ0JBQVE7QUFDVi9DLDJCQUFlNkUsT0FBZixDQUF1QkMsSUFBdkIsQ0FBNEIsV0FBNUIsRUFBeUM5QyxJQUF6QztBQUNBNEM7QUFDSCxTQUpMLEVBSU96QixLQUpQLENBSWE7QUFBQSxtQkFBU3lCLFNBQVN4QyxLQUFULENBQVQ7QUFBQSxTQUpiO0FBS0gsS0FORDs7QUFRQWlDLFdBQU9ELEVBQVAsQ0FBVSxZQUFWLEVBQXdCLFVBQUMxQixFQUFELEVBQUtiLElBQUwsRUFBYztBQUNsQ3VCLG1CQUFXVixFQUFYLEVBQWViLElBQWYsRUFDS2tCLElBREwsQ0FDVSxnQkFBUTtBQUNWL0MsMkJBQWU2RSxPQUFmLENBQXVCQyxJQUF2QixDQUE0QixjQUE1QixFQUE0QzlDLElBQTVDO0FBQ0gsU0FITDtBQUlILEtBTEQ7O0FBT0FxQyxXQUFPRCxFQUFQLENBQVUsWUFBVixFQUF3QixVQUFDMUIsRUFBRCxFQUFLYixJQUFMLEVBQWM7QUFDbENpQyxtQkFBV3BCLEVBQVgsRUFBZWIsSUFBZixFQUNLa0IsSUFETCxDQUNVLGdCQUFRO0FBQ1YvQywyQkFBZTZFLE9BQWYsQ0FBdUJDLElBQXZCLENBQTRCLGNBQTVCLEVBQTRDOUMsSUFBNUM7QUFDSCxTQUhMO0FBSUgsS0FMRDtBQU1ILENBekJEOztBQTJCQWxDLFdBQVdpRixNQUFYLENBQWtCdEYsSUFBbEIsRUFBd0IsWUFBTTtBQUMxQmlGLFlBQVFDLEdBQVIscUJBQThCbEYsSUFBOUI7QUFDSCxDQUZEIiwiZmlsZSI6ImluZGV4LmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGV4cHJlc3MgZnJvbSBcImV4cHJlc3NcIjtcbmltcG9ydCBodHRwIGZyb20gXCJodHRwXCI7XG5pbXBvcnQgcGF0aCBmcm9tIFwicGF0aFwiO1xuaW1wb3J0IHV1aWQgZnJvbSBcInV1aWRcIjtcbmltcG9ydCBib2R5UGFyc2VyIGZyb20gXCJib2R5LXBhcnNlclwiO1xuaW1wb3J0IGRvY3VtZW50ZGIgZnJvbSBcImRvY3VtZW50ZGJcIjtcbmltcG9ydCBuY29uZiBmcm9tIFwibmNvbmZcIjtcbmltcG9ydCBzb2NrZXRJbyBmcm9tIFwic29ja2V0LmlvXCI7XG5pbXBvcnQgYmFzaWNBdXRoIGZyb20gXCJiYXNpYy1hdXRoXCI7XG5pbXBvcnQgeyBCb29rTG9va3VwIH0gZnJvbSBcIi4vYm9va0xvb2t1cFwiO1xuXG5jb25zdCBwb3J0ID0gcHJvY2Vzcy5lbnYuUE9SVCB8fCA4MDgwO1xuY29uc3QgYXBwID0gZXhwcmVzcygpO1xuY29uc3QgaHR0cFNlcnZlciA9IGh0dHAuU2VydmVyKGFwcCk7XG5jb25zdCBzb2NrZXRJb1NlcnZlciA9IHNvY2tldElvKGh0dHBTZXJ2ZXIsIHtcbiAgICBwaW5nVGltZW91dDogMjAwMCxcbiAgICBwaW5nSW50ZXJ2YWw6IDIwMDBcbn0pO1xuXG5uY29uZi5maWxlKHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUgKyBcIi9zZWNyZXRzLmpzb25cIikpLmVudigpO1xuY29uc3Qgc2VjcmV0cyA9IHtcbiAgICBkb2N1bWVudGRiX2VuZHBvaW50OiBuY29uZi5nZXQoXCJkb2N1bWVudGRiX2VuZHBvaW50XCIpLFxuICAgIGRvY3VtZW50ZGJfcHJpbWFyeUtleTogbmNvbmYuZ2V0KFwiZG9jdW1lbnRkYl9wcmltYXJ5S2V5XCIpLFxuICAgIGRvY3VtZW50ZGJfZGF0YWJhc2U6IG5jb25mLmdldChcImRvY3VtZW50ZGJfZGF0YWJhc2VcIiksXG4gICAgZG9jdW1lbnRkYl9jb2xsZWN0aW9uOiBuY29uZi5nZXQoXCJkb2N1bWVudGRiX2NvbGxlY3Rpb25cIiksXG4gICAgaXNibkRiQXBpS2V5OiBuY29uZi5nZXQoXCJpc2JuRGJBcGlLZXlcIiksXG4gICAgdXNlcm5hbWU6IG5jb25mLmdldChcImF1dGhfdXNlcm5hbWVcIiksXG4gICAgcGFzc3dvcmQ6IG5jb25mLmdldChcImF1dGhfcGFzc3dvcmRcIilcbn1cblxuY29uc3QgYm9va0xvb2t1cCA9IG5ldyBCb29rTG9va3VwKHNlY3JldHMuaXNibkRiQXBpS2V5KTtcbmNvbnN0IGRvY3VtZW50ZGJDbGllbnQgPSBuZXcgZG9jdW1lbnRkYi5Eb2N1bWVudENsaWVudChzZWNyZXRzLmRvY3VtZW50ZGJfZW5kcG9pbnQsIHsgbWFzdGVyS2V5OiBzZWNyZXRzLmRvY3VtZW50ZGJfcHJpbWFyeUtleSB9KTtcbmNvbnN0IGRhdGFiYXNlVXJsID0gYGRicy8ke3NlY3JldHMuZG9jdW1lbnRkYl9kYXRhYmFzZX1gO1xuY29uc3QgY29sbGVjdGlvblVybCA9IGAke2RhdGFiYXNlVXJsfS9jb2xscy8ke3NlY3JldHMuZG9jdW1lbnRkYl9jb2xsZWN0aW9ufWA7XG5cbmNvbnN0IGF1dGggPSAocmVxLCByZXMsIG5leHQpID0+IHtcbiAgICBmdW5jdGlvbiB1bmF1dGhvcml6ZWQocmVzKSB7XG4gICAgICAgIHJlcy5zZXQoXCJXV1ctQXV0aGVudGljYXRlXCIsIFwiQmFzaWMgcmVhbG09QXV0aG9yaXphdGlvbiBSZXF1aXJlZFwiKTtcbiAgICAgICAgcmV0dXJuIHJlcy5zZW5kKDQwMSk7XG4gICAgfVxuXG4gICAgY29uc3QgdXNlciA9IGJhc2ljQXV0aChyZXEpO1xuXG4gICAgaWYgKCF1c2VyIHx8ICF1c2VyLm5hbWUgfHwgIXVzZXIucGFzcykge1xuICAgICAgICByZXR1cm4gdW5hdXRob3JpemVkKHJlcyk7XG4gICAgfVxuXG4gICAgaWYgKHVzZXIubmFtZSA9PT0gc2VjcmV0cy51c2VybmFtZSAmJiB1c2VyLnBhc3MgPT09IHNlY3JldHMucGFzc3dvcmQpIHtcbiAgICAgICAgcmV0dXJuIG5leHQoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gdW5hdXRob3JpemVkKHJlcyk7XG4gICAgfVxufTtcblxuZnVuY3Rpb24gYWRkQm9vayhib29rKSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgZG9jdW1lbnRkYkNsaWVudC5jcmVhdGVEb2N1bWVudChjb2xsZWN0aW9uVXJsLCBib29rLCAoZXJyb3IsIGJvb2spID0+IHtcbiAgICAgICAgICAgIGlmIChlcnJvcikge1xuICAgICAgICAgICAgICAgIHJlamVjdChlcnJvcik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKGJvb2spO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9KTtcbn1cblxuZnVuY3Rpb24gZ2V0Qm9va3MoKSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgZG9jdW1lbnRkYkNsaWVudC5xdWVyeURvY3VtZW50cyhjb2xsZWN0aW9uVXJsKS50b0FycmF5KChlcnJvciwgYm9va3MpID0+IHtcbiAgICAgICAgICAgIGlmIChlcnJvcikge1xuICAgICAgICAgICAgICAgIHJlamVjdChlcnJvcik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKGJvb2tzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSk7XG59XG5cbmZ1bmN0aW9uIGdldEJvb2tCeUlkKGlkKSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgZG9jdW1lbnRkYkNsaWVudC5xdWVyeURvY3VtZW50cyhjb2xsZWN0aW9uVXJsLCBgU0VMRUNUIFZBTFVFIHIgRlJPTSByb290IHIgV0hFUkUgci5pZCA9IFwiJHtpZH1cImBcbiAgICAgICAgKS50b0FycmF5KChlcnJvciwgYm9va3MpID0+IHtcbiAgICAgICAgICAgIGlmIChlcnJvcikge1xuICAgICAgICAgICAgICAgIHJlamVjdChlcnJvcik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChib29rcy5sZW5ndGggPT0gMSkge1xuICAgICAgICAgICAgICAgIHJlc29sdmUoYm9va3NbMF0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVqZWN0KFwiTm8gZG9jdW1lbnQgZm91bmQuXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9KTtcbn1cblxuXG5cbmZ1bmN0aW9uIGFkZEJvb2tCeUlzYm4oaXNibikge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgIGJvb2tMb29rdXAuZXhlY3V0ZShpc2JuKVxuICAgICAgICAgICAgLnRoZW4oYm9vayA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGJvb2spIHtcbiAgICAgICAgICAgICAgICAgICAgYm9vay5pZCA9IHV1aWQudjQoKTtcbiAgICAgICAgICAgICAgICAgICAgYm9vay5ib3Jyb3dlZEZyb20gPSBcIlwiO1xuICAgICAgICAgICAgICAgICAgICBib29rLmJvcnJvd2VkT24gPSBcIlwiO1xuICAgICAgICAgICAgICAgICAgICBhZGRCb29rKGJvb2spO1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKGJvb2spO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KFwiTm8gYm9vayBmb3VuZFwiKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KS5jYXRjaChyZWplY3QpO1xuICAgIH0pO1xufVxuXG5mdW5jdGlvbiBib3Jyb3dCb29rKGJvb2tJZCwgbmFtZSkge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgIGNvbnN0IGRvY3VtZW50VXJsID0gYCR7Y29sbGVjdGlvblVybH0vZG9jcy8ke2Jvb2tJZH1gO1xuXG4gICAgICAgIGdldEJvb2tCeUlkKGJvb2tJZCkudGhlbihib29rID0+IHtcbiAgICAgICAgICAgIGJvb2suYm9ycm93ZWRGcm9tID0gbmFtZTtcbiAgICAgICAgICAgIGNvbnN0IGRhdGUgPSBuZXcgRGF0ZSgpO1xuICAgICAgICAgICAgYm9vay5ib3Jyb3dlZE9uID0gYCR7ZGF0ZS5nZXREYXRlKCl9LiR7ZGF0ZS5nZXRNb250aCgpICsgMX0uJHtkYXRlLmdldEZ1bGxZZWFyKCl9YDtcbiAgICAgICAgICAgIGRvY3VtZW50ZGJDbGllbnQucmVwbGFjZURvY3VtZW50KGRvY3VtZW50VXJsLCBib29rLCAoZXJyb3IsIHJlc3VsdCkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChlcnJvcikge1xuICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyb3IpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShyZXN1bHQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KS5jYXRjaChlcnJvciA9PiB7XG4gICAgICAgICAgICByZWplY3QoZXJyb3IpO1xuXG4gICAgICAgIH0pO1xuICAgIH0pO1xufVxuXG5mdW5jdGlvbiByZXR1cm5Cb29rKGJvb2tJZCkge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgIGNvbnN0IGRvY3VtZW50VXJsID0gYCR7Y29sbGVjdGlvblVybH0vZG9jcy8ke2Jvb2tJZH1gO1xuXG4gICAgICAgIGdldEJvb2tCeUlkKGJvb2tJZCkudGhlbihib29rID0+IHtcbiAgICAgICAgICAgIGJvb2suYm9ycm93ZWRGcm9tID0gXCJcIjtcbiAgICAgICAgICAgIGJvb2suYm9ycm93ZWRPbiA9IFwiXCI7XG4gICAgICAgICAgICBkb2N1bWVudGRiQ2xpZW50LnJlcGxhY2VEb2N1bWVudChkb2N1bWVudFVybCwgYm9vaywgKGVycm9yLCByZXN1bHQpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycm9yKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUocmVzdWx0KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSkuY2F0Y2goZXJyb3IgPT4ge1xuICAgICAgICAgICAgcmVqZWN0KGVycm9yKTtcblxuICAgICAgICB9KTtcbiAgICB9KTtcbn1cblxuYXBwLnVzZShib2R5UGFyc2VyLmpzb24oKSk7XG5hcHAudXNlKGJvZHlQYXJzZXIudXJsZW5jb2RlZCh7IGV4dGVuZGVkOiB0cnVlIH0pKTtcblxuYXBwLnVzZShcIi9cIiwgYXV0aCwgZXhwcmVzcy5zdGF0aWMocGF0aC5yZXNvbHZlKF9fZGlybmFtZSArIFwiLy4uL3B1YmxpY1wiKSkpO1xuXG5hcHAuZ2V0KFwiL2Jvb2tzXCIsIGF1dGgsIChyZXEsIHJlcykgPT4ge1xuICAgIGdldEJvb2tzKCkudGhlbihib29rcyA9PiByZXMuanNvbihib29rcykpO1xufSk7XG5cbnNvY2tldElvU2VydmVyLm9uKFwiY29ubmVjdGlvblwiLCAoc29ja2V0KSA9PiB7XG4gICAgY29uc3QgY2xpZW50SXAgPSBzb2NrZXQucmVxdWVzdC5jb25uZWN0aW9uLnJlbW90ZUFkZHJlc3M7XG4gICAgY29uc29sZS5sb2coXCJDbGllbnQgY29ubmVjdGVkOlxcdFwiICsgY2xpZW50SXApO1xuXG4gICAgc29ja2V0Lm9uKFwiYWRkQm9va1wiLCAoaXNibiwgY2FsbGJhY2spID0+IHtcbiAgICAgICAgYWRkQm9va0J5SXNibihpc2JuKVxuICAgICAgICAgICAgLnRoZW4oYm9vayA9PiB7XG4gICAgICAgICAgICAgICAgc29ja2V0SW9TZXJ2ZXIuc29ja2V0cy5lbWl0KFwiYm9va0FkZGVkXCIsIGJvb2spO1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKCk7XG4gICAgICAgICAgICB9KS5jYXRjaChlcnJvciA9PiBjYWxsYmFjayhlcnJvcikpO1xuICAgIH0pO1xuXG4gICAgc29ja2V0Lm9uKFwiYm9ycm93Qm9va1wiLCAoaWQsIG5hbWUpID0+IHtcbiAgICAgICAgYm9ycm93Qm9vayhpZCwgbmFtZSlcbiAgICAgICAgICAgIC50aGVuKGJvb2sgPT4ge1xuICAgICAgICAgICAgICAgIHNvY2tldElvU2VydmVyLnNvY2tldHMuZW1pdChcImJvb2tCb3Jyb3dlZFwiLCBib29rKTtcbiAgICAgICAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgc29ja2V0Lm9uKFwicmV0dXJuQm9va1wiLCAoaWQsIG5hbWUpID0+IHtcbiAgICAgICAgcmV0dXJuQm9vayhpZCwgbmFtZSlcbiAgICAgICAgICAgIC50aGVuKGJvb2sgPT4ge1xuICAgICAgICAgICAgICAgIHNvY2tldElvU2VydmVyLnNvY2tldHMuZW1pdChcImJvb2tSZXR1cm5lZFwiLCBib29rKTtcbiAgICAgICAgICAgIH0pO1xuICAgIH0pO1xufSk7XG5cbmh0dHBTZXJ2ZXIubGlzdGVuKHBvcnQsICgpID0+IHtcbiAgICBjb25zb2xlLmxvZyhgbGlzdGVuaW5nIG9uICo6JHtwb3J0fWApO1xufSk7XG4iXX0=
