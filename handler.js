'use strict';

var AccessToken = require('twilio').jwt.AccessToken;
var randomName = require('./randomname');

module.exports.token = (event, context, callback) => {
  const respond = (err, data) => {
    const response = {
      statusCode: err ? 500 : 200,
      headers: {
        'Access-Control-Allow-Origin' : '*'
      },
      body: JSON.stringify(data)
    };

    callback(null, response);
  };

  var identity = randomName();

  // Create an access token which we will sign and return to the client,
  // containing the grant we just created.
  var token = new AccessToken(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_API_KEY,
    process.env.TWILIO_API_SECRET
  );

  // Assign the generated identity to the token.
  token.identity = identity;

  // Grant the access token Twilio Video capabilities.
  var grant = new AccessToken.VideoGrant();
  token.addGrant(grant);

  // Serialize the token to a JWT string and include it in a JSON response.
  respond(null, {
    identity: identity,
    token: token.toJwt()
  });
};
