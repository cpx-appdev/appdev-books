import React from "react";
import Quagga from "quagga";


class AddBook extends React.Component {
    constructor(props) {
        super(props);
        this.state = { scannedIsbn: "" };
        this.addBook = this.addBook.bind(this);
        this.scanImage = this.scanImage.bind(this);
    }

    addBook() {
        const isbn = this.inputIsbn.value;
        const title = this.inputTitle.value;
        fetch("/addBook", {
            method: "POST",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ isbn, title })
        })
    }

    scanImage(e) {
        var file = e.target.files[0];
        var reader = new FileReader();

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
                console.log(result.codeResult.code);
                this.setState({ scannedIsbn: result.codeResult.code });
            });
        };

        if (file) {
            reader.readAsDataURL(file);
        }
    }



    render() {
        return <div>
            <input type="text" ref={(input) => this.inputIsbn = input} />
            <input type="text" ref={(input) => this.inputTitle = input} />
            <button onClick={this.addBook}>Add Book</button>
            <br />
            <input type="text" value={this.state.scannedIsbn} />
            <input onChange={this.scanImage} type="file" capture="camera" accept="image/*" />
        </div>;
    }
}

export default AddBook;
