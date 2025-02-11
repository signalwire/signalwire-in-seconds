import { SignalWire } from "@signalwire/realtime-api";
import pkg from 'csv-writer';
const { createObjectCsvWriter } = pkg;

(async () => {
    // Authenticate Relay v4's unified client using your SignalWire Project ID and API Token
    const client = await SignalWire({
        project: "<YOUR-SIGNALWIRE-PROJECT-ID>",
        token: "<YOUR-SIGNALWIRE-API-TOKEN>"
    });

    // Access the messaging namespace
    let messageClient = client.messaging;

    // Setup your CSV file
    const csvWriter = createObjectCsvWriter({
        path: '<YOUR-FILENAME>.csv',
        header: [
            { id: 'code_name', title: 'code_name' },
            { id: 'secret_message', title: 'secret_message' },
            { id: 'key', title: 'key' },
            { id: 'iv', title: 'iv' }
        ]
    });

    let sm_prompt = true;
    let key_prompt = true;
    let iv_prompt = true;
    let conversationData = {};

    // Listen for inbound messages
    await messageClient.listen({
        topics: ['<YOUR-TOPIC>'],
        async onMessageReceived(message) {
            if (sm_prompt) {
                // Store the Code Name
                conversationData.code_name = message.body;
                console.log("Received: Code Name =>", message);

                // Prompt for the Secret Message
                const cn_response = await messageClient.send({
                    from: message.to,
                    to: message.from,
                    body: "Thank you for providing the target's Code Name, Agent. Now, please reply with your base64 encoded Secret Message:"
                });
                console.log("Dispatched: Secret Message Prompt =>", cn_response);

                sm_prompt = false;
            } else if (key_prompt) {
                // Store the Secret Message
                conversationData.secret_message = message.body;
                console.log("Received: Secret Message =>", message);

                // Prompt for the Key
                const sm_response = await messageClient.send({
                    from: message.to,
                    to: message.from,
                    body: "Thank you for providing the Secret Message, Agent. Now, please input your 256-bit Key:"
                });
                console.log("Dispatched: Key Prompt =>", sm_response);

                key_prompt = false;
            } else if (iv_prompt) {
                // Store the Key
                conversationData.key = message.body;
                console.log("Received: Key =>", message);

                // Prompt for the IV
                const k_response = await messageClient.send({
                    from: message.to,
                    to: message.from,
                    body: "Thank you for providing the Key, Agent. Now, please input your 16-byte Initialization Vector (IV):"
                });
                console.log("Dispatched: IV Prompt =>", k_response);

                iv_prompt = false;
            } else {
                // Store the IV
                conversationData.iv = message.body;
                console.log("Received: IV =>", message);

                // Write the Code Name, Secret Message, Key, and IV to your CSV
                await csvWriter.writeRecords([conversationData]);

                // Thank the user for inputting their information
                const iv_response = await messageClient.send({
                    from: message.to,
                    to: message.from,
                    body: "Thank you for providing the IV, Agent. Now, alert the target that they must phone Fleming to decrypt the Classified Info vested with him."
                });
                console.log("Dispatched: A Call to Action =>", iv_response);

                // Reset the prompt flow for the conversations that are to follow
                sm_prompt = true;
                key_prompt = true;
                iv_prompt = true;
                conversationData = {};
            }
        }
    });

    // Initiate the conversation
    async function start() {
        try {
            const sendResult = await messageClient.send({
                from: "<YOUR-SIGNALWIRE-NUMBER>",
                to: "<YOUR-RECIPIENT>",
                body: "Welcome to a world of espionage, Agent! In this thread you will transmit the Classified Info that Quartermaster Fleming will later decode and decrypt. Begin by replying with the Code Name of your intended target:"
            });
            console.log("Message ID:", sendResult.messageId);
        } catch (e) {
            console.error(e.message);
        }
    }

    start();
})();
