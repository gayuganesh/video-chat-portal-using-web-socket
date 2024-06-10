const WEBSOCKET_URL = "ws://192.168.54.169:3000";
let websocket;
let username;
let localStream;
let peerConn;
let reconnectInterval = 1000; // Initial reconnect interval in ms

function connectWebSocket() {
    websocket = new WebSocket(WEBSOCKET_URL);

    websocket.onopen = () => {
        console.log("WebSocket connection established");
        reconnectInterval = 1000; // Reset reconnect interval on successful connection
        if (username) {
            // Re-send username to server if already set
            sendUsername();
        }
    };

    websocket.onmessage = (event) => {
        console.log("Message received: ", event.data);
        handleSignallingData(JSON.parse(event.data));
    };

    websocket.onclose = (event) => {
        console.log(`WebSocket connection closed: ${event.reason} (Code: ${event.code})`);
        attemptReconnect();
    };

    websocket.onerror = (error) => {
        console.log("WebSocket error: ", error);
    };
}

function attemptReconnect() {
    setTimeout(() => {
        console.log("Reconnecting...");
        connectWebSocket();
    }, reconnectInterval);

    // Exponential backoff
    reconnectInterval = Math.min(reconnectInterval * 2, 30000); // Cap at 30 seconds
}

function handleSignallingData(data) {
    switch (data.type) {
        case "offer":
            peerConn.setRemoteDescription(new RTCSessionDescription(data.offer))
                .then(() => {
                    createAndSendAnswer();
                })
                .catch(error => console.error("Error setting remote description: ", error));
            break;

        case "candidate":
            peerConn.addIceCandidate(new RTCIceCandidate(data.candidate))
                .catch(error => console.error("Error adding received ice candidate: ", error));
            break;
    }
}

function sendUsername() {
    username = document.getElementById('username').value;

    sendData({
        type: 'store_user'
    });
}

// Start video call
function startCall() {
    document.getElementById('video-call-div').style.display = "inline";

    // navigator API to show the video
    navigator.mediaDevices.getUserMedia({
        video: {
            frameRate: 24,
            width: {
                min: 480, ideal: 720, max: 1280
            },
            aspectRatio: 1.3333
        },
        audio: true
    }).then((stream) => {
        localStream = stream;
        document.getElementById('local-video').srcObject = localStream;

        // Servers for video call
        let configuration = {
            iceServers: [
                {
                    "urls": [
                        "stun:stun.l.google.com:19302",
                        "stun:stun1.l.google.com:19302",
                        "stun:stun2.l.google.com:19302"
                    ]
                }
            ]
        };

        peerConn = new RTCPeerConnection(configuration);
        peerConn.addStream(localStream);

        peerConn.onaddstream = (e) => {
            document.getElementById('remote-video').srcObject = e.stream;
        };

        peerConn.onicecandidate = (e) => {
            if (e.candidate == null) {
                return;
            }

            sendData({
                type: 'store_candidate',
                candidate: e.candidate
            });
        };

        // Create the offer and send it to the user
        createAndSendOffer();
    }).catch((error) => {
        console.log(error);
    });
}

function createAndSendAnswer() {
    peerConn.createAnswer()
        .then(answer => {
            return peerConn.setLocalDescription(answer)
                .then(() => {
                    sendData({
                        type: 'send_answer',
                        answer: answer
                    });
                });
        })
        .catch(error => console.error("Error creating and sending answer: ", error));
}

function joinCall() {
    sendData({
        type: 'join_call'
    });
}

let isAudio = true;
let isVideo = true;

function muteAudio() {
    isAudio = !isAudio;
    localStream.getAudioTracks()[0].enabled = isAudio;
}

function muteVideo() {
    isVideo = !isVideo;
    localStream.getVideoTracks()[0].enabled = isVideo;
}

function sendData(data) {
    if (websocket.readyState === WebSocket.OPEN) {
        data.username = username;
        websocket.send(JSON.stringify(data));
    } else {
        console.log("WebSocket is not open: readyState " + websocket.readyState);
    }
}

// Initialize WebSocket connection
connectWebSocket();
