const processData = (options) => {
    const {summaries, markets} = options;
    var summaryResult = mapSummaries(summaries.result);
    var currencies = groupCurrencies(markets.result, summaryResult);

    filter(currencies, (currency) => Object.keys(currency).length > 1);

    const START_CURRENCIES = Object.keys(currencies);
    const FEE = 0.0025;

    var allPaths = localStorage.getItem('allPaths');

    if (!allPaths) {
        allPaths = [];
        for (var idx = 0; idx < START_CURRENCIES.length; idx++) {
            var field = START_CURRENCIES[idx];

            findPaths(field, field, {visited: {[field]: true}, path: field}, allPaths);
        }
        localStorage.setItem('allPaths', JSON.stringify(allPaths));
    } else {
        allPaths = JSON.parse(allPaths);
    }

    var paths = [];
    for (var idx = 0; idx < allPaths.length; idx++) {
        var path = allPaths[idx].split(',');
        var rate = 1;
        for (var currencyIdx = 1; currencyIdx < path.length; currencyIdx++) {
            var price = currencies[path[currencyIdx - 1]][path[currencyIdx]];
            rate *= price;
            rate -= FEE * price;
        }
        if (rate > 1) {
            paths.push({path: allPaths[idx], rate: rate});
        }
    }

    paths.sort((a, b) => b.rate - a.rate);

    var currencyData = paths.slice(0, 100);

    return currencyData;

    //Mihai is my teacher
    function findPaths(current, to, currentPath, allPaths) {
        for (var currency in currencies[current]) {
            if (currency === to && currentPath.path.length > 2) {
                allPaths.push(currentPath.path + ',' + to);

                continue;
            }
            if (!currentPath.visited[currency]) {
                findPaths(currency, to, {
                    path: currentPath.path + ',' + currency,
                    visited: Object.assign({}, currentPath.visited, {
                        [currency]: true
                    })
                });
            }
        }
    }

    function filter(items, predicate) {
        for (var field in items) {
            if (!predicate(items[field])) {
                delete items[field]
            }
        }
    }

    function mapSummaries(summaries) {
        var result = {};
        for (let idx = 0; idx < summaries.length; idx++) {
            var summary = summaries[idx];
            result[summary.MarketName] = summary;
        }
        return result;
    }

    function groupCurrencies(markets, summaries) {
        var result = {};
        for (var idx = 0; idx < markets.length; idx++) {
            var {MarketCurrency, MarketName, BaseCurrency} = markets[idx];
            if (!result[MarketCurrency]) {
                result[MarketCurrency] = {};
            }
            result[MarketCurrency][BaseCurrency] = summaries[MarketName].Bid;
            if (!result[BaseCurrency]) {
                result[BaseCurrency] = [];
            }

            result[BaseCurrency][MarketCurrency] = 1 / summaries[MarketName].Ask;
        }

        return result;
    }
};

export default processData;