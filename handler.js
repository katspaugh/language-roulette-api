'use strict';

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

/* Twilio Video token */
module.exports.token = (event, context, callback) => {
  const Twilio = require('twilio');
  const randomName = require('./randomname');

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

/* Twilio rooms */
module.exports.rooms = (event, context, callback) => {
  const Twilio = require('twilio');

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

/* IoT auth */
module.exports.auth = (event, context, callback) => {
  const AWS = require('aws-sdk');
  const iot = new AWS.Iot();
  const sts = new AWS.STS();
  const roleName = 'serverless-notifications';

  const buildResponseObject = (iotEndpoint, region, accessKey, secretKey, sessionToken) => {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        iotEndpoint: iotEndpoint,
        region: region,
        accessKey: accessKey,
        secretKey: secretKey,
        sessionToken: sessionToken
      })
    };
  };

  const getRegion = (iotEndpoint) => {
    const partial = iotEndpoint.replace('.amazonaws.com', '');
    const iotIndex = iotEndpoint.indexOf('iot');
    return partial.substring(iotIndex + 4);
  };

  // Get random Int
  const getRandomInt = () => {
    return Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
  };

  // get the endpoint address
  iot.describeEndpoint({}, (err, data) => {
    if (err) return callback(err);

    const iotEndpoint = data.endpointAddress;
    const region = getRegion(iotEndpoint);

    // get the account id which will be used to assume a role
    sts.getCallerIdentity({}, (err, data) => {
      if (err) return callback(err);

      const params = {
        RoleArn: `arn:aws:iam::${data.Account}:role/${roleName}`,
        RoleSessionName: getRandomInt().toString()
      };

      // assume role returns temporary keys
      sts.assumeRole(params, (err, data) => {
        if (err) return callback(err);

        const res = buildResponseObject(
          iotEndpoint,
          region,
          data.Credentials.AccessKeyId,
          data.Credentials.SecretAccessKey,
          data.Credentials.SessionToken
        );

        callback(null, res);
      });
    });
  });
};
