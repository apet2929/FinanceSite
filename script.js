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

class HeldStock {
    constructor(ticker, amount, purchase_date=null) {
        this.stock = new Stock(ticker);
        this.amount = amount;
        if(purchase_date == null) purchase_date = new Date();
        this.purchase_date = purchase_date;
    }

    getTotalValue() {
        return this.stock.getCurrentPrice() * this.amount;
    }

    sell(amount) {
        this.amount -= amount;
        return this.stock.getCurrentPrice() * amount; // the amount of cash you got from selling
    }

    buy(amount) {
        this.amount += amount;
        return this.stock.getCurrentPrice() * amount; // the amount of cash it took to buy
    }
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

class User {
    static FromLocalStorage() {
        let loaded = localStorage.getItem("portfolio")
        let userData = JSON.parse(loaded)
        let user = new User(userData.id);
        user.load(userData.cash, userData.assets, userData.history);
    }

    constructor(id) {
        this.id = id;
    }

    load(cash, assets, history) {
        this.cash = cash;
        this.assets = assets;
        this.history = history;
    }

    doCashTransaction(amount, date=null) {
        this.cash += amount;
        if(date == null) date = new Date();
        const transaction = new Transaction(amount, date);
        this.history.push(transaction)
        updatePageData(this);
    }

    doStockTransaction(ticker, numShares, date) {
        let heldStock;
        let cashAmnt;
        try {
            heldStock = this.getHeldStock(ticker);
            cashAmnt = heldStock.buy(numShares);
        } catch {
            heldStock = new HeldStock(ticker, numShares, date);
            cashAmnt = heldStock.buy(numShares);
        }
        this.cash -= cashAmnt;
        this.history.push(new Transaction(cash_amnt, date, `Purchased ${ticker}x${numShares} for ${heldStock.stock.getCurrentPrice()} per share`))
    }

    getHeldStock(ticker) {
        assets.forEach((heldStock) => {
            if(heldStock.stock.ticker == ticker) return heldStock;
        });
        throw new Error("No held stock with ticker found!");
    }

    saveToLocalStorage() {
        let json = JSON.stringify(this)
        localStorage.setItem("portfolio", json)
    }

    toString() {
        return "Cash: ($" + this.cash + ") Assets: " + this.assets.toString();
    }

}

async function testRun() {
    var user = new User("Andrew");
    
    Stock.update().then(() => {
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


// testRun();
