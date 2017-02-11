import React from "react";
import BookList from "./bookList";

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

    return <BookList />;
  }

  componentDidMount() {
    setTimeout(() => this.setState({ loading: false }), 1500);
  }
}

export default Start;
