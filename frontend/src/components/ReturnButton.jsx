const handleReturnClick = () => {
    window.location.href = 'http://localhost:5173/'
}

const ReturnButton = () => {
    return (
        <button onClick={handleReturnClick}>
            Return to main page
        </button>
    )
}

export default ReturnButton