'use strict';

const Twilio = require('twilio');
const randomName = require('./randomname');

function corsResponse(callback, err, data) {
  if (err) console.log(err);

  const response = {
    statusCode: err ? 500 : 200,
    headers: {
      'Access-Control-Allow-Origin' : '*'
    },
    body: JSON.stringify(data)
  };

  callback(null, response);
}

module.exports.token = (event, context, callback) => {
  const respond = corsResponse.bind(null, callback);
  const AccessToken = Twilio.jwt.AccessToken;
  const identity = randomName();

  // Create an access token which we will sign and return to the client,
  // containing the grant we just created.
  const token = new AccessToken(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_API_KEY,
    process.env.TWILIO_API_SECRET
  );

  // Assign the generated identity to the token.
  token.identity = identity;

  // Grant the access token Twilio Video capabilities.
  const grant = new AccessToken.VideoGrant();
  token.addGrant(grant);

  // Serialize the token to a JWT string and include it in a JSON response.
  respond(null, {
    identity: identity,
    token: token.toJwt()
  });
};

module.exports.rooms = (event, context, callback) => {
  const respond = corsResponse.bind(null, callback);

  // Create an access token which we will sign and return to the client,
  // containing the grant we just created.
  const client = new Twilio(
    process.env.TWILIO_API_KEY,
    process.env.TWILIO_API_SECRET,
    {
      accountSid: process.env.TWILIO_ACCOUNT_SID
    }
  );

  client.video.rooms.list({
    status: 'in-progress'
  })
    .then(rooms => {
      respond(null, rooms.map(room => ({
        dateCreated: room.dateCreated,
        dateUpdated: room.dateUpdated,
        uniqueName: room.uniqueName
      })));
    })
    .catch(err => respond(err));
};
