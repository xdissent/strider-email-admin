
var async = require('async')
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
        strider_server_name: mailer.context.config.server_name
      }, null, done);
    },
    revoke_invite: function (code, email, done) {
      mailer.sendTemplateById(email, 'revoke_invite', {
        code: code,
        strider_server_name: mailer.context.config.server_name
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
        strider_server_name: mailer.context.config.server_name
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
        strider_server_name: mailer.context.config.server_name
      }, null, done);
    },
    send_invite_collaborator_existing_user: function (req, email, url, done) {
      mailer.sendTemplateById(email, 'collaborator_invite_existing_user', {
        inviter: inviter.email,
        display_name: url.replace(/^.*com\//gi, ''),
        strider_server_name: mailer.context.config.server_name
      }, null, done);
    }
  },

  // Initialize strider mailer and override `strider/lib/email` methods.
  initialize: function (context) {
    if (mailer.mailer) return;
    mailer.mailer = striderMailer(context.config);
    mailer.context = context;
    for (var k in mailer.email) {
      striderEmail[k] = mailer.email[k];
    }
    mailer.initializeNotifier(context);
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
  },

  // Hijack `strider-email-notifier` if present.
  initializeNotifier: function (context) {
    try {
      require('strider-email-notifier');
    } catch (err) {
      return;
    }
    var io = context.emitter;
    io.removeAllListeners('plugin.emailNotifier.send');
    io.on('plugin.emailNotifier.send', function (jobId, pluginConfig) {
      var onDoneAndSaved = function (job) {
        if (job._id.toString() === jobId.toString()) {
          io.removeListener('job.doneAndSaved', onDoneAndSaved);
          context.pluginConfig = pluginConfig;
          context.createMailer =  striderMailer;
          mailer.notifierJobHandler(job, context);
        }
      }
      io.on('job.doneAndSaved', onDoneAndSaved);
    })
  },

  notifierJobHandler: function (job, context, callback) {
    context.pluginConfig = context.pluginConfig || {}
    var branch = job.ref && job.ref.branch ? job.ref.branch : 'master'
    async.waterfall
    (
      [ function (waterCallback) {
          var query = { project: job.project.name, 'ref.branch': branch }
            , options = { sort: { finished: -1 }, limit: 2 }
          context.models.Job.find(query, null, options, function (error, jobs) {
            var previousJob = jobs && jobs.length > 1 && jobs[1] ? jobs[1] : false
            previousJob.success = determineSuccess(previousJob)
            waterCallback(error, job, previousJob)
          })
        }
      ]
    , function (error, job, previousJob) {
        if (error) {
          throw error
        }
        job.success = determineSuccess(job)
        var pluginConfig = context.pluginConfig
        , sendEmail = mailer.notifierMailer(context)
        if (pluginConfig.always_notify || !previousJob || job.success !== previousJob.success) {
          sendEmail(job, callback)
        } else {
          if (callback) callback(null, { state: 'didNotSend' })
        }
      }
    )
    function determineSuccess(job) {
      return job.test_exitcode === 0 ? true : false
    }
  },

  notifierMailer: function (context) {
    return function (job, callback) {
      var state = parseInt(job.test_exitcode, 10) === 0 ? 'success' : 'failure';
      mailer.notifierSendToCollaborators(job, state, callback);
    };
  },

  notifierSendToCollaborators: function (job, state, callback) {
    callback = callback || function () {};

    var id = state === 'success' ? 'test_succeed' : 'test_fail';
    var numEmailsSent = 0;
    var done = function (err) {
      callback(err, {state: state + 'Sent', numEmailsSent: numEmailsSent});
    };
    var data = mailer.notifierData(job, state);
    model.findOne({id: id}, function (err, template) {
      if (err) return done(err);
      mailer.context.models.User.collaborators(job.project.name, function (err, users) {
        if (err) return done(err);
        async.each(users, function (user, done) {
          mailer.sendTemplate(user.email, template, data, null, function (err) {
            if (err) return done(err);
            numEmailsSent++;
          });
        }, done);
      });
    });
  },

  notifierData: function (job, state) {
    var project = job.project
      , display_name = project.display_name
      , duration = mailer.mailer.elapsed_time(job.started.getTime(),job.finished.getTime())
      , url = mailer.context.config.server_name + '/' + display_name + '/job/' + job._id
      , branchName = job.ref && job.ref.branch ? job.ref.branch : 'branch unknown'
      , jobAuthor = job.trigger && job.trigger.author ? job.trigger.author : false
      , authorName = jobAuthor && jobAuthor.name ? jobAuthor.name : false
      , authorUsername = jobAuthor && jobAuthor.username ? jobAuthor.username : false
      , authorEmail = jobAuthor && jobAuthor.email ? jobAuthor.email : ''
      , author = (authorUsername ? authorUsername : '') + (authorName ? ' (' + authorName + ')' : '')
      , moment = require('moment')
      , options =
        { displayName: display_name
        , finishTime: moment(job.finished_timestamp).format('YYYY-MM-DD h:mm a')
        , elapsedTime: duration
        , url: url
        , branchName: branchName
        , author: author || authorEmail
        , logTail: mailer.mailer.format_stdmerged(job.std.merged, 'plaintext')
        , state: state
        , shortId: job._id.toString().substr(0,8)
        , finishTimeRaw: job.finished_timestamp
        }
    return options
  }

}