# Deployment Guide

## Prerequisites

### Local Development
1. **Node.js** (v16 or higher)
2. **MongoDB** (v4.4 or higher)
3. **npm** or **yarn**

### Production Requirements
1. **MongoDB Atlas** (recommended) or self-hosted MongoDB
2. **Node.js hosting** (Heroku, DigitalOcean, AWS, etc.)
3. **Environment variables** properly configured

## Local Setup

### 1. Install MongoDB

#### Windows
```bash
# Download MongoDB Community Server from https://www.mongodb.com/try/download/community
# Or use Chocolatey
choco install mongodb

# Start MongoDB service
net start MongoDB
```

#### macOS
```bash
# Using Homebrew
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb/brew/mongodb-community
```

#### Linux (Ubuntu)
```bash
# Import MongoDB public GPG key
wget -qO - https://www.mongodb.org/static/pgp/server-5.0.asc | sudo apt-key add -

# Create list file for MongoDB
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/5.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-5.0.list

# Update package database
sudo apt-get update

# Install MongoDB
sudo apt-get install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod
```

### 2. Setup Application

```bash
# Clone and setup
git clone <repository-url>
cd digital-marketplace-backend
npm install

# Configure environment
cp .env.example .env
# Edit .env with your settings

# Seed admin user (requires MongoDB running)
npm run seed

# Start development server
npm run dev
```

## Production Deployment

### Option 1: MongoDB Atlas + Heroku

#### 1. Setup MongoDB Atlas
1. Create account at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a new cluster
3. Create database user
4. Whitelist IP addresses (0.0.0.0/0 for all IPs)
5. Get connection string

#### 2. Deploy to Heroku
```bash
# Install Heroku CLI
npm install -g heroku

# Login to Heroku
heroku login

# Create Heroku app
heroku create your-app-name

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set MONGODB_URI="your-mongodb-atlas-connection-string"
heroku config:set JWT_SECRET="your-super-secret-jwt-key"
heroku config:set JWT_EXPIRES_IN="7d"
heroku config:set ADMIN_PHONE="9999999999"
heroku config:set ADMIN_PASSWORD="your-admin-password"
heroku config:set ADMIN_NAME="System Administrator"

# Deploy
git add .
git commit -m "Initial deployment"
git push heroku main

# Seed admin user
heroku run npm run seed
```

### Option 2: DigitalOcean Droplet

#### 1. Create Droplet
1. Create Ubuntu 20.04 droplet
2. SSH into the server
3. Update system packages

```bash
sudo apt update && sudo apt upgrade -y
```

#### 2. Install Node.js
```bash
# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

#### 3. Install MongoDB
```bash
# Import MongoDB public GPG key
wget -qO - https://www.mongodb.org/static/pgp/server-5.0.asc | sudo apt-key add -

# Create list file
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/5.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-5.0.list

# Update and install
sudo apt-get update
sudo apt-get install -y mongodb-org

# Start and enable MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod
```

#### 4. Deploy Application
```bash
# Clone repository
git clone <repository-url>
cd digital-marketplace-backend

# Install dependencies
npm install

# Create environment file
nano .env
# Add your production environment variables

# Install PM2 for process management
sudo npm install -g pm2

# Seed admin user
npm run seed

# Start application with PM2
pm2 start server.js --name "marketplace-api"
pm2 startup
pm2 save

# Setup Nginx (optional)
sudo apt install nginx
sudo nano /etc/nginx/sites-available/marketplace-api
```

#### 5. Nginx Configuration (Optional)
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/marketplace-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Option 3: AWS EC2 + MongoDB Atlas

#### 1. Launch EC2 Instance
1. Launch Ubuntu 20.04 instance
2. Configure security groups (ports 22, 80, 443, 3000)
3. SSH into instance

#### 2. Setup Application
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone and setup application
git clone <repository-url>
cd digital-marketplace-backend
npm install

# Configure environment with MongoDB Atlas connection
nano .env

# Install PM2
sudo npm install -g pm2

# Seed and start
npm run seed
pm2 start server.js --name "marketplace-api"
pm2 startup
pm2 save
```

## Environment Variables

### Required Variables
```env
# Server Configuration
PORT=3000
NODE_ENV=production

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/digital-marketplace
# OR for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/digital-marketplace

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

# Default Admin Configuration
ADMIN_PHONE=9999999999
ADMIN_PASSWORD=secure-admin-password
ADMIN_NAME=System Administrator

# Optional: Frontend URL for referral links
FRONTEND_URL=https://your-frontend-domain.com
```

## SSL Certificate (Production)

### Using Let's Encrypt with Certbot
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

## Monitoring and Maintenance

### PM2 Commands
```bash
# View running processes
pm2 list

# View logs
pm2 logs marketplace-api

# Restart application
pm2 restart marketplace-api

# Stop application
pm2 stop marketplace-api

# Monitor resources
pm2 monit
```

### MongoDB Maintenance
```bash
# Check MongoDB status
sudo systemctl status mongod

# View MongoDB logs
sudo tail -f /var/log/mongodb/mongod.log

# MongoDB shell
mongo

# Backup database
mongodump --db digital-marketplace --out /backup/

# Restore database
mongorestore --db digital-marketplace /backup/digital-marketplace/
```

## Security Checklist

- [ ] Change default admin password
- [ ] Use strong JWT secret
- [ ] Enable MongoDB authentication
- [ ] Configure firewall (UFW)
- [ ] Setup SSL certificate
- [ ] Regular security updates
- [ ] Monitor application logs
- [ ] Backup database regularly
- [ ] Use environment variables for secrets
- [ ] Implement rate limiting (optional)

## Troubleshooting

### Common Issues

#### MongoDB Connection Failed
```bash
# Check MongoDB status
sudo systemctl status mongod

# Start MongoDB
sudo systemctl start mongod

# Check MongoDB logs
sudo tail -f /var/log/mongodb/mongod.log
```

#### Application Won't Start
```bash
# Check Node.js version
node --version

# Check application logs
pm2 logs marketplace-api

# Check environment variables
pm2 env 0
```

#### Port Already in Use
```bash
# Find process using port 3000
sudo lsof -i :3000

# Kill process
sudo kill -9 <PID>
```

## Performance Optimization

### Database Indexing
The application automatically creates necessary indexes, but you can verify:

```javascript
// Connect to MongoDB shell
use digital-marketplace

// Check indexes
db.users.getIndexes()
db.products.getIndexes()
db.orders.getIndexes()
db.transactions.getIndexes()
```

### PM2 Cluster Mode
```bash
# Start in cluster mode (uses all CPU cores)
pm2 start server.js --name "marketplace-api" -i max
```

### Nginx Caching (Optional)
Add to Nginx configuration:
```nginx
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

## Backup Strategy

### Automated Database Backup
```bash
#!/bin/bash
# Create backup script: /home/ubuntu/backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/ubuntu/backups"
DB_NAME="digital-marketplace"

mkdir -p $BACKUP_DIR

# Create backup
mongodump --db $DB_NAME --out $BACKUP_DIR/backup_$DATE

# Keep only last 7 days of backups
find $BACKUP_DIR -type d -name "backup_*" -mtime +7 -exec rm -rf {} \;

# Add to crontab for daily backup at 2 AM
# 0 2 * * * /home/ubuntu/backup.sh
```

This deployment guide covers various deployment scenarios and should help you get the application running in production environments.