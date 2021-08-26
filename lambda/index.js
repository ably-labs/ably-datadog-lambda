// A Lambda function to post stats from the Ably application stats metachannel
// to the DataDog custom metrics API.
//
// Expects a DataDog API key to be provided in the DD_API_KEY environment
// variable.
//
// See:
// https://ably.com/documentation/general/statistics
// https://docs.datadoghq.com/metrics/custom_metrics/
//
const util     = require('util');
const dogapi   = require('dogapi');
const send_all = util.promisify(dogapi.metric.send_all);

dogapi.initialize({
  api_key:  process.env.DD_API_KEY,
  api_host: process.env.DD_HOSTNAME || 'api.datadoghq.com',
});

// metricNames is the subset of metrics to send to DataDog.
//
// Each of these metrics are posted to DataDog as counters prefixed with
// 'ably.' (e.g. 'ably.connections.all.peak' or 'ably.channels.peak').
//
// For a full list of available metrics, see the 'entries' field in the
// app-stats JSON schema:
//
// https://schemas.ably.com/json/app-stats-0.0.1.json
const metricNames = [
  'messages.all.all.count',
  'connections.all.peak',
  'channels.peak',
  'apiRequests.all.succeeded',
  'apiRequests.all.failed',
  'apiRequests.all.refused',
  'apiRequests.tokenRequests.succeeded',
  'apiRequests.tokenRequests.failed',
  'apiRequests.tokenRequests.refused',
];

// The Lambda function handler receives an Ably event containing a list of
// app-stats messages, and posts the stats to DataDog.
exports.handler = async (event) => {
  return Promise.all(event.messages.map(msg => {
    // Parse the app-stats message.
    const data = JSON.parse(msg.data);

    // Use the app-stats intervalId as the metric timestamp.
    const timestamp = new Date(`${data.intervalId}:00Z`).getTime() / 1000;

    // Construct the list of metrics to send to DataDog, tagged with the appId
    // and ruleId which emitted the message.
    const metrics = metricNames.map(metric => ({
      metric: `ably.${metric}`,
      type:   'count',
      points: [[timestamp, data.entries[metric] || 0]],
      tags:   [`ably.appId:${event.appId}`, `ably.ruleId:${event.ruleId}`],
    }));

    // Send the metrics to DataDog.
    console.log(`Sending ${metrics.length} metrics`);
    return send_all(metrics);
  }));
};
