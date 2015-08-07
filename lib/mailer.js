
var striderMailer = require('strider-mailer');
var striderEmail = require('../../../lib/email.js');
var model = require('./model.js');
var render = require('./render.js');

var mailer = module.exports = {

  // The strider mailer instance
  mailer: null,

  // Template-based implementation of `strider/lib/email`
  email: {
    send_invite: function (code, email, done) {
      mailer.sendTemplateById(email, 'invite', {
        code: code,
        strider_server_name: mailer.config.server_name
      }, null, done);
    },
    revoke_invite: function (code, email, done) {
      mailer.sendTemplateById(email, 'revoke_invite', {
        code: code,
        strider_server_name: mailer.config.server_name
      }, null, done);
    },
    notify_password_change: function (user, done) {
      mailer.sendTemplateById(user.email, 'revoke_invite', {
        current_time: new Date()
      }, null, done);
    },
    send_password_reset: function (user, done) {
      mailer.sendTemplateById(user.email, 'send_password_reset', {
        current_time: new Date(),
        token: user.resetPasswordToken, 
        strider_server_name: mailer.config.server_name
      }, null, done);
    },
    notify_email_change: function (user, old_email, done) {
      var data = {
        current_time: new Date(),
        old_email: old_email,
        user: user
      };
      mailer.sendTemplateById(old_email, 'notify_email_change', data, null, function (err) {
        if (err) return done(err);
        mailer.sendTemplateById(user.email, 'notify_email_change', data, null, done);
      });
    },
    send_invite_collaborator_new_user: function (inviter, email, code, url, done) {
      mailer.sendTemplateById(email, 'collaborator_invite_new_user', {
        inviter: inviter.email,
        display_name: url.replace(/^.*com\//gi, ''),
        code: code,
        strider_server_name: mailer.config.server_name
      }, null, done);
    },
    send_invite_collaborator_existing_user: function (req, email, url, done) {
      mailer.sendTemplateById(email, 'collaborator_invite_existing_user', {
        inviter: inviter.email,
        display_name: url.replace(/^.*com\//gi, ''),
        strider_server_name: mailer.config.server_name
      }, null, done);
    }
  },

  // Initialize strider mailer and override `strider/lib/email` methods.
  initialize: function (config) {
    if (mailer.mailer) return;
    mailer.mailer = striderMailer(config);
    mailer.config = config;
    for (var k in mailer.email) {
      striderEmail[k] = mailer.email[k];
    }
  },

  // Send email (see `strider/lib/email`)
  send: function () {
    return mailer.mailer.send.apply(mailer.mailer, arguments);
  },

  // Send email with template, rendering with given data
  sendTemplate: function (email, template, data, from, done) {
    render(template, data, function (err, rendered) {
      if (err) return done(err);
      mailer.send(email, rendered.subject, rendered.text, rendered.html, from, done);
    });
  },

  // Send email with template ID, rendering with given data
  sendTemplateById: function (email, id, data, from, done) {
    done = done || function () {};
    model.findOne({id: id}, function (err, template) {
      if (err) return done(err);
      if (!template) return done(new Error('Invalid template: ' + id));
      mailer.sendTemplate(email, template, data, from, done);
    });
  }
}