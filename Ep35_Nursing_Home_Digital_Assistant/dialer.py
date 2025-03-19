import logging
import os
import sqlite3
import time
from signalwire.relay.consumer import Consumer
from dotenv import load_dotenv
load_dotenv()

class CustomConsumer(Consumer):
    def setup(self):
        self.project = os.getenv('PROJECT_ID')
        self.token = os.getenv('REST_API_TOKEN')
        self.contexts = ['nursinghome']

        if not self.project or not self.token:
            raise ValueError("Missing SignalWire credentials (PROJECT_ID, REST_API_TOKEN)")

    async def ready(self):
        logging.info('Nursing Home Dialer Consumer Ready')

        from_number = os.getenv('SIGNALWIRE_NUMBER')     
        digital_assistant = os.getenv('AI_AGENT_NUMBER') 

        if not from_number or not digital_assistant:
            raise ValueError("Missing SIGNALWIRE_NUMBER or AI_AGENT_NUMBER in environment variables")

        conn = sqlite3.connect("nursing_home.db")
        cursor = conn.cursor()

        try:
            # Retrieve patient phone numbers
            cursor.execute("SELECT id, patient_phone FROM patients")
            patients = cursor.fetchall()

            if not patients:
                logging.info("No patients found in the database.")
                return

            
            for row in patients:
                patient_id, patient_phone = row
                logging.info(f"Dialing patient: {patient_phone}")

                # Place the outbound call
                dial_result = await self.client.calling.dial(
                    to_number=patient_phone,
                    from_number=from_number
                )

                if dial_result.successful:
                    logging.info(f"{patient_phone}: Call connected.")

                    # Connect the call to the AI agent
                    await dial_result.call.connect(device_list=[
                        {
                            'to_number': digital_assistant,
                            'timeout': 5
                        }
                    ])

                else:
                    logging.error(f"{patient_phone}: Call failed.")

        except sqlite3.Error as e:
            logging.error(f"Database error: {e}")
        except Exception as e:
            logging.error(f"Unexpected error: {e}")
        finally:
            conn.close()

    def teardown(self):
        logging.info("Dialer teardown...")

def run_dialer():
    consumer = CustomConsumer()
    consumer.run()

if __name__ == "__main__":
    run_dialer()