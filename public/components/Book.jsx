import React from "react";
import io from "socket.io-client";

class Book extends React.Component {
    constructor(props) {
        super(props);

        this.returnBook = this.returnBook.bind(this);
        this.borrow = this.borrow.bind(this);
        this.socket = io();
        this.name = localStorage.username;
    }

    returnBook(bookId) {
        this.socket.emit("returnBook", bookId);
    }

    borrow(bookId) {
        this.socket.emit("borrowBook", bookId, this.name);
    }

    render() {

        let borrowInfo = "";
        let action = null;

        if (this.props.book.borrowedFrom) {
            if (this.props.book.borrowedFrom == this.name) {
                action = <button className="btn-primary" onClick={this.returnBook.bind(this, this.props.book.id)}>Zurückgeben</button>;
                borrowInfo = <p className="borrowInfo">Ausgeliehen am {this.props.book.borrowedOn}</p>;
            }
            else {
                borrowInfo = <p className="borrowInfo long">Ausgeliehen von {this.props.book.borrowedFrom} am {this.props.book.borrowedOn}</p>;
            }
        }
        else {
            action = <button className="btn-secondary" onClick={this.borrow.bind(this, this.props.book.id)}>Ausleihen</button>;
        }

        return <section className="book">
            <header>{this.props.book.title.length > 50 ? `${this.props.book.title.substring(0, 50 - 3)}...` : this.props.book.title}</header>
            <p className="author">{this.props.book.author}</p>
            {borrowInfo}
            <div>{action}</div>
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
