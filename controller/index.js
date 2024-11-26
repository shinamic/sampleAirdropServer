const { handleMessage } = require("./lib/Telegram");

async function handler(req, method) {
    const { body } = req;

    if (!body || !body.message) {
        console.log("No valid body or message received.");
        return;
    }

    // console.log(`this is the body: ${JSON.stringify(body, null, 2)}`);
    if (body) {
        const messageObj = body.message;
        await handleMessage(messageObj);
        console.log("message obj", messageObj);
    }
    return;
}

module.exports = { handler };