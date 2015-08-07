
var model = require('./model.js');
var render = require('./render.js');
var mailer = require('./mailer.js');

function handleError (res, err, status) {
  status = status || 500;
  res.status(status);
  var data = {
    errors: [],
    status: status
  };
  if (typeof err  === 'string') {
    data.errors.push(err);
  } else if (err.message) {
    data.errors.push(err.message);
  } else if (err.length) {
    data.errors = err;
  } else {
    data.errors.push('Unknown Error');
  }
  res.json(data);
}

module.exports = {

  config: function (req, res, next) {
    model.find({}, function (err, templates) {
      if (err) return next(err);
      res.render('strider-email-admin/config.html', {
        templates: templates,
        flash: req.flash()
      })
    });
  },

  save: function (req, res, next) {
    if ('email' in req.body) delete req.body.email;
    model.findOne({id: req.body.id}, function (err, template) {
      if (err) return handleError(res, err, 500);
      if (!template) return handleError(res, 'Template not found', 404);
      render(req.body, template.data, function (err) {
        if (err) return handleError(res, err, 500);
        model.update({id: req.body.id}, {$set: req.body}, function (err, num) {
          if (err) return handleError(res, err, 500);
          if (num < 1) return handleError(res, 'Template not found', 404);
          return res.json(req.body);
        });
      });
    });
  },

  test: function (req, res, next) {
    if (!('email' in req.body)) return handleError(res, 'Email required', 400);
    model.findOne({id: req.body.id}, function (err, template) {
      if (err) return handleError(res, err, 500);
      if (!template) return handleError(res, 'Template not found', 404);
      mailer.sendTemplate(req.body.email, req.body, template.data, null, function (err) {
        if (err) return handleError(res, err, 500);
        res.json(req.body);
      });
    });
  },

  preview: function (req, res, next) {
    model.findOne({id: req.body.id}, function (err, template) {
      if (err) return handleError(res, err, 500);
      if (!template) return handleError(res, 'Template not found', 404);
      render(req.body, template.data, function (err, rendered) {
        if (err) return handleError(res, err, 500);
        res.json(rendered);
      });
    });
  }
};