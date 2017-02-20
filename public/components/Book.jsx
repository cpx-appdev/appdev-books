import React from "react";
import io from "socket.io-client";

class Book extends React.Component {
    constructor(props) {
        super(props);

        this.returnBook = this.returnBook.bind(this);
        this.borrow = this.borrow.bind(this);
        this.socket = io();
    }

    returnBook(bookId) {
        this.socket.emit("returnBook", bookId);
    }

    borrow(bookId) {
        const name = localStorage.username;
        this.socket.emit("borrowBook", bookId, name);
    }

    render() {
        return <section className="book">
            <header>{this.props.book.title.length > 50 ? `${this.props.book.title.substring(0, 50 - 3)}...` : this.props.book.title}</header>
            <p className="author">{this.props.book.author}</p>
            <p>{this.props.book.borrowedOn}</p>
            <div>{this.props.book.borrowedFrom ?
                <button onClick={this.returnBook.bind(this, this.props.book.id)}>Return (borrow by {this.props.book.borrowedFrom})</button>
                : <button onClick={this.borrow.bind(this, this.props.book.id)}>Borrow</button>}
            </div>
        </section>;
    }
}



Book.propTypes = {
    book: React.PropTypes.shape({
        id: React.PropTypes.string,
        author: React.PropTypes.string,
        title: React.PropTypes.string,
        subtitle: React.PropTypes.string,
        publishedDate: React.PropTypes.string,
        edition: React.PropTypes.string,
        language: React.PropTypes.string,
        info: React.PropTypes.string,
        coverSmallUrl: React.PropTypes.string,
        coverUrl: React.PropTypes.string,
        pageCount: React.PropTypes.number,
        isbn: React.PropTypes.string,
        category: React.PropTypes.string,
        publisher: React.PropTypes.string,
        borrowedFrom: React.PropTypes.string,
        borrowedOn: React.PropTypes.string
    })
};

export default Book;
