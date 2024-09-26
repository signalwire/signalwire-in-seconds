import express from 'express';
import bodyParser from 'body-parser';
import fs from 'fs';
import onExit from 'on-exit';

const app = express();
const port = 9000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

// Create an array for inbound calls
let callArray = [];

// Write a CSV report of call data when the app is exited
const onExitApp = (callArray) => {
    const csvHeaders = 'Call SID,Call Status,From Number,To Number,Conversation Log,Summary\n';
    const csvContent = callArray.map(call => call.map(item => `"${item}`).join(',')).join('\n');
    fs.writeFileSync('Calls.csv', csvHeaders + csvContent);
    console.log("Inbound transcription app exited, goodbye!");
};

onExit(onExitApp.bind(null, callArray));

// Endpoint for handling basic inbound call details
app.post('/incomingCalls', (req, res) => {
    const body = req.body;
    const call_sid = body.call_sid;
    const call_status = body.call_status;
    const from_number = body.from_number || null;
    const to_number = body.to_number || null;

    // Store the call details in the call array
    callArray.push([call_sid, call_status, from_number, to_number, '', '']);

    // Print the initial call details to the terminal
    console.log("Current Inbound Call Details");
    console.log("----------");
    callArray.forEach((call, index) => {
        console.log(`Call Index: ${index + 1}`);
        console.log(`Call SID: ${call[0]}`);
        console.log(`Call Status: ${call[1]}`);
        console.log(`From Number: ${call[2]}`);
        console.log(`To Number: ${call[3]}`);
        console.log(`Conversation Log: ${call[4]}`);
        console.log(`Summary: ${call[5]}`);
        console.log("----------");
    });

    // Send an affirmative response back to SignalWire
    res.status(200).json({ message: 'Call details recorded successfully.' });
});

// Endpoint for handling conversation logs and summaries
app.post('/transcription', (req, res) => {
    const body = req.body;
    const call_sid = body.channel_data.call_id;
    const conversation_log = body.conversation_log || [];
    const summary = body.conversation_summary || null;

    // Convert the conversation log array to a comma-delimited string
    // Include both caller role and utterance content
    const conversationLogString = conversation_log.map(log => `${log.role}: ${log.content}`).join(', ');

    // Upon completion of the call, find the call in the call array
    // Update the call details with the conversation log and summary
    const callIndex = callArray.findIndex(call => call[0] === call_sid);

    if (callIndex !== -1) {
        callArray[callIndex][4] = conversationLogString;
        callArray[callIndex][5] = summary;

        const totalCalls = callArray.length;

        // Print the updated call details, including the conversation log and summary
        console.log("Updated Call Details");
        console.log("----------");

        callArray.forEach((call, index) => {
            console.log(`Call Index: ${index + 1}`);
            console.log(`Call SID: ${call[0]}`);
            console.log(`Call Status: ${call[1]}`);
            console.log(`From Number: ${call[2]}`);
            console.log(`To Number: ${call[3]}`);
            console.log(`Conversation Log: ${call[4]}`);
            console.log(`Summary: ${call[5]}`);
            console.log("----------");
        });

        console.log("Total Number of Inbound Calls:", totalCalls);
        console.log("----------");

        // Return anoter response to SignalWire
        res.status(200).json({ message: 'Transcription details recorded successfully.' });
    } else {
        res.status(400).json({ message: 'Call SID not found. Transcription details not recorded.' });
    };
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
