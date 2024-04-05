const mysqlx = require('@mysql/xdevapi');
const express = require('express');
const session = require('express-session');
const path = require('path');
const jwt = require('jsonwebtoken');

const app = express();

const dotenv = require('dotenv');
dotenv.config();

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
    user: `${process.env.DBUSER}`,
    password: `${process.env.DBPWD}`,
    host: `${process.env.DBHOST}`,
    port: process.env.DBPORT,
  })
  .then((session) => {
    // Select database
    const db = session.getSchema('nodelogin');

    // http://localhost:3000/
    app.get('/', function (request, response) {
      // Render login template
      response.sendFile(path.join(__dirname + '/login.html'));
    });
    app.get('/sign-up', (request, response) => {
      // Render register template
      response.sendFile(path.join(__dirname + '/register.html'));
    });

    // http://localhost:3000/register
    app.post('/register', (request, response) => {
      let username = request.body.username;
      let password = request.body.password;
      let email = request.body.email;

      if (username && password && email) {
        console.log('inside else');
        // Insert the new user into the database
        db.getTable('accounts')
          .insert('username', 'password', 'email')
          .values(username, password, email)
          .execute(() => {
            response.redirect('/home');
          });
      }
      // response.sendFile(path.join(__dirname + '/succes.html'));
      response.redirect('http://localhost:5173/success');
    });

    // http://localhost:3000/auth
    app.post('/auth', function (request, response) {
      // Capture the input fields
      let username = request.body.username;
      let password = request.body.password;
      // Ensure the input fields exist and are not empty
      if (username && password) {
        // Execute SQL query that'll select the account from the database based on the specified username and password
        db.getTable('accounts')
          .select(['username'])
          .where('username = :username AND password = :password')
          .bind('username', username)
          .bind('password', password)
          .execute((result) => {
            console.log(result);
            if (result.length > 0) {
              // Authenticate the user
              request.session.loggedin = true;
              request.session.username = username;
              // Redirect to home page
              return response.redirect('/home');
            } else {
              // Redirect to sign-up page if user is not found
              return response.redirect('/sign-up');
            }
          });
      } else {
        response.send('Please enter Username and Password!');
      }
    });

    // http://localhost:3000/home
    app.get('/home', function (request, response) {
      // If the user is loggedin
      if (request.session.loggedin) {
        // Output username
        response.send('Welcome back, ' + request.session.username + '!');
      } else {
        // Not logged in
        response.send('Please login to view this page!');
      }
      response.end();
    });

    app.listen(3000);
  })
  .catch((err) => {
    console.error('Error connecting to MySQL:', err.message);
  });
