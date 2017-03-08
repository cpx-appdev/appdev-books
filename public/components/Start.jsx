import React from "react";
import BookList from "./BookList";
import Header from "./Header";
import Welcome from "./Welcome";


class Start extends React.Component {
  constructor() {
    super();
    this.setName = this.setName.bind(this);
    this.state = { loading: true, nameSet: localStorage.getItem("username") != null, version: "" };
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
        <div style={{ "margin": "4px 10px", "fontSize": "0.8rem", "opacity": "0.6" }}>{this.state.version}</div>
      </div >
    }
  }

  componentDidMount() {
    fetch("/version")
      .then(result => result.json())
      .then(result => {
        this.setState({ version: result.version });
      });

    setTimeout(() => this.setState({ loading: false }), 1500);
  }
}

export default Start;
