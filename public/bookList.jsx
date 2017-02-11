import React from "react";

class BookList extends React.Component {
    constructor() {
        super();
        this.state = { books: [] };
    }

    componentDidMount() {
        fetch("/books")
            .then(result => result.json())
            .then(books => this.setState({ books }));
    }

    borrow(bookId) {
        // const books = this.state.books;
        // alert(books.find((book) => book.id == bookId).borrowedFrom
        // this.setState({ books });
    }

    updateInputValue(bookId, evt) {
        const books = this.state.books;
        const book = books.find((book) => book.id == bookId);
        book.borrowedFrom = evt.target.value;
        this.setState({ books });
    }

    render() {
        return <ul>
            {this.state.books.map(book => <li key={book.id}>{book.title}: {book.borrowedFrom}
                <input type="text" value={book.borrowedFrom} onChange={this.updateInputValue.bind(this, book.id)} />
                <button onClick={this.borrow.bind(this, book.id)}>Borrow</button>
            </li>)}
        </ul>;
    }
}

export default BookList;
