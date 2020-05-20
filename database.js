'use strict';

const uuidv1 = require('uuid/v1');
const AWS = require('aws-sdk');
let dynamo = new AWS.DynamoDB.DocumentClient();

const TABLE_NAME = process.env.DYNAMODB_TABLE;

class DB {
  params;

  constructor() {
    this.params = { TableName: TABLE_NAME };
  }

  insertItem(item) {
    item.id = uuidv1();
    item.createdAt = Date.now();
    const params = {
      ...this.params,
      Item: item
    };

    return dynamo.put(params).promise().then(() => {
      return item.id;
    });
  }

  getItem(itemId, user_sub) {
    const params = {
      ...this.params,
      Key: {
        id: itemId,
        user_sub
      },
    };

    return dynamo.get(params).promise().then(result => {
      return result.Item;
    });
  }

  getAllItems() {
    return dynamo.scan(this.params).promise().then(res => res.Items);
  }

  getItems(user_sub) {
    const params = {
      ...this.params,
      IndexName: 'ThingsTableRecentItemsIndex',
      KeyConditionExpression: 'user_sub = :us and createdAt > :ca',
      ExpressionAttributeValues: {
        ':us': user_sub,
        ':ca': 0
      },
      ScanIndexForward: false,
    }
    return dynamo.query(params).promise().then(res => res.Items);
  }

  deleteItem(itemId, user_sub) {
    const params = {
      ...this.params,
      Key: {
        id: itemId,
        user_sub
      },
    };

    return dynamo.delete(params).promise();
  }

  updateItem(itemId, user_sub, item) {
    const [updateExpression, expressionAttributeValueMap] = serializeItem(item);
    const params = {
      ...this.params,
      Key: {
        id: itemId,
        user_sub
      },
      ConditionExpression: 'attribute_exists(id)',
      UpdateExpression: updateExpression,
      ExpressionAttributeValues: expressionAttributeValueMap,
      ReturnValues: 'ALL_NEW'
    };

    return dynamo.update(params).promise().then(response => {
      return response.Attributes;
    });
  }
}
function serializeItem(dict) {
  let updateExpression = 'set';
  const expressionAttributeValueMap = {};
  let curr = 1;
  const keys = Object.keys(dict);
  for (const key of keys) {
    const valueKey = `:v${curr}`;
    curr++;

    updateExpression += ` ${key} = ${valueKey}`;
    expressionAttributeValueMap[valueKey] = dict[key];
  }
  return [updateExpression, expressionAttributeValueMap];
}

module.exports = new DB();
