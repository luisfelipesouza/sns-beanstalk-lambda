const https = require("https");

function sendNotification(snsMessage) {
  let payload = JSON.stringify(createNotificationPayload(snsMessage));
  console.log(Buffer.byteLength(payload));
  const options = {
    hostname: process.env.WEBHOOK_HOST,
    path: process.env.WEBHOOK_PATH,
    port: 443,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(payload),
    },
  };

  var req = https.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
    res.setEncoding("utf8");
    res.on("data", (chunk) => {
      console.log(`BODY: ${chunk}`);
    });
    res.on("end", () => {
      console.log("No more data in response.");
    });
  });

  req.on("error", (e) => {
    console.log(`problem with request: ${e.message}`);
  });

  req.write(payload);
  req.end();
  return;
}

function createNotificationPayload(snsMessage) {
  let payload = {
    "@type": "MessageCard",
    "@context": "http://schema.org/extensions",
    summary: "AWS Elastic Beanstalk Notification",
    themeColor: "3498db",
    title: `AWS Elastic Beanstalk Notification`,
    sections: [
      {
        activityTitle: `${snsMessage.Message}`,
        facts: [
          {
            name: "Time:",
            value: snsMessage.Timestamp,
          },
          {
            name: "Account:",
            value: process.env.ACCOUNT,
          },
          {
            name: "Region:",
            value: process.env.REGION,
          },
          {
            name: "Application:",
            value: process.env.APPLICATION,
          },
          {
            name: "URL:",
            value: snsMessage["Environment URL"],
          },
          {
            name: "DNS:",
            value: process.env.DOMAIN,
          },
        ],
      },
    ],
    potentialAction: [],
  };
  console.log("MSTeams payload:", JSON.stringify(payload));
  return payload;
}

function parseSNSMessage(message) {
  const parsedMessage = message.split("\n").reduce((obj, line) => {
    if (line.length) {
      const key = line.split(":", 1)[0];
      const value = line.substr(key.length + 2);
      if (key !== "Environment URL" || value !== "http://null") {
        const newObj = Object.assign({}, obj);
        newObj[key] = value;
        return newObj;
      }
    }
    return obj;
  }, {});
  // eslint-disable-next-line no-console
  console.log("Parsed SNS Message:", JSON.stringify(parsedMessage));
  return parsedMessage;
}

exports.handler = async (event, context, callback) => {
  let snsMessage;

  try {
    //await sendNotification(pipeline);
    console.log("SNS Event:", JSON.stringify(event));
    const snsMessage = parseSNSMessage(event.Records[0].Sns.Message);
    sendNotification(snsMessage);
  } catch (err) {
    console.error(
      `Unable to sendNotification for ${JSON.stringify(snsMessage, null, 2)}`
    );
    console.error(JSON.stringify(err, null, 2));

    return callback(err);
  }

  return callback(null);
};
