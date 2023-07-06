require('dotenv').config();
const ngrok = require('ngrok');
const express = require('express');
const bodyParser = require('body-parser');
const { RestClient } = require('@signalwire/compatibility-api');

let ngrok_url;

(async function () {
    ngrok_url = await ngrok.connect({ 
        authtoken: process.env.NGROK_TOKEN, 
        addr: process.env.PORT
    });
    console.log(ngrok_url);
})();

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const client = new RestClient(
    process.env.SIGNALWIRE_PROJECT_ID,
    process.env.SIGNALWIRE_API_TOKEN,
    {
        signalwireSpaceUrl: process.env.SIGNALWIRE_SPACE
    }
);

let availability = {
    "2023-07-05": [

    ],
    "2023-07-10": [
        "11:15",
        "14:30"
    ],
    "2023-07-11": [
        "13:00"
    ]
}

app.post('/startReminder', async (req, res) => {
    console.log(req.body)

    let name = req.body.name
    let number = req.body.number
    let date = req.body.date
    let time = req.body.time

    await client.calls.create({
        url: ngrok_url + '/agent' + `?name=${name}&` + `date=${date}&` + `time=${time}`,
        to: number,
        from: process.env.FROM_NUMBER,
        machineDetection: "DetectMessageEnd",
        machineDetectionTimeout: 45,
        asyncAmd: true,
        asyncAmdStatusCallback: ngrok_url + "/amd" + `?name=${name}&` + `date=${date}&` + `time=${time}`,
        asyncAmdStatusCallbackMethod: "POST"
    });

    return res.sendStatus(200)
});

app.post('/amd', async (req, res) => {
    console.log(req.body);

    let name = req.query.name
    let date = req.query.date
    let time = req.query.time

    switch (req.body.AnsweredBy) {
        case "machine_end_beep":
        case "machine_end_silence":
        case "machine_end_other":
            await client.calls(req.body.CallSid).update({
                url: ngrok_url + "/leaveVoicemail" + `?name=${name}&` + `date=${date}&` + `time=${time}`
            })
            break;
    }
})

app.post('/agent', (req, res) => {
    console.log(req.query)

    let name = req.query.name
    let date = req.query.date
    let time = req.query.time

    const response = new RestClient.LaML.VoiceResponse();

    const connect = response.connect();

    const ai = connect.ai();
    ai.prompt(
        { 
            confidence: 0.2,
            temperature: 0,
            bargeConfidence: 0
        },
        `You are Gordon, an assistant at Doctor Fibonacci's office. You call patients of his to confirm appointment times. In this case you're calling ${name} (there's no need to mention their name unless it feels natural) about their upcoming appointment on ${date}, at ${time}.
        
        ## Step 1
        Remind the patient about their upcoming appointment.

        ## Step 2
        Ask if they can confirm they're going to be attending.

        ### Step 2.1
        If they cannot attend, ask them for a day when they'll be available.

        ### Step 2.2
        Use the get_available_times function to get the list of available times slots.
        
        ### Step 2.3
        Have the patient pick a time slot.

        ### Step 2.4
        Thank the patient for picking a new time slot, ask them to wait while you confirm the change, stop talking, and move on to the next step.

        ### Step 2.5
        Use the update_appointment_schedule function to update the available time slots. Never skip this step.

        ### Step 2.6
        End the call without offering further help.
        `
    );

    const swaig = ai.swaig()

    const defaults = swaig.defaults()
    defaults.setWebHookURL(ngrok_url + "/functionHandler")

    const getAvailableTimes = swaig.function()
    getAvailableTimes.setName("get_available_times")
    getAvailableTimes.setArgument("The date the customer is available on, in YYYY-MM-DD format.")
    getAvailableTimes.setPurpose("To get the date available times for a particular date.")

    const scheduleAppointment = swaig.function()
    scheduleAppointment.setName("update_appointment_schedule")
    scheduleAppointment.setArgument("The new date the customer is available on, in YYYY-MM-DD format. The new time the customer is available at, in HH:MM 24h format. The old date the appointment was supposed to take place on, in YYYY-MM-DD format. The old time the appointment was supposed to take place at, in HH:MM 24h format. Separate each value with commas. Do not add spaces.")
    scheduleAppointment.setPurpose("To update the list of available time slots once the patient agrees to reschedule.")

    const instructions = response.toString()
    console.log(instructions);
    
    res.send(instructions)
});

app.post('/leaveVoicemail', (req, res) => {
    console.log(req.query)

    let name = req.query.name
    let date = req.query.date
    let time = req.query.time

    const response = new RestClient.LaML.VoiceResponse();

    const connect = response.connect();

    const ai = connect.ai();
    ai.prompt(
        { 
            confidence: 0.2,
            temperature: 0,
            bargeConfidence: 0
        },
        `You are Gordon, an assistant at Doctor Fibonacci's office. You call patients of his to confirm appointment times. In this case you're leaving ${name} (there's no need to mention their name unless it feels natural) a voicemail about their upcoming appointment on ${date}, at ${time}.
        
        Tell the patient they can call back if they need to reschedule and hang up.
        `
    );

    const instructions = response.toString()
    console.log(instructions);
    
    res.send(instructions)
});

app.post('/functionHandler', (req, res) => {
    console.log(req.body);

    switch (req.body.function) {
        case 'get_available_times':
            let day = req.body.argument.raw

            if(!availability.hasOwnProperty(day)) {
                availability[day] = []
            }

            let confirmation = {
                response: JSON.stringify(availability[day])
            }

            res.send(JSON.stringify(confirmation))
            break;

        case 'update_appointment_schedule':
            let arguments = req.body.argument.raw.split(",");
            let newDate = arguments[0]
            let newTime = arguments[1]
            let oldDate = arguments[2]
            let oldTime = arguments[3]

            console.log("Time slots before updates:", availability);

            // Remove new appointment time from available times
            for (let day in availability) {
                if (availability.hasOwnProperty(newDate)) {
                    availability[newDate] = availability[newDate].filter(item => item !== newTime);
                    break;
                }
            }

            console.log("Time slots after removing the new appointment time:", availability);

            // Add old appointment time back to available times
            for (const day in availability) {
                if (availability.hasOwnProperty(oldDate)) {
                    availability[oldDate].push(oldTime);
                    break;
                }
            }

            console.log("Time slots after adding old appointment time:", availability);

            res.send(JSON.stringify({
               response: "Appointment rescheduled." 
            }))
            break;
    }

});

app.listen(process.env.PORT, () => {
    console.log(`Server is running on port ${process.env.PORT}`);
});