
var path = require('path');
var fs = require('fs');
var mongoose = require('mongoose');
var async = require('async');

function loadTemplate (id, type) {
  var dir = path.resolve(__dirname, '../../../lib/views/email_templates', type);
  var file = path.join(dir, id + '.jade');
  return fs.readFileSync(file, 'utf8');
}

function loadNotifierTemplate (id, type) {
  var dir;
  if (type === 'plaintext') {
    dir = path.resolve(__dirname, '../../strider-email-notifier/views/email_templates', type);
  } else {
    dir = path.resolve(__dirname, '../views/email_templates', type);
  }
  var file = path.join(dir, id + '.jade');
  return fs.readFileSync(file, 'utf8');
}

function hasEmailNotifier () {
  try {
    require('strider-email-notifier');
    return true;
  } catch (err) {
    return false;
  }
}

function makeNotifierData (state) {
  return {
    displayName: 'example/project',
    finishTime: '2015-08-07 7:36 am',
    elapsedTime: '24m 10s',
    url: 'https://stridercd.com/example/project/job/3oxf2kq49zx23ld3',
    branchName: 'master',
    author: 'tester@email.com',
    logTail:  ' Cloning into \'.\'...\n' +
              ' + \'[\' -z \'\' \']\'\n' +
              ' + return\n' +
              ' + case $- in\n' +
              ' + return\n' +
              ' + node --version\n' +
              ' v0.12.7\n' +
              ' + npm --version\n' +
              ' 2.11.3\n',
    shortId: '3oxf2kq4',
    finishTimeRaw: new Date(),
    state: state
  };
}

var templates = {
  invite: {
    id: 'invite',
    name: 'Invite',
    subject: 'Strider Invitation',
    data: {
      strider_server_name: 'https://stridercd.com',
      code: 'Xsld349zx234s'
    }
  },
  revoke_invite: {
    id: 'revoke_invite',
    name: 'Revoke Invite',
    subject: 'Strider Invitation',
    data: {
      strider_server_name: 'https://stridercd.com',
      code: 'Xsld349zx234s'
    }
  },
  notify_password_change: {
    id: 'notify_password_change',
    name: 'Notify Password Change',
    subject: '[STRIDER] - Password Change Notification - #{current_time.getHours()}:#{current_time.getMinutes()}',
    data: {
      current_time: new Date()
    }
  },
  send_password_reset: {
    id: 'send_password_reset',
    name: 'Send Password Reset',
    subject: '[STRIDER] - Password Reset - #{current_time.getHours()}:#{current_time.getMinutes()}',
    data: {
      strider_server_name: 'https://stridercd.com',
      token: 'Xsld349zx234s',
      current_time: new Date()
    }
  },
  notify_email_change: {
    id: 'notify_email_change',
    name: 'Notify Email Change',
    subject: '[STRIDER] - Email Address Change Notification - #{current_time.getHours()}:#{current_time.getMinutes()}',
    data: {
      old_email: 'old@email.com',
      user: {
        email: 'old@email.com'
      }
    }
  },
  collaborator_invite_new_user: {
    id: 'collaborator_invite_new_user',
    name: 'Collaborator Invite (New User)',
    subject: '[STRIDER] Invite to #{display_name}',
    data: {
      inviter: 'inviter@email.com',
      display_name: 'example/project',
      code: 'Xsld349zx234s',
      strider_server_name: 'https://stridercd.com'
    }
  },
  collaborator_invite_existing_user: {
    id: 'collaborator_invite_existing_user',
    name: 'Collaborator Invite (Existing User)',
    subject: '[STRIDER] Invite to #{display_name}',
    data: {
      inviter: 'inviter@email.com',
      display_name: 'example/project',
      strider_server_name: 'https://stridercd.com'
    }
  }
};

var notifierTemplates = {
  test_succeed: {
    id: 'test_succeed',
    name: 'Test Succeeded',
    subject: '[STRIDER] - #{display_name} test #{state} - #{shortId}',
    data: makeNotifierData('success')
  },
  test_fail: {
    id: 'test_fail',
    name: 'Test Failed',
    subject: '[STRIDER] - #{display_name} test #{state} - #{shortId}',
    data: makeNotifierData('failure')
  }
};

var EmailTemplateSchema = new mongoose.Schema({
  id: String,
  name: String,
  subject: String,
  html: String,
  text: String,
  data: mongoose.Schema.Types.Mixed
});

// Creates default email templates if they do not exist
var initialized = false;
EmailTemplateSchema.static('initialize', function (done) {
  if (initialized || !mongoose.connection) return;
  initialized = true;

  // Load templates
  var id;
  for (id in templates) {
    templates[id].html = loadTemplate(id, 'html');
    templates[id].text = loadTemplate(id, 'plaintext');
  }

  // Load `strider-email-notifier` templates
  if (hasEmailNotifier()) {
    for (id in notifierTemplates) {
      templates[id] = notifierTemplates[id];
      templates[id].html = loadNotifierTemplate(id, 'html');
      templates[id].text = loadNotifierTemplate(id, 'plaintext');
    }
  }

  // Create templates
  var self = this;
  var initialize = function () {
    async.map(templates, function (template, done) {
      self.update({id: template.id}, {$setOnInsert: template}, {upsert: true}, done);
    }, done);
  };
  if (mongoose.connection.readyState === 1) return initialize();
  mongoose.connection.on('connected', initialize);
});

module.exports = mongoose.model('EmailTemplate', EmailTemplateSchema);
