import React from "react";
import Quagga from "quagga";
import io from "socket.io-client";


class AddBook extends React.Component {
    constructor(props) {
        super(props);
        this.state = { scannedIsbn: "" };
        this.addBook = this.addBook.bind(this);
        this.scanImage = this.scanImage.bind(this);
        this.socket = io();
    }

    addBook() {
        const isbn = this.inputIsbn.value;
        this.socket.emit("addBook", isbn);
    }

    scanImage(e) {
        const file = e.target.files[0];
        const reader = new FileReader();

        reader.onload = () => {
            Quagga.decodeSingle({
                inputStream: {
                    name: "Image",
                    type: "ImageStream",
                    src: reader.result
                },
                decoder: {
                    readers: ["ean_reader"]
                }
            }, (result) => {
                this.setState({ scannedIsbn: result.codeResult.code });
            });
        };

        if (file) {
            reader.readAsDataURL(file);
        }
    }



    render() {
        return <div className="addBook">
            {/*<input type="text" ref={(input) => this.inputIsbn = input} />*/}
            <button className="btn-accent" onClick={this.addBook}>Neues Buch hinzufügen</button>
            {/*<br />*/}
            {/*<input type="text" readOnly value={this.state.scannedIsbn} />*/}
            {/*<input onChange={this.scanImage} type="file" capture="camera" accept="image/*" />*/}
        </div>;
    }
}

export default AddBook;
