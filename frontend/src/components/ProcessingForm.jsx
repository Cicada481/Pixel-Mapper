import { useState } from 'react'
import axios from 'axios'

const ProcessingForm = () => {
    // State variables for HTML form fields and FormData object
    const [sheetUrl, setSheetUrl] = useState('')
    const [uploadedImage, setUploadedImage] = useState([])
    const [numColumns, setNumColumns] = useState('')
    const [cellWidth, setCellWidth] = useState('')
    const [cellHeight, setCellHeight] = useState('')

    // State variables for processing a spreadsheet update response
    const [isLoading, setIsLoading] = useState(false)
    const [responseMessage, setResponseMessage] = useState(null) // both success and failure
    const [isError, setIsError] = useState(false)

    // For the form to know the limited image types accepted by Jimp
    const acceptedImageTypes = 'image/jpeg, image/png, image/bmp, image/tiff, image/gif'

    // Handler function for the event of submitting the rendered HTML form in this component
    const handleSubmit = async (event) => {
        event.preventDefault();

        // Create a FormData object to send to the backend via a POST request
        // Values come from the rendered form
        const formData = new FormData();
        formData.append('sheetUrl', sheetUrl)
        formData.append('uploadedImage', uploadedImage)
        formData.append('numColumns', numColumns)
        formData.append('cellWidth', cellWidth)
        formData.append('cellHeight', cellHeight)

        // Clear any existing responses from a previously attempted spreadsheet update
        setIsError(false)
        setResponseMessage(null)

        try {
            // Attempt a spreadsheet update
            setIsLoading(true)
            const backendUrl = import.meta.env.VITE_BACKEND_URL
            const processSheetResponse = await axios.post(
                `${backendUrl}/process-sheet`,
                formData,
                {withCredentials: true}
            )

            // Successful spreadsheet update
            setIsError(false)
            setResponseMessage('Spreadsheet successfully updated! Please check your spreadsheet to see the changes.')
            setIsLoading(false)
            console.log(processSheetResponse.data)
        } catch (error) {
            // Unsuccessful spreadsheet update
            setIsError(true)
            console.error(error)

            // Find an appropriate error message to send
            if (error.response && error.response.status) {
                if (error.response.status === 400) {
                    if (error.response.data && error.response.data.code &&
                        error.response.data.code === 'NON_POSITIVE_COLUMNS'
                    ) {
                        setResponseMessage('Please provide a positive number of columns.')
                    } else {
                        setResponseMessage('Invalid spreadsheet link. Please provide a valid link.')
                    }
                } else if (error.response.status === 401) {
                    setResponseMessage('An error has occurred. Please try logging in again.')
                } else if (error.response.status === 403) {
                    setResponseMessage('Your Google account does not have edit access, or you did not grant this app edit access.')
                } else if (error.response.status === 429) {
                    setResponseMessage('The server is currently busy. Please try again later.')
                } else {
                    setResponseMessage('An unexpected error occurred. Please try again later.')
                }
            } else {
                setResponseMessage('An unexpected error occurred. Please try again later.')
            }

            setIsLoading(false)
        }
    }

    // Displayed below the form
    // Reflects loading status and then success or failure response
    let sheetUpdateStatusDisplay = null
    if (isLoading) {
        sheetUpdateStatusDisplay = <div><span>Processing image...</span></div>
    } else if (responseMessage) {
        const finalUpdateStatus = isError ? 'failure-message' : 'success-message';
        sheetUpdateStatusDisplay = <div id='sheet-response-message' className={finalUpdateStatus}>{responseMessage}</div>
    }

    return (
        <div id="form-component">
            <h2>Image to Spreadsheet Converter</h2>
            <form id="processing-form" onSubmit={handleSubmit}>
                <p className="form-field-group">
                    <label>Google Sheets Link:</label>
                    <input type='text' name='sheetUrl' value={sheetUrl} onChange={(event) => {
                        setSheetUrl(event.target.value)
                    }} required />
                </p>
                <p className="form-field-group">
                    <label>Upload image:</label>
                    <input type='file' name='uploadedImage' accept={acceptedImageTypes} onChange={(event)=>{
                        setUploadedImage(event.target.files[0])
                    }} required />
                </p>
                <p className="form-field-group">
                    <label>Number of Columns:</label>
                    <input type='number' name='numColumns' value={numColumns} placeholder='e.g. 50 (max 300)' onChange={(event) => {
                        setNumColumns(event.target.value)
                    }} required />
                </p>
                <p className="form-field-group">
                    <label><span className='optional-field-indicator'>(Optional)</span> Cell Width:</label>
                    <input type='number' name='cellWidth' value={cellWidth} placeholder='e.g. 10 (min 2)' onChange={(event) => {
                        setCellWidth(event.target.value)
                    }} />
                </p>
                <p className="form-field-group">
                    <label><span className='optional-field-indicator'>(Optional)</span> Cell Height:</label>
                    <input type='number' name='cellHeight' value={cellHeight} placeholder='e.g. 10 (min 2)' onChange={(event) => {
                        setCellHeight(event.target.value)
                    }} />
                </p>
                <button id="convert-button" type='submit' disabled={isLoading}>Convert Image to Spreadsheet</button>
            </form>
            {sheetUpdateStatusDisplay}
        </div>
    )
}

export default ProcessingForm