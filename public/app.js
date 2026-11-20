const socket = io();
const $ = (id) => document.getElementById(id);
const roomInput = $("room");
const statusBox = $("status");
const localVideo = $("localVideo");
const remoteVideo = $("remoteVideo");

let localStream = null;
let pc = null;
let joined = false;
let role = null;
let pendingCandidates = [];

function status(message) { statusBox.textContent = message; }
function roomCode() {
  const value = roomInput.value.trim();
  if (!/^[a-zA-Z0-9_-]{4,40}$/.test(value)) {
    status("Room code must be 4–40 letters, numbers, hyphens or underscores.");
    return null;
  }
  return value;
}
function join(room, selectedRole) {
  if (joined) return true;
  socket.emit("join-room", { room, role: selectedRole });
  role = selectedRole;
  joined = true;
  return true;
}
function makePeer() {
  if (pc) return pc;
  pc = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
  });
  pc.onicecandidate = (event) => {
    if (event.candidate) socket.emit("ice-candidate", event.candidate);
  };
  pc.ontrack = (event) => {
    remoteVideo.srcObject = event.streams[0];
    status("Live stream connected. The sender can stop sharing at any time.");
  };
  pc.onconnectionstatechange = () => {
    if (pc && ["failed", "disconnected", "closed"].includes(pc.connectionState)) {
      status("Stream disconnected.");
    }
  };
  return pc;
}

$("cameraPermission").addEventListener("click", async () => {
  try {
    if (!navigator.mediaDevices?.getUserMedia) {
      status("Camera requires HTTPS and a modern browser. Open the deployed HTTPS link.");
      return;
    }
    localStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" },
      audio: false
    });
    localVideo.srcObject = localStream;
    $("startShare").disabled = false;
    status("Camera preview is active on this device. Press Start live sharing when ready.");
  } catch (err) {
    status(`Camera was not enabled: ${err.message || "permission denied"}`);
  }
});

$("startShare").addEventListener("click", async () => {
  const room = roomCode();
  if (!room || !localStream) return;
  join(room, "host");
  const peer = makePeer();
  localStream.getTracks().forEach(track => peer.addTrack(track, localStream));
  try {
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    socket.emit("offer", peer.localDescription);
    $("startShare").disabled = true;
    $("stopShare").disabled = false;
    status("You are sharing your camera live. Keep this page open; press Stop to end.");
  } catch (err) {
    status(`Could not start sharing: ${err.message}`);
  }
});

$("joinViewer").addEventListener("click", () => {
  const room = roomCode();
  if (!room) return;
  join(room, "viewer");
  status("Joined as viewer. Waiting for the other person to start their camera.");
});

$("stopShare").addEventListener("click", stopEverything);
function stopEverything() {
  if (localStream) localStream.getTracks().forEach(track => track.stop());
  localStream = null;
  localVideo.srcObject = null;
  remoteVideo.srcObject = null;
  if (pc) pc.close();
  pc = null;
  if (joined) socket.emit("hangup");
  $("startShare").disabled = true;
  $("stopShare").disabled = true;
  $("cameraPermission").disabled = false;
  joined = false;
  role = null;
  pendingCandidates = [];
  status("Camera and stream stopped.");
}

socket.on("joined", ({ role: joinedRole }) => {
  status(joinedRole === "host" ? "Camera sender joined. Waiting for viewer…" : "Viewer joined. Waiting for the camera sender…");
});
socket.on("room-full", () => {
  joined = false;
  status("This room already has two participants. Use a different room code.");
});
socket.on("peer-joined", ({ role: peerRole }) => {
  status(`${peerRole === "viewer" ? "Viewer" : "Camera sender"} joined the room.`);
});
socket.on("offer", async (offer) => {
  if (role !== "viewer") return;
  const peer = makePeer();
  try {
    await peer.setRemoteDescription(offer);
    for (const candidate of pendingCandidates) await peer.addIceCandidate(candidate);
    pendingCandidates = [];
    const answer = await peer.createAnswer();
    await peer.setLocalDescription(answer);
    socket.emit("answer", peer.localDescription);
    status("Connecting to the camera sender…");
  } catch (err) {
    status(`Connection error: ${err.message}`);
  }
});
socket.on("answer", async (answer) => {
  if (role !== "host" || !pc) return;
  try {
    await pc.setRemoteDescription(answer);
    status("Viewer connected. Your camera is being shared.");
  } catch (err) { status(`Connection error: ${err.message}`); }
});
socket.on("ice-candidate", async (candidate) => {
  if (!pc || !pc.remoteDescription) {
    pendingCandidates.push(candidate);
    return;
  }
  try { await pc.addIceCandidate(candidate); } catch (_) {}
});
socket.on("peer-left", () => {
  remoteVideo.srcObject = null;
  status("The other participant left the room.");
});
socket.on("hangup", () => {
  if (role === "viewer") {
    remoteVideo.srcObject = null;
    if (pc) pc.close();
    pc = null;
    status("The camera sender ended the stream.");
  }
});

$("copyHost").addEventListener("click", async () => {
  const room = roomCode();
  if (!room) return;
  const url = new URL("/", window.location.href);
  url.searchParams.set("room", room);
  url.searchParams.set("role", "host");
  try {
    await navigator.clipboard.writeText(url.toString());
    status("Camera-sender invite copied. Share it only with the person who will knowingly share their camera.");
  } catch (_) {
    status(`Invite link: ${url.toString()}`);
  }
});

// Pre-fill room and role from an invite URL, but never start the camera automatically.
const params = new URLSearchParams(location.search);
if (params.has("room")) roomInput.value = params.get("room");
if (params.get("role") === "viewer") {
  status("You were invited as a viewer. Press Join as viewer to connect.");
}
window.addEventListener("beforeunload", () => {
  if (localStream) localStream.getTracks().forEach(track => track.stop());
});
