import React from "react";
import BookList from "./BookList";
import AddBook from "./AddBook";

class Start extends React.Component {
  constructor() {
    super();
    this.setName = this.setName.bind(this);
    this.state = { loading: true, nameSet: localStorage.getItem("username") != null };
  }

  setName() {
    localStorage.username = this.input.value;
    this.setState({ nameSet: true });
  }

  render() {
    const { loading } = this.state;

    if (loading) {
      return null;
    }

    if (!this.state.nameSet) {
      return <span>
        <input type="text" ref={(input) => this.input = input} />
        <button onClick={this.setName}>OK</button>
      </span>;
    }
    else {
      return <div className="start flex layout-v">
        <header>
          <h1>AppDev Books</h1>
          <AddBook />
        </header>
        <BookList />
      </div>
    }
  }

  componentDidMount() {
    setTimeout(() => this.setState({ loading: false }), 1500);
  }
}

export default Start;
