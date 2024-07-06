#!/bin/bash

# Update and install necessary packages
sudo yum update -y
sudo yum install -y nodejs npm mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Navigate to project directory (assuming the script is run from within the project directory)
cd "$(dirname "$0")"

# Install project dependencies
npm install

# Start the application
npm start
