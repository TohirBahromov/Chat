import axios from "axios";
import { createContext,useEffect,useState } from "react";

export const UserContext = createContext({})

export function UserContextProvider({children}){

  const [username,setUsername] = useState(null)
  const [id, setId] = useState(null) 
  const [uzbek,setUzbek] = useState(false)
  useEffect(()=>{
    axios.get("/profile").then(response => {
      setUsername(response.data.userData.username)
      setId(response.data.userData.userId)
    })
  },[])

  return(
    <>
      <UserContext.Provider value={{username, setUsername, id, setId, uzbek, setUzbek}}>
        {children}
      </UserContext.Provider>
    </>
  )
}