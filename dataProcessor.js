function mapSummaries(summaries) {
    const result = {};
    for (let idx = 0; idx < summaries.length; idx++) {
        const summary = summaries[idx];
        result[summary.MarketName] = summary;
    }
    return result;
}

function findPaths(current, to, currentPath, currencies, allPaths, level) {
    if (level > 4) {
        return;
    }

    for (let currency in currencies[current]) {
        if (currency === to && level > 0) {
            allPaths.push({
                path: currentPath.path + ',' + to,
                markets: currentPath.markets + ',' + currencies[current][currency]
            });
            continue;
        }

        if (!currentPath.visited[currency]) {
            findPaths(currency, to, {
                path: currentPath.path + ',' + currency,
                markets: (currentPath.markets ? currentPath.markets + `,` : '') + currencies[current][currency],
                visited: Object.assign({}, currentPath.visited, {
                    [currency]: true
                })
            }, currencies, allPaths, level + 1);
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
        result[MarketCurrency][BaseCurrency] = summaries ? summaries[MarketName].Bid : MarketName;
        if (!result[BaseCurrency]) {
            result[BaseCurrency] = [];
        }

        result[BaseCurrency][MarketCurrency] = summaries ? (1 / summaries[MarketName].Ask) : MarketName;
    }

    return result;
}

const descendingComparer = (a, b) => b.rate - a.rate;

//TODO: Per Exchange!!
const FEE = 0.0005; ///0.0025

class DataProcessor {
    constructor(markets, startCurrencies) {
        this.startCurrencies = startCurrencies;
        this.markets = markets
        this.initPaths();
        console.log('>paths calculated..');
    }

    initPaths() {
        const paths = this.paths = [];
        const currencies = groupCurrencies(this.markets);
        filter(currencies, (currency) => Object.keys(currency).length > 1);

        const START_CURRENCIES = this.startCurrencies  || Object.keys(currencies);

        for (let idx = 0; idx < START_CURRENCIES.length; idx++) {
            const field = START_CURRENCIES[idx];

            findPaths(field, field, {visited: {[field]: true}, path: field}, currencies, paths, 0);
        }
    }

    processSummaries(summary, max = 10) {
        const summaryResult = mapSummaries(summary);
        const currencies = groupCurrencies(this.markets, summaryResult);
        const allPaths = this.paths;
        const result = [];
        for (let idx = 0; idx < allPaths.length; idx++) {
            const path = allPaths[idx].path.split(',');
            let rate = 1;
            let rateWithFee = 1;
            let prices = [];
            for (let currencyIdx = 1; currencyIdx < path.length; currencyIdx++) {
                const price = currencies[path[currencyIdx - 1]][path[currencyIdx]];
                rateWithFee = rateWithFee * price;
                rateWithFee -= rateWithFee * FEE;
                rate = rate * price;
                prices.push(price);
            }

            if (rateWithFee > 1) {
                result.push({ path: allPaths[idx].path, rateWithFee: rateWithFee, rate: rate, markets: allPaths[idx].markets, prices: prices});
            }
        }

        result.sort(descendingComparer);

        return result.slice(0, max);
    }
}

export default DataProcessor;
