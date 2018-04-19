import Worker from 'webworker-threads';
import dataProcessor from 'dataProcessor';

export default class DataProcessorWorker {
    constructor(options) {
        const {id, onMessage} = options;

        this._worker = new Worker(this._workerCode);

        this._worker.onmessage = (message) => {onMessage(message, id)};

        this._id = id;
    }

    _workerCode () {
        console.log('>>>WEB WORKER WORK DONE');

        this.onmessage = function (receivedMessage) {
            //TODO: SHOULD BE PURE FUNCTION
            //TODO: WORKER CODE HERE
            //dataProcessor(receivedMessage);

            setTimeout(() => {
                postMessage(receivedMessage);
            }, 1000);
        };
    }

    postMessage(message) {
        this._worker.postMessage(message);
    }

    getId() {
        return this._id;
    }
}