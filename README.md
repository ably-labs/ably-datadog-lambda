# Ably Datadog Lambda Example

An example Lambda function demonstrating how to publish [Ably application stats](https://ably.com/documentation/general/statistics)
into Datadog using the [custom metrics API](https://docs.datadoghq.com/metrics/custom_metrics/).

## Ably Application Stats

The Ably system collects usage statistics on a per-application basis and exposes them via the REST API
as documented [here](https://ably.com/documentation/general/statistics).

These application stats are also published every minute to a special metachannel named `[meta]stats:minute`, with
each message being formatted according to the app-stats JSON schema which can be found here:

https://schemas.ably.com/json/app-stats-0.0.1.json

Here's an example of the messages published to the `[meta]stats:minute` metachannel for an application
with 10 persistent connections over a 3 minute period (the `entries` field has been truncated to just
include connection stats):

```json
{
  "id": "qoEVQHkLLR:0:0",
  "timestamp": 1630485306030,
  "encoding": "json",
  "channel": "[meta]stats:minute",
  "data": "{\"intervalId\":\"2021-09-01:08:34\",\"unit\":\"minute\",\"schema\":\"https://schemas.ably.com/json/app-stats-0.0.1.json\",\"entries\":{...\"connections.all.peak\":10,\"connections.all.min\":10,\"connections.all.mean\":10}}",
  "name": "update"
}
```

```json
{
  "id": "JIQsGyPy_I:0:0",
  "timestamp": 1630485366034,
  "encoding": "json",
  "channel": "[meta]stats:minute",
  "data": "{\"intervalId\":\"2021-09-01:08:35\",\"unit\":\"minute\",\"schema\":\"https://schemas.ably.com/json/app-stats-0.0.1.json\",\"entries\":{...\"connections.all.peak\":10,\"connections.all.min\":10,\"connections.all.mean\":10}}",
  "name": "update"
}
```

```json
{
  "id": "hFopUEeabA:0:0",
  "timestamp": 1630485426027,
  "encoding": "json",
  "channel": "[meta]stats:minute",
  "data": "{\"intervalId\":\"2021-09-01:08:36\",\"unit\":\"minute\",\"schema\":\"https://schemas.ably.com/json/app-stats-0.0.1.json\",\"entries\":{...\"connections.all.peak\":10,\"connections.all.min\":10,\"connections.all.mean\":10}}",
  "name": "update"
}
```

The Lambda function in [`lambda/index.js`](/lambda/index.js) handles these app-stats messages by constructing
a list of custom metrics and posting them to Datadog.

## Usage

### Lambda Function

To deploy the example Lambda function using AWS CloudFormation:

- Install and configure [AWS CLI version 2](https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html)

- Set `AWS_REGION` to the AWS region you'd like to run the example in:

```
export AWS_REGION=eu-west-2
```

- Create an S3 bucket to store the Lambda function code (or skip if using an existing one):

```
aws s3 mb "s3://ably-datadog-lambda-example"
```

- Upload a zip file of the Lambda function code to the S3 bucket:

```
zip -r lambda.zip lambda/*

aws s3 cp lambda.zip "s3://ably-datadog-lambda-example/lambda.zip"
```

- Set the S3 bucket, Datadog API key, and Ably External ID parameters in `cloudformation/parameters.json` (see [here](https://ably.com/documentation/control-api#account-id) for instructions on how to determine your Ably External ID, which takes the form `<accountID>.<appID>`)

- Deploy the CloudFormation stack:

```
aws cloudformation deploy \
  --template-file       cloudformation/template.yaml \
  --stack-name          ably-datadog-lambda-example \
  --parameter-overrides file://cloudformation/parameters.json \
  --capabilities        "CAPABILITY_IAM"
```

- Retrieve the Lambda function name and the ARN of the IAM role which grants Ably permission to invoke the
  Lambda function from the CloudFormation stack outputs:

```
aws cloudformation describe-stacks --stack-name ably-datadog-lambda-example | grep -A 11 Outputs
```

### Ably Reactor Rule

Follow [these instructions](https://ably.com/documentation/general/events/aws-lambda) to configure an
Ably Reactor Rule which will invoke the Lambda function with messages published to the `[meta]stats:minute`
metachannel by using the following parameters:

- **AWS Region** - the AWS region you deployed the CloudFormation stack to
- **Function Name** - the value of `LambdaFunctionName` from the CloudFormation stack outputs
- **AWS Authentication Scheme** - use "ARN of an assumable role" with the value of `IAMRoleARN` from the CloudFormation stack outputs
- **Source** - use "Message"
- **Channel filter** - use `^\[meta\]stats:minute$` (i.e. a regular expression that matches the name of the `[meta]stats:minute` metachannel)
- **Enveloped** - leave this Enabled

After a few minutes, you should see metrics appear in the Datadog metrics explorer.
