var express = require('express'),
  partials = require('express-partials');
var app = express();
var ejs = require('ejs');
var https = require('https');
var http = require('http');
var url = require('url');
var months = ["January","February","March","April","May","June","July","August","September","October","November","December"];

var events;

// sort comparers for date strings
function asorter(a, b) {
  return getTime(a.start_time) - getTime(b.start_time);
}

function dsorter(a, b) {
  return getTime(b.start_time) - getTime(a.start_time);
}

function getTime(a) {
  return new Date(a).getTime();
}

function formatDate(date) {
  var d = date;
  var hh = d.getHours();
  var m = d.getMinutes();
  var s = d.getSeconds();
  var dd = "AM";
  var h = hh;
  if (h >= 12) {
      h = hh-12;
      dd = "PM";
  }
  if (h == 0) {
      h = 12;
  }
  m = m<10?"0"+m:m;

  if(m == '00') {
    return h + dd;
  }

  s = s<10?"0"+s:s;

  var pattern = new RegExp("0?"+hh+":"+m+":"+s);
  return h+":"+m+dd;
}

function getEvents() {
  var fully_explored = false;
  var next_page;
  events = {'upcoming': [], 'past': []};

  function grab_events(res) {
    var body = "";
    res.on('data', function(chunk) {
      body += chunk;
    });
    res.on('end', function() {
      if (body == false) {
        return;
      }
      try {
        var ts = (new Date()).valueOf();
        data = JSON.parse(body);
        paging = data.paging;
        data = data.data;

        var event, date;
        for (var i in data) {
          event = data[i];

          // More detailed query
          https.get({
            host: 'graph.facebook.com',
            path: '/' + event.id + '?fields=name,cover,description,start_time,id,location&access_token=658413130906919|jq0oT6M9dcNBf_a6EGXbpNHrWI4'
          }, function(res) {
            body = "";
            res.on('data', function(chunk) {
              body += chunk;
            });
            res.on('end', function() {
              if(body == "false") {
                return;
              }
              try {
                event = JSON.parse(body);
              } catch(e) {
                return;
              }
              date = new Date(event.start_time);
              event.date = months[date.getMonth()] + " " + date.getDate();
              event.dateObj = date;
              event.time = formatDate(date);

              if (event.description != undefined) {
                var description = "";
                var count = 0;
                event.description = event.description.split('\n');
                while(description.split(" ").length < 30 && count <= 3 && event.description){
                  description += "\n" + event.description.shift();
                  count += 1;
                }
                event.description = description;
              } else {
                event.description = 'More information to come!'
              }

              if (event.cover != undefined) {
                event.pic_url = event.cover.source;
              } else {
                // TODO: INSERT DEFAULT COVER PHOTO HERE (Logo?)
                // event.pic_url =
              }

              if (event.location === undefined) {
                event.location = "--";
              }

              if (event.dateObj.valueOf() > ts) {
                events['upcoming'].push(event);
              } else {
                events['past'].push(event);
              }

              // Sort Upcoming & Past Events
              events['upcoming'].sort(asorter);
              events['past'].sort(dsorter);

              // If there are more events, do another query and events.
              if (paging['next'] != undefined) {
                https.get(paging['next'], grab_events);
              }
            });
          });
        }
      } catch(e) {
        return;
      }
    });
  };

  https.get({
    host: 'graph.facebook.com',
    path: '/466093040128127/events?access_token=1399949440268336|cb5a39d0a773588e4e57eac8e5641307'
  }, grab_events);
}

getEvents();

app.use(partials());

// Initialize main server
app.use(express.json());
app.use(express.urlencoded());
app.use(express.static(__dirname + '/static'));

app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');

app.get('/', function(req, res){
    res.render('about', {page: 'about'});
});

app.get('/about', function(req, res){
    res.render('about', {page: 'about'});
});

app.get('/events', function(req, res){
    res.render('events', {page: 'events', events: events});
});

app.get('/album', function(req, res){
    res.render('album', {page: 'album'});
});

app.get('/music', function(req, res){
    res.render('music', {page: 'music'});
});

app.get('/contact', function(req, res){
    res.render('contact', {page: 'contact'});
});

var port = process.env.PORT || 5000;
console.log(port);
app.listen(port);
