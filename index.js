const express = require ("express");
const axios = require("axios");
const PORT = process.env.PORT || 4040;
const { handler } = require("./controller");
const connectDB = require("./server/db");
// const bodyParser = require('body-parser');
const { User } = require('./models/User'); // The user schema model
const tasksJson = require('./models/tasksJson')

const crypto = require('crypto');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// app.use(bodyParser.json());

app.use(cors());

const db = connectDB();

const dbMiddleware = async (req, res, next) => {
  try {
    if (!db.isConnected) {
      await connectDB();
    }
    req.db = db;
    // const {User, Task} = require('./models/User');
    next();
  } catch (error) {
    console.error('Error connecting to database:', error);
    res.status(500).send('Server error');
  }
  };

  const getNextSequence = async (sequenceName) => {
    const { Counter } = require('./models/User'); 
    const sequenceDoc = await Counter.findByIdAndUpdate(
      sequenceName,
      { $inc: { seq: 1 } }, // Increment the sequence number by 1
      { new: true, upsert: true } // Create a new doc if it doesn't exist
    );
    return sequenceDoc.seq;
  };

// Telegram Authentication Route
app.get("/auth/telegram", dbMiddleware, (req, res) => {
    const authData = req.query;
    const secret = crypto.createHash('sha256').update(process.env.TOKEN).digest();  // Use your bot token
    const checkString = Object.keys(authData)
        .filter(key => key !== 'hash')
        .sort()
        .map(key => `${key}=${authData[key]}`)
        .join('\n');
    
    const hash = crypto.createHmac('sha256', secret).update(checkString).digest('hex');
    console.log("authData auth:", authData)
    if (hash === authData.hash) {
        // Authentication successful
        console.log("auth data id:", authData.id);
        // res.send('Authentication successful');
        // Save or process user info here
        res.json({
            telegramId: authData.id,  // Assuming the ID is the telegram ID
            first_name: authData.first_name,
            username: authData.username,
        });
    } else {
        // Authentication failed
        res.status(403).send('Authentication failed');
    }
});

app.post('/api/userdata', dbMiddleware, async (req, res) => {
    console.log('Request Body:', req.body);
    const { telegramId } = req.body;
    console.log("telegram id in userdata:", telegramId);
  
    try {
      const user = await User.findOne({ telegramId });
      if (!user) {
        console.log("user not found");
        return res.status(404).json({ message: 'User not found' });
      }
      res.json(user);
      console.log("user", user);
    } catch (error) {
      console.error('Error fetching user data:', error);
      res.status(500).send('Server error');
    }
  });

  // app.get('/api/populate-tasks', dbMiddleware, async (req, res) => {
  // const { Task } = require('./models/User'); // The user schema model

  //   try {
  //     console.log("populating task")
  //     await Task.deleteMany(); // clear existing tasks
  //     await Task.insertMany(tasksJson);
  //     console.log("populating task done !!!")
  //     res.json({ message: 'Tasks populated successfully' });
  //   } catch (error) {
  //     if (error.name === 'ValidationError') {
  //       console.error('Validation Error:', error);
  //       res.status(400).send('Validation error');
  //     } else {
  //       console.error('Error populating tasks:', error);
  //       res.status(500).send('Server error');
  //     }
  //     // res.status(500).send('Server error');
  //   }
  // });

  // Endpoint to check if a user is a member of the Telegram group
  app.post("/api/checkGroupMembership", async (req, res) => {
  const token = process.env.TOKEN;

  console.log('Request Body:', req.body);
  const { telegramId, groupChatId} = req.body;
  console.log(`checking membership with token ${token}`)

  try {
    const response = await axios.get(
      `https://api.telegram.org/bot${token}/getChatMember`,
      {
        params: {
          chat_id: groupChatId,
          user_id: telegramId,
        },
      }
    );

    const isMember =
      response.data.ok &&
      (response.data.result.status === "member" ||
        response.data.result.status === "administrator" ||
        response.data.result.status === "creator");
        console.log("ismember:", isMember);

    res.json({ isMember });
  } catch (error) {
    res.status(500).json({ error: "Failed to check group membership" });
    console.log("failed to check membership")
  }
});

  app.post('/api/populate-tasks', dbMiddleware, async (req, res) => {
    const { Task } = require('./models/User'); // The Task model
    
    try {
      console.log("populating tasks");
      await Task.deleteMany(); // Clear existing tasks
  
      // Iterate over each task and assign an auto-incremented taskID
      for (const task of tasksJson) {
        // Get the next taskID from the counter collection
        const nextTaskID = await getNextSequence('taskID');
        task.taskID = nextTaskID; // Assign the auto-incremented taskID
  
        // Create and save the new task with the auto-incremented taskID
        await new Task(task).save();
      }
  
      console.log("populating tasks done !!!");
      res.json({ message: 'Tasks populated successfully' });
    } catch (error) {
      console.error('Error populating tasks:', error);
      res.status(500).send('Server error');
    }
  });

  app.post('/api/saveUsername', async (req, res) => {
    try {
      // console.log(`req.body ${(req.body).json()}`);
      const { platform, username, telegramId } = req.body;
  
      // Ensure the platform is valid
      const validPlatforms = ['YouTube', 'Twitter', 'TikTok', 'Discord'];
      if (!validPlatforms.includes(platform)) {
        return res.status(400).json({ error: 'Invalid platform' });
      }
  
      // Find the user by telegramId
      const user = await User.findOne({ telegramId });
  
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
  
      // Update the corresponding platform username
      user.socialMediaUsernames[platform] = username;
  
      // Save the updated user data
      await user.save();
      console.log("successfully saved username");
  
      res.status(200).json({ message: 'Username saved successfully', user });
    } catch (error) {
      console.error('Error saving username', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // app.post('/api/taskdata', dbMiddleware, async (req, res) => {
  //   const { Task, UserTask } = require('./models/User'); // The Task model
  //   try {
  //     const { telegramId } = req.body;
  
  //     // Fetch tasks with no status on UserTask
  //     const tasksWithNoStatus = await Task.find({
  //       _id: { $not: { $in: await UserTask.find({ telegramId }).select('taskID') } },
  //     });
  
  //     // Fetch tasks with status except "completed"
  //     const tasksWithStatus = await UserTask.find({
  //       telegramId,
  //       taskStatus: { $ne: 'completed' },
  //     })
  //       .populate('taskID')
  //       .exec();
  
  //     // Combine results
  //     const allTasks = [...tasksWithNoStatus, ...tasksWithStatus.map((ut) => ut.taskID)];
  //     // console.log(allTasks)
  //     console.log("getting all task")
  
  //     res.json(allTasks);
  //   } catch (error) {
  //     console.error('Error fetching user tasks:', error);
  //     res.status(500).send('Server error');
  //   }
  // });

  app.post('/api/taskdata', dbMiddleware, async (req, res) => {
    const { Task, UserTask } = require('./models/User'); // The Task model

    // const isTelegram = req.headers['user-agent'].includes('Telegram');

    // if (!isTelegram) {
    //   res.redirect('https://t.me/Tom_Cat_Affiliate_bot');
    // }
    try {
      const { telegramId } = req.body;
  
      // Fetch all tasks
      const allTasks = await Task.find();
  
      // Fetch user task statuses (tasks associated with this telegramId)
      const userTasks = await UserTask.find({ telegramId }).select('taskID taskStatus').lean();
  
      // Create a map of taskID to taskStatus for easier lookup
      const taskStatusMap = userTasks.reduce((map, userTask) => {
        map[userTask.taskID] = userTask.taskStatus;
        return map;
      }, {});
  
      // Combine tasks with their corresponding status
      const tasksWithStatus = allTasks.map((task) => {
        return {
          ...task.toObject(),
          taskStatus: taskStatusMap[task.taskID] || 'unverified', // Default to 'not started' if no status
        };
      });
  
      console.log("Fetching all tasks with status for", telegramId);
      // console.log("tasksWithStatus", tasksWithStatus);
      console.log("tasksWithStatus");



  
      res.json(tasksWithStatus);
    } catch (error) {
      console.error('Error fetching user tasks:', error);
      res.status(500).send('Server error');
    }
  });
  

  // Route to fetch task status
  app.get('/api/getTaskStatus', dbMiddleware, async (req, res) => {
    const { UserTask } = require('./models/User'); // The Task model

    const { telegramId, taskID } = req.query;

    try {
      // Find the user by telegramId
      const user = await User.findOne({ telegramId });
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Find the user's task and get the status
      const userTask = await UserTask.findOne({ telegramId: user.telegramId, taskID });
      if (!userTask) {
        return res.status(404).json({ error: 'Task not found for this user' });
      }

      // Respond with the task status
      console.log(`user task status: ${userTask}`)
      res.status(200).json({ userTask });
    } catch (error) {
      console.error('Error fetching task status:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Update task status route
app.post('/api/updateTaskStatus', dbMiddleware, async (req, res) => {
  const { UserTask } = require('./models/User'); // The Task model

  const { telegramId, taskID, status } = req.body;
  console.log(`req.body: ${JSON.stringify(req.body)}`);

  try {
    // Find the UserTask by telegramId and taskID and update the status
    const userTask = await UserTask.findOneAndUpdate(
      { telegramId, taskID },
      { taskStatus: status }, // Update the status to 'pending'
      { 
        new: true,           // Return the updated document
        upsert: true,        // Create the document if it doesn't exist
        setDefaultsOnInsert: true  // Set default values if a new document is inserted
      }
    );

    if (!userTask) {
      console.log("UserTask not found");
      return res.status(404).json({ error: "UserTask not found" });
    }

    console.log("Task status updated");
    res.status(200).json({ message: "Task status updated", userTask });
  } catch (error) {
    console.error("Error updating task status:", error);
    res.status(500).json({ error: "Failed to update task status" });
  }
});

app.post('/api/verifyTonTransaction', dbMiddleware, async (req, res) => {
  const { taskId, toAddress, fromAddress, amount } = req.body;

  try {
    // Use the toncenter API or any other TON blockchain API to fetch recent transactions
    const response = await axios.get(`https://toncenter.com/api/v2/getTransactions`, {
      params: {
        address: toAddress,
        limit: 10,
        // You’ll need to provide your API key if toncenter requires one
      },
    });

    // Find a matching transaction in the last 10 transactions
    const matchingTransaction = response.data.transactions.find((transaction) => {
      return (
        transaction.in_msg.source === fromAddress &&
        transaction.in_msg.destination === toAddress &&
        parseFloat(transaction.in_msg.value) / 1e9 === amount
      );
    });

    // Respond with confirmation status based on the transaction search
    if (matchingTransaction) {
      res.json({ isConfirmed: true });
      console.log(`Transaction confirmed for task ID: ${taskId}`);
    } else {
      res.json({ isConfirmed: false });
      console.log(`No matching transaction found for task ID: ${taskId}`);
    }
  } catch (error) {
    console.error("Failed to verify transaction", error);
    res.status(500).json({ error: "Failed to verify transaction" });
  }
});

// ...........................................................
// Route to update points and profitPerHour
app.post('/api/updatePoints', dbMiddleware, async (req, res) => {
  const { telegramId, points, profitPerHour } = req.body;
  console.log(`req.body: ${JSON.stringify(req.body)}`);
  console.log("updating the points and profitperhour");

  if (!telegramId) {
    return res.status(400).json({ error: "telegramId is required" });
  }

  try {
    const updateFields = {};
    
    // Only add fields to update if they are provided in the request
    if (typeof points === 'number') {
      updateFields.points = points;
    }
    if (typeof profitPerHour === 'number') {
      updateFields.profitPerHour = profitPerHour;
    }

    const updatedUser = await User.findOneAndUpdate(
      { telegramId },
      { $set: updateFields },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ message: "User data updated successfully", updatedUser });
  } catch (error) {
    console.error("Error updating user data:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("*", dbMiddleware, async (req, res) => {
    // console.log(req.body);
    res.send(await handler(req));
});
app.get("*", dbMiddleware, async (req, res) => {
    // console.log(req.body);
    res.send(await handler(req));
});

app.listen(PORT, function (err) {
    if (err) console.log(err);
    console.log("server listening on PORT,", PORT);
});
