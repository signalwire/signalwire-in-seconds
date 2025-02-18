# AI Agent - Fleming: Decrypting Data with SignalWire

## Table of Contents

1. [Introduction](#introduction)
2. [Overview](#overview)
3. [Functions & Capabilities](#functions--capabilities)
   - [Fetch](#function-fetch)
   - [Decode](#function-decode)
   - [Decrypt](#function-decrypt)
4. [Environment Variables](#environment-variables)
5. [Sample Prompt for the AI Agent](#sample-prompt-for-the-ai-agent)
6. [Conclusion](#conclusion)
7. [Appendix](#appendix)

---

## Introduction

Fleming is a virtual cryptologist AI Agent designed to retrieve, decode, and decrypt classified information using **SignalWire AI Gateway (SWAIG)** and the **SignalWire Realtime API**. By leveraging SMS-based interactions, users can securely transmit encrypted messages and later decrypt them through structured conversations with Fleming.

## Overview

Fleming operates as an AI-powered digital employee with **three core functions**:

1. **Fetch**: Retrieve encrypted messages and associated keys from a CSV file.
2. **Decode**: Convert Base64-encoded messages into a readable hex format.
3. **Decrypt**: Decrypt the hex message using AES-256-CBC encryption.

The AI agent is deployed using a **Node.js server**, a **Relay v4 messaging application**, and a **SignalWire Markup Language (SWML) script** to manage structured AI interactions effectively.

## Functions & Capabilities

### Function: Fetch

**Purpose:** Retrieve the Secret Message, Key, and IV from the server.

**OpenAI Tool Specification:**

```json
{
    "function": "fetch",
    "description": "Retrieve the Secret Message, Key, and IV from the server.",
    "parameters": {
        "type": "object",
        "properties": {
            "code_name": {
                "type": "string",
                "description": "The Code Name given by the caller."
            }
        }
    },
    "data_map": {
        "webhooks": [
            {
                "url": "https://<YOUR-SERVER-ADDRESS>/fetch?code_name=${args.code_name}",
                "method": "GET",
                "output": {
                    "response": "Agent ${classifiedInfo[${index}].code_name}, the classified data has been successfully retrieved."
                }
            }
        ]
    }
}
```

**Node.js Implementation:**

```javascript
app.get("/fetch", (req, res) => {
    const { code_name } = req.query;
    const index = classifiedInfo.findIndex(secret => secret.code_name === code_name);
    res.json({ classifiedInfo, index });
});
```

---

### Function: Decode

**Purpose:** Convert Base64-encoded messages into a readable hex format.

**OpenAI Tool Specification:**

```json
{
    "function": "decode",
    "description": "Decode the Secret Message.",
    "parameters": {
        "type": "object",
        "properties": {
            "secret_message": {
                "type": "string",
                "description": "The Secret Message to decode."
            }
        }
    },
    "data_map": {
        "webhooks": [
            {
                "url": "https://<YOUR-SERVER-ADDRESS>/decode?secret_message=${args.secret_message}",
                "method": "GET",
                "output": {
                    "response": "The Decoded Message is... ${decoded_message}"
                }
            }
        ]
    }
}
```

**Node.js Implementation:**

```javascript
app.get("/decode", (req, res) => {
    const { secret_message } = req.query;
    const decoded_message = Buffer.from(secret_message, "base64").toString("hex");
    res.json({ decoded_message });
});
```

---

### Function: Decrypt

**Purpose:** Decrypt the Decoded Message using AES-256-CBC.

**OpenAI Tool Specification:**

```json
{
    "function": "decrypt",
    "description": "Decrypt the Decoded Message using the Key and IV.",
    "parameters": {
        "type": "object",
        "properties": {
            "decoded_message": { "type": "string", "description": "The Decoded Message." },
            "key": { "type": "string", "description": "The Decryption Key." },
            "iv": { "type": "string", "description": "The Initialization Vector." }
        }
    },
    "data_map": {
        "webhooks": [
            {
                "url": "https://<YOUR-SERVER-ADDRESS>/decrypt?decoded_message=${args.decoded_message}&key=${args.key}&iv=${args.iv}",
                "method": "GET",
                "output": {
                    "response": "The Decrypted Message is... ${decrypted_message}"
                }
            }
        ]
    }
}
```

**Node.js Implementation:**

```javascript
app.get("/decrypt", (req, res) => {
    const { decoded_message, key, iv } = req.query;
    const decrypted_message = decrypt(Buffer.from(decoded_message, "hex"), Buffer.from(key, "hex"), Buffer.from(iv, "hex"));
    res.json({ decrypted_message });
});
```

---

## Environment Variables

- `<YOUR-SIGNALWIRE-PROJECT-ID>`
- `<YOUR-SIGNALWIRE-API-TOKEN>`
- `<YOUR-SERVER-ADDRESS>`
- `<YOUR-TOPIC>`

Ensure these credentials are stored securely and never shared publicly.

## Sample Prompt for the AI Agent

```
You are an AI assistant capable of retrieving real-time encrypted information using SWAIG functions. Your responses must be accurate, human-readable, and formatted to assist users effectively. Follow the steps below to decrypt a classified message:

1. Retrieve the message using `fetch`.
2. Decode it using `decode`.
3. Decrypt the final output using `decrypt`.
```

## Conclusion

Fleming is an AI-powered cryptologist built to assist in structured decryption workflows. Utilizing **SignalWire AI Gateway (SWAIG)** and a **Node.js backend**, the AI ensures efficient, real-time decryption of classified data while maintaining high-security standards.

## Appendix

- **Error Handling:** Structured error messages are provided for missing inputs or invalid decryption attempts.
- **Rate Limiting:** Implementing rate limits prevents abuse.
- **Security Notes:** API credentials should never be stored in publicly accessible locations.

