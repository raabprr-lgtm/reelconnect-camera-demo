# ReelConnect — consent-based camera demo

A small one-to-one WebRTC demo with the supplied Instagram Reel embedded above the camera controls.

## Important privacy behavior

- Opening the link does **not** activate the camera.
- The camera sender must press **Enable camera**, accept the browser permission prompt, preview their own camera, and then press **Start live sharing**.
- The sender has a visible **Stop camera & sharing** button.
- The viewer must join the same room.
- This demo does not record, save, or upload video to the application server. Video is sent peer-to-peer through WebRTC. Network metadata may be visible to the signaling/STUN infrastructure.
- Use only with informed consent. Do not disguise the camera controls or mislead someone about live sharing.

## Run locally

Requires Node.js 18+.

```bash
npm install
npm start
```

Open `http://localhost:3000` in two browser windows/devices. For testing camera on the same computer, localhost is allowed by browsers.

## Deploy for Android

Deploy this Node app to a host that supports persistent Node.js + WebSocket connections (for example, Render or Railway). Use the HTTPS URL. Camera access generally requires HTTPS on phones.

1. Deploy the project.
2. Open the deployed HTTPS site.
3. The camera sender enters a room code and clicks **Copy invite**. Share that invite with the consenting sender.
4. The viewer opens the main site, enters the same room code, and clicks **Join as viewer**.
5. The sender clicks **Enable camera**, approves Android Chrome's camera permission, checks the preview, and clicks **Start live sharing**.
6. Either participant can leave; the sender can press **Stop camera & sharing**.

## Important limitations

- Instagram may block embedding for some Reels, private accounts, age-gated content, or viewers who are not logged in. The page also provides a direct Instagram link.
- This is a starter demo, not a hardened production service. Room codes are not authentication; anyone who knows the code may attempt to join. Use a long random room code and share it privately.
- STUN-only WebRTC may fail on some mobile networks or restrictive NATs. A production deployment may need a TURN server.
- The demo allows one sender and one viewer per room.
