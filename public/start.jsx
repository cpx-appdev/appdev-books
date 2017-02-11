import React from "react";
import BookList from "./bookList";
import AddBook from "./addBook";

class Start extends React.Component {
  constructor() {
    super();
    this.state = { loading: true };
  }

  render() {
    const { loading } = this.state;

    if (loading) {
      return null; // render null when app is not ready
    }

    return <div>
      <h1>Books</h1>
      <BookList />
      <AddBook />
    </div>
  }

  componentDidMount() {
    setTimeout(() => this.setState({ loading: false }), 1500);
  }
}

export default Start;
