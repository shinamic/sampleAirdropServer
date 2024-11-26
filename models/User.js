const mongoose = require('mongoose');
// const AutoIncrement = require("mongoose-sequence")(mongoose);
// const autoIncrement = require('mongoose-auto-increment');

const counterSchema = new mongoose.Schema({
    _id: { type: String, required: true }, // Sequence name (e.g., 'taskID')
    seq: { type: Number, default: 0 } // Incrementing sequence number
  });
  
  const Counter = mongoose.model('Counter', counterSchema);

const userSchema = new mongoose.Schema({
    telegramId: { type: String, required: true, unique: true },
    referralId: { type: String, required: true, unique: true },
    referredBy: { type: String, default: null },  // Referral ID of the person who referred this user
    chatusername: { type: String, default: null},
    createdAt: { type: Date, default: Date.now },
    referredUsers: [{
        username: String,
        telegramId: String
      }],
       // Add fields for the social media usernames
  socialMediaUsernames: {
    YouTube: { type: String, default: null },
    Twitter: { type: String, default: null },
    TikTok: { type: String, default: null },
    Discord: { type: String, default: null }
  },
  points: { type: String, required: true, default: 10 },
  profitPerHour: { type: String, required: true, default: 300 },
  clickPerTap: {type: String, required: true, default: 1},
  wallet: [{
    exchange: { type: String, required: true },
    uid: { type: String, required: true },
    address: { type: String, required: true },
    memo: { type: String, default: null }
  }]
});

const User = mongoose.model('User', userSchema);

const taskSchema = new mongoose.Schema({
    taskID: { type: Number, unique: true },
    platform: { type: String, required: true },
    iconClass: { type: String, required: true },
    taskDescription: { type: String, required: true },
    friendsCount: { type: Number,},
    reward: { type: String, required: true },
    videoCode: { type: String, default: null },
    groupChatId: { type: String, default: null },
    taskType: { 
        type: String, 
        enum: ['joinCommunity', 'joinTelegramCommunity', 'watchVideo', 'profitPerHour', 'tonTransaction'], 
        required: true 
      },
    taskLink: { type: String, required: true },
    verification: { type: String, required: true },
    category: { type: String, required: true } // added category field
  });


  const Task = mongoose.model('Task', taskSchema);

  const userTaskSchema = new mongoose.Schema({
    telegramId: { type: String, ref: 'User', required: true }, 
    taskID: { type: Number, required: true },
    taskStatus: { type: String, enum: ['pending', 'declined', 'completed', 'unverified', 'claimed'], required: true },
    rewardClaimed: { type: Boolean, default: false }
  });

  const UserTask = mongoose.model('UserTask', userTaskSchema);

  module.exports = {
    User,
    Task,
    UserTask,
    Counter
  };
