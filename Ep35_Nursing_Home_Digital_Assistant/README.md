# Nursing Home AI Agent: Weekly Health Assessments with SignalWire

## Table of Contents
1. [Introduction](#introduction)  
2. [Overview](#overview)  
3. [Functions & Capabilities](#functions--capabilities)  
   - [verify_patient](#verify_patient)  
   - [get_data](#get_data)  
   - [store_summary](#store_summary)  
   - [send_message](#send_message)  
4. [Environment Variables](#environment-variables)  
5. [Sample Prompt for the AI Agent](#sample-prompt-for-the-ai-agent)  
6. [Conclusion](#conclusion)

---

## Introduction
This **Nursing Home AI Agent** automates weekly health assessments for residents using **SignalWire RELAY v2** ([RELAY SDK for Python](https://docs.signalwire.com/reference/relay-sdk-python/v2/#relay-sdk-for-python)) for outbound calls. Once a call connects, the AI agent—powered by **SWML**—verifies the patient’s identity, collects vital health information, and, if necessary, retrieves additional medical guidance via **Datasphere**. The system records patient responses in a local SQLite database and, through its integrated functions, ensures that critical information reaches caregivers without delay.

---

## Overview
The system is built around four core SWML/SWAIG functions:
- **verify_patient**: Confirms the patient’s identity (first and last name) by querying a local database.
- **get_data**: Retrieves additional health information from Datasphere, which processes PDF documents by breaking them into searchable chunks.
- **store_summary**: Logs the final call summary into the database, associating it with the patient.
- **send_message**: Sends a brief SMS recap to the caregiver using stored contact details.

A simple Flask web interface lets staff add or update patient data and trigger calls, while the dialer script places outbound calls from your configured number.

---

## Functions & Capabilities

### `verify_patient`
**Purpose:** Validate the patient’s identity by checking the provided first and last name against the database.  
Upon a successful match, the endpoint returns the patient's ID and caregiver phone number.  
In the SWML **`verify_patient`** function, this data is then set as meta_data (using the same `meta_data_token`) so subsequent functions can access it without re-querying the database.

**SWML Example:**
```jsonc
{
  "function": "verify_patient",
  "purpose": "Verify patient's first and last name in the local database and retrieve caregiver info.",
  "argument": {
    "type": "object",
    "properties": {
      "first_name": { "type": "string", "description": "The patient's first name" },
      "last_name": { "type": "string", "description": "The patient's last name" }
    }
  },
  "data_map": {
    "webhooks": [
      {
        "method": "POST",
        "url": "https://<YOUR-ENDPOINT>/verify_patient",
        "params": {
          "first_name": "${args.first_name}",
          "last_name": "${args.last_name}"
        },
        "output": {
          "response": "Verified ${Records[0].first_name} ${Records[0].last_name}.",
          "action": [
            {
              "set_meta_data": {
                "patient_id": "${Records[0].id}",
                "caregiver_phone": "${Records[0].caregiver_phone}"
              }
            }
          ]
        }
      }
    ]
  },
  "meta_data_token": "patient_meta"
}
```

### `get_data`
**Purpose:** 
Retrieve additional health information by querying SWs Datasphere API.
Datasphere takes large text documents (e.g., PDFs), splits them into searchable chunks, and stores them as vectors. This function allows the AI agent to pull the most relevant paragraph based on the patient's question.

**SWML Example:**
```jsonc
{
  "function": "get_data",
  "purpose": "Use this information to answer the user's query.",
  "argument": {
    "type": "object",
    "properties": {
      "user_question": { "type": "string", "description": "The question the patient asks." }
    }
  },
  "data_map": {
    "webhooks": [
      {
        "method": "POST",
        "url": "https://<YOUR-SIGNALWIRE-SPACE>.signalwire.com/api/datasphere/documents/search",
        "headers": {
          "Content-Type": "application/json",
          "Authorization": "Basic OGVhMjI0YzktM--USE--Project_ID:API_KEY--TO-BASE64-ENCODE--NkYjFh"
        },
        "params": {
          "query_string": "${args.user_question}",
          "document_id": "<YOUR_DOCUMENT_ID>"
        },
        "output": {
          "response": "Here's what I found: ${chunks[0].text}",
          "action": []
        }
      }
    ]
  }
}   
```

### `store_summary`
**Purpose:**
Save a concise record of the call in the local database, associating it with the patient’s ID.
This ensures that the conversation history and any health insights are permanently logged for future reference.

### `send_message`
**Purpose:**
Send a brief SMS summary (e.g., "Patient feeling good, no pain.") to the caregiver.
This function leverages the meta_data (specifically, the ```caregiver_phone``` set in ```/verify_patient```) to deliver timely notifications.

---

## Environment Variables
Set up your environment by creating a ```.env``` file in the project root with the following variables:

```bash
PROJECT_ID="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
REST_API_TOKEN="PTxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
SIGNALWIRE_SPACE="myspace.signalwire.com"
SIGNALWIRE_NUMBER="+1XXXXXXXXXX"
PUBLIC_URL="https://example.ngrok.io"
AI_AGENT_NUMBER="+1YYYYYYYYYY"
``` 

- PROJECT_ID: Your SignalWire project ID.
- REST_API_TOKEN: Your SignalWire API token.
- SIGNALWIRE_SPACE: Your SignalWire domain (e.g., myspace.signalwire.com).
- SIGNALWIRE_NUMBER: The phone number used to dial out.
- PUBLIC_URL: Your public callback URL (use ngrok or another tunneling service).
- AI_AGENT_NUMBER: The phone number where your AI agent (SWML) listens.

---

## Sample Prompt for the AI Agent

**Prompt:**
```
Objective:
You are an AI assistant calling residents every week to assess their well-being.

Key Guidelines:
1. Greet the patient warmly.
2. Verify the patient's name using verify_patient.
3. Ask about pain, appetite, sleep, etc.
4. Ask if the patient needs more info about their symptoms. Call the get_data function to access that information.
5. Summarize the call using store_summary and, send a brief SMS recap with send_message.
```

---

## Conclusion
This AI agent streamlines the weekly health assessment process for nursing home residents, ensuring that caregivers receive timely updates and that patient data is securely stored for future reference. By leveraging SignalWire's AI Agent through SWML, you can easily customize the agent's functions to meet your specific needs and enhance the quality of care provided to residents.
