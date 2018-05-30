# PRIVATE REPOSITORY - ALL RIGHTS RESERVED

## Windows install:
If you have problems with NPM install check the readme of the websocket-threads package.

## Latency fixes (Nagle’s Algorithm Disable):
Nagle’s algorithm combines several small packets into a single, larger packet for more efficient transmissions. This is designed to improve throughput efficiency of data transmission. Disabling “nagling” can help reduce latency/ping in some games. Nagle’s algorithm is enabled in Windows by default.

To implement this tweak, modify the following registry keys.

### HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters\Interfaces\{NIC-id}

For the {NIC-id}, look for the one with your IP address listed. Under this {NIC-id} key, create the following DWORD value:

- TcpAckFrequency and set it to 1 to disable “nagling” for gaming.
- TCPNoDelay and set it also to 1 to disable “nagling”
- TcpDelAckTicks and set it to 0
