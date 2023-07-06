import { useContext, useEffect, useRef, useState } from "react"
import Avatar from "./Avatar"
import Logo from "./Logo"
import { UserContext } from "./UserContext"
import {uniqBy} from "lodash"
import axios from "axios"

export default function Chat() {
  const [webS,setWebS] = useState(null)
  const [onlineUsers, setOnlineUsers] = useState({})
  const [offlineUsers, setOfflineUsers] = useState({})
  const [selectedUserId, setSelectedUserId] = useState(null)
  const [newMsgText, setNewMsgText] = useState("")
  const [messages,setMessages] = useState([])
  const [showMenu, setShowMenu] = useState(false)
  const {id,username,setId,setUsername} = useContext(UserContext)
  const bottomMessages = useRef()

  useEffect(()=>{
    connectToWs()
  },[selectedUserId])
  function connectToWs(){
    const ws = new WebSocket('wss://chatagram-9jo5.onrender.com')
    setWebS(ws)
    ws.addEventListener("message", handleMessage)
    ws.addEventListener("close", () => {
      setTimeout(()=>{
        console.log("Disconnected, Trying to reconnect. ");
        connectToWs();
      },1000 )
    })
  }
  function onlinePeople(peopleArray){
    const people = {}
    peopleArray.forEach(({userId, username}) => {
      people[userId] = username
    });
    setOnlineUsers(people)
  }
  function handleMessage(e){
    const messageData = JSON.parse(e.data)
    if("online" in messageData){
      onlinePeople(messageData.online)
    } else if("text" in messageData) {
      if(messageData.sender === selectedUserId){
        setMessages(prev => ([...prev ,{...messageData}]))
      }
    }
  }
  function logout(){
    axios.post("/logout").then(()=>{
      setWebS(null)
      setId(null),
      setUsername(null);
    })
  }
  function sendMessage(ev, file = null){
    if(ev) ev.preventDefault();
    webS.send(JSON.stringify({
      recipient:selectedUserId,
      text: newMsgText,
      file
    }))
    if(file){
      axios.get("/messages/" + selectedUserId).then(res => {
        setMessages(res.data)
      })
    } else {
      setNewMsgText("");
      setMessages(prev => ([...prev ,{
        text: newMsgText,
        sender:id, 
        recipient: selectedUserId,
        _id:Date.now()
      }]))
    }
  }
  function sendFile(e){
    const reader = new FileReader();
    reader.readAsDataURL(e.target.files[0]);
    reader.onload = () => {
      sendMessage(null, {
        name: e.target.files[0].name,
        data: reader.result
      })
    }
  }
  function ShowMenu(){
    setShowMenu(prev => {
      return !prev
    })
  }
  useEffect(()=> {
    const div = bottomMessages.current;
    if(div){
      div.scrollIntoView({behavior:"smooth", block:"end"});
    }
  },[messages])

  useEffect(()=> {
    axios.get("/people").then(res => {
      const offlinePeopleArr = res.data
        .filter(p => p._id !== id)
        .filter(p => !Object.keys(onlineUsers).includes(p._id));
      const offlinePeople = {};
      offlinePeopleArr.forEach(p => {
        offlinePeople[p._id] = p
      });
      setOfflineUsers(offlinePeople);
    });
  },[onlineUsers]);

  useEffect(()=>{ 
    if(selectedUserId){
      axios.get("/messages/" + selectedUserId).then(res => {
        setMessages(res.data)
      })
    }
  },[selectedUserId])
  console.log(selectedUserId);



  const deleteOurUser = {...onlineUsers}
  delete deleteOurUser[id]

  const messagesWithoutDupes = uniqBy(messages,"_id")
  return (
    <>
      <div className="flex h-screen relative">
        <div className={"contacts bg-white w-1/3 flex flex-col " + (showMenu ? "left-[0%]" : "left-[-100%]")}>
          <div className="logo">
            <Logo />
          </div>
          <div className="flex-grow overflow-x-scroll scrollbar">
            <div className="online-users mb-4 py-3 border-b-2 border-t-2">
              <div className="px-2 font-bold mb-4 text-green-500 border-b pb-2 mx-4">Online users</div>
              {Object.keys(deleteOurUser).length === 0 && (
                <div className="text-gray-400 p-5 text-center">no online users</div>
              )}
              {Object.keys(deleteOurUser).map(userId => (
                <div key={userId} onClick={()=> {
                  setSelectedUserId(userId),
                  ShowMenu()
                }} 
                className={"border-b border-gray-100 flex items-center gap-2 cursor-pointer " + (userId === selectedUserId ? "bg-blue-50" : "")}>
                  {userId === selectedUserId && (
                    <div className="w-1 h-12 bg-blue-500 rounded-r-md"></div>
                  )}
                  <div className="flex items-center py-2 pl-4 gap-2">
                    <Avatar online={true} username={onlineUsers[userId]} userId={userId} />
                    <span className="text-gray-800">
                      {onlineUsers[userId]}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="offline-users mb-4 py-3 border-b-2 border-t-2">
              <div className="px-2 font-bold mb-4 text-gray-500 border-b pb-2 mx-4">Offline users</div>
              {Object.keys(offlineUsers).map(userId => (
                <div key={userId} onClick={()=> setSelectedUserId(userId)} 
                className={"border-b border-gray-100 flex items-center gap-2 cursor-pointer " + (userId === selectedUserId ? "bg-blue-50" : "")}>
                  {userId === selectedUserId && (
                    <div className="w-1 h-12 bg-blue-500 rounded-r-md"></div>
                  )}
                  <div className="flex items-center py-2 pl-4 gap-2">
                    <Avatar online={false} username={offlineUsers[userId].username} userId={userId} />
                    <span className="text-gray-800">
                      {offlineUsers[userId].username}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="text-center p-3 flex items-center justify-center">
            <span className="mr-2 text-gray-600 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
              </svg>  
              {username}
            </span>
            <button 
              className="text-gray-500 bg-blue-100 py-1 px-2 border rounded-sm"
              onClick={logout}>Logout
            </button>
          </div>
        </div>
        <div className="mobile flex flex-col w-full">
          <div className="mobile-navbar items-center justify-between p-4 bg-white text-blue-500 hidden">
            <div className="text-blue-500 font-bold flex items-center gap-2 p-2">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
              <path d="M4.913 2.658c2.075-.27 4.19-.408 6.337-.408 2.147 0 4.262.139 6.337.408 1.922.25 3.291 1.861 3.405 3.727a4.403 4.403 0 00-1.032-.211 50.89 50.89 0 00-8.42 0c-2.358.196-4.04 2.19-4.04 4.434v4.286a4.47 4.47 0 002.433 3.984L7.28 21.53A.75.75 0 016 21v-4.03a48.527 48.527 0 01-1.087-.128C2.905 16.58 1.5 14.833 1.5 12.862V6.638c0-1.97 1.405-3.718 3.413-3.979z" />
              <path d="M15.75 7.5c-1.376 0-2.739.057-4.086.169C10.124 7.797 9 9.103 9 10.609v4.285c0 1.507 1.128 2.814 2.67 2.94 1.243.102 2.5.157 3.768.165l2.782 2.781a.75.75 0 001.28-.53v-2.39l.33-.026c1.542-.125 2.67-1.433 2.67-2.94v-4.286c0-1.505-1.125-2.811-2.664-2.94A49.392 49.392 0 0015.75 7.5z" />
              </svg>
              _bakhramovvv__
            </div>
            <div onClick={ShowMenu}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </div>
          </div>
          <div className="chat-screen bg-blue-50 p-2 flex flex-col flex-grow">
            <div className="flex-grow">
              {!selectedUserId &&
              (
                <div className="h-full flex items-center justify-center">
                  <div className="text-gray-400">select a user</div>
                </div>
              )}
              {!!selectedUserId && (
                <div className="relative h-full">
                  <div className="overflow-y-scroll scrollbar absolute top-0 left-0 right-0 bottom-2" >
                    {messagesWithoutDupes.map(message => (
                      <div key={message._id} className={"" + message.sender === id ? "text-right" : "text-left"}>
                        <div className={"msg p-2 my-2 rounded-md text-left inline-block relative " + (message.sender === id ? "bg-blue-500 text-white" : "bg-white text-gray-500")}>
                          {message.text}
                          {message.file && (
                            <div>
                              <a target="_blank" className="underline flex items-center gap-1" href={axios.defaults.baseURL + "/uploads/" + message.file}>
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
                                </svg>
                                {message.file}
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    <div ref={bottomMessages}></div>
                  </div>
                </div>
              )}
            </div>
            {!!selectedUserId && (
              <form className="flex gap-2" onSubmit={sendMessage}>
                <input type="text" placeholder="Type your message here" 
                      value={newMsgText}
                      onChange={ev => setNewMsgText(ev.target.value)}
                      className="bg-white border p-2 flex-grow rounded-sm outline-none" />
                <label className="bg-blue-200 p-2 text-gray-600 cursor-pointer">
                  <input type="file" className="hidden" onChange={sendFile} />
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
                  </svg>
                </label>
                <button type="submit" className="bg-blue-500 p-2 text-white rounded-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                  </svg>
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
