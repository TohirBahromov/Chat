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
  const [editing, setEditing] = useState(false)
  const {id,username,setId,setUsername} = useContext(UserContext)
  const bottomMessages = useRef()

  useEffect(()=>{
    connectToWs()
  },[])

  function connectToWs(){
    const ws = new WebSocket('wss://chatagram-9jo5.onrender.com')
    setWebS(ws)
    ws.addEventListener("message", handleMessage)
    ws.addEventListener("close", () => connectToWs())
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
    setNewMsgText("")
    setMessages(prev => ([...prev ,{
      text: newMsgText,
      sender:id, 
      recipient: selectedUserId,
      _id:Date.now()
    }]))
    if(file){
      axios.get("/messages/" + selectedUserId).then(res => {
        setMessages(res.data)
      })
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
  function changeEditing(){
    setEditing(prev => {
      return !prev
    })
  }

  useEffect(()=> {
    const div = bottomMessages.current;
    if(div){
      div.scrollIntoView({behavior:"smooth"})
    }
  },[messages])

  useEffect(()=> {
    axios.get("/people").then(res => {
      const offlinePeopleArr = res.data
        .filter(p => p._id !== id)
        .filter(p => !Object.keys(onlineUsers).includes(p._id));
      const offlinePeople = {}
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



  const deleteOurUser = {...onlineUsers}
  delete deleteOurUser[id]

  const messagesWithoutDupes = uniqBy(messages,"_id")

  return (
    <>
      <div className="flex h-screen">
        <div className="bg-white w-1/3 flex flex-col">
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
                <div key={userId} onClick={()=> setSelectedUserId(userId)} 
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
          <div className="text-center p-2 flex items-center justify-center">
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
        <div className="bg-blue-50 w-2/3 p-2 flex flex-col">
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
    </>
  )
}
