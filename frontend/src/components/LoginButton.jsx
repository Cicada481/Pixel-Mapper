const handleLoginClick = () => {
    window.location.href = 'http://localhost:3001/auth/google'
}

const LoginButton = () => {
    return (
        <button onClick={handleLoginClick}>
            Sign in with Google
        </button>
    )
}

export default LoginButton