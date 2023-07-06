import React,{useState, useContext} from 'react'
import { UserContext } from './UserContext';
import axios from "axios"

export default function Register() {
  const [username,setUsername] = useState("");
  const [password,setPassword] = useState("");
  const [registerError,setRegisterError] = useState("")
  const [loginError, setLoginError] = useState("")
  const [isLogOrReg, setIsLogOrReg] = useState("register")
  const {setUsername: setLoggedInUsername,setId, setUzbek, uzbek} = useContext(UserContext);

  function ChangePage(){
    setIsLogOrReg(isLogOrReg === "register" ? "login" : "register")
  }

  async function handleSubmit(e)  {
    e.preventDefault();
    if(username === "" || password === ""){
      setRegisterError("You haven't entered either username or password")
    }else{
      let url = isLogOrReg === "register" ? "/register" : "/login"
      const { data } = await axios.post(url, {
        username,
        password
      })
      setLoggedInUsername(data.username)
      setId(data.id)
      setLoginError(data.err)
    }
  } 


  return (
    <>
      <div className='bg-blue-50 h-screen flex items-center relative'>
        <div className="choose-language absolute top-8 right-8">
          <fieldset>
            <select className='p-2'>
              <option onChange={() => setUzbek(false)} value="eng">English</option>
              <option onChange={() => setUzbek(true)} value="uzb">Uzbek</option>
            </select>
          </fieldset>
        </div>
        <form className='w-64 mx-auto' onSubmit={handleSubmit}>
          <input value={username} onChange={(ev)=>{setUsername(ev.target.value)}} type="text" placeholder='username' className='block outline-none p-3 mb-2 w-full rounded-sm border' />
          <input value={password} onChange={(ev)=>{setPassword(ev.target.value)}} type="password" placeholder='password' className='block outline-none p-3 mb-2 w-full rounded-sm border' />
          <input type="submit" value={isLogOrReg === "register" ? "Register" : "Login"} className='w-full bg-blue-500 p-3 text-white rounded-sm border' />
          <div className='text-center mt-2'>
            {isLogOrReg === "register" && (
              <div>
                {uzbek ? "Saytga a'zomisiz?" : "Already a member?"} 
                <button className='ml-1 text-blue-600' onClick={ChangePage}>{uzbek ? "Akkauntingizga kiring" : "Login here"}</button>
                <h3 className='text-red-500'>{registerError}</h3>
              </div>
            )}
            {isLogOrReg === "login" && (
              <div>
                {uzbek ? "Akkauntingiz yo'qmi?" : "Don't have an account?"} 
                <button className='ml-1 text-blue-600' onClick={ChangePage}>{uzbek ? "Ro'yxatdan o'ting" : "Sign in"}</button>
                <h3 className='text-red-500'>{loginError}</h3>
              </div>
            )}
          </div>
        </form>
      </div>
    </>
  )
}
