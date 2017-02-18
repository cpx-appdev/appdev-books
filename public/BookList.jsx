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

        return <table>
            <thead>
                <tr>
                    <th>Titel</th>
                    <th>Autor</th>
                    <th>Verliehen an</th>
                    <th />
                </tr>
            </thead>
            <tbody>
                {books.map(book =>
                    <Book key={book.id} book={book} />                    
                )}
            </tbody>
        </table>;
    }
}

export default BookList;
