import { useState, useEffect } from 'react'
import './App.css'
import axios from 'axios'
import LoginButton from './components/LoginButton.jsx'
import ReturnButton from './components/ReturnButtons.jsx'

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userName, setUserName] = useState(null)

  useEffect(() => {
    const checkLogin = async () => {
      try {
        const currentUserResponse = await axios.get(
          'http://localhost:3001/api/current_user',
          {withCredentials: true} // for CORS
        )
        setIsLoggedIn(true)
        setUserName(currentUserResponse.data.displayName)
      } catch (error) {
        if (error.response.status == 401) { // Not logged in
          setIsLoggedIn(false)
          setUserName(null)
        } else {
          console.error("Unexpected error", error)
        }
      }
    }
    checkLogin()
  }, [])

  if (window.location.pathname === '/login-error') {
    return (
      <>
        <p>Error logging in. Please try again.</p>
        <ReturnButton />
      </>
    )
  } else if (isLoggedIn) {
    return (
      <>
        <p>Logged in as {userName}</p>
      </>
    )
  } else { // Default page, user is not logged in
    return (
      <LoginButton />
    )
  }
}

export default App
