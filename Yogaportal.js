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
    db.run("CREATE TABLE IF NOT EXISTS attendance (id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT, time TEXT, name TEXT, activity TEXT, FOREIGN KEY (name) REFERENCES users(name))");
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

app.get('/Attendance', function(req, res) {
    db.all("SELECT * FROM attendance ORDER by id DESC", function(err, rows) {
        if (err) {
            console.error(err);
            res.status(500).send("Error retrieving data");
        } else {
            res.render('viewAttendance', { attendance: rows });
        }
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





var server=app.listen(3030,function()
{
    console.log("Server is running on port", server.address().port);
});
