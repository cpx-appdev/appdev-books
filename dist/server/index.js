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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImluZGV4LmpzIl0sIm5hbWVzIjpbInBvcnQiLCJwcm9jZXNzIiwiZW52IiwiUE9SVCIsImFwcCIsImh0dHBTZXJ2ZXIiLCJTZXJ2ZXIiLCJzb2NrZXRJb1NlcnZlciIsInBpbmdUaW1lb3V0IiwicGluZ0ludGVydmFsIiwiZmlsZSIsInJlc29sdmUiLCJfX2Rpcm5hbWUiLCJzZWNyZXRzIiwiZG9jdW1lbnRkYl9lbmRwb2ludCIsImdldCIsImRvY3VtZW50ZGJfcHJpbWFyeUtleSIsImRvY3VtZW50ZGJfZGF0YWJhc2UiLCJkb2N1bWVudGRiX2NvbGxlY3Rpb24iLCJpc2JuRGJBcGlLZXkiLCJ1c2VybmFtZSIsInBhc3N3b3JkIiwiYm9va0xvb2t1cCIsImRvY3VtZW50ZGJDbGllbnQiLCJEb2N1bWVudENsaWVudCIsIm1hc3RlcktleSIsImRhdGFiYXNlVXJsIiwiY29sbGVjdGlvblVybCIsImF1dGgiLCJyZXEiLCJyZXMiLCJuZXh0IiwidW5hdXRob3JpemVkIiwic2V0Iiwic2VuZCIsInVzZXIiLCJuYW1lIiwicGFzcyIsImFkZEJvb2siLCJib29rIiwiUHJvbWlzZSIsInJlamVjdCIsImNyZWF0ZURvY3VtZW50IiwiZXJyb3IiLCJnZXRCb29rcyIsInF1ZXJ5RG9jdW1lbnRzIiwidG9BcnJheSIsImJvb2tzIiwiZ2V0Qm9va0J5SWQiLCJpZCIsImxlbmd0aCIsImFkZEJvb2tCeUlzYm4iLCJpc2JuIiwiZXhlY3V0ZSIsInRoZW4iLCJ2NCIsImJvcnJvd2VkRnJvbSIsImJvcnJvd2VkT24iLCJjYXRjaCIsImJvcnJvd0Jvb2siLCJib29rSWQiLCJkb2N1bWVudFVybCIsImRhdGUiLCJEYXRlIiwiZ2V0RGF0ZSIsImdldE1vbnRoIiwiZ2V0RnVsbFllYXIiLCJyZXBsYWNlRG9jdW1lbnQiLCJyZXN1bHQiLCJyZXR1cm5Cb29rIiwidXNlIiwianNvbiIsInVybGVuY29kZWQiLCJleHRlbmRlZCIsInN0YXRpYyIsIm9uIiwic29ja2V0IiwiY2xpZW50SXAiLCJyZXF1ZXN0IiwiY29ubmVjdGlvbiIsInJlbW90ZUFkZHJlc3MiLCJjb25zb2xlIiwibG9nIiwiY2FsbGJhY2siLCJzb2NrZXRzIiwiZW1pdCIsImxpc3RlbiJdLCJtYXBwaW5ncyI6Ijs7QUFBQTs7OztBQUNBOzs7O0FBQ0E7Ozs7QUFDQTs7OztBQUNBOzs7O0FBQ0E7Ozs7QUFDQTs7OztBQUNBOzs7O0FBQ0E7Ozs7QUFDQTs7OztBQUVBLElBQU1BLE9BQU9DLFFBQVFDLEdBQVIsQ0FBWUMsSUFBWixJQUFvQixJQUFqQztBQUNBLElBQU1DLE1BQU0sd0JBQVo7QUFDQSxJQUFNQyxhQUFhLGVBQUtDLE1BQUwsQ0FBWUYsR0FBWixDQUFuQjtBQUNBLElBQU1HLGlCQUFpQixzQkFBU0YsVUFBVCxFQUFxQjtBQUN4Q0csaUJBQWEsSUFEMkI7QUFFeENDLGtCQUFjO0FBRjBCLENBQXJCLENBQXZCOztBQUtBLGdCQUFNQyxJQUFOLENBQVcsZUFBS0MsT0FBTCxDQUFhQyxZQUFZLGVBQXpCLENBQVgsRUFBc0RWLEdBQXREO0FBQ0EsSUFBTVcsVUFBVTtBQUNaQyx5QkFBcUIsZ0JBQU1DLEdBQU4sQ0FBVSxxQkFBVixDQURUO0FBRVpDLDJCQUF1QixnQkFBTUQsR0FBTixDQUFVLHVCQUFWLENBRlg7QUFHWkUseUJBQXFCLGdCQUFNRixHQUFOLENBQVUscUJBQVYsQ0FIVDtBQUlaRywyQkFBdUIsZ0JBQU1ILEdBQU4sQ0FBVSx1QkFBVixDQUpYO0FBS1pJLGtCQUFjLGdCQUFNSixHQUFOLENBQVUsY0FBVixDQUxGO0FBTVpLLGNBQVUsZ0JBQU1MLEdBQU4sQ0FBVSxlQUFWLENBTkU7QUFPWk0sY0FBVSxnQkFBTU4sR0FBTixDQUFVLGVBQVY7QUFQRSxDQUFoQjs7QUFVQSxJQUFNTyxhQUFhLDJCQUFlVCxRQUFRTSxZQUF2QixDQUFuQjtBQUNBLElBQU1JLG1CQUFtQixJQUFJLHFCQUFXQyxjQUFmLENBQThCWCxRQUFRQyxtQkFBdEMsRUFBMkQsRUFBRVcsV0FBV1osUUFBUUcscUJBQXJCLEVBQTNELENBQXpC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UCxFQUFvQjtBQUNyQ2hDLHNCQUFjQyxJQUFkLEVBQ0tFLElBREwsQ0FDVSxnQkFBUTtBQUNWL0MsMkJBQWU2RSxPQUFmLENBQXVCQyxJQUF2QixDQUE0QixXQUE1QixFQUF5QzlDLElBQXpDO0FBQ0E0QztBQUNILFNBSkwsRUFJT3pCLEtBSlAsQ0FJYTtBQUFBLG1CQUFTeUIsU0FBU3hDLEtBQVQsQ0FBVDtBQUFBLFNBSmI7QUFLSCxLQU5EOztBQVFBaUMsV0FBT0QsRUFBUCxDQUFVLFlBQVYsRUFBd0IsVUFBQzFCLEVBQUQsRUFBS2IsSUFBTCxFQUFjO0FBQ2xDdUIsbUJBQVdWLEVBQVgsRUFBZWIsSUFBZixFQUNLa0IsSUFETCxDQUNVLGdCQUFRO0FBQ1YvQywyQkFBZTZFLE9BQWYsQ0FBdUJDLElBQXZCLENBQTRCLGNBQTVCLEVBQTRDOUMsSUFBNUM7QUFDSCxTQUhMO0FBSUgsS0FMRDs7QUFPQXFDLFdBQU9ELEVBQVAsQ0FBVSxZQUFWLEVBQXdCLFVBQUMxQixFQUFELEVBQUtiLElBQUwsRUFBYztBQUNsQ2lDLG1CQUFXcEIsRUFBWCxFQUFlYixJQUFmLEVBQ0trQixJQURMLENBQ1UsZ0JBQVE7QUFDVi9DLDJCQUFlNkUsT0FBZixDQUF1QkMsSUFBdkIsQ0FBNEIsY0FBNUIsRUFBNEM5QyxJQUE1QztBQUNILFNBSEw7QUFJSCxLQUxEO0FBTUgsQ0F6QkQ7O0FBMkJBbEMsV0FBV2lGLE1BQVgsQ0FBa0J0RixJQUFsQixFQUF3QixZQUFNO0FBQzFCaUYsWUFBUUMsR0FBUixxQkFBOEJsRixJQUE5QjtBQUNILENBRkQiLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgZXhwcmVzcyBmcm9tIFwiZXhwcmVzc1wiO1xuaW1wb3J0IGh0dHAgZnJvbSBcImh0dHBcIjtcbmltcG9ydCBwYXRoIGZyb20gXCJwYXRoXCI7XG5pbXBvcnQgdXVpZCBmcm9tIFwidXVpZFwiO1xuaW1wb3J0IGJvZHlQYXJzZXIgZnJvbSBcImJvZHktcGFyc2VyXCI7XG5pbXBvcnQgZG9jdW1lbnRkYiBmcm9tIFwiZG9jdW1lbnRkYlwiO1xuaW1wb3J0IG5jb25mIGZyb20gXCJuY29uZlwiO1xuaW1wb3J0IHNvY2tldElvIGZyb20gXCJzb2NrZXQuaW9cIjtcbmltcG9ydCBiYXNpY0F1dGggZnJvbSBcImJhc2ljLWF1dGhcIjtcbmltcG9ydCB7IEJvb2tMb29rdXAgfSBmcm9tIFwiLi9ib29rTG9va3VwXCI7XG5cbmNvbnN0IHBvcnQgPSBwcm9jZXNzLmVudi5QT1JUIHx8IDgwODA7XG5jb25zdCBhcHAgPSBleHByZXNzKCk7XG5jb25zdCBodHRwU2VydmVyID0gaHR0cC5TZXJ2ZXIoYXBwKTtcbmNvbnN0IHNvY2tldElvU2VydmVyID0gc29ja2V0SW8oaHR0cFNlcnZlciwge1xuICAgIHBpbmdUaW1lb3V0OiAyMDAwLFxuICAgIHBpbmdJbnRlcnZhbDogMjAwMFxufSk7XG5cbm5jb25mLmZpbGUocGF0aC5yZXNvbHZlKF9fZGlybmFtZSArIFwiL3NlY3JldHMuanNvblwiKSkuZW52KCk7XG5jb25zdCBzZWNyZXRzID0ge1xuICAgIGRvY3VtZW50ZGJfZW5kcG9pbnQ6IG5jb25mLmdldChcImRvY3VtZW50ZGJfZW5kcG9pbnRcIiksXG4gICAgZG9jdW1lbnRkYl9wcmltYXJ5S2V5OiBuY29uZi5nZXQoXCJkb2N1bWVudGRiX3ByaW1hcnlLZXlcIiksXG4gICAgZG9jdW1lbnRkYl9kYXRhYmFzZTogbmNvbmYuZ2V0KFwiZG9jdW1lbnRkYl9kYXRhYmFzZVwiKSxcbiAgICBkb2N1bWVudGRiX2NvbGxlY3Rpb246IG5jb25mLmdldChcImRvY3VtZW50ZGJfY29sbGVjdGlvblwiKSxcbiAgICBpc2JuRGJBcGlLZXk6IG5jb25mLmdldChcImlzYm5EYkFwaUtleVwiKSxcbiAgICB1c2VybmFtZTogbmNvbmYuZ2V0KFwiYXV0aF91c2VybmFtZVwiKSxcbiAgICBwYXNzd29yZDogbmNvbmYuZ2V0KFwiYXV0aF9wYXNzd29yZFwiKVxufVxuXG5jb25zdCBib29rTG9va3VwID0gbmV3IEJvb2tMb29rdXAoc2VjcmV0cy5pc2JuRGJBcGlLZXkpO1xuY29uc3QgZG9jdW1lbnRkYkNsaWVudCA9IG5ldyBkb2N1bWVudGRiLkRvY3VtZW50Q2xpZW50KHNlY3JldHMuZG9jdW1lbnRkYl9lbmRwb2ludCwgeyBtYXN0ZXJLZXk6IHNlY3JldHMuZG9jdW1lbnRkYl9wcmltYXJ5S2V5IH0pO1xuY29uc3QgZGF0YWJhc2VVcmwgPSBgZGJzLyR7c2VjcmV0cy5kb2N1bWVudGRiX2RhdGFiYXNlfWA7XG5jb25zdCBjb2xsZWN0aW9uVXJsID0gYCR7ZGF0YWJhc2VVcmx9L2NvbGxzLyR7c2VjcmV0cy5kb2N1bWVudGRiX2NvbGxlY3Rpb259YDtcblxuY29uc3QgYXV0aCA9IChyZXEsIHJlcywgbmV4dCkgPT4ge1xuICAgIGZ1bmN0aW9uIHVuYXV0aG9yaXplZChyZXMpIHtcbiAgICAgICAgcmVzLnNldChcIldXVy1BdXRoZW50aWNhdGVcIiwgXCJCYXNpYyByZWFsbT1BdXRob3JpemF0aW9uIFJlcXVpcmVkXCIpO1xuICAgICAgICByZXR1cm4gcmVzLnNlbmQoNDAxKTtcbiAgICB9XG5cbiAgICBjb25zdCB1c2VyID0gYmFzaWNBdXRoKHJlcSk7XG5cbiAgICBpZiAoIXVzZXIgfHwgIXVzZXIubmFtZSB8fCAhdXNlci5wYXNzKSB7XG4gICAgICAgIHJldHVybiB1bmF1dGhvcml6ZWQocmVzKTtcbiAgICB9XG5cbiAgICBpZiAodXNlci5uYW1lID09PSBzZWNyZXRzLnVzZXJuYW1lICYmIHVzZXIucGFzcyA9PT0gc2VjcmV0cy5wYXNzd29yZCkge1xuICAgICAgICByZXR1cm4gbmV4dCgpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiB1bmF1dGhvcml6ZWQocmVzKTtcbiAgICB9XG59O1xuXG5mdW5jdGlvbiBhZGRCb29rKGJvb2spIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICBkb2N1bWVudGRiQ2xpZW50LmNyZWF0ZURvY3VtZW50KGNvbGxlY3Rpb25VcmwsIGJvb2ssIChlcnJvciwgYm9vaykgPT4ge1xuICAgICAgICAgICAgaWYgKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgcmVqZWN0KGVycm9yKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlc29sdmUoYm9vayk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0pO1xufVxuXG5mdW5jdGlvbiBnZXRCb29rcygpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICBkb2N1bWVudGRiQ2xpZW50LnF1ZXJ5RG9jdW1lbnRzKGNvbGxlY3Rpb25VcmwpLnRvQXJyYXkoKGVycm9yLCBib29rcykgPT4ge1xuICAgICAgICAgICAgaWYgKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgcmVqZWN0KGVycm9yKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlc29sdmUoYm9va3MpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9KTtcbn1cblxuZnVuY3Rpb24gZ2V0Qm9va0J5SWQoaWQpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICBkb2N1bWVudGRiQ2xpZW50LnF1ZXJ5RG9jdW1lbnRzKGNvbGxlY3Rpb25VcmwsIGBTRUxFQ1QgVkFMVUUgciBGUk9NIHJvb3QgciBXSEVSRSByLmlkID0gXCIke2lkfVwiYFxuICAgICAgICApLnRvQXJyYXkoKGVycm9yLCBib29rcykgPT4ge1xuICAgICAgICAgICAgaWYgKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgcmVqZWN0KGVycm9yKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGJvb2tzLmxlbmd0aCA9PSAxKSB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZShib29rc1swXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICByZWplY3QoXCJObyBkb2N1bWVudCBmb3VuZC5cIik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0pO1xufVxuXG5cblxuZnVuY3Rpb24gYWRkQm9va0J5SXNibihpc2JuKSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgYm9va0xvb2t1cC5leGVjdXRlKGlzYm4pXG4gICAgICAgICAgICAudGhlbihib29rID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoYm9vaykge1xuICAgICAgICAgICAgICAgICAgICBib29rLmlkID0gdXVpZC52NCgpO1xuICAgICAgICAgICAgICAgICAgICBib29rLmJvcnJvd2VkRnJvbSA9IFwiXCI7XG4gICAgICAgICAgICAgICAgICAgIGJvb2suYm9ycm93ZWRPbiA9IFwiXCI7XG4gICAgICAgICAgICAgICAgICAgIGFkZEJvb2soYm9vayk7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoYm9vayk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZWplY3QoXCJObyBib29rIGZvdW5kXCIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pLmNhdGNoKHJlamVjdCk7XG4gICAgfSk7XG59XG5cbmZ1bmN0aW9uIGJvcnJvd0Jvb2soYm9va0lkLCBuYW1lKSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgY29uc3QgZG9jdW1lbnRVcmwgPSBgJHtjb2xsZWN0aW9uVXJsfS9kb2NzLyR7Ym9va0lkfWA7XG5cbiAgICAgICAgZ2V0Qm9va0J5SWQoYm9va0lkKS50aGVuKGJvb2sgPT4ge1xuICAgICAgICAgICAgYm9vay5ib3Jyb3dlZEZyb20gPSBuYW1lO1xuICAgICAgICAgICAgY29uc3QgZGF0ZSA9IG5ldyBEYXRlKCk7XG4gICAgICAgICAgICBib29rLmJvcnJvd2VkT24gPSBgJHtkYXRlLmdldERhdGUoKX0uJHtkYXRlLmdldE1vbnRoKCkgKyAxfS4ke2RhdGUuZ2V0RnVsbFllYXIoKX1gO1xuICAgICAgICAgICAgZG9jdW1lbnRkYkNsaWVudC5yZXBsYWNlRG9jdW1lbnQoZG9jdW1lbnRVcmwsIGJvb2ssIChlcnJvciwgcmVzdWx0KSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnJvcik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHJlc3VsdCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pLmNhdGNoKGVycm9yID0+IHtcbiAgICAgICAgICAgIHJlamVjdChlcnJvcik7XG5cbiAgICAgICAgfSk7XG4gICAgfSk7XG59XG5cbmZ1bmN0aW9uIHJldHVybkJvb2soYm9va0lkKSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgY29uc3QgZG9jdW1lbnRVcmwgPSBgJHtjb2xsZWN0aW9uVXJsfS9kb2NzLyR7Ym9va0lkfWA7XG5cbiAgICAgICAgZ2V0Qm9va0J5SWQoYm9va0lkKS50aGVuKGJvb2sgPT4ge1xuICAgICAgICAgICAgYm9vay5ib3Jyb3dlZEZyb20gPSBcIlwiO1xuICAgICAgICAgICAgYm9vay5ib3Jyb3dlZE9uID0gXCJcIjtcbiAgICAgICAgICAgIGRvY3VtZW50ZGJDbGllbnQucmVwbGFjZURvY3VtZW50KGRvY3VtZW50VXJsLCBib29rLCAoZXJyb3IsIHJlc3VsdCkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChlcnJvcikge1xuICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyb3IpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShyZXN1bHQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KS5jYXRjaChlcnJvciA9PiB7XG4gICAgICAgICAgICByZWplY3QoZXJyb3IpO1xuXG4gICAgICAgIH0pO1xuICAgIH0pO1xufVxuXG5hcHAudXNlKGJvZHlQYXJzZXIuanNvbigpKTtcbmFwcC51c2UoYm9keVBhcnNlci51cmxlbmNvZGVkKHsgZXh0ZW5kZWQ6IHRydWUgfSkpO1xuXG5hcHAudXNlKFwiL1wiLCBhdXRoLCBleHByZXNzLnN0YXRpYyhwYXRoLnJlc29sdmUoX19kaXJuYW1lICsgXCIvLi4vcHVibGljXCIpKSk7XG5cbmFwcC5nZXQoXCIvYm9va3NcIiwgKHJlcSwgcmVzKSA9PiB7XG4gICAgZ2V0Qm9va3MoKS50aGVuKGJvb2tzID0+IHJlcy5qc29uKGJvb2tzKSk7XG59KTtcblxuc29ja2V0SW9TZXJ2ZXIub24oXCJjb25uZWN0aW9uXCIsIChzb2NrZXQpID0+IHtcbiAgICBjb25zdCBjbGllbnRJcCA9IHNvY2tldC5yZXF1ZXN0LmNvbm5lY3Rpb24ucmVtb3RlQWRkcmVzcztcbiAgICBjb25zb2xlLmxvZyhcIkNsaWVudCBjb25uZWN0ZWQ6XFx0XCIgKyBjbGllbnRJcCk7XG5cbiAgICBzb2NrZXQub24oXCJhZGRCb29rXCIsIChpc2JuLCBjYWxsYmFjaykgPT4ge1xuICAgICAgICBhZGRCb29rQnlJc2JuKGlzYm4pXG4gICAgICAgICAgICAudGhlbihib29rID0+IHtcbiAgICAgICAgICAgICAgICBzb2NrZXRJb1NlcnZlci5zb2NrZXRzLmVtaXQoXCJib29rQWRkZWRcIiwgYm9vayk7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgICAgICAgIH0pLmNhdGNoKGVycm9yID0+IGNhbGxiYWNrKGVycm9yKSk7XG4gICAgfSk7XG5cbiAgICBzb2NrZXQub24oXCJib3Jyb3dCb29rXCIsIChpZCwgbmFtZSkgPT4ge1xuICAgICAgICBib3Jyb3dCb29rKGlkLCBuYW1lKVxuICAgICAgICAgICAgLnRoZW4oYm9vayA9PiB7XG4gICAgICAgICAgICAgICAgc29ja2V0SW9TZXJ2ZXIuc29ja2V0cy5lbWl0KFwiYm9va0JvcnJvd2VkXCIsIGJvb2spO1xuICAgICAgICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICBzb2NrZXQub24oXCJyZXR1cm5Cb29rXCIsIChpZCwgbmFtZSkgPT4ge1xuICAgICAgICByZXR1cm5Cb29rKGlkLCBuYW1lKVxuICAgICAgICAgICAgLnRoZW4oYm9vayA9PiB7XG4gICAgICAgICAgICAgICAgc29ja2V0SW9TZXJ2ZXIuc29ja2V0cy5lbWl0KFwiYm9va1JldHVybmVkXCIsIGJvb2spO1xuICAgICAgICAgICAgfSk7XG4gICAgfSk7XG59KTtcblxuaHR0cFNlcnZlci5saXN0ZW4ocG9ydCwgKCkgPT4ge1xuICAgIGNvbnNvbGUubG9nKGBsaXN0ZW5pbmcgb24gKjoke3BvcnR9YCk7XG59KTtcbiJdfQ==
