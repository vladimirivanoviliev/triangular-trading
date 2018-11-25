import ReaderBittrex from './readers/bittrex';
import ReaderBinance from './readers/binannce';
//import ThreadPool from './threadPool';
import DataProcessor from './dataProcessor';

import { Summary, Orders } from './orders';

const DEFAULT_INTERVAL_MS = 2000;

export default class ReaderServer {
    constructor(options) {
        this._reader = new ReaderBittrex();//options.market === 'binance' ? new ReaderBinance() : new ReaderBittrex();
        this.startCurrencies = options.currencies || ['XVG', 'XZC', 'ZEN', 'BTC', 'ETH'];
        this._exited = false;
        this._marketData;

        // this._threadPool = new ThreadPool(4, (summary) => { this._onSummaryProcessed(summary); });


        //message queue
        //worker pipeline

        ///TODO:
        //1. When to check for new items in queue:
        //   - when item pushed to queue (handle first item)
        //   - when worker finishes work (handle all workers are busy)
        //2. When to check pipeline for last item is finished?
        //   - when worker finishes work
        //3. When to add / remove worker from free list
        //   - add worker to free list on finish work
        //   - remove worker from free list when start work
    }

    _onSummaryProcessed(summary) {
        console.log('>>>Summary processed, pushing to client');
    }

    start() {
    //    this.processMarketData();
    //    this.test();
    //    return;

        if (this._exited) {
            return;
        }

        this._reader.readMarket((marketDataResponse, error) => {
            if (error) {
                console.log('>>>MARKET DATA READ ERROR: ', error);
                console.log('>>>...trying again');

                setTimeout(this.start, DEFAULT_INTERVAL_MS);
            } else {
                this.processMarketData(marketDataResponse);

         //       this._reader.readSummaries((data) => {this.processSummaryData(data);});
                 this._readerInterval = setInterval(() => {

                     this._reader.readSummaries((data) => {this.processSummaryData(data);});
                 }, DEFAULT_INTERVAL_MS);
            }
        });
    }

    exit() {
        clearInterval(this._readerInterval);
        this._exited = true;
    }

    processMarketData(marketResponse) {
        console.log('>market data saved..');

        this._dataProcessor = new DataProcessor(marketResponse, {
            fee: this._reader.fee,
            startCurrencies: this.startCurrencies
        });

        // this._dataProcessor.marketsMap = {
        //     'USDT-BTC': {
        //         "MarketCurrency": "BTC",
        //         "BaseCurrency": "USDT",
        //         "MarketCurrencyLong": "Bitcoin",
        //         "BaseCurrencyLong": "Tether",
        //         "MinTradeSize": 0.00046083,
        //         "MarketName": "USDT-BTC"
        //     },
        //     "USDT-BCH": {
        //         "MarketCurrency": "BCH",
        //         "BaseCurrency": "USDT",
        //         "MarketCurrencyLong": "Bitcoin Cash (ABC)",
        //         "BaseCurrencyLong": "Tether",
        //         "MinTradeSize": 0.00501305,
        //         "MarketName": "USDT-BCH"
        //     },
        //     "BTC-BCH": {
        //         "MarketCurrency": "BCH",
        //         "BaseCurrency": "BTC",
        //         "MarketCurrencyLong": "Bitcoin Cash (ABC)",
        //         "BaseCurrencyLong": "Bitcoin",
        //         "MinTradeSize": 0.00271400,
        //         "MarketName": "BTC-BCH"
        //     }
        // };
    }

    test() {
        const item = Summary[0];
        const currencies = item.path.split(',');
        const markets = item.markets.split(',');
        const prices = item.prices;
        const promises = [];
        const orderTypes = [];

        for (let idx = 0; idx < markets.length; idx++) {
            const market = markets[idx];
            const type = this._dataProcessor.orderType(currencies[idx], market);
            orderTypes.push(type);
        }

        console.log(item);

        const startQuantity = 3;
        let quantity = startQuantity;//this.startCurrencies[0].quantity;

        const allOrders = this._dataProcessor.getOrders(Orders, startQuantity, orderTypes);
        console.log(allOrders);
    }

    processSummaryData(summaryResponse, error) {
        if (error) {
            console.log('>>>MARKET SUMMARY ERROR: ', error);
            return;
        }

        const processedData = this._dataProcessor.processSummaries(summaryResponse);

        console.log('>market summary calculated..', processedData.length);
        console.log(processedData.map(item => item.path + ' ' + item.rate + ' ' + item.rateWithFee).join('\n'));

        // console.log(processedData.length);
        if (processedData.length) {
            const item = processedData[0];
            const currencies = item.path.split(',');
            const markets = item.markets.split(',');
            const prices = item.prices;
            const promises = [];
            const orderTypes = [];

            //also need the initial market with the reverse order type
            for (let idx = 0; idx < markets.length; idx++) {
                const market = markets[idx];
                const type = this._dataProcessor.orderType(currencies[idx], market);
                orderTypes.push(type);
                promises.push(this._reader.readOrders(market, type));
            }

            const startQuantity = 1;
            let quantity = startQuantity;//this.startCurrencies[0].quantity;

            Promise.all(promises).then(result => {
               const allOrders = this._dataProcessor.getOrders(result, startQuantity, orderTypes);
               if (allOrders.length) {
                   console.log('KOR');
               }
               console.log(allOrders);
               console.log(new Array(100).join('-'));
            });
        }


        // this._threadPool.addWork({
        //     summaries: summaryResponse,
        //     markets: this._marketData
        // });
    }
}