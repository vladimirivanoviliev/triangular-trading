import request from 'request';
const crypto = require("crypto");

const GET_MARKETS_API_URL = 'https://bittrex.com/api/v1.1/public/getmarkets';
const GET_MARKET_SUMMARY_API_URL = 'https://bittrex.com/api/v1.1/public/getmarketsummaries';
const GET_BALANCE = 'https://bittrex.com/api/v1.1/account/getbalances';
const GET_ORDERS = 'https://bittrex.com/api/v1.1/public/getorderbook';
const FEE = 0.0025;
const key = 'abee2cad0e2540d2afbf0783eaa272f1';
const secret = 'e33b52cdd5c24b39a0a89c3a88bd625f';

function encrypt(secret, uri) {
    var hmac = crypto.createHmac("sha512", secret);
    var signed = hmac.update(new Buffer(uri, 'ascii')).digest("hex");

    return signed;
}

export default class BittrexReader {
    _remoteRequest(url, callback) {
        request(url, (error, response = {}) => {
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

    readBalance(callback) {
        request.get(this.authenticate(GET_BALANCE), (error, response, body) => callback(JSON.parse(body)));
    }

    readOrders(market, type) {
        return new Promise((resolve) => {
            this._remoteRequest(GET_ORDERS + `?market=${ market }&type=${ type }`, (response) => {
                resolve(response);
            });
        });
    }

    authenticate(url) {
        const nonce = new Date().getTime();
        const uri = url + `?apikey=${ key }&nonce=${ nonce }`;

        return {
          url: uri,
          headers: {
            'apisign': encrypt(secret, uri)
          }
        };
    }

    get fee() {
        return FEE;
    }
}
