# Ably Datadog Lambda Example

An example Lambda function demonstrating how to publish [Ably application stats](https://ably.com/documentation/general/statistics) into [Datadog](https://www.datadoghq.com/) using the [custom metrics API](https://docs.datadoghq.com/metrics/custom_metrics/).

## Ably Application Stats

The Ably system collects usage statistics on a per-application basis and exposes them via the REST API
as documented [here](https://ably.com/documentation/general/statistics).

These application stats are also published every minute to a special metachannel named `[meta]stats:minute`, with
each message being formatted according to the [`app-stats` JSON schema](https://schemas.ably.com/json/app-stats-0.0.1.json).

Here's an example of the messages published to the `[meta]stats:minute` metachannel for an application with 10 persistent connections over a 3 minute period (the `entries` field has been truncated to include only connection stats):

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

The Lambda function in [`lambda/index.js`](/lambda/index.js) handles these `app-stats` messages by constructing a list of custom metrics and posting them to Datadog.

## Setup and usage

To deploy the example Lambda function using [AWS CloudFormation](https://aws.amazon.com/cloudformation/):

- Install and configure [AWS CLI version 2](https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html)

- Set `AWS_REGION` to the AWS region you'd like to run the example in:

  ```
  export AWS_REGION=eu-west-2
  ```

### Step 1: Create an S3 bucket

Create an S3 bucket to store the Lambda function code (skip this step if you are using an existing bucket). You can do this either by using the [AWS CLI](https://aws.amazon.com/cli/), or from the [AWS S3 console](https://s3.console.aws.amazon.com/).

Using the AWS CLI:

```
aws s3 mb "s3://ably-datadog-lambda-example"
```

Using the AWS S3 console:

1. Enter the **Bucket name** (in this case it is `ably-datadog-lambda-example`).
2. Ensure that **AWS Region** is set to your designated region (`eu-west-2` in this example).
3. Leave all other settings at their default values.
   ![Creating an S3 bucket](/screenshots/create-s3-bucket.png)

### Step 2: Copy the Lambda code to the bucket

Create a zip file that contains the source code of the Datadog integration Lambda function.

You can do this either from the command line:

```
zip -r lambda.zip lambda/*
```

Or from your desktop GUI. For example, in MacOS Finder:

![Creating the Lambda source zip file](/screenshots/zip-lambda.png)

Then, upload the zip file containing the Lambda source code to your S3 bucket:

Using AWS CLI:

```
aws s3 cp lambda.zip "s3://ably-datadog-lambda-example/lambda.zip"
```

Using the S3 Management Console:

![Uploading the Lambda zip file using the S3 Management Console](/screenshots/upload-zip-lambda.png)

### Step 3: Configure CloudFormation

You must configure the required CloudFormation parameters in the `cloudformation/parameters.json` file. These consist of:

- The S3 bucket details
- Your Datadog API key (see below)
- Your Ably External ID, in the format `<accountID>.<appID>`, as described [here](https://knowledge.ably.com/authentication-for-reactor-rules-for-aws-reactor-events-for-lambda-functions-reactor-firehose-for-aws-sqs-and-kinesis)

#### Obtaining a Datadog API key

To obtain a DataDog API Key, go to Organization settings and click the _API keys_ or _Client Tokens_ tab. Then:

1. Click the _New Key_ or _New Client Token_ button, depending on which you want to create.
2. Enter a name for your key or token.
3. Click _Create API key_ or _Create Client Token_, as appropriate.

#### Configuring the parameters

Edit the `cloudformation/parameters.json` file with the following values:

- `LambdaS3Bucket`: The name of the S3 bucket you created in Step 1.
- `LambdaS3Path`: The filename of the Lambda source zip file you created in Step 2.
- `DatadogAPIKey`: Your Datadog API key.
- `DatadogAPIHostname`: This depends on which Datadog region you signed up for:
  - US: `api.datadoghq.com`
  - EU: `api.datadoghq.eu`

The contents of the `cloudformation/parameters.json` should be similar to the following:

```[json]
[
  {
 "ParameterKey":   "LambdaS3Bucket",
 "ParameterValue": "ably-datadog-lambda-example-an"
  },
  {
 "ParameterKey":   "LambdaS3Path",
 "ParameterValue": "lambda.zip"
  },
  {
 "ParameterKey":   "DatadogAPIKey",
 "ParameterValue": "5f21b61c8e47f7b2319a6fdeaaa00000"
  },
  {
 "ParameterKey":   "DatadogAPIHostname",
 "ParameterValue": "api.datadoghq.eu"
  },
  {
 "ParameterKey":   "AblyLambdaExternalID",
 "ParameterValue": "mXnD-A.L_XXXXX"
  }
]
```

### Step 4: Deploy the CloudFormation stack

Using the AWS CLI:

```
aws cloudformation deploy \
  --template-file       cloudformation/template.yaml \
  --stack-name          ably-datadog-lambda-example \
  --parameter-overrides file://cloudformation/parameters.json \
  --capabilities        "CAPABILITY_IAM"
```

Using the [AWS CloudFormation console](https://console.aws.amazon.com/cloudformation/):

![Deploy the CloudFormation stack step 1](/screenshots/cloudformation-stack-1.png)
![Deploy the CloudFormation stack step 2](/screenshots/cloudformation-stack-2.png)
![Deploy the CloudFormation stack step 3](/screenshots/cloudformation-stack-3.png)

Retrieve the Lambda function name and the ARN of the IAM role which grants Ably permission to invoke the Lambda function from the CloudFormation stack outputs:

Using the AWS CLI:

```
aws cloudformation describe-stacks --stack-name ably-datadog-lambda-example | grep -A 11 Outputs
```

Using the AWS Lambda console:

![Retrieving the Lambda details](/screenshots/lambda-arn-details.png)

### Step 5: Create an Ably Reactor rule

In this step, you will create and configure an Ably Reactor integration rule which will invoke the Lambda function when messages are published to the `[meta]stats:minute` metachannel.

First, create the rule:

1. Log into the [Ably dashboard](https://ably.com/login).
2. Locate the app you want to collect statistics for.
3. Select the _Integrations_ tab and click the _New Reactor Rule_ button.
   ![Create a new Reactor rule](/screenshots/reactor-rule-1.png)
4. Select _Reactor Event_ and click the _Choose_ button.
   ![Selecting the type of integration](/screenshots/reactor-rule-2.png)
5. Select _AWS Lambda_ and click _Choose_
   ![Selecting the event type](/screenshots/reactor-rule-3.png)

Then, configure your new Reactor integration rule [using these instructions](https://ably.com/documentation/general/events/aws-lambda).

The parameters you require are as follows:

- **AWS Region**: The AWS region you deployed the CloudFormation stack to.
- **Function Name**: The value of `LambdaFunctionName` from the CloudFormation stack outputs in Step 4.
- **AWS Authentication Scheme**: Select "ARN of an assumable role" and enter the value of `IAMRoleARN` from the CloudFormation stack outputs. (You can alternatively use your AWS Credentials for this - see below).
- **Source**: Select "Message".
- **Channel filter**: Enter `^\[meta\]stats:minute$`. (This regular expression matches the name of the `[meta]stats:minute` metachannel).
- **Enveloped**: Leave this Enabled.

When you have created your rule, click the _Test rule_ button. If the rule is working correctly, you will see the following message:

![Testing the Reactor rule](/screenshots/test-reactor-rule.png)

#### Optional: Using AWS credentials for authentication

Instead of using the "ARN of an assumable role" option, you could use your AWS credentials to authenticate with AWS. To do this, you need an AWS API key. It is best practice to create an IAM user with the minimum required permissions and then create an access key for that IAM user. This process is described in the [AWS knowledge base](https://aws.amazon.com/premiumsupport/knowledge-center/create-access-key/).

Once you have your AWS credentials, you can configure them as `<access key id>:<secret access key>` in the AWS Credentials field in your Reactor integration rule as shown below:

![Configuring the Reactor rule with AWS credentials](/screenshots/create-reactor-event.png)

### Step 6: Set up your Datadog dashboard

Please refer to the Datadog documentation on [setting up dashboards](https://docs.datadoghq.com/dashboards/).

![Creating a Datadog dashboard](/screenshots/datadog-dashboard-1.png)
![Example Datadog dashboard](/screenshots/datadog-dashboard-2.png)
