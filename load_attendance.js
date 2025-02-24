const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

// Database connection
const db = new sqlite3.Database('yogadata.db', (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to SQLite database.');
    }
});

// Ensure the attendance table exists
db.run(`CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT,
    time TEXT,
    name TEXT,
    activity TEXT,
    FOREIGN KEY (name) REFERENCES users(name)
)`);

const csvFilePath = '2024 yoga attendance - Sheet1.csv';

fs.createReadStream(csvFilePath)
    .pipe(csv())
    .on('data', (row) => {
        const { date, time, name, activity } = row;
        
        db.run(
            `INSERT INTO attendance (date, time, name, activity) VALUES (?, ?, ?, ?)`,
            [date, time, name, activity],
            function (err) {
                if (err) {
                    console.error('Error inserting row:', err.message);
                } else {
                    console.log(`Inserted row with ID: ${this.lastID}`);
                }
            }
        );
        
    })
    .on('end', () => {
        console.log('CSV file successfully processed.');
        db.close();
    });
