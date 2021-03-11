//dHedge Node.js Bot. Manages Portfolio and executes trades based on signals from TradingView Alert Webhooks powered by Pinescript Studies



//SECTION: GLOBALS AND SETTINGS

const express = require('express')
const path = require('path')
const PORT = process.env.PORT || 5000
util = require('util')
Web3 = require("web3");
ethers = require("ethers");
//rpcURL = 'https://sandbox.truffleteams.com/fcf79868-7513-4a42-84aa-98b4001c55cc';
const fileGetContents = require('file-get-contents');
const { Factory } = require("dhedge-sdk");
  const factory =  Factory.initialize()


function returnPubKey(){
  pub = '0x70532734c9e67e470ae4cB9999aFf5760Eb71824';
  return pub;
}

function returnSetPool(){
  //This changes once set. This is simply default for tests:
  return '0xC388C0160aE9FE37A6D379889a35D642074d5A41';
}

function returnSetPool(){
  //This changes once set. This is simply default for tests:
  return globalPoolAddress;
}


portfolioComposition ={
  "maxIndividualShare": 1,
  "percentageOfPortfolioPerTrade":.20,
  "maxLoss": .25,
  "minimumPercentageOfPortfolioPerTrade":.05
}

//period in which bot cant do anything after executin a trade to prevent API accidental double calling for whatever reason from trigger
coolDownPeriod = 30000;

//Boolean of if there was a recent trade that puts us in a cooldown period
isCoolDownHappening = false;

//Boolean if Bot is paused
isBotPaused = false;

tradeableUniverse =[ "sETH", "sBTC", "sDEFI", "sLINK", "sETC"];

//global for the pool if needed
pool = [];

//keeps list of logs
theLogs=[];

//this needs to be set by /setPoolAddressEndpoint once pool is created
globalPoolAddress= '0x0F9E7e92fE4889F8b37f677C92a296E92D43b165';

//END GLOBAL AND settings


//SECTION: INITIALIZATION OF POOL
loadExamplePool()
//END INITIALIZATION



//SECTION: CORE FUNCTIONS
async function restHandler(targetCurrency, signal, strength){

  if(signal == "BUY"){
    var possibleToTrade = await canWeTradeThisNow("sUSD", targetCurrency, (portfolioComposition['percentageOfPortfolioPerTrade']*strength));
    if(possibleToTrade.status == "fail"){
      return possibleToTrade;
    }
    var thePercentageOfPool = portfolioComposition['percentageOfPortfolioPerTrade']*strength;

    console.log("Beginning attempt of trade from "+thePercentageOfPool +" percent of the sUSD pool")
    var response = await executeTrade("sUSD", targetCurrency, thePercentageOfPool, thePercentageOfPool, true);
    return response;
  }
  else if(signal =="SELL"){
    console.log("Attempting sell back to sUSD")
    var possibleToTrade = await canWeTradeThisNow(targetCurrency, "sUSD", (portfolioComposition['minimumPercentageOfPortfolioPerTrade']*strength));
    if(possibleToTrade.status == "fail"){
      return possibleToTrade;
    }
    //If sell signal, for now, just sells all of position. This can be changed in the future
    var response =  await executeTrade(targetCurrency, "sUSD", 1, false);
    return response;
  }
  else{
    return {"status":"fail", "msg":"Please send a BUY or SELL signal"};

  }
}


async function percentageOfPool(targetCurrency){

  //get target balance
  try{
  var thePool = await factory.loadPool(returnSetPool())
  pool = thePool;
  var theComposition = await thePool.getComposition()
  var poolValue = await thePool.getPoolValue()
  var exchangeRates = await factory.getExchangeRates()
  var targetEffectiveValue = await exchangeRates.getEffectiveValue(
 targetCurrency,
 theComposition[targetCurrency].balance.toString(),
 "sUSD"
);

  var percentageOfPool = targetEffectiveValue/poolValue;

  var response = {"status":"success", "data":{"percentage":percentageOfPool, "usdBalance":targetEffectiveValue, "poolValue":poolValue}};

  return response;
}
catch(err){
  console.log(err)
  var response = {"status":"fail", "msg":err};
  return response;
}


  //convert to usd

  //get pool usd effective

  //divide convered amount by pool effect and return

}

function triggerCoolDown(){

  isCoolDownHappening = true;
  setTimeout(function(){
    isCoolDownHappening = false;
  }, coolDownPeriod)
}
async function createPortfolio(author, name){

  FACTORY_ADDRESS = "0x03d20ef9bdc19736f5e8baf92d02c8661a5941f7";
  pool = await factory.createPool(false, author, name, tradeableUniverse)
  globalPoolAddress = pool.getAddress()
  console.log(pool);
  return pool;
}


async function getComposition(poolAddress){
  try{
  var thePool = await factory.loadPool(poolAddress)
  pool = thePool;
  var theComposition = await thePool.getComposition()
  var poolValue = await thePool.getPoolValue()
  }

  catch(err){
    console.log(err)
    return {"status":"fail", "msg":err};
  }
  var trueComposition ={};
  var totalValue = 0;
  /*
  for(i in theComposition){
    var amountInUSD = parseInt(theComposition[i]['balance']) /   parseInt(theComposition[i]['rate']);

    trueComposition[i] = parseInt(amountInUSD) || 0;
    totalValue = totalValue+trueComposition[i];
  }
  */
  return {"status":"success", "composition":theComposition, "totalValue":totalValue, "poolValue":poolValue};
}

async function depositInPool( currency, howMuch){
  console.log("beginning pool deposit")
  var depositResponse={}
  try{
  let sUSD = await pool.getAsset(currency);
  var amount = howMuch * (Math.pow(10, 18));
  var approveResp = await sUSD.approve(pool.getAddress(), '100000000000000000000000000000')
  console.log(approveResp)
  depositResponse = await pool.deposit(amount.toString());
  depositResponse = {"status":"success", "msg":"funds loaded"}
  return depositResponse;
}

catch(err){
  return {"status":"fail", "msg":err}
}
  return depositResponse;
}

async function executeTrade(fromCoin, toCoin, portionOfFrom, asPercentageOfWholePool){
  console.log("attempting trade execution");



  try{


  composition = await pool.getComposition();
  exchangeRates = await factory.getExchangeRates()
  var fromEffectiveValue = await exchangeRates.getEffectiveValue(
 fromCoin,
 composition[fromCoin].balance.toString(),
 toCoin
);


  var adjustedPortionOfFrom = portionOfFrom;

  if(asPercentageOfWholePool ==true){
    console.log("asPercentageOfWholePool is true... adjusting")
    var percentageFrom = await percentageOfPool(fromCoin);
    percentageFrom = percentageFrom['data']['percentage']
    if(percentageFrom['data']['percentage'] !=0){
      console.log("multiple is"+(1/percentageFrom['data']['percentage']) )
      adjustedPortionOfFrom = (1/percentageFrom['data']['percentage']) * portionOfFrom;
    }

  }
  console.log("adjustedPortionFrom is" +adjustedPortionOfFrom)
//return {"data":fromEffectiveValue};
  howMuchToBuyOfToCoin = (fromEffectiveValue * parseFloat(adjustedPortionOfFrom));
  howMuchToBuyOfToCoin1=  howMuchToBuyOfToCoin.toString().split(".")[0]+"00000"
  howMuchToSell = composition[fromCoin].balance * parseFloat(portionOfFrom);

  if(portionOfFrom>.89){
    howMuchToSell = composition[fromCoin].balance;
  }

  howMuchToSell1 = howMuchToSell.toString().split(".")[0];

  //return {"data":howMuchToBuyOfToCoin1};
  console.log(howMuchToSell1 +"-- \n\n\n\n --");
  //console.log("target = "+howMuchToBuyOfToCoin)
  console.log("about to pool.exchange with params: "+fromCoin+ "howMuch = "+ howMuchToSell1+" | toCoin = "+toCoin)
  await pool.exchange(fromCoin, howMuchToSell1, toCoin)

  return {"status":"success", "data":howMuchToSell1};

}

catch(err){
  console.log(err)
  return {"status":"fail", "msg":err}
}


}


async function loadExamplePool(){
  try{
    if(typeof process.env.MNEMONIC =="PLEASE SET HERE"){
      console.log("Your pool will not work... setup your account in the .env file!")
    }
  pool = await factory.loadPool(returnSetPool());
  console.log("starting with Pool: "+pool.getAddress())
  return pool;
  }
  catch(err){
    console.log("\n\nExample pool has not been deployed yet on this fork\n\n. Deploy with /poolcreate endpoint ");
  }
}
async function canWeTradeThisNow(fromCurrency, toCurrency, percentage){
  console.log("checking if this trade is possible due to the trading rules and current portfolio composition...")
  //check that there is enough eth to trade


  try{


  var percentageFrom =await(percentageOfPool(fromCurrency));




  var perc = percentageFrom['data']['percentage'];
  if(perc < portfolioComposition['percentageOfPortfolioPerTrade']){
    return {"status":"fail", "msg":"You dont have enough money to perform the trade because of trade size"};

  }

  //check that we haven't trades this since the cooldown period
  if(isCoolDownHappening == true){
    return {"status":"fail", "msg":"Hold your horses... Cooldown period in effect. Trade not happening."};
  }

  //check toCurrency hasn't reached max indivudal hold
  var percentageTo = await(percentageOfPool(toCurrency));
  var perc = percentageTo['data']['percentage'];
  if(perc > portfolioComposition['maxIndividualShare'] && toCurrency != "sUSD"){
    return {"status":"fail", "msg":"You cant do this now because you cant hold that much of an asset that is not sUSD"};

  }

  //check if bot is paused
  if(isBotPaused == true){
    return {"status":"fail", "msg":"Bot is paused. Cannot execute"};
  }

  //if all are okay, return true.


  var canWeResponse = {"status":"success", "msg":"Check passed, okat for Executing "+ fromCurrency + "to "+ toCurrency, "time": new Date()};
  appendLogs(canWeResponse);

  return canWeResponse;
  }

  catch(err){
    console.log(err)
    var canWeResponse = {"status":"fail", "msg":"Excecution Error", "data":err};

  }
}


function appendLogs(logData){
  console.log(logData)
  theLogs.push(logData);
}




//END CORE FUNCTIONS

/**

-------------------------------------------------------------------------
------------                                                 ------------
-------------------------------------------------------------------------


**/


//SECTION: CLIENT APP INITIALIZATION
client = express()
  .use(express.static(path.join(__dirname, 'public')))
  .set('views', path.join(__dirname, 'views'))
  .set('view engine', 'ejs')
  .get("/", async function(req, res) {
      res.send("dHedge Bot 1 Vitals<br><hr><br>Status:<br><br>Is Bot Paused?: "+isBotPaused+"<br><br>CoolDown Status: "+ isCoolDownHappening+"<br><br>Pool Address:"+returnSetPool()+"<br><br>Caller/Wallet/Signer Address: "+returnPubKey())
  })

  //SECTION: ENDPOINTS  FOR TESTING AND TRADING USING CORE FUNCTIONS ABOVE

  .get("/toggleonoff", async function(req, res) {

    if(isBotPaused == false){
      isBotPaused= true;
    }
    else{
      isBotPaused = false;
    }
    res.send({"status":"success", "msg":"Bot running is now"+isBotPaused})
  })


  .get("/depositUSD", async function(req, res) {

    if(typeof req.query.amount == "undefined"){
      res.send({"status":"fail", "msg":"Please send amount (dont worry about all zeros, we will take care of the million zeroes for solidity)"})
      return;
    }
    var result = await depositInPool("sUSD", parseInt(req.query.amount));
    res.send(result)
  })

  .get("/setTradeSize", async function(req, res) {

    if(typeof req.query.size == "undefined"){
      res.send({"status":"fail", "msg":"Please send size"})
      return;
    }
    var size = parseFloat(req.query.size);
    if(size>=1){
      res.send({"status":"fail", "msg":"1 is 100%... Accident: did you mean 1%? 10% size = .1"})
      return;
    }

    portfolioComposition['percentageOfPortfolioPerTrade'] = size;
    return {"status":"success", "msg":"Updated trade size to "+ size}
  })

  .get("/composition", async function(req, res) {
    //default address: 0xC388C0160aE9FE37A6D379889a35D642074d5A41
    if(typeof req.query.address == "undefined"){
      res.send({"status":"fail", "msg":"Please send pool address"})
      return;
    }

    composition = await getComposition(req.query.address)
    res.send(composition);

  })


  .get("/setPoolAddress", async function(req, res) {
    //default address: 0xC388C0160aE9FE37A6D379889a35D642074d5A41
    if(typeof req.query.address == "undefined"){
      res.send({"status":"fail", "msg":"Please send pool address"})
      return;
    }

    globalPoolAddress = req.query.address;
    res.send({"status":"success", "msg":"pool adress is now"+ globalPoolAddress});

  })



  .get("/poolcreate", async function(req, res) {
    if(typeof req.query.author == "undefined"){
      res.send({"status":"fail", "msg":"Please send author"})
      return;
    }
    if(typeof req.query.name == "undefined"){
      res.send({"status":"fail", "msg":"Please send portfolio name as 'name'"})
      return;
    }
    console.log("Creating pool... please wait")
    newPoolResp = await createPortfolio(req.query.author, req.query.name);
    res.send(pool);

  })


  .get("/percentage", async function(req, res) {
    if(typeof req.query.symbol == "undefined"){
      res.send({"status":"fail", "msg":"Please send symbol"})
      return;
    }
      var info = await percentageOfPool(req.query.symbol);
      res.send(info);

    })

  .get("/executeTrade", async function(req, res) {
    if(typeof req.query.from == "undefined"){
      res.send({"status":"fail", "msg":"Please send from"})
      return;
    }
    if(typeof req.query.to== "undefined"){
      res.send({"status":"fail", "msg":"Please send to"})
      return;
    }

    if(typeof req.query.portion == "undefined"){
      res.send({"status":"fail", "msg":"Please send portion"})
      return;
    }

    var resp = await executeTrade(req.query.from , req.query.to, parseFloat(req.query.portion ), false)

    res.send(resp);

  })


  .get("/trigger", async function(req, res) {
    if(typeof req.query.target == "undefined"){
      res.send({"status":"fail", "msg":"Please send target"})
      return;
    }
    if(typeof req.query.signal== "undefined"){
      res.send({"status":"fail", "msg":"Please send signal"})
      return;
    }

    if(typeof req.query.strength == "undefined"){
      res.send({"status":"fail", "msg":"Please send strength"})
      return;
    }
    if(isNaN(req.query.strength)){
      res.send({"status":"fail", "msg":"Please send strength as number"})
      return;
    }


    var resp = await restHandler(req.query.target, req.query.signal, parseFloat(req.query.strength));

    res.send(resp);

  })


  .get("/exampleExchangeForSanityTests", async function(req, res) {
    resp = await pool.exchange('sUSD', '100000000000000000', 'sETH')
    res.send(resp);

  })



//END ENDPOINTS


//SECTION: OPEN PORT FOR COMMUNICATION
  .listen(PORT, () => console.log(`Listening on ${ PORT }`))
