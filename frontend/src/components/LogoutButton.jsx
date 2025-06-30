import axios from 'axios'

const LogoutButton = ({setIsLoggedIn, setUserName}) => {
    const handleLogoutClick = async () => {
        try {
            // wait for backend to log out of session
            const backendUrl = import.meta.env.VITE_BACKEND_URL
            await axios.post(`${backendUrl}/auth/logout`, {}, {
                withCredentials: true // cors
            })

            // update user state on the frontend
            setIsLoggedIn(false)
            setUserName(null)
        } catch (error) { // unsuccessful logout on the backend
            console.error('Unsucessful logout', error)
        }
    }

    return (
        <button id='logout-button' onClick={handleLogoutClick}>
            Log Out
        </button>
    )
}

export default LogoutButton