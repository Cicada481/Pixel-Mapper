import arrow from './../assets/arrow.svg'
import parakeet from './../assets/parakeet.jpg'
import parakeetSheets from './../assets/parakeet_sheets.png'

const Demonstration = () => {
    return (
        <div id='demonstration'>
            <img src={parakeet} className='flexed-image' alt='Photo of a parakeet'/>
            <img src={arrow} className='flexed-image' id='arrow-image' alt='Arrow pointing to the right' />
            <img src={parakeetSheets} className='flexed-image' alt='Pixel art of a parakeet on a Google Sheet' />
        </div>
    )
}

export default Demonstration