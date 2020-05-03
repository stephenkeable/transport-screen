const request = require('request');
const handlebars = require('handlebars');
const fs = require('fs');
require('dotenv').config();

const express = require('express');
const app = express();
const port = 80;

const appId = process.env.APP_ID;
const appKey = process.env.APP_KEY;

function getTimes(stationCode, callback) {

  const baseUrl = "https://transportapi.com/v3/";

  request( {
    method: 'GET',
    url: baseUrl + "uk/train/station/" + stationCode + "/live.json",
    qs: {
      "app_id": appId,
      "app_key": appKey
    }
  }, function(error, response, body) {
    if (error) {
      console.error(error);
    } else {
      const responseJson = JSON.parse(body);

      const stationName = responseJson.station_name;
      let departures = new Array();
      if (responseJson.departures.all.length > 0) {
        for (let i = 0; i < responseJson.departures.all.length; i++) {
          let departure_time = responseJson.departures.all[i].aimed_departure_time;
          if (responseJson.departures.all[i].status == "LATE") {
            departure_time = "<del>" + responseJson.departures.all[i].aimed_departure_time + "</del>&nbsp;" + responseJson.departures.all[i].expected_departure_time;
          } else if (responseJson.departures.all[i].status == "CANCELLED") {
            departure_time = "CANCELLED";
          } else {
            departure_time = responseJson.departures.all[i].aimed_departure_time;
          }

          const departure = {
            "destination": responseJson.departures.all[i].destination_name,
            "departureTime": departure_time,
            "status": responseJson.departures.all[i].status.toLowerCase().replace(/[^\w ]+/g,'').replace(/ +/g,'-')
          };
          departures.push(departure);
          // if(i > 6) { break; }
        }
      } else {
        const departure = {
          "destination": "No Departures",
          "departureTime": "",
          "status": ""
        };
        departures.push(departure);
      }

      const data = {
        "stationName": stationName,
        "stationClass": stationName.toLowerCase().replace(/[^\w ]+/g,'').replace(/ +/g,'-'),
        "departures": departures
      }

      callback(data);

    }
  });
}

function getBusTimes(stopCode, busNumbers, callback) {

  const baseUrl = "https://transportapi.com/v3/";

  request( {
    method: 'GET',
    url: baseUrl + "uk/bus/stop/" + stopCode + "/live.json",
    qs: {
      "app_id": appId,
      "app_key": appKey
    }
  }, function(error, response, body) {
    if (error) {
      console.error(error);
    } else {
      const responseJson = JSON.parse(body);

      const stationName = responseJson.name;
      let departures = new Array();

      for(let i = 0; i < busNumbers.length; i++) {
        if(responseJson.departures[busNumbers[i]]) {
          for(let ii = 0; ii < responseJson.departures[busNumbers[i]].length; ii++) {
            const departure = {
              "destination": responseJson.departures[busNumbers[i]][ii].line_name + " - " + responseJson.departures[busNumbers[i]][ii].direction,
              "departureTime": responseJson.departures[busNumbers[i]][ii].expected_departure_time,
              "status": "bus"
            };
            departures.push(departure);
          }
        } else {
          const departure = {
            "destination": busNumbers[i] + " - No Departures",
            "departureTime": "",
            "status": "bus"
          };
          departures.push(departure);
        }
      }

      const data = {
        "stationName": stationName,
        "stationClass": stationName.toLowerCase().replace(/[^\w ]+/g,'').replace(/ +/g,'-'),
        "departures": departures
      }

      callback(data);

    }
  });
}

app.get('/', function(req, res) {
  let stations = new Array();
  getTimes("ENF", function(dataEnfieldTown) {
    stations.push(dataEnfieldTown);

    getTimes("ENC", function(dataEnfieldChase) {
      stations.push(dataEnfieldChase);

      getBusTimes("490006587E", ["191", "313"], function(dataEnfieldChase) {
        stations.push(dataEnfieldChase);

        getBusTimes("490006586W", ["307", "121"], function(dataEnfieldChase) {
          stations.push(dataEnfieldChase);

          getBusTimes("490009169S", ["329"], function(dataEnfieldChase) {
            stations.push(dataEnfieldChase);

            const outputData = { "stations": stations };
            fs.readFile('./templates/index.hbs', 'utf-8', function(error, source) {

              var template = handlebars.compile(source);
              var html = template(outputData);

              res.send(html);
            });
          });
        });
      });
    });
  });
});

app.listen(port, "127.0.0.1", () => console.log(`Example app listening on port ${port}!`));
