import React from "react";
import Quagga from "quagga";
import io from "socket.io-client";


class AddBook extends React.Component {
    constructor(props) {
        super(props);
        this.state = { isbn: "", inputVisible: false };
        this.addBook = this.addBook.bind(this);
        this.captureImage = this.captureImage.bind(this);
        this.processImage = this.processImage.bind(this);
        this.showInput = this.showInput.bind(this);
        this.hideInput = this.hideInput.bind(this);
        this.editIsbn = this.editIsbn.bind(this);

        this.socket = io();
    }

    addBook() {
        this.socket.emit("addBook", this.state.isbn, error => {
            alert(error);
        });
    }

    showInput() {
        this.setState({ inputVisible: true });
    }

    hideInput() {
        this.setState({ isbn: "", inputVisible: false });
    }

    editIsbn(e) {
        this.setState({ isbn: e.target.value });
    }

    captureImage() {
        this.fileInput.click();
    }

    processImage(e) {
        this.setState({ isbn: "Analysiere..." });

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
                if (result.codeResult) {
                    this.setState({ isbn: result.codeResult.code });
                } else {
                    this.setState({ isbn: "" });
                    alert("ISBN konnte nicht erkannt werden, bitte manuell eingeben.");
                }
            });
        };

        if (file) {
            reader.readAsDataURL(file);
        }
    }



    render() {

        let input;
        if (this.state.inputVisible) {
            input = <div>
                <span onClick={this.captureImage} className="fa fa-camera">
                    <input ref={(input) => this.fileInput = input} onChange={this.processImage} type="file" capture="camera" accept="image/*" />
                </span>
                <input type="text" onChange={this.editIsbn} value={this.state.isbn} />
                <button className="btn-secondary" onClick={this.hideInput}>Abbrechen</button>
                <button className="btn-primary" onClick={this.addBook}>Hinzufügen</button>
            </div>;
        }

        return <div id="addBook">
            {!this.state.inputVisible ? <button className="btn-primary" onClick={this.showInput}>Neues Buch hinzufügen</button> : null}
            {input}
        </div>;
    }
}

export default AddBook;
