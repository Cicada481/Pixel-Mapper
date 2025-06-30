const LoginButton = () => {
    const handleLoginClick = () => {
        // Browser-level redirect to authenticate with Google
        const backendUrl = import.meta.env.VITE_BACKEND_URL
        window.location.href = `${backendUrl}/auth/google`
    }

    return (
        <button id='login-button' onClick={handleLoginClick}>
            Sign in with Google
        </button>
    )
}

export default LoginButton