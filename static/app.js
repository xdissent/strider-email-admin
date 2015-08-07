
(function () {

function EmailAdminController ($sce, $http, $scope) {
  $scope.preview = function (template) {
    $scope.previewing = template;
    $scope.previewResult = null;
    $scope.previewErrors = null;
    $http.post('/admin/email/preview', template)
      .success(function (data, status) {
        data.html = $sce.trustAsHtml(data.html);
        $scope.previewResult = data;
      })
      .error(function (data, status) {
        $scope.previewErrors = data;
      });
  };
  $scope.close = function (evt) {
    evt.preventDefault();
    $scope.previewing = null;
  };
}

function EmailTemplateController ($http, $scope) {

  $scope.saving = false;
  $scope.sending = false;

  $scope.save = function (evt) {
    evt.preventDefault();
    if ($scope.saving) return;
    $scope.saving = true;
    $http.post('/admin/email', $scope.template)
      .success(function (data, status) {
        $scope.success('Email template saved.');
        $scope.orig = angular.copy($scope.template);
        $scope.emailForm.$setPristine();
        $scope.saving = false;
      })
      .error(function (data, status) {
        if (data.errors) $scope.error(data.errors.join('\n\n'));
        $scope.saving = false;
      });
  };
  
  $scope.preview = function (evt) {
    evt.preventDefault();
    $scope.$parent.preview($scope.template);
  };
  
  $scope.test = function (evt) {
    evt.preventDefault();
    if ($scope.testing) return;
    $scope.testing = true;
    var data = {email: $scope.email};
    angular.extend(data, $scope.template);
    $http.post('/admin/email/test', data)
      .success(function (data, status) {
        $scope.success('Test email sent.');
        $scope.testing = false;
      })
      .error(function (data, status) {
        if (data.errors) $scope.error(data.errors.join('\n\n'));
        $scope.testing = false;
      });
  };

  $scope.reset = function (evt) {
    evt.preventDefault();
    angular.extend($scope.template, $scope.orig);
    $scope.emailForm.$setPristine();
  }
}

var app = angular.module('emailAdmin', []);
app.controller('EmailTemplateController', ['$http', '$scope', EmailTemplateController]);
app.controller('EmailAdminController', ['$sce', '$http', '$scope', EmailAdminController]);
window.app.requires.push('emailAdmin');

})();