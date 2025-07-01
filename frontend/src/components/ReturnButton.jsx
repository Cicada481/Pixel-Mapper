const ReturnButton = () => {
    const handleReturnClick = () => {
        // Browser-level redirect to home page
        const frontendUrl = import.meta.env.VITE_FRONTEND_URL
        window.location.href = frontendUrl
    }

    return (
        <button onClick={handleReturnClick}>
            Return to main page
        </button>
    )
}

export default ReturnButton