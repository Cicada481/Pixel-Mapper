const handleReturnClick = () => {
    window.location.href = 'http://localhost:5173/'
}

const ReturnButton = () => {
    return (
        <button onClick={handleReturnClick}>
            Return to home page
        </button>
    )
}

export default ReturnButton