# Pixel-Mapper

A full-stack web application that can create Google Sheet pixel art out of images.

# Live Demo

Experience the live application here: https://pixel-mapper.up.railway.app/  
Backend API (for informational purposes): https://pixel-mapper-production.up.railway.app/  

<img height="450" alt="image" src="https://github.com/user-attachments/assets/ef8570f3-de46-4358-99d9-d984af1f9d01" />

<img height="450" alt="image" src="https://github.com/user-attachments/assets/969e871e-2802-4ef9-a0b6-4d65c7584590" />

# Key Features

* **Secure Google Authentication:** Implements user sign-in securely via Google OAuth 2.0.
* **Image Upload & Processing:** Allows users to upload images (JPG, PNG, BMP, TIFF, GIF), which are then processed and resized using Jimp.
* **Dynamic Google Sheets Integration:** Connects directly with the Google Sheets API to translate image pixel data into colored spreadsheet cells.
* **Automatic Sheet Resizing:** Adds new rows and columns to the Google Sheet if the image requires more space than currently available.
* **Customizable Output:** Enables users to specify desired cell width and height for the pixel art output in the spreadsheet.
* **Persistent User Sessions:** Utilizes PostgreSQL for robust and persistent session management.
* **Full-Stack Deployment:** The application is fully deployed with the frontend and the backend on Railway.

# Technologies Used
* **Frontend:** React, Plain CSS
* **Backend:** Node.js, Express.js, Passport.js, googleapis, Multer, Jimp
* **Database:** PostgreSQL for persistent user session storage
* **Deployment:** Railway
