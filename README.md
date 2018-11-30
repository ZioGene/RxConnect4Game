# Overview

This repo contains the sample code for the Labcamp: [Reactive Apps with WebSockets](https://tamtamy.reply.com/tamtamy/page/group/event-9927.action)

It implements a WebSockets client-server system that lets two people play
connect4 against each other

# Usage

`npm run start`

This will run both the server and the client. It will also open one web browser on http://localhost:8081. This will the Red player. You need to open another tab (or browser) and go to http://localhost:8081 again. This will be the Yellow player and then the game can start with the players alternating turns until one wins. 