import request from 'request';

const TICKER_API_URL = 'https://api.kraken.com/0/public/Ticker?pair=';
const MARKET_READ_INTERVAL = 6000000;

export default class ReaderServer {
    constructor() {
        this._marketsUrl = TICKER_API_URL;
        this._summariesUrl = TICKER_API_URL;
    }

    _remoteRequest(url, callback) {
        request(url, (error, response) => {
            const handledServerError = response.success ? undefined : response.message;

            callback((response || {}).result, error || handledServerError);
        });
    }

    readMarket(callBack) {
        this._remoteRequest(this._marketsUrl, callBack);
    }

    readSummaries(callBack) {
        this._remoteRequest(this._summariesUrl, callBack);
    }
}