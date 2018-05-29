//import Reader from './readers/bittrex';
import Reader from './readers/binannce';
import DataProcessor from './dataProcessor';

const DEFAULT_INTERVAL_MS = 150;

export default class ReaderServer {
    constructor() {
        this._reader = new Reader();
        this._exited = false;
        this._marketData;
    }

    _onSummaryProcessed(summary) {
        console.log('>>>Summary processed, pushing to client');
    }

    start() {
        if (this._exited) {
            return;
        }

        this._reader.readMarket((marketDataResponse, error) => {
            if (error) {
                console.log('>>>MARKET DATA READ ERROR: ', error);
                console.log('>>>...trying again');

                setTimeout(this.start, DEFAULT_INTERVAL_MS);
            } else {
                //TODO: time to calc - 10sec on mobile i7, binance
                this.processMarketData(marketDataResponse);
                this._readerInterval = setInterval(() => {
                    this._reader.readSummaries((data) => {
                        //TODO: time to calc: 300ms on mobile i7, binance
                        this.processSummaryData(data);
                    });
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
            fee: Reader.fee
        });
    }

    processSummaryData(summaryResponse, error) {
        if (error) {
            console.log('>>>MARKET SUMMARY ERROR: ', error);
            return;
        }

        this._dataProcessor.processSummaries(summaryResponse, 5, (processedData) => {
            console.log('>market summary calculated..');
            console.log(processedData.map(item => item.path + ' ' + item.rate + ' ' + item.rateWithFee).join('\n'));
            console.log(processedData.length);
        });
    }
}