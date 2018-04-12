var HTTPS = require('https');
var http = require('http');
var Promise = require('promise');

const botId = process.env.BOT_ID;

const regex = /[^\[]*(\[([^\[]*)\])*/;


function extractCards(message) {
  var cards = [];
  var card = /\[[^\[]*\]/g.exec(message);
  while (card != null) {
    message = message.replace(card, '');
    cards.push(card[0]);
    card = /\[[^\[]*\]/g.exec(message);
  }
  return cards;
}

function fetchCard(card, cardCallback, responder) {
  var cardName = card.slice(1, -1);
  console.log(cardName);
  var link;
  return http.get({
    host: "api.magicthegathering.io",
    path: "/v1/cards?name=" + encodeURI(cardName),
    method: "GET",
  }, function(response) {
    console.log("Received mtg.io API response.");
    var body = '';
    response.on('data', function(d) {
      body += d;
    });
    response.on('end', function() {
      try {
        var parsed = JSON.parse(body);
      } catch(error) {
        console.log("Error parsing response body: " + error);
        return;
      }
      var matches = parsed["cards"];
      if (matches.length == 0) {
        return;
      }
      card = matches[0];
      cardCallback({
        name: card.name,
        manaCost: card.manaCost,
        image: card.imageUrl,
        type: card.type,
        types: card.types,
        text: card.text,
        power: card.power,
        toughness: card.toughness,
      }, responder);
    });
  });
}

/**
 * Extracts request message and responds if necessary.
 */
function respond() {
  const request = JSON.parse(this.req.chunks[0]);
  const message = request.text;
  const sender = request.sender_type;
  if (sender != "user") {
    return;
  }

  var response = null;

  cards = extractCards(message);
  console.log(cards);

  for (var i = 0; i < cards.length; i++) {
    var card = cards[i];
    var sendCard = function(parsedCard, responder) {
      var text = parsedCard.name + ' ' + parsedCard.manaCost + '\n';
      if (parsedCard.types.indexOf('Creature') != -1) {
        text = text + parsedCard.type + ' ' + parsedCard.power + '/' + parsedCard.toughness + '\n';
      } else {
        text = text + parsedCard.type + '\n';
      }
      if (parsedCard.image) {
        text = text + parsedCard.image;
      } else {
        text = text + parsedCard.text;
      }
      response = {
        'text': text
      }
      console.log(response);
      send(Promise.resolve(response), responder);
    }
    return fetchCard(card, sendCard, this);
  }
  return send(Promise.resolve(null), this);
}

/**
 * Send request to GroupMe API to post message on bot's behalf
 * @private
 */
function send(responsePromise, responder) {
  responsePromise.then(function(response) {
    console.log('about to send message to groupme: ' + JSON.stringify(response));
    sendHttpRequest(response, responder);
  }, function(error) {
    console.log("Error!");
    response = {
      'text': 'There was an error processing the request: ' +
          JSON.stringify(error)
    }
  });
}

function sendHttpRequest(response, responder) {
  console.log(response);
  responder.res.writeHead(200);
  if (response != null) {
    response['bot_id'] = botId;
    console.log(response);

    const options = {
      hostname: 'api.groupme.com',
      path: '/v3/bots/post',
      method: 'POST'
    };

    var req = HTTPS.request(options, function(res) {
      if (res.statusCode != 202) {
        console.log('rejecting bad status code ' + res.statusCode);
        console.log(res);
      }
    });

    req.on('error', function(err) {
      console.log('error posting message '  + JSON.stringify(err));
    });
    req.on('timeout', function(err) {
      console.log('timeout posting message '  + JSON.stringify(err));
    });

    req.end(JSON.stringify(response));
  }
  responder.res.end();
}

exports.respond = respond;
