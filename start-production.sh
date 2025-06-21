#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🚀 Starting AI Call Center in production mode...${NC}"

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}Installing PM2 globally...${NC}"
    npm install -g pm2
fi

# Check if the server is already running
if pm2 list | grep -q "ai-call-center"; then
    echo -e "${YELLOW}Stopping existing AI Call Center process...${NC}"
    pm2 stop ai-call-center
    pm2 delete ai-call-center
fi

# Check if port 12001 is in use
PORT_IN_USE=$(netstat -tulpn 2>/dev/null | grep -c ":12001" || echo "0")
if [ "$PORT_IN_USE" -gt 0 ]; then
    echo -e "${YELLOW}⚠️ Port 12001 is already in use. Killing the process...${NC}"
    PROCESS_ID=$(netstat -tulpn 2>/dev/null | grep ":12001" | awk '{print $7}' | cut -d'/' -f1)
    kill -9 $PROCESS_ID 2>/dev/null || true
    sleep 2
fi

# Start the server with PM2
echo -e "${YELLOW}Starting AI Call Center with PM2...${NC}"
NODE_ENV=production pm2 start server.js --name ai-call-center

# Save PM2 configuration
echo -e "${YELLOW}Saving PM2 configuration...${NC}"
pm2 save

# Display status
echo -e "${YELLOW}Server status:${NC}"
pm2 status ai-call-center

# Verify the server is running correctly
echo -e "\n${YELLOW}Verifying server health...${NC}"
sleep 2
HEALTH_CHECK=$(curl -s http://localhost:12001/health)

if [[ $HEALTH_CHECK == *"healthy"* ]]; then
    echo -e "${GREEN}✅ Server is healthy${NC}"
    echo -e "${GREEN}✅ AI Call Center is running in production mode!${NC}"
    echo -e "\n${YELLOW}To monitor logs:${NC} pm2 logs ai-call-center"
    echo -e "${YELLOW}To stop the server:${NC} pm2 stop ai-call-center"
    echo -e "${YELLOW}To restart the server:${NC} pm2 restart ai-call-center"
    
    echo -e "\n${YELLOW}Twilio Configuration:${NC}"
    echo -e "Make sure your Twilio phone number (+18186006909) is configured with:"
    echo -e "  Voice URL: ${GREEN}https://work-2-unsprsgldmecsdco.prod-runtime.all-hands.dev${NC}"
    echo -e "  HTTP Method: ${GREEN}POST${NC}"
    
    echo -e "\n${YELLOW}To verify your configuration:${NC}"
    echo -e "./verify-twilio-webhook.sh"
else
    echo -e "${RED}❌ Server health check failed${NC}"
    echo "Health check response: $HEALTH_CHECK"
    echo -e "${YELLOW}Check the logs for errors:${NC} pm2 logs ai-call-center"
    exit 1
fi

exit 0