#!/bin/bash
cd /home/z/my-project
while true; do
  if ! curl -s -m 3 http://localhost:3000/ > /dev/null 2>&1; then
    echo "$(date) - Server down, restarting..." >> /tmp/keep-alive.log
    pkill -f "node.*server" 2>/dev/null
    sleep 1
    PORT=3000 node .next/standalone/server.js >> /tmp/next-serve.log 2>&1 &
    sleep 3
    echo "$(date) - Restarted" >> /tmp/keep-alive.log
  fi
  sleep 5
done
