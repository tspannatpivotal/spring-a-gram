define(function(require) {
	'use strict';

	var $ = require('jquery');
	var when = require('when');
	var api = require('./api');
	var follow = require('./follow');
	var twitter = require('./twitter');
	var imageReader = require('./imageReader');

	var currentGallery;
	var items = {};
	var galleries = {};
	var root = '/api';

	/* Search for a given item in the table of unlinked images */
	function findUnlinkedItem(item) {
		return $('#images tr[data-uri="' + item._links.self.href + '"]');
	}

	/* Search for a given item in the gallery's table */
	function findLinkedItem(item) {
		return $('#gallery tr[data-uri="' + item._links.self.href + '"]');
	}

	/* Delete the picture from storage and remove from the screen */
	function deletePic(item) {
		api({ method: 'DELETE', path: item._links.self.href })
			.done(function() {
				findUnlinkedItem(item).remove();
				delete items[item._links.self.href];
			});
	}

	/* Move the picture from table of unlinked items to its gallery's table */
	function addToSelectedGallery(item) {
		if (currentGallery === undefined) {
			return;
		}

		api({
			method: 'PUT',
			path: item._links.gallery.href,
			entity: currentGallery,
			headers: {'Content-Type': 'text/uri-list'}
		}).done(function() {
			$('#gallery table tr[data-uri="' + currentGallery._links.self.href +'"] table').append(createItemRowForGallery(item, currentGallery));
			findUnlinkedItem(item).remove();
		});
	}

	/* Take either a JSON or URI version of a resource, and extract it's ID */
	/* Unlink an item from it's gallery, and move it to the table of unlinked items */
	function removePicByResource(item, gallery) {
		if (gallery === undefined || item === undefined) {
			return;
		}

		api({
			method: 'DELETE',
			path: item._links.gallery.href
		}).done(function() {
			findLinkedItem(item).remove();
			$('#images table').append(createItemRow(item));
		});
	}

	/* Create a new table row for a item based on its gallery */
	function createItemRowForGallery(item, gallery) {
		var row = $('<tr></tr>')
			.attr('data-uri', item._links.self.href);

		row.append($('<td></td>').text(item.name));

		row.append($('<td></td>').append(
			$('<img>').addClass('thumbnail').attr('src', item.image)
		));

		row.append($('<td></td>').append(
			twitter.tweetButton(item.htmlUrl.href)
		));

		row.append($('<td></td>').append(
			$('<button>Remove</button>')
				.attr('data-gallery-uri', gallery._links.self.href)
				.attr('data-uri', item._links.self.href)
		));
		return row;
	}

	/* Draw the gallery table from scratch */
	function drawGalleryTable(data) {
		var table = $('<table></table>');
		table.append('<tr><th></th><th>Name</th><th>Collection</th></tr>')
		data.forEach(function (gallery) {
			var row = $('<tr></tr>').attr('data-uri', gallery._links.self.href);

			row.append($('<td></td>').append(
				$('<input type="radio" name="gallery">').click(function () {
					currentGallery = gallery;
				})
			));

			row.append($('<td></td>').text(gallery.description));

			var nestedTable = $('<table></table>');
			nestedTable.append('<tr><th>Filename</th><th>Image</th><th>Share</th></tr>');
			row.append($('<td></td>').append(nestedTable));
			table.append(row);
			$('#gallery').append(table);

			/* Now that the table is configured, start adding items to the nested table */
			var items = api({
				method: 'GET',
				path: gallery._links.items.href,
				params: {projection: "noImages"}
			}).then(function (response) {
				if (response.entity._embedded) {
					return response.entity._embedded.items.map(function (itemWithoutImage) {
						return api({path: itemWithoutImage._links.self.href})
					});
				} else {
					return [];
				}
			});

			return when.map(items, function(itemWithImage) {
				items[itemWithImage.entity._links.self.href] = itemWithImage.entity;
				nestedTable.append(createItemRowForGallery(itemWithImage.entity, gallery));
			});
		});
	}

	/* Create a new table row for an unlinked item */
	function createItemRow(item) {
		var row = $('<tr></tr>').attr('data-uri', item._links.self.href);

		row.append($('<td></td>').text(item.name));

		row.append($('<td></td>').append(
			$('<img>').addClass('thumbnail').attr('src', item.image)
		));

		row.append($('<td></td>').append(
			twitter.tweetButton(item.htmlUrl.href)
		));

		row.append($('<td></td>').append(
			$('<button>Delete</button>')
		));

		row.append($('<td></td>').append(
			$('<button>Add To Gallery</button>')
		));

		return row;
	}

	/* Append an item's table row to the image table */
	function addItemRow(item) {
		$('#images table').append(createItemRow(item));
	}

	/* When the page is loaded, run/register this set of code */
	$(function() {
		/* When upload is clicked, upload the file, store it, and then add to list of unlinked items */
		$('#upload').submit(function (e) {
			e.preventDefault();

			var fileInput = $('#file')[0];

			if(!imageReader.hasImage(fileInput)) {
				return;
			}

			imageReader.readImage(fileInput).then(function(imageData) {
				return api({
					method: 'POST',
					path: root + '/items',
					entity: imageData,
					headers: {'Content-Type': 'application/json'}
				});
			}).then(function(response) {
				return api({
					method: 'GET',
					path: response.headers.Location
				});
			}).done(function(response) {
				var item = response.entity;
				items[item._links.self.href] = item;
				addItemRow(item);
			});
		});

		/* Listen for clicks on the gallery */
		$('#gallery').on('click', function(e) {
			if (e.target.localName === 'button' && e.target.innerText === 'Remove') {
				var itemUri = e.target.dataset['uri'];
				var galleryUri = e.target.dataset['galleryUri'];
				removePicByResource(items[itemUri], galleries[galleryUri]);
			}
		});

		/* Listen for clicks on the list of images */
		$('#images').on('click', function(e) {
			if (e.target.localName === 'button') {
				if (e.target.innerText === 'Delete') {
					var itemUri = e.target.parentNode.parentNode.dataset['uri'];
					deletePic(items[itemUri]);
				} else if (e.target.innerText === 'Add To Gallery') {
					var itemUri = e.target.parentNode.parentNode.dataset['uri'];
					addToSelectedGallery(items[itemUri]);
				}
			}
		});

		follow(api, root, ['galleries', 'galleries']).done(function(response) {
			response.forEach(function(gallery) {
				galleries[gallery._links.self.href] = gallery;
			});
			drawGalleryTable(response).done();
			twitter.tweetPic();
		});

		follow(api, root, [
			{ rel: 'items', params: { projection: "noImages"} },
			'search',
			{ rel: 'findByGalleryIsNull', params: { projection: "noImages" } },
			'items']).done(function(response) {

			var table = $('<table></table>');
			table.append('<tr><th>Filename</th><th>Image</th><th>Share</th><th></th><th></th></tr>');
			$('#images').append(table);
			response.forEach(function(itemWithoutImage) {
				api({path: itemWithoutImage._links.self.href}).done(function(item) {
					items[item.entity._links.self.href] = item.entity;
					addItemRow(item.entity);
				});
				twitter.tweetPic();
			});
		});
	});
});
