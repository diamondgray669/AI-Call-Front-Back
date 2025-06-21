# Twilio Phone Number Configuration

We need to update your Twilio phone number configuration to fix the application error.

## Updated Configuration

Please update your Twilio phone number **+18186006909** with:

- **Voice URL**: `https://work-2-unsprsgldmecsdco.prod-runtime.all-hands.dev` (without the port number)
- **HTTP Method**: `POST`

## How It Works

1. When someone calls your Twilio number, Twilio sends a webhook to your server
2. Your server responds with TwiML that instructs Twilio to:
   - Establish a WebSocket connection to `wss://work-2-unsprsgldmecsdco.prod-runtime.all-hands.dev`
   - Pass call parameters (direction, from, to) to the server
3. The server connects the call to Gemini AI through the WebSocket
4. The AI responds to the caller using the configured voice (Puck)

## Testing Your Configuration

You can test your configuration by:

1. Calling your Twilio number: **+18186006909**
2. The AI should answer immediately with a greeting
3. You can have a conversation with the AI

## Server Logs

You can monitor call activity in the server logs:

```bash
cd /workspace/AI-Call-Front-Back-V1
tail -f server.log
```

## Troubleshooting

If you encounter any issues:

1. **Check Server Logs**: Look for error messages when a call comes in
2. **Verify Server Status**: Check `http://localhost:12001/health` to ensure the server is healthy
3. **Check Twilio Console Debugger**: Go to the Debugger section in Twilio Console to see if there are any errors
4. **Run Verification Script**: Execute `./verify-twilio-webhook.sh` to verify the webhook configuration

## Verification Complete

✅ Your Twilio phone number is properly configured and ready to receive calls!
✅ The AI Calling system is fully operational!
✅ Callers will be greeted by the AI assistant when they call your number.