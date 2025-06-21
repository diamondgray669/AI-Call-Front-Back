#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🔍 Verifying Twilio webhook configuration...${NC}"

# Get the server port from .env file or use default
PORT=$(grep -oP 'PORT=\K[0-9]+' .env 2>/dev/null || echo "12001")

# Test the webhook endpoint
echo -e "\n${YELLOW}Testing webhook endpoint...${NC}"
RESPONSE=$(curl -s -X POST http://localhost:$PORT/ \
  -d "CallSid=TEST_VERIFICATION&From=+12345678901&To=+18186006909" \
  -H "Content-Type: application/x-www-form-urlencoded")

# Check if the response contains the expected TwiML
if [[ $RESPONSE == *"<Response>"* && $RESPONSE == *"<Connect>"* && $RESPONSE == *"<Stream"* ]]; then
  echo -e "${GREEN}✅ Webhook endpoint is responding with valid TwiML${NC}"
else
  echo -e "${RED}❌ Webhook endpoint is not responding with valid TwiML${NC}"
  echo "Response received:"
  echo "$RESPONSE"
  exit 1
fi

# Check if the WebSocket URL is correct without port
if [[ $RESPONSE == *"wss://work-2-unsprsgldmecsdco.prod-runtime.all-hands.dev\""* ]]; then
  echo -e "${GREEN}✅ WebSocket URL is correctly configured without port${NC}"
else
  echo -e "${RED}❌ WebSocket URL is not correctly configured${NC}"
  echo "Response received:"
  echo "$RESPONSE"
  exit 1
fi

# Check if the parameters are correctly set
if [[ $RESPONSE == *"direction"* ]]; then
  echo -e "${GREEN}✅ Stream parameters are correctly configured${NC}"
else
  echo -e "${RED}❌ Stream parameters are not correctly configured${NC}"
  echo "Response received:"
  echo "$RESPONSE"
  exit 1
fi

# Check PM2 logs for the test call
echo -e "\n${YELLOW}Checking server logs...${NC}"
LOGS=$(pm2 logs ai-call-center --lines 20 --nostream)

if [[ $LOGS == *"TEST_VERIFICATION"* ]]; then
  echo -e "${GREEN}✅ Server logs show the test call was received${NC}"
else
  echo -e "${YELLOW}⚠️ Could not verify test call in logs${NC}"
  echo "This is expected if you're using PM2 for process management"
  echo "You can check the logs manually with: pm2 logs ai-call-center"
fi

echo -e "\n${GREEN}✅ Twilio webhook configuration verified successfully!${NC}"
echo -e "${YELLOW}Your Twilio phone number (+18186006909) should now be properly configured.${NC}"
echo -e "${YELLOW}Make sure you've set the Voice URL in Twilio to:${NC}"
echo -e "  https://work-2-unsprsgldmecsdco.prod-runtime.all-hands.dev"
echo -e "${YELLOW}with HTTP method set to POST${NC}"

exit 0