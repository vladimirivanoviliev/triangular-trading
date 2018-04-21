import request from 'request';

const GET_MARKETS_API_URL = 'https://api.binance.com/api/v1/exchangeInfo';
const GET_MARKET_SUMMARY_API_URL = 'https://api.binance.com/api/v3/ticker/bookTicker';

export default class BinanceReader {
    readMarket(callBack) {
        request(GET_MARKETS_API_URL, (error, response = {}) => {
            const handledServerError = response.success ? undefined : response.message;

            const mappedData = ((JSON.parse(response.body) || {symbols: []}).symbols)
                .map(item => {
                    return {
                        MarketCurrency:item.baseAsset,
                        BaseCurrency: item.quoteAsset,
                        MarketName: item.symbol
                    };
            });

            callBack(mappedData, error || handledServerError);
        });
    }

    readSummaries(callBack) {
        request(GET_MARKET_SUMMARY_API_URL, (error, response = {}) => {
            const handledServerError = response.success ? undefined : response.message;

            const mappedData = (JSON.parse(response.body) || []).map(item => {
                return {
                    MarketName: item.symbol,
                    Bid: item.bidPrice,
                    Ask: item.askPrice
                };
            });

            callBack(mappedData, error || handledServerError);
        });
    }
}