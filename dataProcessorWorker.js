import {Worker} from 'webworker-threads';

export default class DataProcessorWorker {
    constructor(options) {
        const {id, onMessage} = options;

        this._worker = new Worker(function () {
            this.onmessage = function (receivedMessage) {
                //TODO: this should be pure function. Parameters passed to workers are serialized!
                const {allPaths, currencies, max, fee} = JSON.parse(receivedMessage.data);

                const descendingComparer = (a, b) => b.rate - a.rate;

                const result = [];
                for (let idx = 0; idx < allPaths.length; idx++) {
                    const path = allPaths[idx].path.split(',');
                    let rate = 1;
                    let rateWithFee = 1;
                    let prices = [];
                    for (let currencyIdx = 1; currencyIdx < path.length; currencyIdx++) {
                        const price = currencies[path[currencyIdx - 1]][path[currencyIdx]];
                        rateWithFee = rateWithFee * price;
                        rateWithFee -= rateWithFee * fee;
                        rate = rate * price;
                        prices.push(price);
                    }

                    if (rateWithFee > 1) {
                        result.push({
                            path: allPaths[idx].path,
                            rateWithFee: rateWithFee,
                            rate: rate,
                            markets: allPaths[idx].markets,
                            prices: prices
                        });
                    }
                }

                result.sort(descendingComparer);

                postMessage(result.slice(0, max));
            };
        });

        this._worker.onmessage = (message) => {onMessage(message, id)};

        this._id = id;
    }

    postMessage(message) {
        this._worker.postMessage(message);
    }

    getId() {
        return this._id;
    }
}