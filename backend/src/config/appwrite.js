'use strict';

const sdk = require('node-appwrite');
const env = require('./env');

let adminClient = null;
let adminDatabases = null;
let adminUsers = null;
let adminStorage = null;

function getAppwriteAdmin() {
  if (!adminClient) {
    adminClient = new sdk.Client()
      .setEndpoint(env.appwrite.endpoint)
      .setProject(env.appwrite.projectId);

    if (env.appwrite.apiKey) {
      adminClient.setKey(env.appwrite.apiKey);
    }

    adminDatabases = new sdk.Databases(adminClient);
    adminUsers = new sdk.Users(adminClient);
    adminStorage = new sdk.Storage(adminClient);
  }

  return {
    client: adminClient,
    databases: adminDatabases,
    users: adminUsers,
    storage: adminStorage,
    databaseId: env.appwrite.databaseId,
    collections: env.appwrite.collections,
    Query: sdk.Query,
    ID: sdk.ID,
    Permission: sdk.Permission,
    Role: sdk.Role,
  };
}

function createSessionClient(tokenOrSession) {
  const client = new sdk.Client()
    .setEndpoint(env.appwrite.endpoint)
    .setProject(env.appwrite.projectId);

  if (tokenOrSession) {
    client.setJWT(tokenOrSession);
  }

  return {
    client,
    account: new sdk.Account(client),
    databases: new sdk.Databases(client),
  };
}

function buildDocumentPermissions(creatorUserId, options = {}) {
  const { Permission, Role } = sdk;
  const { isLocked = false } = options;

  const permissions = [
    Permission.read(Role.user(creatorUserId)),
    Permission.read(Role.team('approvers')),
    Permission.read(Role.team('admins')),
    Permission.delete(Role.team('admins')),
  ];

  if (!isLocked) {
    permissions.push(Permission.update(Role.user(creatorUserId)));
  }
  permissions.push(Permission.update(Role.team('approvers')));
  permissions.push(Permission.update(Role.team('admins')));

  return permissions;
}

module.exports = {
  getAppwriteAdmin,
  getAppwriteServices: getAppwriteAdmin,
  createSessionClient,
  buildDocumentPermissions,
};
