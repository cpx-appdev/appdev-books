import React from "react";
import BookList from "./BookList";
import Header from "./Header";
import Welcome from "./Welcome";


class Start extends React.Component {
  constructor() {
    super();
    this.setName = this.setName.bind(this);
    this.state = { loading: true, nameSet: localStorage.getItem("username") != null };
  }

  setName(name) {
    localStorage.username = name;
    this.setState({ nameSet: true });
  }

  render() {
    const { loading } = this.state;

    if (loading) {
      return null;
    }

    if (!this.state.nameSet) {
      return <Welcome setName={this.setName} />;
    }
    else {
      return <div className="start flex layout-v">
        <Header />
        <BookList />
      </div>
    }
  }

  componentDidMount() {
    setTimeout(() => this.setState({ loading: false }), 1500);
  }
}

export default Start;
