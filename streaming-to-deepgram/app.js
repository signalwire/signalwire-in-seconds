require("dotenv").config()
const ngrok = require('ngrok')
let wss_url

(async function () {
    let ngrok_url = await ngrok.connect({
        authtoken: process.env.NGROK_TOKEN,
        addr: process.env.PORT
    })
    console.log("Please connect a Phone Number with the following Webhook URL:", ngrok_url + '/startStreaming')
    wss_url = ngrok_url.replace("https://", "wss://")
})();

const WebSocket = require('ws')
const wss = new WebSocket.Server({ noServer: true })
var express = require('express')
var app = express()

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

const { RestClient } = require('@signalwire/compatibility-api')
const { Deepgram } = require("@deepgram/sdk")
const deepgram = new Deepgram(process.env.DEEPGRAM_TOKEN)

app.post("/startStreaming", async (req, res) => {
    const response = new RestClient.LaML.VoiceResponse()

    const start = response.start();
    start.stream({
        url: wss_url,
        track: 'both_tracks'
    })
    response.pause({ length: 1 })
    response.say("Please wait one moment.")
    response.pause({ length: 3 })
    response.say("Yes, we are open Monday through Friday.")
    response.pause({ length: 60 })

    res.send(response.toString())
});

const server = app.listen(process.env.PORT, () => {
    console.log(`Listening on port ${process.env.PORT}\n`)
});

function createDeepgramConnection() {
    return deepgram.transcription.live({
        punctuate: true,
        model: "phonecall",
        encoding: "mulaw",
        channels: 1,
        sample_rate: 8000
    })
}

function listenForTranscriptionResults(deepgramConnection, callSid, callLeg) {
    deepgramConnection.addListener("transcriptReceived", (result) => {
        let data = JSON.parse(result)

        if (data.type == 'Results' && data.channel.alternatives[0].transcript != '') {
            console.log(callSid, callLeg, data.channel.alternatives[0].transcript)
        }

    });
}

server.on('upgrade', (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, async (ws) => {
        console.log("New Connection Initiated.")

        const deepgramLiveInbound = createDeepgramConnection()
        const deepgramLiveOutbound = createDeepgramConnection()

        ws.on('message', (message) => {
            const msg = JSON.parse(message)

            switch (msg.event) {
                case "connected":
                    console.log("A new call was connected.")
                    break

                case "start":
                    listenForTranscriptionResults(deepgramLiveInbound, msg.start.callSid, 'inbound')
                    listenForTranscriptionResults(deepgramLiveOutbound, msg.start.callSid, 'outbound')
                    break

                case "media":
                    const payload = Buffer.from(msg.media.payload, "base64")

                    try {
                        if (msg.media.track === 'inbound' && deepgramLiveInbound.getReadyState() === 1) {
                            deepgramLiveInbound.send(payload)
                        } else if (msg.media.track === 'outbound' && deepgramLiveOutbound.getReadyState() === 1) {
                            deepgramLiveOutbound.send(payload)
                        }
                    } catch (error) {
                        console.log("Error:", error)
                    }

                    break

                case "stop":
                    console.log("Call has ended.")
                    break
            }
        });
    });
});