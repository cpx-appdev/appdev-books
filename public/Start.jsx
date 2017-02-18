import React from "react";
import BookList from "./BookList";
import AddBook from "./AddBook";

class Start extends React.Component {
  constructor() {
    super();
    this.state = { loading: true };
  }

  render() {
    const { loading } = this.state;

    if (loading) {
      return null;
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
