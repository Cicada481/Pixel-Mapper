import axios from 'axios'

const LogoutButton = ({setIsLoggedIn, setUserName}) => {
    // this function is defined inside the component to use the prop variable
    const handleLogoutClick = async () => {
        try {
            // wait for backend to log out of session
            await axios.post('http://localhost:3001/auth/logout', {}, {
                withCredentials: true
            })

            // update user state on the frontend
            setIsLoggedIn(false)
            setUserName(null)
        } catch (error) { // unsuccessful logout on the backend
            console.error('Unsucessful logout', error)
        }
    }

    return (
        <button onClick={handleLogoutClick}>
            Log Out
        </button>
    )
}

export default LogoutButton