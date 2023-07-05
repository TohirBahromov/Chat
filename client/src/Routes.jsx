import Chat from "./Chat"
import Register from "./Register"
import { UserContext } from "./UserContext"
import { useContext } from "react"

export default function Routes(){
  const {username,id} = useContext(UserContext)

  if(username){
    return <Chat />
  }

  return(
    <>
      <Register />
    </>
  )
}