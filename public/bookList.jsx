import React from "react";
import Borrow from "./borrow";

class BookList extends React.Component {
    constructor() {
        super();
    }

    componentDidMount() {
        fetch("/books")
            .then(result => result.json())
            .then(books => {
                books.map(book => this.setState({ [book.id]: book }))
            });
    }

    f(x, y, ...a) {
        return (x + y) * a.length;
    }

    borrow(bookId, name) {
        this.setState({ [bookId]: { ...this.state[bookId], borrowedFrom: name } });
    }

    render() {
        const books = [];
        for (let key in this.state) {
            if (this.state.hasOwnProperty(key)) {
                books.push(this.state[key]);

            }
        }

        return <ul>{
            books.map(book => <li key={book.id}>{book.title}: {book.borrowedFrom}
                <Borrow borrowedFrom={book.borrowedFrom} borrow={this.borrow.bind(this, book.id)} />
            </li>)
        }</ul>;
    }
}

export default BookList;
