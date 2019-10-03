'use strict';

// ========== Dependencies ========== //
const fs = require('fs');
const express = require('express');
const pg = require('pg');
const superagent = require('superagent');
const methodOverride = require('method-override');

const googleCalendarAPI = require('./googleapi');
const GCA = new googleCalendarAPI();

// TODO: fix to get event list properly
let eventList = GCA.getEventList();

// ========== Environment Variable ========== //
require('dotenv').config();

// ========== Server ========== //
const app = express();
const PORT = process.env.PORT || 3001;

// ========== App Middleware ========== //
app.use(express.static('./public'));
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride((request, response) => {
  if (request.body && typeof request.body === 'object' && '_method' in request.body) {
    let method = request.body._method;
    delete request.body._method;
    return method;
  }
}));

// ========== Database Setup ========== //
const client = new pg.Client(process.env.DATABASE_URL);
client.on('error', error => handleError(error));
client.connect();

// ========== Set Views Engine for Templating ========== //
app.set('view engine', 'ejs');

// ========== Routes ========== //

// render the Home page
app.get('/', getHome);
app.get('/upcoming/:count', getUpcoming);

// render the Calendar page that shows a Google Calendar API
app.get('/calendar', getCalendar);
// render the Resource page
app.get('/resources', getResources);
app.get('/calendar/:item_id', getCalendarItemDetail);

app.get('/email', getEmailLink);

app.get('/pdf', testPDF);

// render the Admin page
// app.get('/edit-mode/authority/admin', renderAdmin);
const adminRoute = process.env.ADMIN_ROUTE;

// Make sure we do not set up the routes if ADMIN_ROUTE is not defined.
if (adminRoute) {
  app.get(`/${adminRoute}`, getAdminView);
  app.get(`/${adminRoute}/calendar`, getEventAdminList);
  app.get(`/${adminRoute}/calendar/new`, getNewEventView);
  app.get(`/${adminRoute}/calendar/edit`, getEditEventView);
  app.get(`/${adminRoute}/calendar/delete`, getDeleteEventView);
  app.post(`/${adminRoute}/calendar/new`, postNewEvent);
  app.put(`/${adminRoute}/calendar/edit`, updateEvent);
  app.delete(`/${adminRoute}/calendar/delete`, deleteEvent);
  app.get(`/${adminRoute}/resource`, getResourceAdminList);
  app.get(`/${adminRoute}/resource/new`, getNewResourceView);
  app.get(`/${adminRoute}/resource/edit/:id`, getEditResourceView);

  // TODO: This route may be redundant.  It would be for a confirmation prompt, but this can be done on the front end.
  app.get(`/${adminRoute}/resource/delete/:id`, getDeleteResourceView);
  app.post(`/${adminRoute}/resource/new`, postNewResource);
  app.put(`/${adminRoute}/resource/edit/:id`, updateResource);
  app.delete(`/${adminRoute}/resource/delete/:id`, deleteResource);
} else {
  console.log('no ADMIN_ROUTE .env value');
}

// ========== Catch All Other Routes ========== //
app.all('*', (req, res) => {
  res.status(404).send('This route does not exist.');
  console.log(`Route for ${req.method} ${req.originalUrl} does not exist.`);
});

// ========== Route Handlers ========== //

function getHome(req, res) {
  res.render('pages/index');
}

function getUpcoming(req, res) {
  let EventList = GCA.getEventList();
  console.log('The current event list: \n', EventList);
  res.send(EventList);
}

function getCalendar(req, res) {
  res.render('pages/calendar');
}

function getResources(req, res) {
  const sql = 'SELECT id, title, description, resource_url, logo_png FROM resource ORDER BY title DESC;';

  client
    .query(sql)
    .then(sqlResults => {
      console.log('sql results', sqlResults.rows);
      res.render('pages/resources', { resource: sqlResults.rows });
    })
    .catch(err => handleError(err, res));
}

function getEmailLink(req, res) {
  res.redirect(`${process.env.EMAIL}`);
}

function getCalendarItemDetail(req, res) {
  res.render('pages/calendar/item');
}

function getAdminView(req, res) {
  const sql = 'SELECT id, title, description, resource_url, logo_png FROM resource ORDER BY title DESC;';

  client
    .query(sql)
    .then(sqlResults => {
      console.log('sql results', sqlResults.rows);
      res.render('pages/admin', {
        adminRoute: adminRoute,
        resource: sqlResults.rows
      });
    })
    .catch(err => handleError(err, res));
}

function getEventAdminList(req, res) {
  res.render('pages/calendar/list');
}

function getNewEventView(req, res) {
  res.render('pages/calendar/new-item');
}

function getEditEventView(req, res) {
  res.render('pages/calendar/edit-item');
}

function getDeleteEventView(req, res) {
  res.render('pages/calendar/delete-item');
}

function postNewEvent(req, res) {
  res.redirect(`/${adminRoute}`);
}

function updateEvent(req, res) {
  res.redirect(`/${adminRoute}`);
}

function deleteEvent(req, res) {
  res.redirect(`/${adminRoute}`);
}

function getResourceAdminList(req, res) {
  const sql = 'SELECT id, title, description, resource_url, logo_png FROM resource ORDER BY title DESC;';

  client
    .query(sql)
    .then(sqlResults => {
      console.log('sql results', sqlResults.rows);
      res.render('pages/resource/list', {
        adminRoute: adminRoute,
        resource: sqlResults.rows
      });
    })
    .catch(err => handleError(err, res));
}

function getNewResourceView(req, res) {
  res.render('pages/resource/new-item');
}

function getEditResourceView(req, res) {
  res.render('pages/resource/edit-item');
}

function getDeleteResourceView(req, res) {
  // TODO: This route may by redundant
  res.render('pages/resource/delete-item', {
    adminRoute: adminRoute,
  });
}

function postNewResource(req, res) {
/**
 * id SERIAL PRIMARY KEY,
 * title varchar(255),
 * description text,
 * resource_url varchar(255),
 * logo_png bytea
 */

  let {
    title,
    description,
    resource_url,
    // logo_png
  } = req.body;
  let values = [title, description, resource_url];

  console.log(values);

  let sql = 'INSERT INTO resource (title, description, resource_url) VALUES($1, $2, $3);';
  client
    .query(sql, values)
    .then(sqlResults => {
      // res.redirect(`/${adminRoute}`);
      getAdminView(req, res);
    })
    .catch(err => handleError(err, res));
}

function updateResource(req, res) {
  res.redirect(`/${adminRoute}`);
}

function deleteResource(req, res) {
  let values = [req.params.id];
  let sql = 'DELETE FROM resource WHERE id = $1;';
  console.log('deleteResource() values', values);
  client
    .query(sql, values)
    .then(sqlResults => {
      console.log('deleteResource() success');

      // TODO: should go to getAdminView(req, res);
      getResourceAdminList(req, res);

      // res.redirect(303, `/${adminRoute}`);
    })
    .catch(err => handleError(err, res));
  //res.redirect(`/${adminRoute}`);
}

function testPDF(req, res) {
  var data = fs.readFileSync('./data/test.pdf');
  res.contentType('application/pdf');
  res.send(data);
}

// ========== Error Function ========== //

function handleError(err, response) {
  console.log('ERROR START ==================');
  console.error(err);
  console.log('ERROR END ====================');

  if (response) {
    response
      .status(500)
      .render('pages/error', {
        header: 'Uh Oh something went wrong :(',
        error: err.toString()
      });
  }
}

// ========== Listen on PORT ==========
app.listen(PORT, () => console.log(`listening on port ${PORT}`));
