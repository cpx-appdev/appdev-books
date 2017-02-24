import React from "react";
import Book from "./Book";
import socketService from "../services/SocketService";

class BookList extends React.Component {
    constructor() {
        super();
        this.initSocket();
    }

    initSocket() {
        socketService.on("bookAdded", (book) => {
            this.setState({ [book.id]: book });
        });

        socketService.on("bookBorrowed", (book) => {
            this.setState({ [book.id]: book });
        });

        socketService.on("bookReturned", (book) => {
            this.setState({ [book.id]: book });
        });
    }

    componentDidMount() {
        socketService.emit("getBooks", (books) => {
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

        return <div className="show-loading flex" style={{ padding: "0 12px" }}>
            {books.map(book => <Book key={book.id} book={book} />
            )}
        </div>;
    }
}

export default BookList;
