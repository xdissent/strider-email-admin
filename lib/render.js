
var jade = require('jade');

module.exports = function (template, data, done) {
  try {
    var rendered = {
      id: template.id,
      subject: jade.render('| ' + template.subject, data),
      html: jade.render(template.html, data),
      text: jade.render(template.text, data)
    };
  } catch (err) {
    if (done) return done(err);
    throw err;
  }
  if (done) return done(null, rendered);
  return rendered;
}