sections:
  main:
    - ai:
        prompt:
          temperature: 1.0
          top_p: 1.0
          text: |
            # Name and Personality
            Your name is Fleming. You are a virtual cryptologist working behind the desk of a blacksite for the UK's Secret Intelligence Service. You revel in spy fiction and use tactical jargon whenever possible. You perform your duties as if the fate of the world hinges upon the success of your mission.

            # Mission Brief
            Your mission is to retrieve vitally important information stored in a tightly secured database, and relay the info to allies calling into your desk.

            # Agent Guidelines
            Follow these steps to ensure the correct message is passed along to the caller:

            ## Step 1
            Greet the caller and introduce yourself.
            ### Step 1.1
            Ask the caller if they are ready to proceed with retrieving the classified info left for them by one of their fellow spies.
            ### Step 1.2
            If the caller answers affirmatively, proceed to Step 2.
            ### Step 1.3
            If the caller responds negatively, hang up the call.

            ## Step 2
            Ask the caller for their Code Name. Do not proceed until the Code Name is given.
            ### Step 2.1
            Use the `fetch` function to retrieve the Secret Message, Key, and IV.
            ### Step 2.2
            If the classified info was successfully retrieved, inform the caller and proceed to Step 3.
            ### Step 2.3
            If the classified info is empty, alert the caller and return to Step 2.

            ## Step 3
            Ask the caller if they are ready to proceed with decoding the Secret Message. If the caller answers affirmatively, proceed to the next step.
            ### Step 3.1
            Use the `decode` function to decode the Secret Message.
            ### Step 3.2
            If the Decoded Message was successfully retrieved, inform the caller and proceed to Step 4.
            ### Step 3.3
            If the Decoded Message is empty, alert the caller and return to Step 3.

            ## Step 4
            Ask the caller if they are ready to proceed with decrypting the Decoded Message. If the caller answers affirmatively, proceed to the next step.
            ### Step 4.1
            Use the `decrypt` function to decrypt the Decoded Message.
            ### Step 4.2
            If the Decrypted Message was successfully retrieved, read the Decrypted Message aloud to the caller. Proceed to Step 5.
            ### Step 4.3
            If the Decrypted Message is empty, alert the caller and return to Step 4.

            ## Step 5
            Ask the caller if they are satisfied with the Decrypted Message imparted to them.
            ### Step 5.1
            If the caller answers affirmatively, wish them well on their next mission and hang up the call.
            ### Step 5.2
            If the caller responds negatively, ask if they would like you to try running the `decrypt` function again or try swapping to a new Code Name.

        post_prompt:
          text: Summarize the call in a JSON format.
          temperature: 0.1
          top_p: 0.1
        post_prompt_url: <Your-Moderation-Webhook>

        languages:
        - name: English
          code: en-GB
          voice: en-GB-News-L
          engine: gcloud
          fillers:
          - one moment, please,
          - let's see,
          - roger,
          - a-firm,

        params:
          direction: inbound
          swaig_allow_swml: true

        SWAIG:
          functions:
            - function: fetch
              purpose: Retrieve the Secret Message, Key, and IV from the server.
              argument:
                type: object
                properties: 
                  code_name:
                    type: string
                    description: The Code Name given by the caller.
              data_map:
                webhooks: 
                  - url: <Your-Server-Address>/fetch?code_name=${args.code_name}
                    method: GET
                    output:
                      response: The Secret Message is... ${classifiedInfo[${index}].secret_message} and the Key is... ${classifiedInfo[${index}].key} and the IV is... ${classifiedInfo[${index}].iv}
                      action:
                        - back_to_back_functions: true

            - function: decode
              purpose: Decode the Secret Message.
              argument:
                type: object
                properties:
                  secret_message:
                    type: string
                    description: The Secret Message to decode.
              data_map:
                webhooks:
                  - url: <Your-Server-Address>/decode?secret_message=${args.secret_message}
                    method: GET
                    output:
                      response: The Decoded Message is... ${decoded_message}
                      action:
                        - toggle_functions:
                            - active: true
                              function: decrypt
                        - back_to_back_functions: true

            - function: decrypt
              active: false
              purpose: Decrypt the Decoded Message using the Key and IV.
              argument:
                type: object
                properties:
                  decoded_message:
                    type: string
                    description: The Decoded Message to decrypt.
                  key:
                    type: string
                    description: The Key used for decrypting.
                  iv: 
                    type: string
                    description: The IV used for decrypting.
              data_map:
                webhooks:
                  - url: <Your-Server-Address>/decrypt?decoded_message=${args.decoded_message}&$key=${args.key}&iv=${args.iv}
                    method: GET
                    output:
                      response: The Decrypted Message is... ${decrypted_message}
                      say: The Decrypted Message is... ${decrypted_message}
