import React from "react";

class Borrow extends React.Component {
    constructor(props) {
        super(props);
        this.borrow = this.borrow.bind(this);
    }
    borrow() {
        this.props.borrow(this.input.value);
    }

    render() {
        return <span>
            <input type="text" defaultValue={this.props.borrowedFrom} ref={(input) => this.input = input} />
            <button onClick={this.borrow}>Borrow</button>
        </span>;
    }
}

Borrow.propTypes = {
    borrow: React.PropTypes.func,
    borrowedFrom: React.PropTypes.string
};

export default Borrow;
