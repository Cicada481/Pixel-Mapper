const ReturnButton = () => {
    const handleReturnClick = () => {
        // Browser-level redirect to home page
        window.location.href = 'http://localhost:5173/'
    }

    return (
        <button onClick={handleReturnClick}>
            Return to main page
        </button>
    )
}

export default ReturnButton