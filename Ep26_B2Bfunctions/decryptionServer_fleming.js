const express = require('express');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const crypto = require('crypto');

const app = express();
app.use(express.json());
const port = 3000;

// Create a path to the CSV file
const csvFilePath = path.join('<Your-CSV-File>');

// Initialize an array for the storage of data read from the CSV
let classifiedInfo = [];

// Read the CSV file and store its data in an arry
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

// Print the data read from the CSV file
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
    console.log('Code name received:', code_name);

    // Find the index of the secret_message using the given code_name
    const index = classifiedInfo.findIndex(secret_message => secret_message.code_name === code_name);
    console.log('Array index:', index);

    res.json({ classifiedInfo, index });
});

// Endpoint for decoding the base64 encoded message
app.get("/decode", (req, res) => {
    const { secret_message } = req.query;
    console.log('Secret Message received:', secret_message);

    const decoded_message = Buffer.from(secret_message, "base64").toString("hex");

    res.json({ decoded_message });
    console.log(`Decoded Message: ${decoded_message}`);
});

// Endpoint for decrypting the Decoded Message
app.get("/decrypt", (req, res) => {
    const { decoded_message, key, iv } = req.query;

    // Convert the arguments to an acceptable format for decryption
    const decodedBuffer = Buffer.from(decoded_message, "hex");
    console.log('Decoded Buffer:', decodedBuffer);

    const keyBuffer = Buffer.from(key, "hex");
    console.log('Key Buffer:', keyBuffer);

    const ivBuffer = Buffer.from(iv, "hex");
    console.log('IV Buffer:', ivBuffer);

    // Decrypt the Decoded Message
    const decrypted_message = decrypt(decodedBuffer, keyBuffer, ivBuffer);

    res.json({ decrypted_message });
    console.log(`Decrypted Message: ${decrypted_message}`);
});

// Function for decrypting text encrypted with AES in CBC mode using a Key and IV
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
