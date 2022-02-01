import WebSocket from "ws";
import fetch from "fetch";

async function getStockPrice(ticker) {
    const api_key = process.env.YAHOO_FINANCE_API_KEY;
    
    const response = await fetch(`https://yfapi.net/v11/finance/quoteSummary/${ticker.toUpperCase()}`, {
        method: 'GET', // *GET, POST, PUT, DELETE, etc.
        mode: 'cors', // no-cors, *cors, same-origin
        cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
        credentials: 'same-origin', // include, *same-origin, omit
        headers: {
            'x-api-key': api_key,
            'Content-Type': 'application/json'
        },
        params: {modules: 'defaultKeyStatistics,assetProfile'},
        redirect: 'follow', // manual, *follow, error
        referrerPolicy: 'no-referrer', // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
      });
    return await response.json();
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


function updatePageData(user) {
    document.getElementById("cash").innerText = "Cash : $" + user.cash;
    document.getElementById("assets").innerText = "Assets : " + user.assets;
    document.getElementById("history").innerText = "History : " + user.history;
}

class Transaction {
    constructor(amount, date, description="") {
        this.amount = amount;
        this.date = date;
        this.description = description;
        Object.seal(this);
    }
}

// class Bitcoin {
//     static {
//         this.price_history = [];

//         const today = new Date();
//         for (let index = 0; index < 365; index++) {
//             // this.price_history.push(getBtcPrice(new Date(today.year, today.month, today.date - index)))  
//             this.price_history.push(getCryptoPrice("btc"))  
//         }
//     }

//     constructor() {
//         Asset.apply(this);
//     }

//     update() {
//         return getCryptoPrice("btc");
//     }
// }

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
    console.log(getStockPrice("AAPL"));
    setInterval(() => {
        console.log(getStockPrice("AAPL"));
    }, 1000 * 60 * 60); // 1 hour
}

// const assets = [
//     new Bitcoin(103.532)
// ];

// var user = new User(1000, assets);
testRun();
// user.doCashTransaction(20);
// document.write(user.toString())
// console.log(user);