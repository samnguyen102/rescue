const functions = require('firebase-functions')
const express = require('express')
const cors = require('cors')
const googleCredentials = require('./credentials.json')
const { google } = require('googleapis')
const OAuth2 = google.auth.OAuth2
const calendar = google.calendar('v3')
const sheets = google.sheets('v4')
const is_prod = process.env.GCLOUD_PROJECT === 'sharing-excess-prod'
const spreadsheetId = is_prod
  ? '1wmcOySR3EhHezgFn0o3suf7RZFDh62secue3jpbPK4Q'
  : '16bn0SYmKu7YnTI1yB5NiMzHhq3E0ZkDzCnfeh0v1AeI'
const serviceAccountKey = is_prod
  ? './serviceAccountProd.json'
  : './serviceAccountDev.json'
const serviceAccount = require(serviceAccountKey)
const moment = require('moment-timezone')

const jwtClient = new google.auth.JWT({
  email: serviceAccount.client_email,
  key: serviceAccount.private_key,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
})

const jwtAuthPromise = jwtClient.authorize()

const ERROR_RESPONSE = {
  status: '500',
  message: 'There was an error with your Google calendar',
}
const admin = require('firebase-admin')
admin.initializeApp()
const db = admin.firestore()

exports.writeToGoogleSheets = functions
  .runWith({
    timeoutSeconds: 540,
    memory: '4GB',
  })
  .pubsub.schedule('01 00 * * *') // run every day at 12:01am (00:01)
  .timeZone('America/New_York')
  .onRun(async () => {
    console.log('Spreadsheet ID:', spreadsheetId)
    console.log('is_prod?', is_prod, process.env.GCLOUD_PROJECT)

    // fetch all rescues from db
    const rescues = []
    await db
      .collection('rescues')
      .where('status', '==', 'completed')
      .get()
      .then(querySnapshot => {
        querySnapshot.forEach(doc => {
          rescues.push(doc.data())
        })
      })

    // sort rescues by start time
    rescues.sort(
      (a, b) =>
        a.timestamp_scheduled_start.toDate().getTime() -
        b.timestamp_scheduled_start.toDate().getTime()
    )
    console.log('found', rescues.length, 'rescues')

    // fetch all stops from db
    const stops = []
    await db
      .collection('stops')
      .get()
      .then(querySnapshot => {
        querySnapshot.forEach(doc => {
          stops.push(doc.data())
        })
      })

    console.log('found', stops.length, 'stops')

    // fetch all organizations from db
    const organizations = []
    await db
      .collection('organizations')
      .get()
      .then(querySnapshot => {
        querySnapshot.forEach(doc => {
          organizations.push(doc.data())
        })
      })

    console.log('found', organizations.length, 'organizations')

    // fetch all locations from db
    const locations = []
    await db
      .collection('locations')
      .get()
      .then(querySnapshot => {
        querySnapshot.forEach(doc => {
          locations.push(doc.data())
        })
      })

    console.log('found', locations.length, 'locations')

    // fetch all users from db
    const users = []
    await db
      .collection('users')
      .get()
      .then(querySnapshot => {
        querySnapshot.forEach(doc => {
          users.push(doc.data())
        })
      })

    console.log('found', users.length, 'users')

    // convert rescues into flattened spreadsheet rows
    // and replace unreadable IDs and data with data
    // gathered from other db tables
    const rows = []
    for (const rescue of rescues) {
      // format all timestamps as readable strings
      console.log('rescue:', JSON.stringify(rescue))
      for (const key in rescue) {
        if (key.includes('timestamp_') && rescue[key]) {
          rescue[key] = moment(rescue[key].toDate())
            .tz('America/New_York')
            .format('dddd, MM/DD/YY, hh:mma')
        }
      }
      // add the handler's name to the rescue
      if (rescue.handler_id) {
        const handler = users.find(i => i.id === rescue.handler_id)
        console.log('handler:', JSON.stringify(handler))
        rescue.handler_name = handler.name
      } else console.log('No handler_id in rescue, skipping...')

      // map over all stops on the route to get organization and location info
      // and impact data numbers
      if (rescue.stop_ids) {
        const rescue_stops = []
        for (const stop_id of rescue.stop_ids) {
          console.log('looking for stop:', stop_id)
          const stop = stops.find(i => i.id === stop_id)
          console.log('stop:', JSON.stringify(stop))
          if (!stop) {
            console.log('Could not find stop matching id:', stop_id)
            continue
          }
          // get organization name for stop
          const organization = organizations.find(
            i => i.id === stop.organization_id
          )
          console.log('stop organization:', JSON.stringify(organization))
          stop.organization = organization
          // get location address for stop
          const location = locations.find(i => i.id === stop.location_id)
          console.log('stop location:', JSON.stringify(location))
          stop.location = location
          rescue_stops.push(stop)
        }
        // map the stops array to a flattened and readable string
        rescue.stops = rescue_stops
          .map(s => `${s.organization.name} (${s.location.address1})`)
          .join(', ')

        // calculate impact data for route
        const IMPACT_DATA_CATEGORIES = [
          'impact_data_dairy',
          'impact_data_bakery',
          'impact_data_produce',
          'impact_data_meat_fish',
          'impact_data_non_perishable',
          'impact_data_prepared_frozen',
          'impact_data_mixed',
          'impact_data_other',
          'impact_data_total_weight',
        ]
        const deliveries = rescue_stops.filter(s => s.type === 'delivery')
        for (const category of IMPACT_DATA_CATEGORIES) {
          rescue[category] = deliveries.reduce(
            (total, currDelivery) => total + currDelivery[category],
            0
          )
        }
      }

      console.log('COMPLETE RESCUE:', JSON.stringify(rescue))

      // map completed rescue into array in order of spreadsheet columns
      const row = [
        rescue.id || '',
        rescue.handler_name || '',
        rescue.timestamp_scheduled_start || '',
        rescue.stops || '',
        rescue.status || '',
        rescue.impact_data_dairy || 0,
        rescue.impact_data_bakery || 0,
        rescue.impact_data_produce || 0,
        rescue.impact_data_meat_fish || 0,
        rescue.impact_data_non_perishable || 0,
        rescue.impact_data_prepared_frozen || 0,
        rescue.impact_data_mixed || 0,
        rescue.impact_data_other || 0,
        rescue.impact_data_total_weight || 0,
        rescue.notes || '',
        rescue.is_direct_link || '',
        rescue.timestamp_scheduled_finish || '',
        rescue.timestamp_logged_start || '',
        rescue.timestamp_logged_finish || '',
      ]
      console.log('COMPLETE ROW:', JSON.stringify(row))
      rows.push(row)
    }

    const headers = [
      'Rescue ID',
      'Handler',
      'Scheduled Start',
      'Stops',
      'Status',
      'Pounds Rescued (dairy)',
      'Pounds Rescued (bakery)',
      'Pounds Rescued (produce)',
      'Pounds Rescued (meat/fish)',
      'Pounds Rescued (non-perishable)',
      'Pounds Rescued (prepared/frozen)',
      'Pounds Rescued (mixed)',
      'Pounds Rescued (other)',
      'Pounds Rescued (total)',
      'Notes',
      'Direct Link',
      'Scheduled Finish',
      'Logged Start',
      'Logged Finish',
    ]
    const columns = [
      'A',
      'B',
      'C',
      'D',
      'E',
      'F',
      'G',
      'H',
      'I',
      'J',
      'K',
      'L',
      'M',
      'N',
      'O',
      'P',
      'Q',
      'R',
      'S',
      'T',
      'U',
      'V',
      'W',
      'X',
      'Y',
      'Z',
    ]

    await jwtAuthPromise
    const headersRange = `Rescues!A1:${columns[headers.length - 1]}1`
    console.log('writing headers to range:', headersRange)
    await sheets.spreadsheets.values.update(
      {
        auth: jwtClient,
        spreadsheetId: spreadsheetId,
        range: headersRange,
        valueInputOption: 'RAW',
        requestBody: { values: [headers] },
      },
      {}
    )

    let current_row = 2
    while (rows.length) {
      const body = rows.splice(0, Math.min(100, rows.length))
      const range = `Rescues!A${current_row}:${columns[headers.length - 1]}${
        current_row + body.length
      }`
      await sheets.spreadsheets.values.update(
        {
          auth: jwtClient,
          spreadsheetId: spreadsheetId,
          range: range,
          valueInputOption: 'RAW',
          requestBody: { values: body },
        },
        {}
      )
      current_row += body.length
    }
  })

const backend_routes = express()
backend_routes.use(cors({ origin: true }))

backend_routes.post('/addCalendarEvent', addCalendarEvent)
backend_routes.post('/deleteCalendarEvent', deleteCalendarEvent)

function addEvent(resource, auth) {
  console.log('\n\n\n\nAdding Event:', resource)
  return new Promise(function (resolve, reject) {
    const event = {
      summary: resource.summary,
      location: resource.location,
      description: resource.description,
      start: resource.start,
      end: resource.end,
      attendees: resource.attendees,
    }

    calendar.events.insert(
      {
        auth,
        calendarId: resource.calendarId,
        resource: event,
      },
      (err, res) => {
        if (err) {
          console.log('Rejecting because of error', err)
          reject(err)
        } else {
          console.log('Request successful', res)
          resolve(res.data)
        }
      }
    )
  })
}

function deleteEvent(calendarId, eventId, auth) {
  console.log('Deleting Event:', eventId)
  return new Promise(function (resolve, reject) {
    calendar.events.delete({ auth, calendarId, eventId }, (err, res) => {
      if (err) {
        console.log('Rejecting because of error', err)
        reject(err)
      } else {
        console.log('Request successful', res)
        resolve(res.data)
      }
    })
  })
}

function addCalendarEvent(request, response) {
  const oAuth2Client = new OAuth2(
    googleCredentials.web.client_id,
    googleCredentials.web.client_secret,
    googleCredentials.web.redirect_uris[0]
  )

  oAuth2Client.setCredentials({
    refresh_token: googleCredentials.refresh_token,
  })

  addEvent(JSON.parse(request.body), oAuth2Client)
    .then(data => {
      response.status(200).send(data)
      return
    })
    .catch(err => {
      console.error('Error adding event: ' + err.message)
      response.status(500).send(ERROR_RESPONSE)
      return
    })
}

function deleteCalendarEvent(request, response) {
  const oAuth2Client = new OAuth2(
    googleCredentials.web.client_id,
    googleCredentials.web.client_secret,
    googleCredentials.web.redirect_uris[0]
  )

  oAuth2Client.setCredentials({
    refresh_token: googleCredentials.refresh_token,
  })
  const { calendarId, eventId } = JSON.parse(request.body)

  deleteEvent(calendarId, eventId, oAuth2Client)
    .then(data => {
      response.status(200).send(data)
      return
    })
    .catch(err => {
      console.error('Error adding event: ' + err.message)
      response.status(500).send(ERROR_RESPONSE)
      return
    })
}

exports.backend = functions.https.onRequest(backend_routes)
