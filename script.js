
function getBtcPrice() {
    return 1.0;
}

function getBtcPrice(date) {
    return 1.0;
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
    static {
        this.price_history = [];

        const today = new Date();
        for (let index = 0; index < 365; index++) {
            this.price_history.push(getBtcPrice(new Date(today.year, today.month, today.date - index)))   
        }
    }

    constructor() {
        Asset.apply(this);
    }

    update() {
        return getBtcPrice();
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

const assets = [
    new Bitcoin(103.532)
];
var user = new User(1000, assets);
user.doCashTransaction(20);
document.write(user.toString())
console.log(user);
