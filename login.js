const mysqlx = require('@mysql/xdevapi');
const express = require('express');
const session = require('express-session');
const path = require('path');
const dotenv = require('dotenv');

const app = express();

dotenv.config();

// Middleware
app.use(
  session({
    secret: 'secret',
    resave: true,
    saveUninitialized: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'static')));

// Connect to MySQL using xdevapi
mysqlx
  .getSession({
    user: process.env.DBUSER,
    password: process.env.DBPWD,
    host: process.env.DBHOST,
    port: process.env.DBPORT,
  })
  .then((session) => {
    // Select database
    const db = session.getSchema('nodelogin');

    // Routes
    app.get('/', function (req, res) {
      res.sendFile(path.join(__dirname + '/login.html'));
    });
    app.get('/sign-up', (req, res) => {
      res.sendFile(path.join(__dirname + '/register.html'));
    });

    app.post('/register', (req, res) => {
      const { username, password, email } = req.body;

      if (username && password && email) {
        db.getTable('accounts')
          .insert('username', 'password', 'email')
          .values(username, password, email);
      }

      res.redirect('http://localhost:5173/success');
    });

    app.post('/auth', function (req, res) {
      const { username, password } = req.body;

      if (username && password) {
        db.getTable('accounts')
          .select(['username'])
          .where('username = :username AND password = :password')
          .bind('username', username)
          .bind('password', password)
          .execute((result) => {
            if (result.length > 0) {
              req.session.loggedin = true;
              req.session.username = username;
              return res.redirect('/home');
            } else {
              return res.redirect('/sign-up');
            }
          });
      } else {
        res.send('Please enter Username and Password!');
      }
    });

    app.get('/home', function (req, res) {
      if (req.session.loggedin) {
        res.send('Welcome back, ' + req.session.username + '!');
      } else {
        res.send('Please login to view this page!');
      }
      res.end();
    });

    app.listen(3000);
  })
  .catch((err) => {
    console.error('Error connecting to MySQL:', err.message);
  });
