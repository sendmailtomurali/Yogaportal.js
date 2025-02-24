var express=require('express');
var app=express();
//Add middleware to parse URL-encoded form data
app.use(express.urlencoded({ extended: true }));

// this code is to include sqlite3 and add a database
var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('./yogadata.db'); 

// Set Pug as the view engine
app.set('view engine', 'pug');
app.set('views', './views');
app.use(express.static("public"));

// Create a new SQLite3 database
db.serialize(function() {
    db.run("CREATE TABLE  IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, location TEXT, membersince TEXT, status TEXT DEFAULT 'Active')");
});

db.serialize(function() {
    db.run("CREATE TABLE IF NOT EXISTS attendance (id INTEGER PRIMARY KEY AUTOINCREMENT, date DATE, time TEXT, name TEXT, activity TEXT, FOREIGN KEY (name) REFERENCES users(name))");
});

app.get('/',function(req,res)
{
    res.render('index');
});

app.get('/Members', function(req, res) {
    db.all("SELECT * FROM users", function(err, rows) {
        if (err) {
            console.error(err);
            res.status(500).send("Error retrieving data");
        } else {
            res.render('MemberDir', { users: rows });
        }
    });
});

app.get('/attendance', (req, res) => {
    let page = parseInt(req.query.page) || 1;
    let limit = 50; // Show 50 records per page
    let offset = (page - 1) * limit;

    db.all(`SELECT * FROM attendance ORDER BY DATE(date) DESC LIMIT ? OFFSET ?`, [limit, offset], (err, rows) => {
        if (err) {
            return res.status(500).send('Database error');
        }
        res.render('viewAttendance', { attendance: rows, currentPage: page });
    });
});

app.get('/reportAttendance', (req, res) => {
    let { startDate, endDate, user } = req.query;
    let query = `SELECT * FROM attendance WHERE date BETWEEN ? AND ?`;
    let params = [startDate, endDate];

    if (user) {
        query += " AND name = ?";
        params.push(user);
    }
    
    db.all(query, params, (err, rows) => {
        if (err) {
            return res.status(500).send("Database error");
        }

        db.all("SELECT name FROM users", (err, users) => {
            if (err) {
                return res.status(500).send("Error retrieving users");
            }
            res.render('reportAttendance', { attendance: rows, users });
        });
    });
});

app.get('/addAttendance', function(req, res) {
    db.all("SELECT name FROM users WHERE status='Active'", function(err, rows) {
        if (err) {
            console.error(err);
            res.status(500).send("Error retrieving users");
        } else {
            res.render('addAttendance', { users: rows });
        }
    });
});


app.post('/addAttendance', function(req, res) {
    var date = req.body.date;
    var time = req.body.time;
    var activity = req.body.activity;
    var entries = [];
    var selectedUsers = new Set();

    // Collect selected users (up to 3) and prevent duplicates
    for (var i = 1; i <= 3; i++) {
        let user = req.body[`user${i}`];
        if (user) {
            if (selectedUsers.has(user)) {
                return res.status(400).send("Duplicate users selected! Please select unique users.");
            }
            selectedUsers.add(user);
            entries.push({
                date: date,
                time: time,
                name: user,
                activity: activity
            });
        }
    }

    if (entries.length === 0) {
        return res.status(400).send("No users selected.");
    }

    var insertCount = 0;
    var errorOccurred = false;

    entries.forEach(function(entry) {
        db.run("INSERT INTO attendance (date, time, name, activity) VALUES (?, ?, ?, ?)", 
        [entry.date, entry.time, entry.name, entry.activity], function(err) {
            if (err) {
                console.error(err);
                if (!errorOccurred) {
                    errorOccurred = true;
                    res.status(500).send("Error inserting attendance data");
                }
                return;
            }
            insertCount++;
            if (insertCount === entries.length && !errorOccurred) {
                res.redirect('/Attendance');
            }
        });
    });
});





var server=app.listen(3030,"0.0.0.0",function()
{
    console.log("Server is running on port", server.address().port);
});
