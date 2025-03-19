import io
import csv
import re
import sqlite3
import subprocess
from flask import Flask, jsonify, request, render_template, make_response
from flask_socketio import SocketIO
from ai import ai_prompt
import os
from dotenv import load_dotenv
load_dotenv()



app = Flask(__name__)
socketio = SocketIO(app)

def init_db():
    conn = sqlite3.connect('nursing_home.db')
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS patients (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            first_name TEXT NOT NULL,
            last_name TEXT NOT NULL,
            dob TEXT NOT NULL,
            patient_phone TEXT NOT NULL,
            caregiver_name TEXT NOT NULL,
            caregiver_phone TEXT NOT NULL
        )
    ''')

    # Create responses table for weekly health assessment
    c.execute('''
        CREATE TABLE IF NOT EXISTS responses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id INTEGER NOT NULL,
            answers TEXT NOT NULL,
            FOREIGN KEY(patient_id) REFERENCES patients(id)
        )
    ''')

    conn.commit()
    conn.close()

init_db()
def format_phone_number(phone_number):
    if not phone_number.startswith('+1'):
        return f"+1{phone_number}"
    return phone_number

@app.route('/')
def index():
   
    return render_template('index.html')


@app.route('/ai_prompt', methods=['POST'])
def handle_ai_prompt():
    print("AI Prompt request received")
    print(request.json)
    return ai_prompt()

@app.route('/add_patient', methods=['POST'])
def add_patient():
    data = request.get_json()

    if not data:
        return jsonify({"error": "No data provided"}), 400

    first_name = data.get("first_name")
    last_name = data.get("last_name")
    dob = data.get("dob")
    patient_phone = data.get("patient_phone")
    caregiver_name = data.get("caregiver_name")
    caregiver_phone = data.get("caregiver_phone")

    if not all([first_name, last_name, dob, patient_phone, caregiver_name, caregiver_phone]):
        return jsonify({"error": "Missing required fields"}), 400

    # Format phone numbers
    formatted_patient_phone = format_phone_number(patient_phone)
    formatted_caregiver_phone = format_phone_number(caregiver_phone)

    conn = sqlite3.connect('nursing_home.db')
    c = conn.cursor()
    c.execute('''
        INSERT INTO patients (first_name, last_name, dob, patient_phone, caregiver_name, caregiver_phone)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (first_name, last_name, dob, formatted_patient_phone, caregiver_name, formatted_caregiver_phone))
    conn.commit()
    conn.close()

    return jsonify({"status": "success"}), 201

@app.route('/verify_patient', methods=['POST'])
def verify_patient():
   
    if not request.is_json:
        return jsonify({"error": "Content-Type must be application/json"}), 415

    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    first_name = data.get("first_name")
    last_name = data.get("last_name")
    print("First Name:", first_name)
    print("Last Name:", last_name)

    if not all([first_name, last_name]):
        return jsonify({"error": "Missing required fields"}), 400

    conn = sqlite3.connect('nursing_home.db')
    c = conn.cursor()

    c.execute("""
        SELECT 
            id,
            first_name,
            last_name,
            dob,
            patient_phone,
            caregiver_name,
            caregiver_phone
        FROM patients
        WHERE lower(first_name) = lower(?)
          AND lower(last_name) = lower(?)
        LIMIT 1
    """, (first_name, last_name))
    
    row = c.fetchone()
    conn.close()

    if row:
        # Unpack the fields with the ID included
        patient_id, found_fname, found_lname, found_dob, patient_phone, caregiver_name, caregiver_phone = row
        
        response_text = (f"Found patient {found_fname} {found_lname}. "
                         f"Caregiver is {caregiver_name}, phone: {caregiver_phone}")
        
        return jsonify({
            "response": response_text,
            "Records": [
                {
                    "id": patient_id,              
                    "first_name": found_fname,
                    "last_name": found_lname,
                    "dob": found_dob,
                    "patient_phone": patient_phone,
                    "caregiver_name": caregiver_name,
                    "caregiver_phone": caregiver_phone
                }
            ]
        })
    else:
        
        return jsonify({
            "response": "No matching record found. Please provide your first and last name again.",
            "Records": [],
            "retry": True
        })



@app.route('/add_response', methods=['POST'])
def add_response():
    
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    patient_id = data.get("patient_id")
    answers = data.get("answers")

    
    if not all([patient_id, answers]):
        return jsonify({"error": "Missing required fields"}), 400

    conn = sqlite3.connect('nursing_home.db')
    c = conn.cursor()

   
    c.execute('''
        INSERT INTO responses (patient_id, answers)
        VALUES (?, ?)
    ''', (patient_id, answers))

    conn.commit()
    conn.close()

    return jsonify({"status": "success"}), 201


@app.route('/patients', methods=['GET'])
def get_patients():
   
    conn = sqlite3.connect('nursing_home.db')
    c = conn.cursor()
    c.execute('SELECT * FROM patients')
    rows = c.fetchall()
    conn.close()
    return jsonify(rows)

@app.route('/responses', methods=['GET'])
def get_responses():
   
    conn = sqlite3.connect('nursing_home.db')
    c = conn.cursor()
    c.execute('SELECT * FROM responses')
    rows = c.fetchall()
    conn.close()
    return jsonify(rows)

@app.route('/export_csv', methods=['GET'])
def export_csv():
   
    conn = sqlite3.connect('nursing_home.db')
    c = conn.cursor()
   
    c.execute('''
        SELECT
            p.first_name,
            p.last_name,
            p.dob,
            p.caregiver_name,
            p.caregiver_phone,
            r.answers
        FROM responses r
        JOIN patients p ON r.patient_id = p.id
        ORDER BY p.first_name, p.last_name
    ''')
    rows = c.fetchall()
    conn.close()

    csv_output = []
    csv_output.append([
        'First Name',
        'Last Name',
        'DOB',
        'Caregiver Name',
        'Caregiver Phone',
        'Answers'
    ])
    for row in rows:
        csv_output.append(list(row))

    si = io.StringIO()
    cw = csv.writer(si)
    cw.writerows(csv_output)
    output = make_response(si.getvalue())
    output.headers["Content-Disposition"] = "attachment; filename=responses.csv"
    output.headers["Content-type"] = "text/csv"
    return output

@app.route('/start_dialer', methods=['POST'])
def start_dialer():
    
    try:
        subprocess.Popen(["python3", "dialer.py"])
        return jsonify({"status": "success", "message": "Dialer started"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})

@socketio.on('connect')
def handle_connect():
    print('Client connected')

@socketio.on('disconnect')
def handle_disconnect():
    print('Client disconnected')

if __name__ == '__main__':
    socketio.run(app, host="0.0.0.0", port=5000)