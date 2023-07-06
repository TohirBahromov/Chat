const express = require("express")
const app = express()
const dotenv = require("dotenv")
const mongoose = require("mongoose")
const User = require("./models/User")
const Message = require("./models/Messages")
const cors = require("cors")
const jwt = require("jsonwebtoken")
const bcrypt = require("bcrypt")
const fs = require("fs")
const { WebSocketServer } = require("ws")
const cookieParser = require("cookie-parser")
const { log } = require("console")
dotenv.config()

mongoose.connect(process.env.MONGO)
const jwtSecret = process.env.JWT_SECRET
const Salt = bcrypt.genSaltSync(10)

app.use(cors({
  credentials:true,
  origin:"https://chatagramm.netlify.app"
}))
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "https://chatagramm.netlify.app");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});
app.use("/uploads",express.static(__dirname + "/uploads"))
app.use(cookieParser())
app.use(express.json())
app.use(express.urlencoded({extended:false}))

async function getUserDataFromRequest(req){
  return new Promise((resolve,reject) => {
    const token = req.cookies?.token
    if(token){
      jwt.verify(token, jwtSecret, {}, (err, userData)=>{
        if(err) throw err;
        resolve(userData);
      })
    } else {
      reject("no token");
    }
  })
}

app.get("/test",(req,res)=>{
  res.json("test")
})
app.get("/profile",(req,res)=>{
  const token = req.cookies?.token
  if(token){
    jwt.verify(token, jwtSecret, {}, (err, userData)=>{
      if(err) throw err;
      res.json({userData})
    })
  } else{
    res.status(401).json("no token")
  }
})
app.get("/people", async (req,res) => {
  const users = await User.find({}, {"_id":1,username:1});
  res.json(users)
})
app.get("/messages", async (req,res) => {
  const messages = await Message.find()
  res.json(messages)
})
app.get("/messages/:userId", async (req,res)=>{
  const {userId} = req.params
  const userData = await getUserDataFromRequest(req)
  const ourUserId = userData.userId;
  const messages = await Message.find({
    sender:{$in:[userId, ourUserId]},
    recipient:{$in:[userId, ourUserId]},
  }).sort({createdAt:1});
  res.json(messages);
})
app.post("/login", async (req,res) => {
  const {username, password} = req.body;
  const foundUser = await User.findOne({username})
  if(foundUser){
    const passOk = bcrypt.compareSync(password, foundUser.password)
    if(passOk){
      jwt.sign({userId: foundUser._id,username},jwtSecret, {},(err,token)=>{
        if(err) throw err
        res.cookie("token", token,{sameSite:"none", secure:true}).json({
          id:foundUser._id,
          username
        })
      })
    }else{
      res.json({err : "Password is incorrect"})
    }
  }else{
    res.json({err : "User doesn't exist"})
  }
})
app.post("/logout", (req,res)=>{
  res.cookie("token", "",{sameSite:"none", secure:true}).json('ok');
})
app.post("/register", async (req,res)=>{
  const {username,password} = req.body
  try{
    const hashedPassword = bcrypt.hashSync(password, Salt)
    const newUser = await User.create({
      username:username,
      password:hashedPassword
    })
    jwt.sign({userId: newUser._id,username},jwtSecret, {}, (err,token)=>{
    if(err) throw err
    res.cookie("token", token, {sameSite:"none", secure:true}).status(201).json({
      id:newUser._id,
      username
    });
  })
  } catch(err){
    if(err) throw err
  }
})

cookieParser()

const server = app.listen(4040)

const wss = new WebSocketServer({server});
wss.on("connection",(ws,req)=>{

  function notifyAboutOnlineUsers(){
    [...wss.clients].forEach(client => {
      client.send(JSON.stringify({
        online: [...wss.clients].map(c => ({userId: c.userId, username: c.username}))
      }))
    })
  }

  ws.isAlive = true;

  ws.timer = setInterval(() => {
    ws.ping()
    ws.deathTimer = setTimeout(()=> {
      ws.isAlive = false;
      ws.terminate();
      notifyAboutOnlineUsers()
    },1000)
  }, 5000)

  ws.on("pong", () => {
    clearTimeout(ws.deathTimer)
  })

// read username and id of a user from the cookie
  const cookies = req.headers.cookie
  if(cookies){
    const tokenCookieString = cookies.split(";").find(str => str.startsWith("token="))
    if(tokenCookieString){
      const token = tokenCookieString.split("=")[1]
      if(token){
        jwt.verify(token, jwtSecret, {}, (err, userData)=>{
          if(err) throw err
          const {userId, username} = userData
          ws.userId = userId;
          ws.username = username
        })
      }
    }
  }

  ws.on("message",async (message)=>{
    const msg = JSON.parse(message.toString())
    const {recipient,text, file} = msg
    let filename = null
    if(file){
      const parts = file.name.split('.');
      const ext = parts[parts.length - 1 ];
      filename = Date.now() + "." + ext;
      const path = __dirname + "/uploads/" + filename
      const BufferData = new Buffer(file.data.split(",")[1], "base64");
      fs.writeFile(path,BufferData, ()=>{
        console.log("file saved:" + path);
      })
    }
    if(recipient && (text || file)) {
      const messageDoc = await Message.create({
        sender:ws.userId,
        recipient,
        text,
        file: file ? filename : null 
      });
      [...wss.clients]
        .filter(c => c.userId === recipient)
        .forEach(c => c.send(JSON.stringify({
          text,
          sender: ws.userId,
          recipient,
          file: file ? filename : null,
          _id:messageDoc._id,
        })))
    }
  });

  // Notifying every user about online users
  notifyAboutOnlineUsers()
})  