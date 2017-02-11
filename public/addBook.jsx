import React from "react";

class AddBook extends React.Component {
    constructor(props) {
        super(props);

        this.addBook = this.addBook.bind(this);
    }

    addBook() {
        const isbn = this.inputIsbn.value;
        const title = this.inputTitle.value;
        fetch("/addBook", {
            method: "POST",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ isbn, title })
        })
    }

    render() {
        return <div>
            <input type="text" ref={(input) => this.inputIsbn = input} />
            <input type="text" ref={(input) => this.inputTitle = input} />
            <button onClick={this.addBook}>Add Book</button>
        </div>;
    }
}

export default AddBook;
