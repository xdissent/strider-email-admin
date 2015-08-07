
var path = require('path');
var swig = require('swig');
var model = require('./model.js');
var routes = require('./routes.js');

module.exports = function (context, done) {
  // Add email admin link to admin nav
  context.registerBlock('AdminNavExtra', function(context, done) {
    done(null, '<li><a href="/admin/email">Email</a></li>');
  });

  // Reinitialize swig with plugin views path
  var viewsPath = path.resolve(__dirname, '../views');
  swig.init({
    root: [viewsPath, context.config.viewpath],
    allowErrors: true,
    cache: false,
    filters: require('../../../lib/swig-filters'),
    tags: require('../../../lib/swig-tags').tags,
    extensions: { plugin: require('../../../lib/plugin-templates') }
  });

  // Initialize mailer
  var mailer = require('./mailer.js');
  mailer.initialize(context);

  // Load initial templates if they do not exist
  model.initialize(function () {
    var app = context.app;
    var auth = context.auth;

    // Add plugin views path to app
    var views = app.get('views');
    views = [viewsPath].concat(views || [])
    app.set('views', views);

    // Find first real route in app stack
    var stack = app._router.stack;
    for (var idx = 0; idx < stack.length; idx++) {
      if (stack[idx].route) break;
    };

    // Remove and stash all real routes in stack
    var afterRoutes = stack.splice(idx, stack.length);

    // Add plugin routes
    app.get('/admin/email', auth.requireAdminOr401, routes.config);
    app.post('/admin/email', auth.requireAdminOr401, routes.save);
    app.post('/admin/email/test', auth.requireAdminOr401, routes.test);
    app.post('/admin/email/preview', auth.requireAdminOr401, routes.preview);

    // Restore stashed routes
    stack.splice.apply(stack, [stack.length, 0].concat(afterRoutes));

    done();
  });
};
