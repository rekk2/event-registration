#!/bin/bash

# Update and install necessary packages
sudo yum update -y
sudo yum install -y nodejs npm

# Install MongoDB
sudo yum install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Navigate to project directory (assuming the script is run from within the project directory)
cd "$(dirname "$0")"

# Install project dependencies
npm install

# Install dotenv package
npm install dotenv

# Install PM2 globally
sudo npm install -g pm2

# Start the application using PM2
pm2 start server.js --name event-registration

# Save PM2 process list and corresponding environment
pm2 save

# Ensure PM2 restarts on reboot
pm2 startup systemd -u ec2-user --hp /home/ec2-user
sudo env PATH=$PATH:/home/ec2-user/.nvm/versions/node/v$(node -v)/bin /home/ec2-user/.nvm/versions/node/v$(node -v)/lib/node_modules/pm2/bin/pm2 startup systemd -u ec2-user --hp /home/ec2-user
