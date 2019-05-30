import React from "react";

let Hello = React.createClass({
    displayName: 'Hello',
    getInitialState: function () {
        return {name: this.props.name};
    },
    handleChange: function (event) {
        this.setState({name: event.target.value});
    },
    render: function () {
        return React.DOM.div(null,
            "Name: ", React.DOM.input({type: "text", value: this.state.name, onChange: this.handleChange}),
            React.DOM.br(),
            "Hello ", this.state.name, "! "
        );
    }
});

React.render(React.createElement(Hello, {name: "World"}), document.getElementById("demo"));