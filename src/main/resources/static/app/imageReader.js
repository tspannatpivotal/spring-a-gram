define(function(require) {

	var when = require('when');

	return {
		hasImage: hasImage,
		readImage: readImage
	};

	function hasImage(file) {
		return file.type.indexOf('image') != -1
	}

	function readImage(file) {
		return when.promise(function(resolve, reject) {
			var fileReader = new FileReader();

			fileReader.onerror = reject;
			fileReader.onloadend = function () {
				resolve({ name: file.name, image: fileReader.result });
			};

			fileReader.readAsDataURL(file);
		});
	}
});