import React from "react";

class Book extends React.Component {
    constructor(props) {
        super(props);

        this.state = { book: props.book };
        this.returnBook = this.returnBook.bind(this);
        this.borrow = this.borrow.bind(this);
    }

    returnBook(bookId) {
        this.setState((previousState) => ({ book: { ...previousState[bookId], borrowedFrom: "" } }));
    }

    borrow(bookId) {
        const name = localStorage.username;
        this.setState((previousState) => ({ book: { ...previousState[bookId], borrowedFrom: name } }));
        console.dir(this.state);
    }

    render() {
        return <section className="book">
            <header>{this.props.book.title.length > 50 ? `${this.props.book.title.substring(0, 50 - 3)}...` : this.props.book.title}</header>
            <p className="author">{this.props.book.author}</p>
            <div>{this.state.book.borrowedFrom ?
                <button onClick={this.returnBook.bind(this, this.props.book.id)}>Return (borrow by {this.state.book.borrowedFrom})</button>
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
        genre: React.PropTypes.string,
        publisher: React.PropTypes.string,
        borrowedFrom: React.PropTypes.string,
        borrowedOn: React.PropTypes.instanceOf(Date)
    })
};

export default Book;
