const LoginButton = () => {
    const handleLoginClick = () => {
        // Browser-level redirect to authenticate with Google
        window.location.href = 'http://localhost:3001/auth/google'
    }

    return (
        <button onClick={handleLoginClick}>
            Sign in with Google
        </button>
    )
}

export default LoginButton