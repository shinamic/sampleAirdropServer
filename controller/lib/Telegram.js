const { axiosInstance } = require("./axios");
// const connectDB = require("../../server/db.js");
const { User } = require('../../models/User.js'); // The user schema model
const crypto = require('crypto');
require('dotenv').config();
// const TelegramBot = require('node-telegram-bot-api');
const token = process.env.TOKEN;


const { Telegraf, Markup } = require('telegraf');
const bot = new Telegraf(token);
// const { Keyboard } = require('telegram-keyboard')
// let globalTelegramId; // Declare global variable

// connectDB();

// const verifyTelegramAuth = (query) => {
//     const secret = crypto.createHash('sha256').update(process.env.TELEGRAM_BOT_TOKEN).digest();
//     const checkString = Object.keys(query)
//       .filter((key) => key !== 'hash')
//       .map((key) => `${key}=${query[key]}`)
//       .sort()
//       .join('\n');
//     const hash = crypto.createHmac('sha256', secret).update(checkString).digest('hex');
//     return hash === query.hash;
//   };



function sendMessage(messageObj, messageText) {
    return axiosInstance.get("sendMessage", {
        chat_id: messageObj.chat.id,
        text: messageText,
    });
}

// Function to generate a unique referral ID
function generateReferralId() {
    return 'sample' + crypto.randomBytes(5).toString('hex');  // Generates a referral ID like 'kentIdxxxxxx'
}

// Function to send message with inline buttons
async function sendWelcomeMessageWithButtons(chatId, chatusername) {
    const telegramId = chatId.toString();
    const inlineKeyboard = Markup.inlineKeyboard([
        [
            Markup.button.url('Youtube', 'https://youtube.com/@freecodecamp?si=V1MFKPg5V-6xh1jq'),
            Markup.button.url('Tiktok', 'https://www.tiktok.com')
        ],
        [
            Markup.button.url('Launch Sample Airdrop', `https://t.me/sample_Airdrop_Bot/sampleAirdrop?sampleId=${telegramId}`)
        ]
    ]);

    await bot.telegram.sendMessage(
        chatId,
        `Hello ${chatusername} ! Welcome to sampleairdrop !! 
        This bot is just to show you a sample of what i'll be bulding for you,\n
        You are now the director of a crypto exchange.
        Which one? You choose. Tap the screen, collect coins, pump up your passive income, 
        develop your own income strategy.
        We’ll definitely appreciate your efforts once the token is listed (the dates are coming soon).
        Don't forget about your friends — bring them to the game and get even more coins together!`,
        inlineKeyboard
    );
}


// Handle start command and referral code
async function handleStartCommand(messageObj, referralCode) {
    const telegramId = messageObj.chat.id.toString();
    const chatId = messageObj.chat.id;
    const chatusername = messageObj.chat.username;

    console.log("this is chat telegramid", chatId);
    // Store telegramId in the global variable
    // globalTelegramId = telegramId;


    try {
        // Check if user already exists in the database
        let user = await User.findOne({ telegramId });

        if (!user) {
            // If the user is new, create a new one

            const referralId = generateReferralId();
            user = new User({
                telegramId,
                referralId,
                referredBy: referralCode || null,  // Save the referral code if provided
                chatusername: chatusername || "anonymoususer"
            });

            await user.save();

            console.log('New user created.');
            console.log(`gotten referalcode trying to populate. ${referralCode}`);


            // Update the referredBy user's referredUsers field
            if (referralCode) {
                console.log("entering the referalusers:", referralCode)
                const referrer = await User.findOne({ referralId: referralCode });
                if (referrer) {
                referrer.referredUsers.push({ 
                    username: chatusername, 
                    telegramId 
                });
                await referrer.save();
                console.log('Referrer updated.');
                }
            }

                    

            // Send message with buttons to new users
            await sendWelcomeMessageWithButtons(chatId, chatusername);
        } else {
            // The user already exists
            console.log('Existing user.');
            await sendWelcomeMessageWithButtons(chatId, user.chatusername || "anonymoususer");  // Send message with buttons to existing users
            return sendMessage(messageObj, `Welcome back! Your referral link is https://t.me/sample_Airdrop_Bot?start=${user.referralId}`); 
        }
    } catch (error) {
        console.error('Error in start command:', error);
        return sendMessage(messageObj, "Something went wrong. Please try again later.");
    }
}

// Function to handle incoming messages
function handleMessage(messageObj) {
    const messageText = messageObj.text || "";

    // Handle commands starting with "/"
    if (messageText.startsWith("/start")) {
        const commandParts = messageText.split(" ");
        const referralCode = commandParts.length > 1 ? commandParts[1] : null;  // Capture referral code after "/start" if provided

        console.log(`commandParts: ${commandParts}`);
        console.log(`refcode: ${referralCode}`);
        // return
        return handleStartCommand(messageObj, referralCode);
    } else {
        const errormessage = `invalid command, send a valid command from menu or send "/start"`;
        return sendMessage(messageObj, errormessage);
        // return sendMessage(messageObj);
    }
}


module.exports = { handleMessage };
