# An Introduction to Transcribing Conversations with SWML - README

## Table of Contents

1. [Introduction](#introduction)
2. [Overview](#overview)
3. [Capabilities and Endpoints](#capabilities-and-endpoints)
   - [Live Transcribe](#live-transcribe)
   - [Incoming Calls](#incoming-calls)
   - [Transcription](#transcription)
4. [Environment Variables](#environment-variables)
5. [Conclusion](#conclusion)
6. [Appendix](#appendix)

---

## Introduction

This project utilizes **SignalWire Markup Language (SWML)** and **Call Fabric Resources** to enable real-time call transcription and logging for inbound calls. It integrates **SignalWire’s telephony services** with **live transcription**, call recording, and **conversation summaries** to enhance communication workflows.

### What is Call Fabric?

Call Fabric, SignalWire’s latest innovation in software-defined telecom, introduces a new architecture that unifies CPaaS, UCaaS, and CCaaS solutions. This allows developers to create sophisticated communication workflows by leveraging programmable **Resources** and **Addresses**.

With **Call Fabric**, you can:

- Design scalable voice, messaging, and video applications.
- Utilize **live transcription** capabilities via SWML.
- Monitor call interactions in real time with AI-generated summaries.

## Overview

The project architecture consists of:

- **SWML Middleware**: Handles incoming call data and triggers event-based actions.
- **Node.js Backend**: Listens for call events and processes transcription data.
- **SignalWire API**: Manages call interactions and event handling.

The system supports:

- **Call initiation tracking**
- **Live transcription & AI-generated summaries**
- **Structured logging & CSV report generation**

## Capabilities and Endpoints

### **Live Transcribe**

#### Purpose
Captures real-time transcriptions of incoming calls and generates AI-driven summaries.

#### SWML Tool Specification

```json
{
    "live_transcribe": {
        "action": {
            "start": {
                "webhook": "<Your-Webhook-Address-Here>/transcription",
                "lang": "en",
                "live_events": false,
                "ai_summary": true,
                "speech_timeout": 8000,
                "vad_silence_ms": 80,
                "vad_thresh": 80,
                "debug_level": 0,
                "direction": ["remote-caller", "local-caller"],
                "speech_engine": "default",
                "summary_prompt": "Summarize the primary talking points in this conversation."
            }
        }
    }
}
```

#### Node.js Implementation

```javascript
app.post('/transcription', (req, res) => {
    const body = req.body;
    const call_sid = body.channel_data.call_id;
    const conversation_log = body.conversation_log || [];
    const summary = body.conversation_summary || null;

    const conversationLogString = conversation_log.map(log => `${log.role}: ${log.content}`).join(', ');

    const callIndex = callArray.findIndex(call => call[0] === call_sid);

    if (callIndex !== -1) {
        callArray[callIndex][4] = conversationLogString;
        callArray[callIndex][5] = summary;

        console.log("Updated Call Details:", callArray);
        res.status(200).json({ message: 'Transcription recorded successfully.' });
    } else {
        res.status(400).json({ message: 'Call SID not found.' });
    }
});
```

### **Incoming Calls**

#### Purpose
Handles and logs inbound call details.

#### SWML Tool Specification

```json
{
    "request": {
        "url": "<Your-Webhook-Address-Here>/incomingCalls",
        "method": "POST",
        "headers": { "Content-Type": "application/json" },
        "body": {
            "call_sid": "${call.call_id}",
            "call_status": "${call.call_state}",
            "from_number": "${call.from}",
            "to_number": "${call.to}"
        }
    }
}
```

#### Node.js Implementation

```javascript
app.post('/incomingCalls', (req, res) => {
    const { call_sid, call_status, from_number, to_number } = req.body;
    callArray.push([call_sid, call_status, from_number, to_number, '', '']);
    console.log("Inbound Call Recorded:", callArray);
    res.status(200).json({ message: 'Call recorded successfully.' });
});
```

## Environment Variables

The project requires the following environment variables:

- `SIGNALWIRE_PROJECT_ID`: Your SignalWire Project ID.
- `SIGNALWIRE_API_TOKEN`: Authentication token.
- `SIGNALWIRE_SPACE`: The domain of your SignalWire space.
- `WEBHOOK_URL`: URL for receiving transcriptions and call data.

## Conclusion

This project provides a structured **call handling** and **transcription system** using **SignalWire APIs** and **SWML**. It ensures real-time logging and easy-to-access call summaries, enhancing communication workflows with automation and AI-driven insights.

## Appendix

- **Resources & Addresses**: Call Fabric’s new paradigm for scalable communication workflows.
- **Node.js Call Monitoring**: Generates structured logs for deeper analysis.
