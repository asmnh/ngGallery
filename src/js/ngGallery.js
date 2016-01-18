angular.module('jkuri.gallery', [])

.directive('ngGallery', ['$document', '$timeout', '$q', '$templateCache', function($document, $timeout, $q, $templateCache) {
	'use strict';

	var defaults = { 
		baseClass   : 'ng-gallery',
		thumbClass  : 'ng-thumb',
		thumbContainerClass  : 'ng-thumb-container',
		templateUrl : 'ng-gallery.html'
	};

	var keys_codes = {
		enter : 13,
		esc   : 27,
		left  : 37,
		right : 39
	};

	function setScopeValues(scope, attrs) {
		scope.baseClass = scope.class || defaults.baseClass;
		scope.thumbClass = scope.thumbClass || defaults.thumbClass;
		scope.thumbContainerClass = scope.thumbContainerClass || defaults.thumbContainerClass;
		scope.thumbsNum = scope.thumbsNum || 3; // should be odd
	}

	var template_url = defaults.templateUrl;
	// Set the default template
  	$templateCache.put(template_url,
	'<div class="{{ baseClass }}">' +
	'  <div ng-repeat="i in images  | startFrom: startFromValue | limitTo: limitToValue" class="{{ thumbContainerClass }}">' +
	'	 <span class="glyphicon glyphicon-remove delete-icon" ng-click="remove(i)"></span>' +
	'    <img ng-src="{{ i.thumbnail }}" class="{{ thumbClass }}" ng-click="openGallery($index+startFromValue)" alt="Image {{ $index + startFromValue + 1 }}" />' +
	'	 <span>{{i.title}}</span>'+
	'  </div>' +
	'</div>' +
	'<div class="ng-overlay" ng-show="opened">' +
	'</div>' +
	'<div class="ng-gallery-content" ng-show="opened">' +
	'  <div class="uil-ring-css" ng-show="loading"><div></div></div>' + 
	'  <a class="close-popup" ng-click="closeGallery()"><i class="fa fa-close"></i></a>' +
	'  <a class="nav-left" ng-click="prevImage()"><i class="fa fa-angle-left"></i></a>' +
	'  <img ng-src="{{ img }}" ng-click="nextImage()" ng-show="!loading" class="effect" />' +
	'  <a class="nav-right" ng-click="nextImage()"><i class="fa fa-angle-right"></i></a>' +
	'  <span class="info-text">{{ index + 1 }}/{{ images.length }} - {{ title }}</span>' +
	'  <div class="ng-thumbnails-wrapper">' +
	'    <div class="ng-thumbnails slide-left">' +
	'      <div ng-repeat="i in images">' + 
	'        <img ng-src="{{ i.thumbnail }}" ng-class="{\'active\': index === $index}" ng-click="changeImage($index)" />' +
	'      </div>' +
	'    </div>' +
	'  </div>' +
	'</div>'
	);

	return {
		restrict: 'EA',
		scope: {
			images: '=',
			startFromValue: '=',
			limitToValue: '=',
			thumbsNum: '@',
			remove: '='
		},
		templateUrl: function(element, attrs) {
        		return attrs.templateUrl || defaults.templateUrl;
    		},
		link: function (scope, element, attrs) {
			setScopeValues(scope, attrs);

			if (scope.thumbsNum >= 11) {
				scope.thumbsNum = 11;
			}

			var $body = $document.find('body');
			var $thumbwrapper = angular.element(document.querySelectorAll('.ng-thumbnails-wrapper'));
			var $thumbnails = angular.element(document.querySelectorAll('.ng-thumbnails'));

			scope.index = 0;
			scope.opened = false;

			scope.thumb_wrapper_width = 0;
			scope.thumbs_width = 0;

			var loadImage = function (i) {
				var deferred = $q.defer();
				var image = new Image();

				image.onload = function () {
					scope.loading = false;
				        if (typeof this.complete === false || this.naturalWidth === 0) {
				        	deferred.reject();
				      	}
				      	deferred.resolve(image);
				};
		
				image.onerror = function () {
					deferred.reject();
				};
				
				image.src = scope.images[i].thumbnail;
				scope.loading = true;

				return deferred.promise;
			};

			var showImage = function (i) {
				loadImage(scope.index).then(function(resp) {
					scope.img = resp.src;
					smartScroll(scope.index);
				});
				scope.title = scope.images[i].title || '';
			};

			scope.changeImage = function (i) {
				scope.index = i;
				loadImage(scope.index).then(function(resp) {
					scope.img = resp.src;
					smartScroll(scope.index);
				});
				scope.title = scope.images[i].title || '';
			};

			scope.nextImage = function () {
				scope.index += 1;
				if (scope.index === scope.images.length) {
					scope.index = 0;
				}
				showImage(scope.index);
			};

			scope.prevImage = function () {
				scope.index -= 1;
				if (scope.index < 0) {
					scope.index = scope.images.length - 1;
				}
				showImage(scope.index);
			};

			scope.openGallery = function (i) {
				if (typeof i !== undefined) {
					scope.index = i;
					showImage(scope.index);
				}
				scope.opened = true;

				$timeout(function() {
					var calculatedWidth = calculateThumbsWidth();
					scope.thumbs_width = calculatedWidth.width;
					$thumbnails.css({ width: calculatedWidth.width + 'px' });
					$thumbwrapper.css({ width: calculatedWidth.visible_width + 'px' });
					smartScroll(scope.index);
				});
			};

			scope.closeGallery = function () {
				scope.opened = false;
			};

			$body.bind('keydown', function(event) {
				if (!scope.opened) {
					return;
				}
				var which = event.which;
				if (which === keys_codes.esc) {
					scope.closeGallery();
				} else if (which === keys_codes.right || which === keys_codes.enter) {
					scope.nextImage();
				} else if (which === keys_codes.left) {
					scope.prevImage();
				}

				scope.$apply();
			});

			var calculateThumbsWidth = function () {
				var width = 0,
					visible_width = 0;
				angular.forEach($thumbnails.find('img'), function(thumb) {
					width += thumb.clientWidth;
					width += 10; // margin-right
					visible_width = thumb.clientWidth + 10;
				});
				return {
					width: width,
					visible_width: visible_width * scope.thumbsNum
				};
			};

			var smartScroll = function (index) {
				$timeout(function() {
					var len = scope.images.length,
				 	    width = scope.thumbs_width,
					    current_scroll = $thumbwrapper[0].scrollLeft,
					    item_scroll = parseInt(width / len, 10),
					    i = index + 1,
					    s = Math.ceil(len / i);

					$thumbwrapper[0].scrollLeft = 0;
					$thumbwrapper[0].scrollLeft = i > scope.thumbsNum ? (i - scope.thumbsNum) * item_scroll : 0;
				}, 100);
			};

		}
	};

}]);
