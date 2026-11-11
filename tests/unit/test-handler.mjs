import test from 'node:test';
import assert from 'node:assert/strict';
import { lambdaHandler } from '../../src/app.mjs';

test('lambdaHandler - API Gateway invocation returns 200 and owner header', async () => {
  const event = {
    httpMethod: 'GET',
    path: '/',
    headers: {},
    queryStringParameters: null,
    requestContext: {
      http: { method: 'GET', path: '/' },
    },
  };

  const context = {
    awsRequestId: 'test-request-id-1234',
  };

  const response = await lambdaHandler(event, context);
  assert.equal(response.statusCode, 200);
  assert.equal(response.headers['X-Service-Owner'], 'so.amin');

  const parsedBody = JSON.parse(response.body);
  assert.equal(parsedBody.status, 'success');
  assert.equal(parsedBody.owner, 'so.amin');
  assert.equal(parsedBody.correlationId, 'test-request-id-1234');
});

test('lambdaHandler - Web browser navigation returns interactive HTML dashboard', async () => {
  const event = {
    httpMethod: 'GET',
    path: '/',
    headers: {
      accept: 'text/html,application/xhtml+xml,application/xml',
    },
    queryStringParameters: null,
    requestContext: {
      http: { method: 'GET', path: '/' },
    },
  };

  const response = await lambdaHandler(event, { awsRequestId: 'browser-req-5678' });
  assert.equal(response.statusCode, 200);
  assert.equal(response.headers['Content-Type'], 'text/html; charset=utf-8');
  assert.equal(response.headers['X-Service-Owner'], 'so.amin');
  assert.match(response.body, /AWS Serverless Dashboard/);
  assert.match(response.body, /Pure AWS Managed Runtime/);
  assert.match(response.body, /Owner: so\.amin/);
});

test('lambdaHandler - Health endpoint returns 200 with runtime diagnostics', async () => {
  const event = {
    httpMethod: 'GET',
    path: '/api/health',
    headers: {},
    requestContext: {
      http: { method: 'GET', path: '/api/health' },
    },
  };

  const response = await lambdaHandler(event, { awsRequestId: 'health-req' });
  assert.equal(response.statusCode, 200);
  const parsed = JSON.parse(response.body);
  assert.equal(parsed.status, 'healthy');
  assert.equal(parsed.owner, 'so.amin');
  assert.equal(parsed.packaging, 'Zip (Zero container overhead)');
});

test('lambdaHandler - POST /api/records persists demo record', async () => {
  const event = {
    httpMethod: 'POST',
    path: '/api/records',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ message: 'Live verification test' }),
    requestContext: {
      http: { method: 'POST', path: '/api/records' },
    },
  };

  const response = await lambdaHandler(event, { awsRequestId: 'post-req' });
  assert.equal(response.statusCode, 201);
  const parsed = JSON.parse(response.body);
  assert.equal(parsed.status, 'success');
  assert.equal(parsed.action, 'record_created');
  assert.equal(parsed.owner, 'so.amin');
});

test('lambdaHandler - SQS invocation processes messages and returns batchItemFailures', async () => {
  const event = {
    Records: [
      {
        eventSource: 'aws:sqs',
        messageId: 'sqs-msg-1',
        receiptHandle: 'handle-1',
        body: JSON.stringify({ action: 'process_item', id: '101' }),
        attributes: {},
      },
    ],
  };

  const response = await lambdaHandler(event, { awsRequestId: 'sqs-ctx' });
  assert.deepEqual(response, { batchItemFailures: [] });
});

test('lambdaHandler - Scheduled EventBridge invocation completes successfully', async () => {
  const event = {
    id: 'cron-event-999',
    'detail-type': 'Scheduled Event',
    source: 'aws.events',
    detail: {},
  };

  const response = await lambdaHandler(event, { awsRequestId: 'cron-ctx' });
  assert.equal(response.status, 'scheduled_execution_completed');
});
