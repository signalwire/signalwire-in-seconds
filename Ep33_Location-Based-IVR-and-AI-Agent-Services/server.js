const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());
const port = 3000;

// SignalWire Space authentication
const auth = {
    username: "<YOUR-SW-PROJECT-ID>",
    password: "<YOUR-SW-API-TOKEN>"
};

// Google Maps API authentication
const g_token = "<YOUR-GOOGLE-API-TOKEN>";

// SignalWire REST API endpoint Phone Number Lookup (PNL)
app.post('/start_pnl', async (req, res) => {
    // Accept inbound phone number from the Call Flow Builder (CFB)
    const from_number = req.headers['x-custom-header'];
    console.log(`Inbound caller number transmitted by CFB: ${from_number}`);

    // Normalize the phone number before passing it to the REST API
    const newNumber = from_number.replace("+", "%2B");
    console.log(`From number converted for REST API query: ${newNumber}`);

    // Execute the PNL
    const client = await axios.get(`https://<YOUR-SPACE-URL>.signalwire.com/api/relay/rest/lookup/phone_number/${newNumber}?include=carrier`,
        {
            auth: auth
        });
    // Map the retrieved PNL info    
    const response = client.data;
    const carrierCity = response.carrier.city;
    const carrierState = response.carrier.state;
    const carrierNum = response.e164;

    console.log(`PNL caller data retrieved:
        City: ${carrierCity}
        State: ${carrierState}
        E164 Number: ${carrierNum}`
    );

    // Return the retrieved PNL info to the CFB
    res.status(200).json({ carrierCity, carrierState, carrierNum });
});

// Endpoint for gathering Point of Interest (POI) candidates
app.get("/fetch_poi", async (req, res) => {
    // Accept incoming search parameters from the AI Agent
    const { fetchPOI_placeName, fetchPOI_city, fetchPOI_state, fetchPOI_postalCode } = req.query;
    console.log(`Query params transmitted by AI Agent: 
        Place Name: ${fetchPOI_placeName}
        City: ${fetchPOI_city}
        State: ${fetchPOI_state}
        Postal Code: ${fetchPOI_postalCode}`
    );

    // Encode the query parameters for Google Maps API execution
    const fullSearch = `${fetchPOI_placeName},${fetchPOI_city},${fetchPOI_state},${fetchPOI_postalCode}`;
    const encodedSearch = encodeURIComponent(fullSearch);

    // Construct the Google Maps API URL
    const url = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?fields=name%2Cformatted_address%2Cgeometry&input=${encodedSearch}&inputtype=textquery&ipbias&key=${g_token}`;
    console.log(`Constructed POI candidate URL: ${url}`);

    // Send a GET request to the Google Maps API
    const response = await axios.get(url);
    const candidates = response.data.candidates;

    if (candidates.length > 0) {
        // Map the retrieved POI candidate info
        const poiCandidate_name = candidates[0].name;
        const poiCandidate_address = candidates[0].formatted_address;
        const poiCandidate_latitude = candidates[0].geometry.location.lat;
        const poiCandidate_longitude = candidates[0].geometry.location.lng;
        console.log(`POI Candidate Retrieved: 
            Name: ${poiCandidate_name}
            Address: ${poiCandidate_address}
            Latitude: ${poiCandidate_latitude}
            Longitude: ${poiCandidate_longitude}`
        );

        // Pass the POI candidate info back to the AI Agent
        res.json({ poiCandidate_name, poiCandidate_address, poiCandidate_latitude, poiCandidate_longitude });
    } else {
        console.log("No candidates found.");
        res.status(404).json({ error: "No POI candidates found" });
    };
});

// Endpoint for retrieving the caller's current coordinates
app.get("/locate_caller", async (req, res) => {
    // Accept incoming search parameters from the AI Agent
    const { caller_unitNumber, caller_streetName, caller_city, caller_state, caller_postalCode } = req.query;
    console.log(`Caller query params transmitted by AI Agent: 
        Unit Number: ${caller_unitNumber}
        Street Name: ${caller_streetName}
        City: ${caller_city}
        State: ${caller_state}
        Postal Code: ${caller_postalCode}`
    );

    // Construct the full address string
    const fullAddress = `${caller_unitNumber} ${caller_streetName}, ${caller_city}, ${caller_state}, ${caller_postalCode}`;
    const encodedAddress = encodeURIComponent(fullAddress);

    // Construct the URL with the encoded address
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${g_token}`;
    console.log('Constructed URL:', url);

    // Send a GET request to the Google Maps API
    const response = await axios.get(url);
    const coordinates = response.data.results;

    // Map the retreived caller coordinates
    const caller_latitude = coordinates[0].geometry.location.lat;
    const caller_longitude = coordinates[0].geometry.location.lng;
    console.log(`Caller coordinates retrieved:
        Latitude: ${caller_latitude}
        Longitude: ${caller_longitude}`
    );

    // Pass the caller's coordinates back to the AI Agent
    res.json({ caller_latitude, caller_longitude });
});

// Endpoint for determining the caller's route from their current location to the POI
app.get("/determine_route", async (req, res) => {
    const { carrierNum, caller_latitude, caller_longitude, poiCandidate_name, poiCandidate_latitude, poiCandidate_longitude } = req.query;
    console.log(`Route query params transmitted by AI Agent: 
        Caller Number: ${carrierNum}
        Caller Latitude: ${caller_latitude}
        Caller Longitude: ${caller_longitude}
        POI Latitude: ${poiCandidate_latitude}
        POI Longitude: ${poiCandidate_longitude}`
    );

    // Construct the full coordinate string for the caller
    const full_callerCoordinates = `${caller_latitude},${caller_longitude}`;
    const encoded_callerCoordinates = encodeURIComponent(full_callerCoordinates);

    // Construct the full coordinate string for the POI
    const full_poiCoordinates = `${poiCandidate_latitude},${poiCandidate_longitude}`;
    const encoded_poiCoordinates = encodeURIComponent(full_poiCoordinates);

    // Construct the URL with the encoded address
    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${encoded_callerCoordinates}&destination=${encoded_poiCoordinates}&mode=driving&key=${g_token}`;
    console.log('Constructed URL:', url);

    // Send a GET request to the Google Maps API
    const response = await axios.get(url);
    const routes = response.data.routes;

    // Map the retreived route info
    const route_startAddress = routes[0].legs[0].start_address;
    const route_endAddress = routes[0].legs[0].end_address;
    const route_distance = routes[0].legs[0].distance.text;
    const route_duration = routes[0].legs[0].duration.text;

    // Combine route directions into a single string
    const route_steps = routes[0].legs[0].steps;
    const combinedInstructions = route_steps
        .map(step => {
            const instruction = step.html_instructions.replace(/<[^>]+>/g, '').trim(); // Normalize html_instructions
            const distance = step.distance.text; // Add distance text
            return `${instruction} (${distance}).`; // Combine instruction and distance with formatting
        })
        .join(' '); // Join all steps with a space

    console.log(`Route info retrieved:
        POI Name: ${poiCandidate_name}
        Origin: ${route_startAddress}
        Destination: ${route_endAddress}
        Distance: ${route_distance}
        Duration: ${route_duration}
        Directions: ${combinedInstructions}`
    );

    // Pass the route info back to the AI Agent
    res.json({ poiCandidate_name, route_startAddress, route_endAddress, route_distance, route_duration, combinedInstructions, carrierNum });
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
