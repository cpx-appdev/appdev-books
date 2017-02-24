import io from "socket.io-client";

class SocketService {
    constructor() {
        this.socket = io();

    }
    emit(event, ...args) {
        return this.socket.emit(event, args);
    }

    on(event, fn) {
        return this.socket.on(event, fn);
    }
}

export default new SocketService();
