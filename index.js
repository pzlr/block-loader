'use strict';

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

const scripts = {
	'.ts': true,
	'.js': true
};

/**
 * Returns include declaration for the specified package
 *
 * @param {string} dir - source directory
 * @param {string} name - package name
 * @param {string} ext - file extension
 * @param {string} type - package type
 * @returns {string}
 */
function include(dir, name, ext, type) {
	if (!scripts[ext] && type === 'interface') {
		return '';
	}

	try {
		if (fs.statSync(path.join(dir, name + ext)).isFile()) {
			return `require('./${name + ext}');`;
		}

	} catch (ignore) {}

	return '';
}

/**
 * Returns escaped path
 * @param {string} path
 * @returns {string}
 */
function escapePath(path) {
	return JSON.stringify(path).slice(1, -1);
}

/**
 * @param source
 * @returns {string}
 */
module.exports = function (source) {
	this.cacheable && this.cacheable();

	const
		query = Sugar.Object.fromQueryString(this.query),
		projectType = query.projectType || core.config.projectType,
		fileExts = query.exts || preferences[projectType],
		declaration = core.declaration.parse(source, true);

	if (!declaration) {
		return source;
	}

	this.addContextDependency(this.context);

	const
		{name, type, parent, dependencies} = declaration;

	let res = parent ? `require('${escapePath(core.resolve.block(parent))}');\n` : '';
	res += dependencies.map((dep) => `require('${escapePath(core.resolve.block(dep))}');`).join('\n');
	res += '\n';
	res += fileExts.map((ext) => include(this.context, name, ext, type)).join('\n');

	return res;
};
