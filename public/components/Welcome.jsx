import React from "react";

class Welcome extends React.Component {
    constructor() {
        super();
        this.setName = this.setName.bind(this);
        this.onKeyPress = this.onKeyPress.bind(this);

    }

    setName() {
        this.props.setName(this.input.value);
    }
    onKeyPress(e) {
        if (e.key === "Enter") {
            this.setName();
        }
    }

    render() {
        return <div id="welcome">
            <h1>Willkommen!</h1>
            <h2>Bitte nenne mir deinen Namen</h2>
            <p>(Dieser wird für deine ausgeliehenen Bücher verwendet)</p>
            <input type="text" placeholder="Name" ref={(input) => this.input = input} onKeyPress={this.onKeyPress} />
            <button className="btn-primary" onClick={this.setName}>Bestätigen</button>
        </div>;
    }

    componentDidMount() {
        this.setState({ someKey: "otherValue" });
    }
}

Welcome.propTypes = {
    setName: React.PropTypes.func
};


export default Welcome;
