import request from 'request';

const GET_MARKETS_API_URL = 'https://bittrex.com/api/v1.1/public/getmarkets';
const GET_MARKET_SUMMARY_API_URL = 'https://bittrex.com/api/v1.1/public/getmarketsummaries';

export default class ReaderServer {
    _remoteRequest(url, callback) {
        request(url, (error, response) => {
            const handledServerError = response.success ? undefined : response.message;

            callback((JSON.parse(response.body) || {}).result, error || handledServerError);
        });
    }

    readMarket(callBack) {
        this._remoteRequest(GET_MARKETS_API_URL, callBack);
    }

    readSummaries(callBack) {
        this._remoteRequest(GET_MARKET_SUMMARY_API_URL, callBack);
    }
}