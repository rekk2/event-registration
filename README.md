# Event Registration Application

This is an event registration application that allows users to register names at different doors and provides an admin interface for managing doors, looking up names, and archiving event data.

## Prerequisites

- Node.js
- MongoDB

## Setup Instructions

1. Clone the repository:

    ```bash
    git clone https://github.com/rekk2/event-registration.git
    cd event-registration
    ```

2. Run the setup script to install dependencies and start the application:

    ```bash
    chmod +x setup.sh
    ./setup.sh
    ```

3. Create a `.env` file in the root directory with the following content:

    ```env
    PORT=3000
    MONGODB_URI=mongodb://localhost:27017/eventTracking
    SESSION_SECRET=your_secret_key
    ADMIN_USERNAME=admin
    ADMIN_PASSWORD=password
    ```

4. Start the application:

    ```bash
    npm start
    ```

5. Open your web browser and go to http://localhost:3000 to access the application.

## Usage

**Registration Page:** `/door` - Users can register names at different doors. <br>
**Stats Page:** `/stats` - Displays total counts and counts by door. <br>
**Names Page:** `/names` - Displays all names sorted by door. <br>
**Admin Page:** `/admin` - Manage doors, look up names, archive event data, and export data to Excel. <br>
**Create Admin Page:** `/createadmin` - Allows the main admin to create and delete other admins and users.

## Webhook Setup (Optional)

If you want to automatically update the application on a Git push, set up a webhook:

1. Create a `webhook.js` file in your project directory with the following content:

    ```javascript
    const express = require('express');
    const bodyParser = require('body-parser');
    const { exec } = require('child_process');

    const app = express();
    const port = 4000; // You can use any port

    app.use(bodyParser.json());

    app.post('/update', (req, res) => {
      if (req.body.ref === 'refs/heads/main') { // Change 'main' to your branch if necessary
        exec('cd ~/event-registration && git fetch origin main && git reset --hard origin/main && npm install dotenv && pm2 restart 0', (error, stdout, stderr) => {
          if (error) {
            console.error(`exec error: ${error}`);
            return res.status(500).send('Server Error');
          }
          console.log(`stdout: ${stdout}`);
          console.error(`stderr: ${stderr}`);
          res.send('Updated and restarted');
        });
      } else {
        res.send('Not the main branch, no action taken');
      }
    });

    app.listen(port, () => {
      console.log(`Listening on port ${port}`);
    });
    ```

2. Start the webhook server:

    ```bash
    node webhook.js
    ```

## Additional Information

- Ensure MongoDB is running before starting the application.
- The `setup.sh` script should include all necessary steps to install dependencies and set up the application.

Feel free to contribute to this project by submitting issues or pull requests.
