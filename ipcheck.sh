#!/bin/bash

echo "=== IP INFO (WSL) ==="

# IP interno di WSL
IP_INTERNAL=$(hostname -I | awk '{print $1}')
echo "WSL internal IP: $IP_INTERNAL"

# IP di Windows host (visto da WSL)
IP_WINDOWS=$(ping -c1 host.docker.internal 2>/dev/null | head -n1 | grep -oE '[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+')
echo "Windows host IP: $IP_WINDOWS"

# IP pubblico (esterno)
IP_PUBLIC=$(curl -s ifconfig.me)
echo "Public IP: $IP_PUBLIC"
