import { useState } from 'react'
import axios from 'axios'

const ProcessingForm = () => {
    const [sheetUrl, setSheetUrl] = useState('')
    const [uploadedImage, setUploadedImage] = useState([])
    const [numColumns, setNumColumns] = useState('')
    const [cellWidth, setCellWidth] = useState('')
    const [cellHeight, setCellHeight] = useState('')

    // Handler function for the event of submitting the form
    const handleSubmit = async (event) => {
        event.preventDefault();

        const formData = new FormData();
        formData.append('sheetUrl', sheetUrl)
        formData.append('uploadedImage', uploadedImage)
        formData.append('numColumns', numColumns)
        formData.append('cellWidth', cellWidth)
        formData.append('cellHeight', cellHeight)

        try {
            const processSheetResponse = await axios.post(
                'http://localhost:3001/process-sheet',
                formData,
                {withCredentials: true}
            )
            console.log(processSheetResponse.data)
        } catch (error) {
            console.error(error)
            if (error.response.status) {
                console.log('Status code:', error.response.status)
            }
        }
    }

    const acceptedImageTypes = 'image/jpeg, image/png, image/bmp, image/tiff, image/gif'

    return (
        <>
            <form onSubmit={handleSubmit} style={{border: '2px solid red'}}>
                <p>
                    <label>Spreadsheet Link</label>
                    <input type='url' name='sheetUrl' value={sheetUrl} onChange={(event) => {
                        setSheetUrl(event.target.value)
                    }} required />
                </p>
                <p>
                    <label>Upload image</label>
                    <input type='file' name='uploadedImage' accept={acceptedImageTypes} onChange={(event)=>{
                        setUploadedImage(event.target.files[0])
                    }} required />
                </p>
                <p>
                    <label>Number of Columns</label>
                    <input type='number' name='numColumns' value={numColumns} onChange={(event) => {
                        setNumColumns(event.target.value)
                    }} required />
                </p>
                <p>
                    <label>Cell Width (Optional)</label>
                    <input type='number' name='cellWidth' value={cellWidth} onChange={(event) => {
                        setCellWidth(event.target.value)
                    }} />
                </p>
                <p>
                    <label>Cell Height (Optional)</label>
                    <input type='number' name='cellHeight' value={cellHeight} onChange={(event) => {
                        setCellHeight(event.target.value)
                    }} />
                </p>
                <button type='submit'>Convert Image to Spreadsheet</button>
            </form>
        </>
    )
}

export default ProcessingForm