//new websocket which will connect to node js server
const websocket = new WebSocket("ws://192.168.54.169:3000")
let username
let localStream 
let peerConn

websocket.onmessage = (event) => {
    handleSignallingData(JSON.parse(event.data))
}

function handleSignallingData(data){
    switch(data.type){
        case "answer":
            peerConn.setRemoteDescription(data.answer)
            break

        case "candidate":
            peerConn.addIceCandidate(data.candidate)
    }
}

function sendUsername(){
    username = document.getElementById('username').value

    sendData({
        type: 'store_user'
    })
}

//start video call
function startCall(){
    document.getElementById('video-call-div').style.display = "inline"

    //navigator api to show the video
    navigator.getUserMedia({
        video:{
            frameRate:24,
            width:{
                min:480, ideal:720, max:1280
            },
            aspectRatio:1.3333
        },
        audio:true
    },(stream) => {
        localStream = stream
        document.getElementById('local-video').srcObject = localStream

        //servers for video call
        let configuration = {
            iceServers: [
                {
                    "urls":["stun:stun.l.google.com:19302",
                        "stun:stun1.l.google.com:19302",
                        "stun:stun2.l.google.com:19302"]
                }
            ]
        }

        peerConn = new RTCPeerConnection(configuration)
        peerConn.addStream(localStream)

        peerConn.onaddstream = (e) => {
            document.getElementById('remote-video').srcObject = e.stream
        }

        peerConn.onicecandidate = ((e) => {
            if(e.candidate == null){
                return
            }

            sendData({
                type:'store_candidate',
                candidate:e.candidate
            })

        })

        //create the offer and send it to the user

        createAndSendOffer()

    },(error) => {
        console.log(error)
    })
}

function createAndSendOffer()
{
    peerConn.createOffer((offer) => {
        sendData({
            type: 'store_offer',
            offer:offer
        })

        peerConn.setLocalDescription(offer)
    })
}

let isAudio = true
let isVideo = true

function muteAudio(){
    isAudio = !isAudio
    localStream.getAudioTracks()[0].enabled = isAudio
}

function muteVideo(){
    isVideo = !isVideo
    localStream.getVideoTracks()[0].enabled = isVideo
}

function sendData(data){
    data.username = username
    websocket.send(JSON.stringify)
}