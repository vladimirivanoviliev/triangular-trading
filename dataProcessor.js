import ThreadPool from './threadPool';

function mapSummaries(summaries) {
    const result = {};
    for (let idx = 0; idx < summaries.length; idx++) {
        const summary = summaries[idx];
        result[summary.MarketName] = summary;
    }
    return result;
}

function findPaths(to, currencies, allPaths) {
    const paths = [{ currency: to, path: [to] }];
    while (paths.length) {
        const { currency, path, markets } = paths.pop();

        for (let next in currencies[currency]) {
            if (next === to) {
                allPaths.push({
                    path: path.concat(next).join(','),
                    markets: markets + ',' + currencies[currency][next]
                });
            } else if (path.indexOf(next) === -1) {
                paths.push({
                    currency: next,
                    path: path.concat(next),
                    markets: (markets ? markets + ',' : '') + currencies[currency][next]
                });
            }
        }
    }
}

function filter(items, predicate) {
    for (let field in items) {
        if (!predicate(items[field])) {
            delete items[field]
        }
    }
}

function groupCurrencies(markets, summaries) {
    const result = {};
    for (let idx = 0; idx < markets.length; idx++) {
        const {MarketCurrency, MarketName, BaseCurrency} = markets[idx];
        if (!result[MarketCurrency]) {
            result[MarketCurrency] = {};
        }
        result[MarketCurrency][BaseCurrency] = summaries ? summaries[MarketName].Ask : MarketName;
        if (!result[BaseCurrency]) {
            result[BaseCurrency] = [];
        }

        result[BaseCurrency][MarketCurrency] = summaries ? (1 / summaries[MarketName].Bid) : MarketName;
    }

    return result;
}

class DataProcessor {
    constructor(markets, options = {}) {
        this.startCurrencies = options.startCurrencies;
        this.fee = options.fee;
        this.markets = markets;

        this._threadPool = new ThreadPool(6);
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

        this.initPaths();
        console.log(`> ${ this.paths.length} paths calculated..`);
    }

    initPaths() {
        const paths = this.paths = [];
        const currencies = groupCurrencies(this.markets);
        filter(currencies, (currency) => Object.keys(currency).length > 1);

        const START_CURRENCIES = this.startCurrencies  || Object.keys(currencies);

        for (let idx = 0; idx < START_CURRENCIES.length; idx++) {
            findPaths(START_CURRENCIES[idx], currencies, paths);
        }
    }

    processSummaries(summary, max = 10, callback) {
        const summaryResult = mapSummaries(summary);
        const currencies = groupCurrencies(this.markets, summaryResult);
        const allPaths = this.paths;

        this._threadPool.addWork({
            allPaths,
            currencies,
            max,
            fee: this.fee,
            callback
        });
    }
}

export default DataProcessor;
