# Event Registration Application

This is an event registration application that allows users to register names at different doors and provides an admin interface for managing doors, looking up names, and archiving event data.

## Prerequisites

- Node.js
- MongoDB

## Setup Instructions

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/event-registration.git
   cd event-registration


2. Run the setup script to install dependencies and start the application:

    ```bash
   chmod +x setup.sh
   ./setup.sh

3.  Create .env file in root directory.
    ```Example
    PORT=3000
   MONGODB_URI=mongodb://localhost:27017/eventTracking
   SESSION_SECRET=your_secret_key
   ADMIN_USERNAME=admin
   ADMIN_PASSWORD=password


5. Open your web browser and go to http://localhost:3000 to access the application.

## Usage
**Registration Page:** `/door` - Users can register names at different doors. <br>
**Stats Page:** `/stats` - Displays total counts and counts by door. <br>
**Names Page:** `/names` - Displays all names sorted by door. <br>
**Admin Page:** `/admin` - Manage doors, look up names, archive event data, and export data to Excel.

.
