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

    returnBook(bookId) {
        this.setState((previousState) => ({ [bookId]: { ...previousState[bookId], borrowedFrom: "" } }));
    }

    borrow(bookId, name) {
        this.setState((previousState) => ({ [bookId]: { ...previousState[bookId], borrowedFrom: name } }));
    }

    render() {
        const books = [];
        for (let key in this.state) {
            if (this.state.hasOwnProperty(key)) {
                books.push(this.state[key]);

            }
        }

        return <table>
            <tr>
                <th>Titel</th>
                <th>Verliehen an</th>
                <th></th>
            </tr>
            {books.map(book =>
                <tr key={book.id}>
                    <td>{book.title}</td>
                    <td>{book.borrowedFrom ? book.borrowedFrom : "-"}</td>
                    <td>{book.borrowedFrom ? <button onClick={this.returnBook.bind(this, book.id)}>Return</button> : <Borrow borrowedFrom={book.borrowedFrom} borrow={this.borrow.bind(this, book.id)} />}</td>
                </tr>
            )
            }</table>;
    }
}

export default BookList;
