# Pixel-Mapper

A full-stack web application where a user logs in using Google, inputs a URL to a Google Sheet, uploads an image, and the backend processes the image to color cells of the specified Google Sheet directly based on pixel data of the image.

# Browser Compatibility

Note on Browser Compatibility: The application's Google Sign-In flow is designed with industry-standard `SameSite=None; Secure` cookie configurations for cross-site communication. Due to increasingly aggressive default privacy settings in some browsers (e.g., Chrome Incognito, Firefox Enhanced Tracking Protection, Safari Intelligent Tracking Prevention), the login flow may not function as expected in these stricter modes. For the best experience, please use a standard Chrome browser (non-Incognito) or Opera.
