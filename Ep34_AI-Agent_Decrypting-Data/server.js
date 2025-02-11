const express = require('express');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const crypto = require('crypto');

const app = express();
app.use(express.json());
const port = 3000;

// Create a path to the CSV file
const csvFilePath = path.join('<YOUR-SMS-APP-FOLDER>', '<YOUR-FILENAME>.csv');

// Read the CSV file and store its data in an array
let classifiedInfo = [];

const readCSV = () => {
    return new Promise((resolve, reject) => {
        const results = [];
        fs.createReadStream(csvFilePath)
            .pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', () => {
                classifiedInfo = results;
                resolve();
            })
            .on('error', (error) => {
                reject(error);
            });
    });
};

// Print the data imported from the CSV file
readCSV()
    .then(() => {
        console.log('CSV file read successfully.', classifiedInfo);
    })
    .catch((error) => {
        console.error('Error reading CSV file:', error);
    });

// Endpoint for retrieving the Secret Message, Key, and IV
app.get("/fetch", (req, res) => {
    const { code_name } = req.query;
    console.log(`Code name transmitted by AI agent: ${code_name}`);

    // Find the index of the secret_message using the given code_name
    const index = classifiedInfo.findIndex(secret_message => secret_message.code_name === code_name);
    console.log(`
        Classified info retrieved from the CSV file...
        Code name: ${classifiedInfo[index].code_name}
        Array index: ${index}
        Secret message: ${classifiedInfo[index].secret_message}
        Key: ${classifiedInfo[index].key}
        IV: ${classifiedInfo[index].iv}
    `);

    // Return the collected data to the AI agent
    res.json({ classifiedInfo, index });
});

// Endpoint for decoding the base64 encoded message
app.get("/decode", (req, res) => {
    const { secret_message } = req.query;
    console.log(`Secret message transmitted by AI agent: ${secret_message}`);

    const decoded_message = Buffer.from(secret_message, "base64").toString("hex");
    console.log(`Decoded message: ${decoded_message}`);

    res.json({ decoded_message });
});

// Endpoint for decrypting the decoded message
app.get("/decrypt", (req, res) => {
    const { decoded_message, key, iv } = req.query;
    console.log(`
        Classified info transmitted by AI agent...
        Decoded message: ${decoded_message}
        Key: ${key}
        IV: ${iv}
    `);

    // Convert the parameters to an acceptable format for decryption
    const decodedBuffer = Buffer.from(decoded_message, "hex");
    console.log('Decoded Buffer:', decodedBuffer);

    const keyBuffer = Buffer.from(key, "hex");
    console.log('Key Buffer:', keyBuffer);

    const ivBuffer = Buffer.from(iv, "hex");
    console.log('IV Buffer:', ivBuffer);

    // Decrypt the decoded message
    const decrypted_message = decrypt(decodedBuffer, keyBuffer, ivBuffer);
    console.log(`Decrypted Message: ${decrypted_message}`);

    res.json({ decrypted_message });
});

// Function for decrypting text encrypted with AES in CBC mode using a key and IV
function decrypt(encryptedText, key, iv) {
    try {
        const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return decrypted.toString("utf8");
    } catch (e) {
        console.error(e.message);
        return null;
    };
};

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
