# AI Agent for Location-Based Telephony Services

## Table of Contents

1. [Introduction](#introduction)
2. [Overview](#overview)
3. [Functions and Capabilities](#functions-and-capabilities)
   - [fetch\_poi](#function-fetch_poi)
   - [locate\_caller](#function-locate_caller)
   - [dispatch\_route](#function-dispatch_route)
4. [Environment Variables](#environment-variables)
5. [Sample Prompt for the AI Agent](#sample-prompt-for-the-ai-agent)
6. [Conclusion](#conclusion)
7. [Appendix](#appendix)

## Introduction

The AI Agent is designed to assist users in locating Points of Interest (POI) and providing driving directions using **SignalWire AI Gateway (SWAIG)** and **Google Maps APIs**. This system delivers personalized wayfinding assistance via a telephony-based IVR system, integrating **SignalWire’s Call Flow Builder** with **Google Places API and Directions API**.

## Overview

This AI Agent enhances user interactions by:

- Identifying their **general location** using the **SignalWire Phone Number Lookup API**.
- Retrieving **Points of Interest (POI)** using **Google Places API**.
- Determining the **caller’s precise coordinates** via **Google Geocode API**.
- Providing **driving directions** from the caller’s location to the desired POI using **Google Directions API**.

The agent seamlessly operates within a telephony system, leveraging **SignalWire Markup Language (SWML)** to manage conversational flow efficiently.

## Functions and Capabilities

### Function: `fetch_poi`

**Purpose:** Retrieve a relevant POI based on the caller’s query.

#### OpenAI Tool Specification

```json
{
  "function": "fetch_poi",
  "description": "Retrieve a POI candidate relevant to the caller's query.",
  "parameters": {
    "fetchPOI_placeName": { "type": "string", "description": "Name or type of place." },
    "fetchPOI_city": { "type": "string", "description": "City to search within." },
    "fetchPOI_state": { "type": "string", "description": "State to search within." },
    "fetchPOI_postalCode": { "type": "string", "description": "Postal code to narrow search." }
  }
}
```

#### Node.js Code

```javascript
app.get("/fetch_poi", async (req, res) => {
    const { fetchPOI_placeName, fetchPOI_city, fetchPOI_state, fetchPOI_postalCode } = req.query;
    const fullSearch = `${fetchPOI_placeName},${fetchPOI_city},${fetchPOI_state},${fetchPOI_postalCode}`;
    const encodedSearch = encodeURIComponent(fullSearch);
    const url = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodedSearch}&inputtype=textquery&fields=name,formatted_address,geometry&key=${g_token}`;
    const response = await axios.get(url);
    const candidates = response.data.candidates;
    if (candidates.length > 0) {
        const poi = candidates[0];
        res.json({ name: poi.name, address: poi.formatted_address, latitude: poi.geometry.location.lat, longitude: poi.geometry.location.lng });
    } else {
        res.status(404).json({ error: "No POI candidates found" });
    }
});
```

---

### Function: `locate_caller`

**Purpose:** Determine the caller’s geographic coordinates based on their provided address.

#### OpenAI Tool Specification

```json
{
  "function": "locate_caller",
  "description": "Retrieve the caller’s latitude and longitude based on their provided address.",
  "parameters": {
    "caller_unitNumber": { "type": "string", "description": "Unit or place name." },
    "caller_streetName": { "type": "string", "description": "Street name." },
    "caller_city": { "type": "string", "description": "City." },
    "caller_state": { "type": "string", "description": "State." },
    "caller_postalCode": { "type": "string", "description": "Postal code." }
  }
}
```

#### Node.js Code

```javascript
app.get("/locate_caller", async (req, res) => {
    const { caller_unitNumber, caller_streetName, caller_city, caller_state, caller_postalCode } = req.query;
    const fullAddress = `${caller_unitNumber} ${caller_streetName}, ${caller_city}, ${caller_state}, ${caller_postalCode}`;
    const encodedAddress = encodeURIComponent(fullAddress);
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${g_token}`;
    const response = await axios.get(url);
    if (response.data.results.length > 0) {
        const location = response.data.results[0].geometry.location;
        res.json({ latitude: location.lat, longitude: location.lng });
    } else {
        res.status(404).json({ error: "Could not determine caller location." });
    }
});
```

## Environment Variables

- `<YOUR-SW-PROJECT-ID>`: SignalWire Project ID.
- `<YOUR-SW-API-TOKEN>`: SignalWire API Token.
- `<YOUR-GOOGLE-API-TOKEN>`: Google API Key.
- `<YOUR-SERVER-ADDRESS>`: Server domain handling API requests.

## Sample Prompt for the AI Agent

```
You are Carmen, a knowledgeable travel guide. Assist callers by providing POIs and route directions in a concise and engaging manner.
```

## Conclusion

This AI Agent enhances telephony-based wayfinding by integrating SignalWire’s telecommunication capabilities with Google Maps geolocation services, streamlining caller interactions with real-time routing assistance.
