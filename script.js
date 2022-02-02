import WebSocket from "ws";
import 'dotenv/config'
import fetch from "node-fetch";
import * as fs from "fs";
import assert, { ok, throws } from "assert";
import { Console } from "console";

function updatePageData(user) {
    document.getElementById("cash").innerText = "Cash : $" + user.cash;
    document.getElementById("assets").innerText = "Assets : " + user.assets;
    document.getElementById("history").innerText = "History : " + user.history;
}

function readJsonFile(path) {
    fs.readFile(path, 'utf8', function readFileCallback(err, data){
        if (err){
            console.log(err);
        } else {
            return JSON.parse(data);
        }
    });
}

function writeStockJson(stock) {
    console.log("Writing stock json " + stock.ticker);
    let json = JSON.stringify(stock);
    fs.writeFile(`stocks/${stock.ticker}Save.json`, json, 'utf8', (error) => {
        if(error) {
            console.error("There was an error!");
        } 
        console.log("Json writing complete!");
    });
}

function concatTickers(tickers) {
    let tickerStr = ""
    tickers.forEach(element => {
        tickerStr = tickerStr.concat(element.toUpperCase() + ",")
    });
    tickerStr = tickerStr.substring(0, tickerStr.length-1);
    return tickerStr;
}

function getBasicYahooUrl(shortUrl) {
    return `https://yfapi.net/${shortUrl}`
}

function getYahooUrlWithTicker(shortUrl, ticker) {
    return getBasicYahooUrl(shortUrl).concat(`/${ticker.toUpperCase()}`)
}

function addParamsToUrl(url, params) {
    if(params == null) return url;
    let rUrl = new URL(url);
    for (const [key, value] of Object.entries(params)) {
        rUrl.searchParams.set(key, value);
    }
    return rUrl.toString();
}

function isolateStockFromJson(stocksData, ticker) {

}

async function getStocksData(tickers) {
    if(tickers.length > 10) console.error("Maximum # of stocks exceeded!");
    let tickerStr = concatTickers(tickers);
    let url = getBasicYahooUrl("v6/finance/quote");
    let params = {
        region: "US",
        lang: "en",
        symbols: tickerStr,  
    };

    return await getStockData(url, params);
}

async function getStockData(url, params=null) {
    const api_key = process.env.YAHOO_FINANCE_API_KEY;
    const realUrl = addParamsToUrl(url, params);
    const options = {
        method: 'GET',
        url: realUrl,
        headers: {
          'x-api-key': api_key
        },
    };
    console.log(options);
    const response = await fetch(realUrl, options);
    return await response.json();
}

async function getStockChart(ticker) {
    return await getStockData(getYahooUrlWithTicker("/v8/finance/chart", ticker));
}

async function getDetailedStockData(ticker) {
    let params = {modules: 'defaultKeyStatistics,assetProfile'};
    let url = getYahooUrlWithTicker("v11/finance/quoteSummary", ticker);
    return await getStockData(url, params);
}

async function getCryptoPrice(ticker) {
    const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${ticker.toLowerCase()}@kline_1m`);

    ws.on('message', async (data) => {
        const incomingData = JSON.parse(data.toString());
        if (incomingData.k) {
        const isClosed = incomingData.k.x;
        const symbolPrice = Number(incomingData.k.c);
        console.log(`${symbol.toUpperCase()} : ${symbolPrice} -- closed = ${isClosed}`);
        return symbolPrice;
        } 
        console.error("Binance request failed!");
        return null;
    });
    return null;
}

class Stock {
    static stocks = {};

    static update() {
        console.log("Stock.update()");
        return getStocksData(Object.keys(Stock.stocks)).then(Stock._updateStocksData, Stock._onRequestRejected);
    }

    static _updateStocksData(data) {
        console.log("Stock._updateStocksData()");
        let stocksData = data["quoteResponse"]["result"];
        stocksData.forEach(stock_data => {
            let ticker = stock_data["symbol"];
            Stock.stocks[ticker].basic_data = stock_data;
            console.log(`${ticker} basic data set: ${stock_data}`);
        });
    }
    
    static _onRequestRejected(error) {
        console.error(error);
        throw new Error("Stocks data collection failed!")
    }
    
    static getStock(ticker) {
        if(!Stock.stocks[ticker]) {
            throw new Error(`Stock ${ticker} does not exist!`);
        }
        return Stock.stocks[ticker]
    }

    constructor(ticker) {
        this.ticker = ticker.toUpperCase();
        if(Stock.stocks[this.ticker]) console.error(`Stock ${this.ticker} already exists! Overwriting!`);
        Stock.stocks[this.ticker] = this;
        this.basic_data = {};
        this.detailed_data = {};
        this.chart_data = {};
    }

    getBasicData() {
        if(this.basic_data == {} || this.basic_data == null) {
            Stock.update();
        }
        ok(this.basic_data, `Static Stock update did not set ${this.ticker} basic data!`);
        return this.basic_data;
    }

    getDetailedData() {
        if(this.detailed_data == {} || this.detailed_data == null) {
            this.detailed_data = getDetailedStockData(this.ticker);
        }
        return this.detailed_data;
    }

    getChartData() {
        if(this.chart_data == {} || this.chart_data == null) {
            this.chart_data = getStockChart(this.ticker);
        }
        return this.chart_data;
    }

    getCurrentPrice() {
        return this.basic_data["regularMarketPrice"];
    }
}

class Transaction {
    constructor(amount, date, description="") {
        this.amount = amount;
        this.date = date;
        this.description = description;
        Object.seal(this);
    }
}

class Bitcoin {
    // static {
    //     this.price_history = [];

    //     const today = new Date();
    //     for (let index = 0; index < 365; index++) {
    //         // this.price_history.push(getBtcPrice(new Date(today.year, today.month, today.date - index)))  
    //         this.price_history.push(getCryptoPrice("btc"))  
    //     }
    // }
    

    constructor() {
        Asset.apply(this);
    }

    update() {
        return getCryptoPrice("btc");
    }
}

/*
Asset is an abstract class that will be used to provide a common interface to track the price of different assets

Each Asset subclass has a static price history list, so that the price history only has to be loaded once per type of asset
    - 
Each Asset subclass will define a function to get the price at a specific date

*/

function Asset() {
    if (this.constructor == Asset) {
        throw new Error("Asset class cannot be directly instantiated");
    }
    this.rate_history = [new ConversionRate()];
}

Asset.prototype.getValueUSD = function(amount) {
    return amount * this.rate;
}

Asset.prototype.sortRateHistory = function() {
    this.rate_history.sort((a, b) => a - b);
}

Asset.prototype.getCurrentRate = function() {
    return this.rate_history[this.rate_history.length-1];
}

Asset.prototype.setRate = function(date=null, rate) {
    if(date == null) date = new Date();
    const r  = new ConversionRate(date, rate);
    this.rate_history.push(r);
    this.sortRateHistory();
}

Asset.prototype.update = function() {
    throw new Error("Update needs to be implemented");
}

class User {
    constructor(initial_cash, initial_assets) {
        this.cash = initial_cash;
        this.assets = initial_assets;
        this.history = [new Transaction(this.cash, new Date(), "Initial value")];
    }

    doCashTransaction(amount) {
        const date = new Date()
        doCashTransaction(amount, date)
    } 
    doCashTransaction(amount, date) {
        this.cash += amount;
        const transaction = new Transaction(amount, date);
        this.history.push(transaction)
        updatePageData(this);
    }

    toString() {
        return "Cash: ($" + this.cash + ") Assets: " + this.assets.toString();
    }

}

class ConversionRate {
    constructor(date, rate) {
        this.date = date;
        this.rate = rate;
        Object.seal(this);
    }
}

async function testRun() {
    // const price = await getStockPrice("AAPL")
    // const stocks = await getStocksData(["AAPL", "QUBT", "ARKK", "BTC-USD", "SU"])
    let appleStock = new Stock("AAPL");
    let teslaStock = new Stock("TSLA");
    Stock.update().then(() => {
        console.log("Stock.update() complete!");
        console.log(appleStock.getBasicData());
        console.log(teslaStock.getBasicData());
        writeStockJson(appleStock);
        writeStockJson(teslaStock);
    }, (error) => {
        throw error;
    });
    
    // setInterval(() => {
    //     console.log(getStockPrice("AAPL"));
    // }, 1000 * 60 * 60); // 1 hour
}

const assets = [
    new Bitcoin()
];

var user = new User(1000, assets);
testRun();
// user.doCashTransaction(20);
// document.write(user.toString())
// console.log(user);