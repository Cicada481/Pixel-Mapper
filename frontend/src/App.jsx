import { useState, useEffect } from 'react'
import './App.css'
import axios from 'axios'
import LoginButton from './components/LoginButton.jsx'
import LogoutButton from './components/LogoutButton.jsx'
import ReturnButton from './components/ReturnButton.jsx'
import ProcessingForm from './components/ProcessingForm.jsx'
import Demonstration from './components/Demonstration.jsx'
import GitHubLink from './components/GitHubLink.jsx'
import HeaderTitle from './components/HeaderTitle.jsx'

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userName, setUserName] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkLogin = async () => {
      try {
        const backendUrl = import.meta.env.VITE_BACKEND_URL
        console.log("Checking login")
        const currentUserResponse = await axios.get(`${backendUrl}/api/current_user`, {
          withCredentials: true // for sending cookies
        })
        console.log('API call link', `${backendUrl}/api/current_user`)
        setIsLoggedIn(true)
        setUserName(currentUserResponse.data.displayName)
        setIsLoading(false)
      } catch (error) {
        const backendUrl = import.meta.env.VITE_BACKEND_URL
        console.log('API call link', `${backendUrl}/api/current_user`)
        if (error.response.status == 401) { // Not logged in
          setIsLoggedIn(false)
          setUserName(null)
          setIsLoading(false)
        } else {
          console.error("Unexpected error", error)
        }
      }
    }
    checkLogin()
  }, [])

  let mainContent = null

  if (isLoading) {
    mainContent = null
  } else if (window.location.pathname === '/login-error') {
    mainContent = (
      <>
        <HeaderTitle />
        <p>Error logging in. Please try again.</p>
        <ReturnButton />
      </>
    )
  } else if (isLoggedIn) {
    mainContent = (
      <div id='logged-in-content'>
        <div id='header-info'>
          <p id='user-info'>Logged in as {userName}</p>
          <LogoutButton setIsLoggedIn={setIsLoggedIn} setUserName={setUserName}/>
        </div>
        <ProcessingForm />
      </div>
    )
  } else { // Default page, user is not logged in
    mainContent = (
      <>
        <HeaderTitle />
        <Demonstration />
        <div><LoginButton /></div>
      </>
    )
  }

  return (
    <>
      <div id='app-main-content'>
        {mainContent}
      </div>
      <GitHubLink />
    </>
  )
}

export default App
