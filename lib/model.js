
var path = require('path');
var fs = require('fs');
var mongoose = require('mongoose');
var async = require('async');

function loadTemplate (id, type) {
  var dir = path.resolve(__dirname, '../../../lib/views/email_templates', type);
  var file = path.join(dir, id + '.jade');
  return fs.readFileSync(file, 'utf8');
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
  for (var id in templates) {
    templates[id].html = loadTemplate(id, 'html');
    templates[id].text = loadTemplate(id, 'plaintext');
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
