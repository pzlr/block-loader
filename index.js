'use strict';

const
	path = require('path'),
	core = require('@pzlr/build-core'),
	e = require('sugar').RegExp.escape,
	loaderUtils = require('loader-utils');

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
 * Returns escaped path
 * (fix for windows)
 *
 * @param {string} path
 * @returns {string}
 */
function escapePath(path) {
	return JSON.stringify(path).slice(1, -1);
}

/**
 * Imports all files from a directory by the specified pattern
 *
 * @param {string} dir
 * @param {string} pattern
 * @returns {string}
 */
function importAll(dir, pattern) {
	return `
(function (r) { 
	var arr = r.keys(); 
	for (var i = 0; i < arr.length; i++) { 
		r(arr[i]);
	}
})(require.context('${dir}', false, /${pattern}/));`;
}

/**
 * @param source
 * @returns {string}
 */
module.exports = function (source) {
	/**
	 * @type {{
	 *   projectType?: string,
	 *   blockDir?: string,
	 *   exts?: Array<string>,
	 *   libs?: boolean,
	 *   abstractRequire?: boolean
	 * }}
	 */
	const query = loaderUtils.getOptions(this) || {};

	const
		projectType = query.projectType || core.config.projectType,
		blockDir = query.blockDir || core.config.blockDir;

	const
		fileExts = query.exts || preferences[projectType],
		requireLibs = 'libs' in query ? query.libs : true,
		declaration = core.declaration.parse(source, true);

	if (!declaration) {
		return source;
	}

	this.addContextDependency(this.context);

	const
		{name, type, parent, dependencies, libs} = declaration;

	function resolve(dep, name) {
		return escapePath(
			query.abstractRequire ? path.join(blockDir, dep) : core.resolve.block(dep, name)
		);
	}

	let res = parent ?
		`require('${resolve(parent, name)}');\n` : '';

	res += dependencies
		.map((dep) => `require('${resolve(dep, name)}');`)
		.join('\n');

	if (requireLibs) {
		res += libs.map((lib) => `require('${escapePath(lib)}');`).join('\n');
	}

	res += '\n';

	const
		validExt = fileExts.filter((ext) => scripts[ext] || type !== 'interface').map((ext) => e(ext)),
		r = `${e(path.basename(name))}(${validExt.join('|')})`;

	if (query.abstractRequire) {
		res += importAll(path.join(blockDir, name), r);

	} else {
		res += importAll('./', r);
	}

	return res;
};
