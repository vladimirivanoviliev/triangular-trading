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
            } else if (path.indexOf(next) === -1 && path.length < 3) {
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
        const { MarketCurrency, MarketName, BaseCurrency } = markets[idx];
        if (!result[MarketCurrency]) {
            result[MarketCurrency] = {};
        }
        // result[MarketCurrency][BaseCurrency] = summaries ? summaries[MarketName].Bid : MarketName;
        // result[MarketCurrency][BaseCurrency] = summaries ? summaries[MarketName].Ask : MarketName;
        result[MarketCurrency][BaseCurrency] = summaries ? (summaries[MarketName].Bid + summaries[MarketName].Ask) / 2 : MarketName;
        if (!result[BaseCurrency]) {
            result[BaseCurrency] = [];
        }

        result[BaseCurrency][MarketCurrency] = summaries ? (1 / (summaries[MarketName].Bid + summaries[MarketName].Ask) / 2) : MarketName;
        // result[BaseCurrency][MarketCurrency] = summaries ? (1 / summaries[MarketName].Ask) : MarketName;
        //result[BaseCurrency][MarketCurrency] = summaries ? (1 / summaries[MarketName].Bid) : MarketName;
    }

    return result;
}

const descendingComparer = (a, b) => b.rate - a.rate;


class DataProcessor {
    constructor(markets, options = {}) {
        this.startCurrencies = options.startCurrencies;
        this.fee = options.fee;
        // this.fee = 0.0025;
        this.markets = markets;
        this.marketsMap = mapSummaries(markets);
        this.initPaths();
        console.log(`> ${this.paths.length} paths calculated..`);
    }

    initPaths() {
        const paths = this.paths = [];
        const currencies = groupCurrencies(this.markets);
        filter(currencies, (currency) => Object.keys(currency).length > 1);

        const START_CURRENCIES = this.startCurrencies || Object.keys(currencies);

        for (let idx = 0; idx < START_CURRENCIES.length; idx++) {
            findPaths(START_CURRENCIES[idx], currencies, paths);
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
                rateWithFee -= rateWithFee * this.fee;
                rate = rate * price;
                prices.push(price);
            }

            if (rateWithFee > 1) {
                result.push({ path: allPaths[idx].path, rateWithFee: rateWithFee, rate: rate, markets: allPaths[idx].markets, prices: prices });
            }
        }

        result.sort(descendingComparer);

        return result.slice(0, max);
    }

    orderType(from, market) {
        const summary = this.marketsMap[market];

        if (from === summary.BaseCurrency) {
            return 'sell';
        }

        return 'buy';
    }

    getOrders(markets, initialQuantity, orderTypes) {
        let paths = [{ orders: [], quantity: initialQuantity, prices: [] }];

        const getQuantity = (marketIdx, { Quantity, Rate }, isStart) => {
            const calculated = Rate * Quantity;
            if (orderTypes[marketIdx] === 'buy') {
                return isStart ? Quantity : calculated;
            }

            return isStart ? calculated : Quantity;
        };

        const getRate = (marketIdx, Rate) => {
            return orderTypes[marketIdx] === 'buy' ? Rate : 1 / Rate;
        };

        for (let marketIdx = 0; marketIdx < markets.length; marketIdx++) {
            const orders = markets[marketIdx];
            let sumStartCurrency = 0;
            let sumOrdersQuantity = 0;
            let avrgRate = 1;

            let marketPaths = [];

            for (let idx = 0; idx < orders.length; idx++) {
                const order = orders[idx];
                const startQuantity = getQuantity(marketIdx, order, true);
                const orderQuantity = getQuantity(marketIdx, order, false);
                const rate = getRate(marketIdx, order.Rate);
                avrgRate = (sumStartCurrency * avrgRate + startQuantity * rate) / (sumStartCurrency + startQuantity);

                const orderPaths = [];

                for (let pathIdx = 0; pathIdx < paths.length; pathIdx++) {
                    const path = paths[pathIdx];

                    if (sumStartCurrency + startQuantity <= path.quantity) {
                        const orderPath = { orders: path.orders.concat(idx), quantity: sumOrdersQuantity + orderQuantity };

                        orderPath.prices = path.prices.concat(avrgRate);

                        orderPaths.push(orderPath);
                    } else if (sumStartCurrency < path.quantity) {
                        const leftQuantity = path.quantity - sumStartCurrency;
                        const leftOrderQuantity = orderTypes[marketIdx] === 'sell' ? leftQuantity * (1 / orders[idx].Rate) : leftQuantity * orders[idx].Rate;

                        const orderPath = { orders: path.orders.concat(idx), quantity: sumOrdersQuantity + leftOrderQuantity };
                        orderPath.prices = path.prices.concat((sumStartCurrency * avrgRate + leftQuantity * rate) / (sumStartCurrency + leftQuantity));

                        orderPaths.push(orderPath);
                    }
                }

                sumStartCurrency += startQuantity;
                sumOrdersQuantity += orderQuantity;
                marketPaths = marketPaths.concat(orderPaths);

                if (!orderPaths.length) {
                    break;
                }
            }

            paths = marketPaths;
        }
        const positive = [];
        for (let idx = 0; idx < paths.length; idx++) {
            const path = paths[idx];
            const prices = path.prices;
            let quantity = path.quantity;

            for (let priceIdx = prices.length - 1; priceIdx >= 0; priceIdx--) {
                quantity = quantity * (1 / prices[priceIdx]);
            }
            path.rate = path.quantity / quantity;
            path.initialQuantity = quantity;
            if (path.quantity > quantity) {
                positive.push(path);
            }
        }

        return positive;
    }
}


export default DataProcessor;
