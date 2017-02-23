"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.BookLookup = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _request = require("request");

var _request2 = _interopRequireDefault(_request);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var BookLookup = exports.BookLookup = function () {
    function BookLookup(isbnDbApiKey) {
        _classCallCheck(this, BookLookup);

        this.isbnDbApiKey = isbnDbApiKey;
    }

    _createClass(BookLookup, [{
        key: "execute",
        value: function execute(isbn) {
            var _this = this;

            return new Promise(function (resolve, reject) {
                _this.googleApi({ isbn: isbn }).then(function (bookInfo) {
                    return _this.openLibrary(bookInfo);
                }).then(function (bookInfo) {
                    return _this.isbnDb(bookInfo);
                }).then(function (bookInfo) {
                    resolve(bookInfo.book);
                }).catch(reject);
            });
        }
    }, {
        key: "googleApi",
        value: function googleApi(bookInfo) {
            if (bookInfo.book) return bookInfo;

            var isbn = bookInfo.isbn;
            return new Promise(function (resolve, reject) {
                (0, _request2.default)("https://www.googleapis.com/books/v1/volumes?q=isbn:" + isbn, function (error, response, body) {
                    if (!error && response.statusCode == 200) {
                        var bookDetails = JSON.parse(body);

                        if (bookDetails && bookDetails.totalItems > 0 && bookDetails.items[0].volumeInfo) {
                            resolve({
                                isbn: isbn,
                                book: {
                                    author: bookDetails.items[0].volumeInfo.authors ? bookDetails.items[0].volumeInfo.authors.join(", ") : "",
                                    title: bookDetails.items[0].volumeInfo.title,
                                    publishedDate: bookDetails.items[0].volumeInfo.publishedDate,
                                    pageCount: bookDetails.items[0].volumeInfo.pageCount,
                                    isbn: isbn,
                                    publisher: bookDetails.items[0].volumeInfo.publisher
                                }
                            });
                        } else {
                            resolve({ isbn: isbn });
                        }
                    } else {
                        reject(error);
                    }
                });
            });
        }
    }, {
        key: "openLibrary",
        value: function openLibrary(bookInfo) {
            if (bookInfo.book) return bookInfo;

            var isbn = bookInfo.isbn;
            return new Promise(function (resolve, reject) {
                (0, _request2.default)("https://openlibrary.org/api/books?bibkeys=ISBN:" + isbn + "&jscmd=data&format=json", function (error, response, body) {
                    if (!error && response.statusCode == 200) {
                        var bookDetails = JSON.parse(body);
                        bookDetails = bookDetails["ISBN:" + isbn];

                        if (bookDetails) {
                            resolve({
                                isbn: isbn,
                                book: {
                                    author: bookDetails.authors && bookDetails.authors.length > 0 ? bookDetails.authors[0].name : "",
                                    title: bookDetails.title,
                                    publishedDate: bookDetails.publish_date,
                                    pageCount: bookDetails.number_of_pages,
                                    isbn: isbn,
                                    publisher: bookDetails.publishers && bookDetails.publishers.length > 0 ? bookDetails.publishers[0].name : ""
                                }
                            });
                        } else {
                            resolve({ isbn: isbn });
                        }
                    } else {
                        reject(error);
                    }
                });
            });
        }
    }, {
        key: "isbnDb",
        value: function isbnDb(bookInfo) {
            var _this2 = this;

            if (bookInfo.book) return bookInfo;

            var isbn = bookInfo.isbn;
            return new Promise(function (resolve, reject) {
                (0, _request2.default)("http://isbndb.com/api/v2/json/" + _this2.isbnDbApiKey + "/book/" + isbn, function (error, response, body) {
                    if (!error && response.statusCode == 200) {
                        var bookDetails = JSON.parse(body);

                        if (bookDetails && bookDetails.data && bookDetails.data.length > 0) {
                            resolve({
                                isbn: isbn,
                                book: {
                                    author: bookDetails.data[0].author_data && bookDetails.data[0].author_data.length > 0 ? bookDetails.data[0].author_data[0].name : "",
                                    title: bookDetails.data[0].title,
                                    publishedDate: "",
                                    pageCount: 0,
                                    isbn: isbn,
                                    publisher: bookDetails.data[0].publisher_name
                                }
                            });
                        } else {
                            resolve({ isbn: isbn });
                        }
                    } else {
                        reject(error);
                    }
                });
            });
        }
    }]);

    return BookLookup;
}();
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImJvb2tMb29rdXAuanMiXSwibmFtZXMiOlsiQm9va0xvb2t1cCIsImlzYm5EYkFwaUtleSIsImlzYm4iLCJQcm9taXNlIiwicmVzb2x2ZSIsInJlamVjdCIsImdvb2dsZUFwaSIsInRoZW4iLCJvcGVuTGlicmFyeSIsImJvb2tJbmZvIiwiaXNibkRiIiwiYm9vayIsImNhdGNoIiwiZXJyb3IiLCJyZXNwb25zZSIsImJvZHkiLCJzdGF0dXNDb2RlIiwiYm9va0RldGFpbHMiLCJKU09OIiwicGFyc2UiLCJ0b3RhbEl0ZW1zIiwiaXRlbXMiLCJ2b2x1bWVJbmZvIiwiYXV0aG9yIiwiYXV0aG9ycyIsImpvaW4iLCJ0aXRsZSIsInB1Ymxpc2hlZERhdGUiLCJwYWdlQ291bnQiLCJwdWJsaXNoZXIiLCJsZW5ndGgiLCJuYW1lIiwicHVibGlzaF9kYXRlIiwibnVtYmVyX29mX3BhZ2VzIiwicHVibGlzaGVycyIsImRhdGEiLCJhdXRob3JfZGF0YSIsInB1Ymxpc2hlcl9uYW1lIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFBQTs7Ozs7Ozs7SUFFYUEsVSxXQUFBQSxVO0FBRVQsd0JBQVlDLFlBQVosRUFDQTtBQUFBOztBQUNJLGFBQUtBLFlBQUwsR0FBb0JBLFlBQXBCO0FBQ0g7Ozs7Z0NBRU9DLEksRUFBTTtBQUFBOztBQUNWLG1CQUFPLElBQUlDLE9BQUosQ0FBWSxVQUFDQyxPQUFELEVBQVVDLE1BQVYsRUFBcUI7QUFDcEMsc0JBQUtDLFNBQUwsQ0FBZSxFQUFFSixVQUFGLEVBQWYsRUFDS0ssSUFETCxDQUNVO0FBQUEsMkJBQVksTUFBS0MsV0FBTCxDQUFpQkMsUUFBakIsQ0FBWjtBQUFBLGlCQURWLEVBRUtGLElBRkwsQ0FFVTtBQUFBLDJCQUFZLE1BQUtHLE1BQUwsQ0FBWUQsUUFBWixDQUFaO0FBQUEsaUJBRlYsRUFHS0YsSUFITCxDQUdVLG9CQUFZO0FBQ2RILDRCQUFRSyxTQUFTRSxJQUFqQjtBQUNILGlCQUxMLEVBS09DLEtBTFAsQ0FLYVAsTUFMYjtBQU1ILGFBUE0sQ0FBUDtBQVFIOzs7a0NBQ1NJLFEsRUFBVTtBQUNoQixnQkFBSUEsU0FBU0UsSUFBYixFQUNJLE9BQU9GLFFBQVA7O0FBRUosZ0JBQU1QLE9BQU9PLFNBQVNQLElBQXRCO0FBQ0EsbUJBQU8sSUFBSUMsT0FBSixDQUFZLFVBQUNDLE9BQUQsRUFBVUMsTUFBVixFQUFxQjtBQUNwQywrRkFBOERILElBQTlELEVBQ0ksVUFBQ1csS0FBRCxFQUFRQyxRQUFSLEVBQWtCQyxJQUFsQixFQUEyQjtBQUN2Qix3QkFBSSxDQUFDRixLQUFELElBQVVDLFNBQVNFLFVBQVQsSUFBdUIsR0FBckMsRUFBMEM7QUFDdEMsNEJBQU1DLGNBQWNDLEtBQUtDLEtBQUwsQ0FBV0osSUFBWCxDQUFwQjs7QUFFQSw0QkFBSUUsZUFBZUEsWUFBWUcsVUFBWixHQUF5QixDQUF4QyxJQUE2Q0gsWUFBWUksS0FBWixDQUFrQixDQUFsQixFQUFxQkMsVUFBdEUsRUFBa0Y7QUFDOUVsQixvQ0FBUTtBQUNKRixzQ0FBTUEsSUFERjtBQUVKUyxzQ0FBTTtBQUNGWSw0Q0FBUU4sWUFBWUksS0FBWixDQUFrQixDQUFsQixFQUFxQkMsVUFBckIsQ0FBZ0NFLE9BQWhDLEdBQTBDUCxZQUFZSSxLQUFaLENBQWtCLENBQWxCLEVBQXFCQyxVQUFyQixDQUFnQ0UsT0FBaEMsQ0FBd0NDLElBQXhDLENBQTZDLElBQTdDLENBQTFDLEdBQStGLEVBRHJHO0FBRUZDLDJDQUFPVCxZQUFZSSxLQUFaLENBQWtCLENBQWxCLEVBQXFCQyxVQUFyQixDQUFnQ0ksS0FGckM7QUFHRkMsbURBQWVWLFlBQVlJLEtBQVosQ0FBa0IsQ0FBbEIsRUFBcUJDLFVBQXJCLENBQWdDSyxhQUg3QztBQUlGQywrQ0FBV1gsWUFBWUksS0FBWixDQUFrQixDQUFsQixFQUFxQkMsVUFBckIsQ0FBZ0NNLFNBSnpDO0FBS0YxQiwwQ0FBTUEsSUFMSjtBQU1GMkIsK0NBQVdaLFlBQVlJLEtBQVosQ0FBa0IsQ0FBbEIsRUFBcUJDLFVBQXJCLENBQWdDTztBQU56QztBQUZGLDZCQUFSO0FBV0gseUJBWkQsTUFhSztBQUNEekIsb0NBQVEsRUFBRUYsVUFBRixFQUFSO0FBQ0g7QUFDSixxQkFuQkQsTUFvQks7QUFDREcsK0JBQU9RLEtBQVA7QUFDSDtBQUNKLGlCQXpCTDtBQTBCSCxhQTNCTSxDQUFQO0FBNEJIOzs7b0NBRVdKLFEsRUFBVTtBQUNsQixnQkFBSUEsU0FBU0UsSUFBYixFQUNJLE9BQU9GLFFBQVA7O0FBRUosZ0JBQU1QLE9BQU9PLFNBQVNQLElBQXRCO0FBQ0EsbUJBQU8sSUFBSUMsT0FBSixDQUFZLFVBQUNDLE9BQUQsRUFBVUMsTUFBVixFQUFxQjtBQUNwQywyRkFBMERILElBQTFELDhCQUNJLFVBQUNXLEtBQUQsRUFBUUMsUUFBUixFQUFrQkMsSUFBbEIsRUFBMkI7QUFDdkIsd0JBQUksQ0FBQ0YsS0FBRCxJQUFVQyxTQUFTRSxVQUFULElBQXVCLEdBQXJDLEVBQTBDO0FBQ3RDLDRCQUFJQyxjQUFjQyxLQUFLQyxLQUFMLENBQVdKLElBQVgsQ0FBbEI7QUFDQUUsc0NBQWNBLHNCQUFvQmYsSUFBcEIsQ0FBZDs7QUFFQSw0QkFBSWUsV0FBSixFQUFpQjtBQUNiYixvQ0FBUTtBQUNKRixzQ0FBTUEsSUFERjtBQUVKUyxzQ0FBTTtBQUNGWSw0Q0FBUU4sWUFBWU8sT0FBWixJQUF1QlAsWUFBWU8sT0FBWixDQUFvQk0sTUFBcEIsR0FBNkIsQ0FBcEQsR0FBd0RiLFlBQVlPLE9BQVosQ0FBb0IsQ0FBcEIsRUFBdUJPLElBQS9FLEdBQXNGLEVBRDVGO0FBRUZMLDJDQUFPVCxZQUFZUyxLQUZqQjtBQUdGQyxtREFBZVYsWUFBWWUsWUFIekI7QUFJRkosK0NBQVdYLFlBQVlnQixlQUpyQjtBQUtGL0IsMENBQU1BLElBTEo7QUFNRjJCLCtDQUFXWixZQUFZaUIsVUFBWixJQUEwQmpCLFlBQVlpQixVQUFaLENBQXVCSixNQUF2QixHQUFnQyxDQUExRCxHQUE4RGIsWUFBWWlCLFVBQVosQ0FBdUIsQ0FBdkIsRUFBMEJILElBQXhGLEdBQStGO0FBTnhHO0FBRkYsNkJBQVI7QUFXSCx5QkFaRCxNQWFLO0FBQ0QzQixvQ0FBUSxFQUFFRixVQUFGLEVBQVI7QUFDSDtBQUNKLHFCQXBCRCxNQXFCSztBQUNERywrQkFBT1EsS0FBUDtBQUNIO0FBQ0osaUJBMUJMO0FBMkJILGFBNUJNLENBQVA7QUE2Qkg7OzsrQkFFTUosUSxFQUFVO0FBQUE7O0FBQ2IsZ0JBQUlBLFNBQVNFLElBQWIsRUFDSSxPQUFPRixRQUFQOztBQUVKLGdCQUFNUCxPQUFPTyxTQUFTUCxJQUF0QjtBQUNBLG1CQUFPLElBQUlDLE9BQUosQ0FBWSxVQUFDQyxPQUFELEVBQVVDLE1BQVYsRUFBcUI7QUFDcEMsMEVBQXlDLE9BQUtKLFlBQTlDLGNBQW1FQyxJQUFuRSxFQUNJLFVBQUNXLEtBQUQsRUFBUUMsUUFBUixFQUFrQkMsSUFBbEIsRUFBMkI7QUFDdkIsd0JBQUksQ0FBQ0YsS0FBRCxJQUFVQyxTQUFTRSxVQUFULElBQXVCLEdBQXJDLEVBQTBDO0FBQ3RDLDRCQUFNQyxjQUFjQyxLQUFLQyxLQUFMLENBQVdKLElBQVgsQ0FBcEI7O0FBRUEsNEJBQUlFLGVBQWVBLFlBQVlrQixJQUEzQixJQUFtQ2xCLFlBQVlrQixJQUFaLENBQWlCTCxNQUFqQixHQUEwQixDQUFqRSxFQUFvRTtBQUNoRTFCLG9DQUFRO0FBQ0pGLHNDQUFNQSxJQURGO0FBRUpTLHNDQUFNO0FBQ0ZZLDRDQUFRTixZQUFZa0IsSUFBWixDQUFpQixDQUFqQixFQUFvQkMsV0FBcEIsSUFBbUNuQixZQUFZa0IsSUFBWixDQUFpQixDQUFqQixFQUFvQkMsV0FBcEIsQ0FBZ0NOLE1BQWhDLEdBQXlDLENBQTVFLEdBQWdGYixZQUFZa0IsSUFBWixDQUFpQixDQUFqQixFQUFvQkMsV0FBcEIsQ0FBZ0MsQ0FBaEMsRUFBbUNMLElBQW5ILEdBQTBILEVBRGhJO0FBRUZMLDJDQUFPVCxZQUFZa0IsSUFBWixDQUFpQixDQUFqQixFQUFvQlQsS0FGekI7QUFHRkMsbURBQWUsRUFIYjtBQUlGQywrQ0FBVyxDQUpUO0FBS0YxQiwwQ0FBTUEsSUFMSjtBQU1GMkIsK0NBQVdaLFlBQVlrQixJQUFaLENBQWlCLENBQWpCLEVBQW9CRTtBQU43QjtBQUZGLDZCQUFSO0FBV0gseUJBWkQsTUFhSztBQUNEakMsb0NBQVEsRUFBRUYsVUFBRixFQUFSO0FBQ0g7QUFDSixxQkFuQkQsTUFvQks7QUFDREcsK0JBQU9RLEtBQVA7QUFDSDtBQUNKLGlCQXpCTDtBQTBCSCxhQTNCTSxDQUFQO0FBNEJIIiwiZmlsZSI6ImJvb2tMb29rdXAuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgcmVxdWVzdCBmcm9tIFwicmVxdWVzdFwiO1xuXG5leHBvcnQgY2xhc3MgQm9va0xvb2t1cCB7XG5cbiAgICBjb25zdHJ1Y3Rvcihpc2JuRGJBcGlLZXkpXG4gICAge1xuICAgICAgICB0aGlzLmlzYm5EYkFwaUtleSA9IGlzYm5EYkFwaUtleTtcbiAgICB9XG5cbiAgICBleGVjdXRlKGlzYm4pIHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgIHRoaXMuZ29vZ2xlQXBpKHsgaXNibiB9KVxuICAgICAgICAgICAgICAgIC50aGVuKGJvb2tJbmZvID0+IHRoaXMub3BlbkxpYnJhcnkoYm9va0luZm8pKVxuICAgICAgICAgICAgICAgIC50aGVuKGJvb2tJbmZvID0+IHRoaXMuaXNibkRiKGJvb2tJbmZvKSlcbiAgICAgICAgICAgICAgICAudGhlbihib29rSW5mbyA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoYm9va0luZm8uYm9vayk7XG4gICAgICAgICAgICAgICAgfSkuY2F0Y2gocmVqZWN0KTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIGdvb2dsZUFwaShib29rSW5mbykge1xuICAgICAgICBpZiAoYm9va0luZm8uYm9vaylcbiAgICAgICAgICAgIHJldHVybiBib29rSW5mbztcblxuICAgICAgICBjb25zdCBpc2JuID0gYm9va0luZm8uaXNibjtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgIHJlcXVlc3QoYGh0dHBzOi8vd3d3Lmdvb2dsZWFwaXMuY29tL2Jvb2tzL3YxL3ZvbHVtZXM/cT1pc2JuOiR7aXNibn1gLFxuICAgICAgICAgICAgICAgIChlcnJvciwgcmVzcG9uc2UsIGJvZHkpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFlcnJvciAmJiByZXNwb25zZS5zdGF0dXNDb2RlID09IDIwMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgYm9va0RldGFpbHMgPSBKU09OLnBhcnNlKGJvZHkpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYm9va0RldGFpbHMgJiYgYm9va0RldGFpbHMudG90YWxJdGVtcyA+IDAgJiYgYm9va0RldGFpbHMuaXRlbXNbMF0udm9sdW1lSW5mbykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpc2JuOiBpc2JuLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBib29rOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhdXRob3I6IGJvb2tEZXRhaWxzLml0ZW1zWzBdLnZvbHVtZUluZm8uYXV0aG9ycyA/IGJvb2tEZXRhaWxzLml0ZW1zWzBdLnZvbHVtZUluZm8uYXV0aG9ycy5qb2luKFwiLCBcIikgOiBcIlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGl0bGU6IGJvb2tEZXRhaWxzLml0ZW1zWzBdLnZvbHVtZUluZm8udGl0bGUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwdWJsaXNoZWREYXRlOiBib29rRGV0YWlscy5pdGVtc1swXS52b2x1bWVJbmZvLnB1Ymxpc2hlZERhdGUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYWdlQ291bnQ6IGJvb2tEZXRhaWxzLml0ZW1zWzBdLnZvbHVtZUluZm8ucGFnZUNvdW50LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaXNibjogaXNibixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHB1Ymxpc2hlcjogYm9va0RldGFpbHMuaXRlbXNbMF0udm9sdW1lSW5mby5wdWJsaXNoZXJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7IGlzYm4gfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyb3IpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIG9wZW5MaWJyYXJ5KGJvb2tJbmZvKSB7XG4gICAgICAgIGlmIChib29rSW5mby5ib29rKVxuICAgICAgICAgICAgcmV0dXJuIGJvb2tJbmZvO1xuXG4gICAgICAgIGNvbnN0IGlzYm4gPSBib29rSW5mby5pc2JuO1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgcmVxdWVzdChgaHR0cHM6Ly9vcGVubGlicmFyeS5vcmcvYXBpL2Jvb2tzP2JpYmtleXM9SVNCTjoke2lzYm59JmpzY21kPWRhdGEmZm9ybWF0PWpzb25gLFxuICAgICAgICAgICAgICAgIChlcnJvciwgcmVzcG9uc2UsIGJvZHkpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFlcnJvciAmJiByZXNwb25zZS5zdGF0dXNDb2RlID09IDIwMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGJvb2tEZXRhaWxzID0gSlNPTi5wYXJzZShib2R5KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJvb2tEZXRhaWxzID0gYm9va0RldGFpbHNbYElTQk46JHtpc2JufWBdO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYm9va0RldGFpbHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaXNibjogaXNibixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYm9vazoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXV0aG9yOiBib29rRGV0YWlscy5hdXRob3JzICYmIGJvb2tEZXRhaWxzLmF1dGhvcnMubGVuZ3RoID4gMCA/IGJvb2tEZXRhaWxzLmF1dGhvcnNbMF0ubmFtZSA6IFwiXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aXRsZTogYm9va0RldGFpbHMudGl0bGUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwdWJsaXNoZWREYXRlOiBib29rRGV0YWlscy5wdWJsaXNoX2RhdGUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYWdlQ291bnQ6IGJvb2tEZXRhaWxzLm51bWJlcl9vZl9wYWdlcyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlzYm46IGlzYm4sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwdWJsaXNoZXI6IGJvb2tEZXRhaWxzLnB1Ymxpc2hlcnMgJiYgYm9va0RldGFpbHMucHVibGlzaGVycy5sZW5ndGggPiAwID8gYm9va0RldGFpbHMucHVibGlzaGVyc1swXS5uYW1lIDogXCJcIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHsgaXNibiB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnJvcik7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgaXNibkRiKGJvb2tJbmZvKSB7XG4gICAgICAgIGlmIChib29rSW5mby5ib29rKVxuICAgICAgICAgICAgcmV0dXJuIGJvb2tJbmZvO1xuXG4gICAgICAgIGNvbnN0IGlzYm4gPSBib29rSW5mby5pc2JuO1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgcmVxdWVzdChgaHR0cDovL2lzYm5kYi5jb20vYXBpL3YyL2pzb24vJHt0aGlzLmlzYm5EYkFwaUtleX0vYm9vay8ke2lzYm59YCxcbiAgICAgICAgICAgICAgICAoZXJyb3IsIHJlc3BvbnNlLCBib2R5KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghZXJyb3IgJiYgcmVzcG9uc2Uuc3RhdHVzQ29kZSA9PSAyMDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGJvb2tEZXRhaWxzID0gSlNPTi5wYXJzZShib2R5KTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGJvb2tEZXRhaWxzICYmIGJvb2tEZXRhaWxzLmRhdGEgJiYgYm9va0RldGFpbHMuZGF0YS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlzYm46IGlzYm4sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJvb2s6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF1dGhvcjogYm9va0RldGFpbHMuZGF0YVswXS5hdXRob3JfZGF0YSAmJiBib29rRGV0YWlscy5kYXRhWzBdLmF1dGhvcl9kYXRhLmxlbmd0aCA+IDAgPyBib29rRGV0YWlscy5kYXRhWzBdLmF1dGhvcl9kYXRhWzBdLm5hbWUgOiBcIlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGl0bGU6IGJvb2tEZXRhaWxzLmRhdGFbMF0udGl0bGUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwdWJsaXNoZWREYXRlOiBcIlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFnZUNvdW50OiAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaXNibjogaXNibixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHB1Ymxpc2hlcjogYm9va0RldGFpbHMuZGF0YVswXS5wdWJsaXNoZXJfbmFtZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHsgaXNibiB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnJvcik7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxufSJdfQ==
