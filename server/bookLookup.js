import request from "request";

export class BookLookup {

    constructor(isbnDbApiKey)
    {
        this.isbnDbApiKey = isbnDbApiKey;
    }

    execute(isbn) {
        return new Promise((resolve, reject) => {
            this.googleApi({ isbn })
                .then(bookInfo => this.openLibrary(bookInfo))
                .then(bookInfo => this.isbnDb(bookInfo))
                .then(bookInfo => {
                    resolve(bookInfo.book);
                }).catch(reject);
        });
    }
    googleApi(bookInfo) {
        if (bookInfo.book)
            return bookInfo;

        const isbn = bookInfo.isbn;
        return new Promise((resolve, reject) => {
            request(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`,
                (error, response, body) => {
                    if (!error && response.statusCode == 200) {
                        const bookDetails = JSON.parse(body);

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
                        }
                        else {
                            resolve({ isbn });
                        }
                    }
                    else {
                        reject(error);
                    }
                });
        });
    }

    openLibrary(bookInfo) {
        if (bookInfo.book)
            return bookInfo;

        const isbn = bookInfo.isbn;
        return new Promise((resolve, reject) => {
            request(`https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&jscmd=data&format=json`,
                (error, response, body) => {
                    if (!error && response.statusCode == 200) {
                        let bookDetails = JSON.parse(body);
                        bookDetails = bookDetails[`ISBN:${isbn}`];

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
                        }
                        else {
                            resolve({ isbn });
                        }
                    }
                    else {
                        reject(error);
                    }
                });
        });
    }

    isbnDb(bookInfo) {
        if (bookInfo.book)
            return bookInfo;

        const isbn = bookInfo.isbn;
        return new Promise((resolve, reject) => {
            request(`http://isbndb.com/api/v2/json/${this.isbnDbApiKey}/book/${isbn}`,
                (error, response, body) => {
                    if (!error && response.statusCode == 200) {
                        const bookDetails = JSON.parse(body);

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
                        }
                        else {
                            resolve({ isbn });
                        }
                    }
                    else {
                        reject(error);
                    }
                });
        });
    }
}