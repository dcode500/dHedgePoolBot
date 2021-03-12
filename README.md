# dHedge Node.js Bot For Managing A Portfolio (Pool) and Executing Trades Based on Signals from TradingView Alert Webhooks powered by Pinescript Studies



## Introduction

This dHedge node.js bot accepts queries from Tradingview to the /trigger endpoint for executing trades in a dHedge portfolio. You can find a simple trend following strategy in the pinescriptTemplate.pine file, and all logic for the node.js bot in the index.js file.


This bot keeps track of the maximum percentage any asset can take up to ensure diversification if required.

This bot can be paused/unpaused, and has a cooldown period between trades to prevent double/triple trading due to Tradingview accidentally triggering a webhook URL too many timestamp

This bot's URL should be help secret, so others don't trigger trades. This is because Tradingview needs the URL, so it must be public. However, if the endpoint is leaked, no funds can be stolen. However, trades can be executed. In this event, you would use the /toggleonoff endpoint to stop the bot until it was redeployed elsewhere.

## Quick Start

Make sure to `npm install`

Add your MNEMONIC phrase and RPC endpoint to the .env file or nothing will not work! For mainnet forking and tests Truffle Teams or Hard Hat is recommended.

Update your tradeableUniverse variable to have the list of assets you want to trade. This is case sensitive.

For dHedge SDK docs, which this is built on top of, visit: https://github.com/dhedge/dhedge-sdk

This uses a default pool address which will not work properly until you do the following (If you aren't just going to import and already created pool ):

Call the endpoint (https://yourul.com/ or localhost:5000/) /poolcreate to get started

And the /depositUSD?amount=1000 (Or however much USD you want to start with

The rest of the docs should guide you through how everything else works. If anything has been left out, please share is Issues.


## Design Philosophy

Simplicity. This node.js app was built with simplicity in mind and built to easily be deployed to a heroku or any other provider quickly and easily. All functions pretty much return like this in JSON format:

{"status":"success", "msg":"Some messaage", "data"{"info":"info"}}

or

{"status":"fail", "msg":"Reason for failure"}

You can navigate the app by searching the index.js file for the word "SECTION" to find the global variables, endpoints, initialization and core functionality sections.

This node.js app has all code logic in one file (index.js). This app was built to be customizable after deployment and to log attempted trades so that is can report what it has attempted. The main "/" endpoint provides simple diagnostics that allow you to know if the bot is running and what the pool address it is currently managing.

## Setting Up The Bot

Before deployment, make sure to update the .env file with your MNEMONIC phrase and the index.js file with your address is the returnPubKey function. Also, if you would like to add or remove tokens from the tradeable universe, update the tradeableUniverse variable in the globals section of index.js. Also, be sure to add your RPC URL to the .env file.

Make sure you have ETH and sUSD in your account, or nothing will work (even if you are using a mainnet fork, which is recommended before production. You can create a mainnet for using TruffleTeams)

Then, ping the /poolcreate endpoint sending the name and author params. This will setup your bot. If your bot stops running and is redeployed, you will need to call the setPoolAddress endpoint, so it can work.


## Setting Up The Alerts & Pinescript on Tradingview to Trigger Trades

Visit the chart page for any asset you are trading on Trading view.
Under the chart, click on the Pine Editor tab. Then paste the pinescriptTemplate.pine file contents in the page. Save your code with a name, and then click "Add To Chart". This is a simple trend following strategy that works best in DeFi on the 4 hour periods.

Once you have done this, setup an alert to track the TrendSignal line. When it is under -99, that is a sell signal. When it is over 99, that is a buy signal.

Set up the alert so that it calls your bot's URL with the parameters set as soo:
https://yourURL.com/trigger?target=sDEFI&signal=BUY&strength=1

The strength parameter is the multiple. Probably the best to keep this as 1 and everytime Tradingview gets the bullish signal you have set, it will call the bot's trigger endpoint which will execute the trade as long as its in your tradable universe and as long as it doesn't violate any of your maximum percentage of portfolio setting (or you not having enough sUSD liquidity because you're already fully spread across positions). For the sell signals/alerts, you will obviously set up like this: https://yourURL.com/trigger?target=sDEFI&signal=SELL&strength=1



## ENDPOINTS

Most functions of this application can accessed and run by visiting via a GET request any of the endpoints. They are listed in relative order of importance upon deployment of a pool. All functions which power these endpoints can be found directly above the endpoints section.

### /trigger

Params: target, signal, strength

This endpoint is the webhook URL that is being used and added to Tradingview alerts to execute the trade.

### /toggleonoff

Params: none

By default bot is on and accepting calls to /trigger. If this endpoint is called, then /trigger calls will not succeed. You can re-call the endpoint to turn the bot back on. This is mostly for emergencies or maintenance.

### /setTradeSize

Params: size

Number between .01 and .99. This is how much of your portfolio will be traded with each trade given the strength is 1. If the strength when calling /trigger is greater, it is a multiple of this number

### /depositUSD

Params: amount

Once you setup your pool, call this endpoint to transfer sUSD from your account to your pool

### /execute
Params: sell, buy, amount (that you are selling)

This is for manually executing trades and making sure everything works. This can be called even when the bot has been toggled to a pause for diagnostic purposes.

### /composition

Params: address (pool ethereum address)

Get info about your portfolio and pool value.

### /poolcreate

Params: author, name

Creates a pull using the account set in your .env file, setting the name of the pool and using the list of assets in your tradeableUniverse array.

### /percentage

Params: symbol
Allows you to see the dollar value, balance and percentage of your portfolio any given asset takes up







## Below is for running on Heroku (copy and pasted from heroku)

# node-js-getting-started

A barebones Node.js app using [Express 4](http://expressjs.com/).

This application supports the [Getting Started on Heroku with Node.js](https://devcenter.heroku.com/articles/getting-started-with-nodejs) article - check it out.

## Running Locally

Make sure you have [Node.js](http://nodejs.org/) and the [Heroku CLI](https://cli.heroku.com/) installed.

```sh
$ git clone https://github.com/heroku/node-js-getting-started.git # or clone your own fork
$ cd node-js-getting-started
$ npm install
$ npm start
```

Your app should now be running on [localhost:5000](http://localhost:5000/).

## Deploying to Heroku

```
$ heroku create
$ git push heroku main
$ heroku open
```
or

[![Deploy to Heroku](https://www.herokucdn.com/deploy/button.png)](https://heroku.com/deploy)

## Documentation

For more information about using Node.js on Heroku, see these Dev Center articles:

- [Getting Started on Heroku with Node.js](https://devcenter.heroku.com/articles/getting-started-with-nodejs)
- [Heroku Node.js Support](https://devcenter.heroku.com/articles/nodejs-support)
- [Node.js on Heroku](https://devcenter.heroku.com/categories/nodejs)
- [Best Practices for Node.js Development](https://devcenter.heroku.com/articles/node-best-practices)
- [Using WebSockets on Heroku with Node.js](https://devcenter.heroku.com/articles/node-websockets)
