const
	path = require('path'),
	fs = require('fs'),
	core = require('@pzlr/build-core'),
	Sugar = require('sugar');

const preferences = {
	static: ['.ess', '.styl'],
	ts: ['.ess', '.ss', '.styl', '.ts'],
	js: ['.ess', '.ss', '.styl', '.js']
};

function include(dir, name, ext) {
	try {
		if (fs.statSync(path.join(dir, name + ext)).isFile()) {
			return `require('./${name + ext}');`;
		}

	} catch (ignore) {}

	return '';
}

module.exports = function (source) {
	this.cacheable && this.cacheable();

	const
		query = Sugar.Object.fromQueryString(this.query || ''),
		type = core.config.projectType || query.projectType || 'ts',
		fileExts = query.exts || preferences[type];

	const declaration = core.declaration.parse(source, true);

	if (!declaration) {
		return source;
	}

	this.addContextDependency(this.context);

	const {name, parent, dependencies} = declaration;

	let res = '';

	if (parent) {
		res += `require('${core.resolve.block(parent)}');\n`;
	}

	res += dependencies.map((dep) => `require('${core.resolve.block(dep)}');`).join('\n');
	res += '\n';
	res += fileExts.map((ext) => include(this.context, name, ext)).join('\n');

	return res;
};
