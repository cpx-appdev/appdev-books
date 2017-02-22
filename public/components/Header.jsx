import React from "react";
import AddBook from "./AddBook";

class Header extends React.Component {
    constructor() {
        super();
    }

    render() {
        return <header>
            <h1>AppDev Books</h1>
            <AddBook />
        </header>;
    }
}

export default Header;
