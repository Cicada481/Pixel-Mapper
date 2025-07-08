import arrow from './../assets/arrow.svg'
import dinosaur from './../assets/dinosaur.jpg'
import dinosaurPixel from './../assets/dinosaur_pixel.png'

const Demonstration = () => {
    return (
        <div id='demonstration'>
            <img src={dinosaur} alt='Photo of a dinosaur'/>
            <img src={arrow} id='arrow-image' alt='Arrow pointing to the right' />
            <img src={dinosaurPixel} alt='Pixel art of a dinosaur on a Google Sheet' />
        </div>
    )
}

export default Demonstration