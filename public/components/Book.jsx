import React from "react";
import Borrow from "./Borrow";

class Book extends React.Component {
    constructor() {
        super();
    }

    returnBook(bookId) {
        this.setState((previousState) => ({ [bookId]: { ...previousState[bookId], borrowedFrom: "" } }));
    }

    borrow(bookId, name) {
        this.setState((previousState) => ({ [bookId]: { ...previousState[bookId], borrowedFrom: name } }));
    }

    render() {
        return <section className="book">
            <header>{this.props.book.title.length > 50 ? `${this.props.book.title.substring(0, 50-3)}...` : this.props.book.title}</header>
            <p>{this.props.book.author}</p>
            <p>{this.props.book.borrowedFrom ? this.props.book.borrowedFrom : "-"}</p>
            <div>{this.props.book.borrowedFrom ? <button onClick={this.returnBook.bind(this, this.props.book.id)}>Return</button> : <Borrow borrowedFrom={this.props.book.borrowedFrom} borrow={this.borrow.bind(this, this.props.book.id)} />}</div>
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
        genre: React.PropTypes.string,
        publisher: React.PropTypes.string,
        borrowedFrom: React.PropTypes.string,
        borrowedOn: React.PropTypes.instanceOf(Date)
    })
};

export default Book;
