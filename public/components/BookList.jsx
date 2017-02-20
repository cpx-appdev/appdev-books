import React from "react";
import io from "socket.io-client";
import Book from "./Book";

class BookList extends React.Component {
    constructor() {
        super();
        this.socket = io();
        this.initSocket();
    }

    initSocket() {
        this.socket.on("bookAdded", (book) => {
            this.setState({ [book.id]: book });
        });

        this.socket.on("bookBorrowed", (book) => {
            this.setState({ [book.id]: book });
        });

        this.socket.on("bookReturned", (book) => {
            this.setState({ [book.id]: book });
        });
    }

    componentDidMount() {
        fetch("/books")
            .then(result => result.json())
            .then(books => {
                books.map(book => this.setState({ [book.id]: book }))
            });
    }

    render() {
        const books = [];
        for (const key in this.state) {
            if (this.state.hasOwnProperty(key)) {
                books.push(this.state[key]);

            }
        }

        return <div className="show-loading">
            {books.map(book => <Book key={book.id} book={book} />
            )}
        </div>;
    }
}

export default BookList;
