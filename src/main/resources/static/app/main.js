define(function(require) {
	'use strict';

	var fab = require('fabulous');
	var most = require('most');
	var when = require('when');
	var domready = require('domready');

	var api = require('./api');
	var follow = require('./follow');
	var twitter = require('./twitter');
	var imageReader = require('./imageReader');

	return fab.run(document.body, runApp);

	function runApp(node, context) {

		var root = '/api';

		context.images = [];
		context.galleries = [];
		context.deletePic = deletePic;

		context.currentGallery = void 0;
		context.addToSelectedGallery = addToSelectedGallery;
		context.removeFromGallery = removePicByResource;
		context.setCurrentGallery = function(gallery) {
			context.currentGallery = gallery;
		};

		context.imageSrc = {
			get: function(node) {
				return node.src;
			},
			set: function(value, node) {
				node.src = value;
			}
		};

		var halrx = /\/(_links|htmlUrl|gallery)(\/|$)/;
		context.ignoreHALMetadata = function(patch) {
			return patch.filter(function(p) {
				return !halrx.test(p.path);
			});
		};

		/* Delete the picture from storage and remove from the screen */
		function deletePic(item) {
			api({ method: 'DELETE', path: item._links.self.href })
				.done(function() {
					removeFromImages(item);
				});
		}

		/* Move the picture from table of unlinked items to its gallery's table */
		function addToSelectedGallery(item) {
			if (context.currentGallery === undefined) {
				return;
			}

			removeFromImages(item);

			var current = context.currentGallery._links.self.href;
			context.galleries.forEach(function(gallery) {
				if(gallery._links.self.href === current) {
					gallery.images.push(item);
				}
			});

			api({
				method: 'PUT',
				path: item._links.gallery.href,
				entity: context.currentGallery,
				headers: {'Content-Type': 'text/uri-list'}
			}).done();
		}

		function removePicByResource(item) {
			context.galleries.forEach(function(gallery) {
				gallery.images = gallery.images.filter(function(image) {
					return !(item._links.self.href === image._links.self.href
						&& item._links.gallery.href === image._links.gallery.href)
				});
			});
			context.images.push(item);

			api({
				method: 'DELETE',
				path: item._links.gallery.href
			}).done();
		}

		function removeFromImages(item) {
			context.images = context.images.filter(function(image) {
				return image._links.self.href !== item._links.self.href
			});
		}

		function getGalleryItems (gallery) {
			return api({
				method: 'GET',
				path: gallery._links.items.href,
				params: { projection: "noImages" }
			}).then(function (response) {
				return getEmbeddedItems(response.entity);
			});
		}

		function getEmbeddedItems(galleryItems) {
			var embedded = galleryItems._embedded;
			if (!embedded) {
				return [];
			}

			return embedded.items.map(function (itemWithoutImage) {
				return api(itemWithoutImage._links.self.href);
			});
		}

		context.uploadImage = function(data) {
			var images = context.images;
			imageReader.readImage(data.image).then(function(imageData) {
				return api({
					method: 'POST',
					path: root + '/items',
					entity: imageData,
					headers: {'Content-Type': 'application/json'}
				});
			}).then(function(response) {
				return api(response.headers.Location);
			}).done(function(response) {
				images.push(response.entity);
			});
		};

		/* When the page is loaded, run/register this set of code */
		domready(function() {

			var galleriesReady = follow(api, root, ['galleries', 'galleries'])
				.then(function(galleries) {
					return when.map(galleries, function(gallery) {
						return when.map(getGalleryItems(gallery), function(item) {
							return item.entity;
						}).then(function(images) {
							gallery.images = images;
							return gallery;
						});
					});
				})
				.then(function(galleries) {
					context.galleries = galleries;
				});

			var images = context.images;
			var itemsReady = follow(api, root, [
				{ rel: 'items', params: { projection: "noImages"} },
				'search',
				{ rel: 'findByGalleryIsNull', params: { projection: "noImages" } },
				'items'])
				.then(function(response) {

					return when.map(response, function(itemWithoutImage) {
						return api({
							path: itemWithoutImage._links.self.href
						}).then(function(item) {
							images.push(item.entity);
							return item.entity;
						});
					});
				});

			when.join(galleriesReady, itemsReady).done(twitter.tweetPic);
		});
	}
});
