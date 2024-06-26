import { SignalWire } from "@signalwire/realtime-api";
import pkg from 'csv-writer';
const { createObjectCsvWriter } = pkg;

(async () => {
    // Authenticate Relay v4's unified client using your SignalWire Project ID & API Token
    const client = await SignalWire({
        project: "<Your-SignalWire-ProjectID>",
        token: "<Your-SignalWire-APItoken>"
    });

    // Access the Messaging namespace 
    let messageClient = client.messaging;

    // Setup your CSV file
    const csvWriter = createObjectCsvWriter({
        path: '<Your-CSV-File>',
        header: [
            { id: 'code_name', title: 'code_name' },
            { id: 'secret_message', title: 'secret_message' },
            { id: 'key', title: 'key' },
            { id: 'iv', title: 'iv' }
        ]
    });

    // Initiate SMS prompt and storage variables
    let sm_prompt = true;
    let key_prompt = true;
    let iv_prompt = true;
    let conversationData = {};

    // Listen for inbound messages
    await messageClient.listen({
        topics: ['<Your-Topic>'],
        async onMessageReceived(message) {
            if (sm_prompt) {
                // Store the Code Name
                conversationData.code_name = message.body;
                console.log("Code Name received.", message);

                // Prompt for the Secret Message
                const cn_response = await messageClient.send({
                    from: message.to,
                    to: message.from,
                    body: "Thank you for providing the target's Code Name, Agent. Please input your base64 encoded and encrypted Secret Message."
                });
                console.log("Dispatched Secret Message prompt.", await cn_response);

                sm_prompt = false;
            } else if (key_prompt) {
                // Store the Secret Message
                conversationData.secret_message = message.body;
                console.log("Secret Message received.", message);

                // Prompt for the Key
                const sm_response = await messageClient.send({
                    from: message.to,
                    to: message.from,
                    body: "Thank you for providing your Secret Message, Agent. Please input your 256-bit Key."
                });
                console.log("Dispatched Key prompt.", await sm_response);

                key_prompt = false;
            } else if (iv_prompt) {
                // Store the Key
                conversationData.key = message.body;
                console.log("Key received.", message);

                // Prompt for the Initialization Vector 
                const k_response = await messageClient.send({
                    from: message.to,
                    to: message.from,
                    body: "Thank you for providing your Key, Agent. Please input your 16-byte IV."
                });
                console.log("Dispatched IV prompt.", await k_response);

                iv_prompt = false;
            } else {
                // Store the IV
                conversationData.iv = message.body;
                console.log("IV received.", message);

                // Write the Code Name, Secret Message, Key, and IV to your CSV
                await csvWriter.writeRecords([conversationData]);

                // Conclude the conversation
                const iv_response = await messageClient.send({
                    from: message.to,
                    to: message.from,
                    body: "Thank you for providing your IV, Agent. Alert the target that they must phone Fleming to decrypt your Secret Message."
                });
                console.log("Dispatched a call to action.", await iv_response);

                // Reset prompt and storage variables for future conversations
                sm_prompt = true;
                key_prompt = true;
                iv_prompt = true;
                conversationData = {};
            }
        }
    })

    // Initiate the conversation
    async function start() {
        try {
            const sendResult = await messageClient.send({
                from: "<Your-SignalWire-PhoneNumber>",
                to: "<Your-Desired-Destination>",
                body: "Welcome to a world of espionage! Please input the Code Name of your intended target."
            });
            console.log("Message ID: ", sendResult.messageId);
        } catch (e) {
            console.error(e.message);
        }
    }

    start()
})()
