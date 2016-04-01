var TelegramBot = require('node-telegram-bot-api');
var config= require("./config")
var request= require("request");
var shipit= require("shipit");
var log= require("captains-log")();
var _= require("lodash");
var SUPPORTED_CARRIERS=["dhl"];
var token = config.token;
// Setup polling way
var bot = new TelegramBot(token, {polling: true});

bot.onText(/\/track (.+)/, function (msg, match) {
	var fromId = msg.from.id;
	var trackingCode=match[1];
	log.verbose("Guessing tracking code: ",trackingCode);
	var carrier=shipit.guessCarrier(trackingCode);
	
	//TODO this is just a hack to make it work with DHL Express
	if (_.isEmpty(carrier)){
		var pattern = /^\d{10}/;
		if (pattern.test(trackingCode)) carrier=["dhl"];
	}
	
	if (_.isEmpty(carrier)) {
		log.warn("Could not find carrier for the tracking code ",trackingCode);
		return bot.sendMessage(fromId,"could not find carrier for tracking number "+trackingCode);
	}
	var guessedCarrier=carrier[0];
	if (_.indexOf(SUPPORTED_CARRIERS,guessedCarrier)==-1){
		log.warn("Could not find carrier for the tracking code ",trackingCode);
		return bot.sendMessage(fromId,"Sorry, we don't support that carrier yet");
	}
	request.get('http://shipit-api.herokuapp.com/api/carriers/'+guessedCarrier+'/'+trackingCode,function(err,res,body){
		if (err){
			log.error("Error trying to get tracking code from Heroku shipit api");
			return;
		}
		log.verbose("Tracking info: ",body);
		var parsedBody=JSON.parse(body);
	
		if (parsedBody.error) return bot.sendMessage(fromId,parsedBody.error.error+ " for tracking number "+match[1]);
	
		var activities=parsedBody.activities;
		var message="";
		
		activities.forEach(function(activity,i){
			if (i==0) message+=activity.details+" - _"+activity.location + "_ - "+new Date(activity.timestamp).toISOString().replace('T', ' ').substr(0, 19)+ "\n";
			else message+=activity.details+" - _"+activity.location + "_ - "+ new Date(activity.timestamp).toISOString().replace('T', ' ').substr(0, 19)+ "\n";
		});
		log.info("Message sent for user ",fromId);
		bot.sendMessage(fromId, message,{parse_mode:"Markdown"});
	});
});
bot.onText(/\/subscribe (.+)/, function (msg, match) {
	var fromId = msg.from.id;
	var trackingCode=match[1];
	var message="Work in progress. This feature will be available in the near future";
	bot.sendMessage(fromId, message,{parse_mode:"Markdown"});
});
