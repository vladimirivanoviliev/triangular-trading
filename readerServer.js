import BittrexReader from './readers/bittrex';
import ThreadPool from 'threadPool';

//Interval here should be increased if api calls increase (interval per API?)
//For example Kraken allows 1 request per 3 seconds - that why if you have 4 api calls
//you need to increase this to 12000ms to avoid block.
const DEFAULT_INTERVAL_MS = 2000;

export default class ReaderServer {
    constructor() {
        this._reader = new BittrexReader();
        this._exited = false;
        this._marketData;

        this._threadPool = new ThreadPool(4, (summary) => { this._onSummaryProcessed(summary); });


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

                this._readerInterval = setInterval(() => {
                    this._reader.readSummaries(this.processSummaryData);
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
        this._marketData = marketResponse;
    }

    processSummaryData(summaryResponse, error) {
        if (error) {
            console.log('>>>MARKET SUMMARY ERROR: ', error);
            return;
        }

        console.log('>market summary saved..');

        this._threadPool.addWork({
            summaries: summaryResponse,
            markets: this._marketData
        });
    }
}