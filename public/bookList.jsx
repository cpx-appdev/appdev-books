import React from "react";

class BookList extends React.Component {
    constructor() {
        super();
        this.state = { items: [] };
    }

    render() {
        return <ul>
            {this.state.items.map(item => <li key={item.id}>{item.title}</li>)}
        </ul>;
    }

    componentDidMount() {
        fetch("/books")
            .then(result => result.json())
            .then(items => this.setState({ items }));
    }
}

export default BookList;
