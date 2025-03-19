
import os
from flask import Response

def ai_prompt():
    
    
    SWML_JSON = """
{
  "version": "1.0.0",
  "sections": {
    "main": [
      {
        "answer": {}
      },
      {
        "record_call": {
          "format": "wav",
          "stereo": true
        }
      },
      {
        "ai": {
          "params": {
            "verbose_logs": true
          },
          "prompt": {
          "temperature": 1.5,
          "top_p": 1.0, 
          "text": "# System Prompt for Nursing Home Health Assessment Agent\\n\\n
          **Objective:**\\n
          You are Adam, and you conduct health assessments for HealthyStay Nursing Home.\\n\\n
          **Key Call Guidelines:**\\n
          1. **Introduction:** Greet the patient warmly and introduce yourself.\\n
          2. **Verify Patient:** Ask for the patient's first and last name, and only call the verify_patient function **after** obtaining both names. Use that info to look up their record and caregiver phone.\\n
          3. **Conduct Assessment:** Ask a few health questions for their weekly health assessment:\\n   
          - How are you feeling overall?\\n   
          - Any pain or discomfort?\\n   
          - Changes in appetite, or weight?\\n\\n   
          - How is your overall sleep quality?\\n
          4. **Provide Guidance:** Ask if they need more info about symptoms, and if yes, call the get_data function.\\n
          5. **Summarize and Store:** After summarizing, **call the store_summary function** with the final conversation summary so it is saved in the database.\\n
          6. **Send SMS:** Then call send_message to text the summary to the caregiver (without reconfirming the caregiver number)."
          },
          "post_prompt": {
            "text": "Summarize the conversation in JSON.",
            "temperature": 0.5,
            "top_p": 0.5
          },
          "post_prompt_url": "https://REPLACE_WITH_YOUR_WEBHOOK_URL",
          "SWAIG": {
            "functions": [
              {
                "function": "verify_patient",
                "purpose": "Verify patient's first and last name in the local database and retrieve the caregiver's phone.",
                "argument": {
                  "type": "object",
                  "properties": {
                    "first_name": {
                      "type": "string",
                      "description": "The patient's first name"
                    },
                    "last_name": {
                      "type": "string",
                      "description": "The patient's last name"
                    }
                  }
                },
                "data_map": {
                  "webhooks": [
                    {
                      "method": "POST",
                      "url": "https://REPLACE_WITH_YOUR_ENDPOINT/verify_patient",
                      "params": {
                        "first_name": "${args.first_name}",
                        "last_name": "${args.last_name}"
                      },
                      "output": {
                        "response": "Verified ${Records[0].first_name} ${Records[0].last_name}. Caregiver phone: ${Records[0].caregiver_phone}",
                        "action": [
                          {
                            "set_meta_data": {
                              "caregiver_phone": "${Records[0].caregiver_phone}",
                              "patient_id": "${Records[0].id}"
                            }
                          }
                        ]
                      }
                    }
                  ]
                },
                "meta_data_token": "patient_meta"
              },
              {
                "function": "get_data",
                "purpose": "Use this information to answer the user's query.",
                "argument": {
                  "type": "object",
                  "properties": {
                    "user_question": {
                      "type": "string",
                      "description": "The question the user asks."
                    }
                  }
                },
                "fillers": {
                  "en-US": [
                    "Let's see",
                    "one moment please"
                  ]
                },
                "data_map": {
                  "webhooks": [
                    {
                      "method": "POST",
                      "url": "https://space_name.signalwire.com/api/datasphere/documents/search",
                      "headers": {
                        "Content-Type": "application/json",
                        "Authorization": "Basic OGVhMjI0YzktM--USE--Project_ID:API_KEY--TO-BASE64-ENCODE--NkYjFh"
                      },
                      "params": {
                        "query_string": "${args.user_question}",
                        "document_id": "680f246c-659e-4fc0-a03c-71bfa3ed17b1"
                      },
                      "output": {
                        "response": "Answer the patient's question using the information in this document. Do not make up answers: ${chunks[0].text} (Document ID: ${chunks[0].document_id})",
                        "action": []
                      }
                    }
                  ]
                },
                "meta_data_token": "patient_meta"
              },
              {
                "function": "send_message",
                "purpose": "Send the health assessment summary via SMS to the caregiver.",
                "argument": {
                  "type": "object",
                  "properties": {
                    "to": {
                      "type": "string",
                      "description": "Caregiver phone in E.164 format"
                    },
                    "message": {
                      "type": "string",
                      "description": "The SMS message to send"
                    }
                  }
                },
                "data_map": {
                  "expressions": [
                    {
                      "string": "${args.message}",
                      "pattern": ".*",
                      "output": {
                        "response": "Message sent.",
                        "action": [
                          {
                            "SWML": {
                              "version": "1.0.0",
                              "sections": {
                                "main": [
                                  {
                                    "send_sms": {
                                      "to_number": "${meta_data.caregiver_phone}",
                                      "region": "us",
                                      "body": "${args.message} Summary: ${chunks[0].text}. Reply STOP to opt out.",
                                      "from_number": "+1XXXXXXXXXX"
                                    }
                                  }
                                ]
                              }
                            }
                          }
                        ]
                      }
                    }
                  ]
                },
                "meta_data_token": "patient_meta"
              },
              {
                "function": "store_summary",
                "meta_data_token": "patient_meta",
                "purpose": "Store the final conversation summary in the DB under the patient's record.",
                "argument": {
                  "type": "object",
                  "properties": {
                    "summary": {
                      "type": "string",
                      "description": "The final conversation summary"
                    }
                  }
                },
                "data_map": {
                  "webhooks": [
                    {
                      "method": "POST",
                      "url": "https://REPLACE_WITH_YOUR_ENDPOINT/add_response",
                      "params": {
                        "patient_id": "${meta_data.patient_id}",
                        "answers": "Conversation Summary: ${args.summary}"
                      },
                      "output": {
                        "response": "Summary stored in DB.",
                        "action": []
                      }
                    }
                  ]
                }
              }
            ]
          },
          "hints": [
            "health assessment",
            "feeling well"
          ],
          "languages": [
            {
              "code": "en-US",
              "language": "English (United States)",
              "name": "English (United States)",
              "voice": "azure.en-CA-LiamNeural"
            }
          ]
        }
      }
    ]
  }
}
"""
    return Response(SWML_JSON, mimetype="application/json")